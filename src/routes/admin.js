const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminOnly = require('../middleware/adminOnly');

// All admin routes require admin role
router.use(adminOnly);

router.get('/stats', adminController.getStats);

// Bookings
router.get('/bookings', adminController.getBookings);
router.patch('/bookings/:id', adminController.updateBookingStatus);

// Orders
router.get('/orders', adminController.getOrders);

// Contact submissions
router.get('/contacts', adminController.getContacts);
router.patch('/contacts/:id/read', adminController.markContactRead);

// Products
router.get('/products', adminController.getProducts);
router.post('/products', adminController.createProduct);
router.patch('/products/:id', adminController.updateProduct);

// Project updates
router.post('/updates', adminController.createProjectUpdate);
router.get('/updates', adminController.getProjectUpdates);

// Clients list
router.get('/clients', adminController.getClients);

module.exports = router;
