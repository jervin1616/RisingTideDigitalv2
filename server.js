require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const authRoutes = require('./src/routes/auth');
const bookingRoutes = require('./src/routes/bookings');
const orderRoutes = require('./src/routes/orders');
const productRoutes = require('./src/routes/products');
const contactRoutes = require('./src/routes/contact');
const adminRoutes = require('./src/routes/admin');
const timeslotRoutes = require('./src/routes/timeslots');

const app = express();

// Stripe webhook must use raw body — register BEFORE express.json()
app.post(
  '/api/orders/webhook',
  express.raw({ type: 'application/json' }),
  require('./src/controllers/orderController').stripeWebhook
);

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/products', productRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/timeslots', timeslotRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Catch-all: serve index.html for unknown routes (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Rising Tide Digital server running on port ${PORT}`);
});

module.exports = app;
