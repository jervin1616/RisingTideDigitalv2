const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const authMiddleware = require('../middleware/auth');

router.get('/slots', authMiddleware, bookingController.getAvailableSlots);
router.post('/', authMiddleware, bookingController.createBooking);
router.get('/my', authMiddleware, bookingController.getMyBookings);
router.delete('/:id', authMiddleware, bookingController.cancelBooking);

module.exports = router;
