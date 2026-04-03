const express = require('express');
const router = express.Router();
const adminOnly = require('../middleware/adminOnly');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Public: get active time slots for a specific date (used by booking page)
router.get('/available', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date is required' });

    const d = new Date(date + 'T00:00:00');
    const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon...
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return res.json({ slots: [] });
    }

    // Get active time slots for that day of week
    const activeSlots = await prisma.timeSlot.findMany({
      where: { dayOfWeek, active: true },
      orderBy: { time: 'asc' },
    });

    // Get already-booked slots for that date
    const bookedSlots = await prisma.booking.findMany({
      where: {
        date,
        status: { not: 'cancelled' },
      },
      select: { timeSlot: true },
    });

    const bookedTimes = new Set(bookedSlots.map((b) => b.timeSlot));
    const available = activeSlots.filter((s) => !bookedTimes.has(s.time));

    res.json({ slots: available });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: manage time slots
router.get('/', adminOnly, async (req, res) => {
  try {
    const slots = await prisma.timeSlot.findMany({ orderBy: [{ dayOfWeek: 'asc' }, { time: 'asc' }] });
    res.json({ slots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', adminOnly, async (req, res) => {
  try {
    const { dayOfWeek, time } = req.body;
    if (!dayOfWeek || !time) return res.status(400).json({ error: 'dayOfWeek and time are required' });

    const slot = await prisma.timeSlot.upsert({
      where: { dayOfWeek_time: { dayOfWeek: parseInt(dayOfWeek), time } },
      update: { active: true },
      create: { dayOfWeek: parseInt(dayOfWeek), time, active: true },
    });
    res.status(201).json({ slot });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id', adminOnly, async (req, res) => {
  try {
    const { active } = req.body;
    const slot = await prisma.timeSlot.update({
      where: { id: parseInt(req.params.id) },
      data: { active: Boolean(active) },
    });
    res.json({ slot });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
