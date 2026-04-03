const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getStats(req, res) {
  try {
    const [
      totalBookings,
      pendingBookings,
      totalOrders,
      newContacts,
      totalRevenue,
    ] = await Promise.all([
      prisma.booking.count(),
      prisma.booking.count({ where: { status: 'pending' } }),
      prisma.order.count({ where: { status: 'paid' } }),
      prisma.contactSubmission.count({ where: { read: false } }),
      prisma.order.aggregate({ where: { status: 'paid' }, _sum: { amount: true } }),
    ]);

    res.json({
      totalBookings,
      pendingBookings,
      totalOrders,
      newContacts,
      totalRevenue: totalRevenue._sum.amount || 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function getBookings(req, res) {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};

    const bookings = await prisma.booking.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true, phone: true } } },
      orderBy: [{ date: 'desc' }, { timeSlot: 'asc' }],
    });
    res.json({ bookings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function updateBookingStatus(req, res) {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const booking = await prisma.booking.update({
      where: { id: parseInt(req.params.id) },
      data: { status },
      include: { user: { select: { name: true, email: true } } },
    });

    res.json({ booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function getOrders(req, res) {
  try {
    const orders = await prisma.order.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        product: { select: { name: true, category: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function getContacts(req, res) {
  try {
    const contacts = await prisma.contactSubmission.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ contacts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function markContactRead(req, res) {
  try {
    const contact = await prisma.contactSubmission.update({
      where: { id: parseInt(req.params.id) },
      data: { read: true },
    });
    res.json({ contact });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function getProducts(req, res) {
  try {
    const products = await prisma.product.findMany({ orderBy: { price: 'asc' } });
    res.json({ products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function createProduct(req, res) {
  try {
    const { name, description, price, category, features } = req.body;
    if (!name || !description || !price || !category) {
      return res.status(400).json({ error: 'Name, description, price, and category are required' });
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: parseInt(price),
        category,
        features: features || [],
        active: true,
      },
    });
    res.status(201).json({ product });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function updateProduct(req, res) {
  try {
    const { name, description, price, category, features, active } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (price !== undefined) data.price = parseInt(price);
    if (category !== undefined) data.category = category;
    if (features !== undefined) data.features = features;
    if (active !== undefined) data.active = Boolean(active);

    const product = await prisma.product.update({
      where: { id: parseInt(req.params.id) },
      data,
    });
    res.json({ product });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function createProjectUpdate(req, res) {
  try {
    const { userId, title, message, status } = req.body;
    if (!userId || !title || !message || !status) {
      return res.status(400).json({ error: 'userId, title, message, and status are required' });
    }

    const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
    if (!user) return res.status(404).json({ error: 'Client not found' });

    const update = await prisma.projectUpdate.create({
      data: {
        userId: parseInt(userId),
        title,
        message,
        status,
      },
      include: { user: { select: { name: true, email: true } } },
    });
    res.status(201).json({ update });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function getProjectUpdates(req, res) {
  try {
    const { userId } = req.query;
    const where = userId ? { userId: parseInt(userId) } : {};

    const updates = await prisma.projectUpdate.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ updates });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function getClients(req, res) {
  try {
    const clients = await prisma.user.findMany({
      where: { role: 'client' },
      select: { id: true, name: true, email: true, phone: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ clients });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  getStats,
  getBookings,
  updateBookingStatus,
  getOrders,
  getContacts,
  markContactRead,
  getProducts,
  createProduct,
  updateProduct,
  createProjectUpdate,
  getProjectUpdates,
  getClients,
};
