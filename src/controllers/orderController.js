const { PrismaClient } = require('@prisma/client');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const prisma = new PrismaClient();

async function createCheckout(req, res) {
  try {
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ error: 'Product ID is required' });

    const product = await prisma.product.findUnique({ where: { id: parseInt(productId) } });
    if (!product || !product.active) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: product.price,
            product_data: {
              name: product.name,
              description: product.description,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.APP_URL}/store.html?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/store.html?cancelled=true`,
      metadata: {
        userId: String(req.user.id),
        productId: String(product.id),
      },
    });

    // Create a pending order record
    await prisma.order.create({
      data: {
        userId: req.user.id,
        productId: product.id,
        stripeSessionId: session.id,
        amount: product.price,
        status: 'pending',
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function stripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      await prisma.order.updateMany({
        where: { stripeSessionId: session.id },
        data: { status: 'paid' },
      });
      console.log(`Order paid: ${session.id}`);
    }

    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object;
      // Find order by matching session (best-effort)
      const sessions = await stripe.checkout.sessions.list({
        payment_intent: paymentIntent.id,
        limit: 1,
      });
      if (sessions.data.length > 0) {
        await prisma.order.updateMany({
          where: { stripeSessionId: sessions.data[0].id },
          data: { status: 'failed' },
        });
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

async function getMyOrders(req, res) {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: { product: { select: { name: true, category: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function getOrderSuccess(req, res) {
  try {
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ error: 'Session ID required' });

    const order = await prisma.order.findFirst({
      where: { stripeSessionId: session_id, userId: req.user.id },
      include: { product: { select: { name: true } } },
    });

    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { createCheckout, stripeWebhook, getMyOrders, getOrderSuccess };
