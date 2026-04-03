const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/auth');

router.post('/checkout', authMiddleware, orderController.createCheckout);
// webhook registered in server.js with raw body parser
router.get('/my', authMiddleware, orderController.getMyOrders);
router.get('/success', authMiddleware, orderController.getOrderSuccess);

module.exports = router;
