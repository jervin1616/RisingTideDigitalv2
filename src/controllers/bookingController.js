const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');

const prisma = new PrismaClient();

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatTime(time) {
  const [h, m] = time.split(':');
  const hour = parseInt(h);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${m} ${suffix}`;
}

async function getAvailableSlots(req, res) {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date is required' });

    const d = new Date(date + 'T00:00:00');
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return res.json({ slots: [] });
    }

    const activeSlots = await prisma.timeSlot.findMany({
      where: { dayOfWeek, active: true },
      orderBy: { time: 'asc' },
    });

    const bookedSlots = await prisma.booking.findMany({
      where: { date, status: { not: 'cancelled' } },
      select: { timeSlot: true },
    });

    const bookedTimes = new Set(bookedSlots.map((b) => b.timeSlot));
    const available = activeSlots.filter((s) => !bookedTimes.has(s.time));

    res.json({ slots: available });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function createBooking(req, res) {
  try {
    const { serviceType, date, timeSlot, notes } = req.body;

    if (!serviceType || !date || !timeSlot) {
      return res.status(400).json({ error: 'Service type, date, and time slot are required' });
    }

    // Validate not a past date
    const bookingDate = new Date(date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (bookingDate < today) {
      return res.status(400).json({ error: 'Cannot book a date in the past' });
    }

    // Validate not Sunday
    if (bookingDate.getDay() === 0) {
      return res.status(400).json({ error: 'Bookings are not available on Sundays' });
    }

    // Check slot is still available
    const conflict = await prisma.booking.findFirst({
      where: { date, timeSlot, status: { not: 'cancelled' } },
    });
    if (conflict) {
      return res.status(409).json({ error: 'That time slot is no longer available' });
    }

    const booking = await prisma.booking.create({
      data: {
        userId: req.user.id,
        serviceType,
        date,
        timeSlot,
        notes: notes || null,
        status: 'pending',
      },
    });

    // Send confirmation emails
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const formattedDate = bookingDate.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    const formattedTime = formatTime(timeSlot);

    try {
      const transporter = getTransporter();

      // Email to client
      await transporter.sendMail({
        from: `"Rising Tide Digital" <${process.env.GMAIL_USER}>`,
        to: user.email,
        subject: 'Booking Confirmed — Rising Tide Digital',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <div style="background: #0a1628; padding: 24px; text-align: center;">
              <h1 style="color: #c9a84c; margin: 0; font-size: 24px;">Rising Tide Digital</h1>
              <p style="color: #fff; margin: 8px 0 0; font-size: 14px;">Built for the coast. Designed to grow.</p>
            </div>
            <div style="padding: 32px;">
              <h2>Your booking is confirmed!</h2>
              <p>Hi ${user.name},</p>
              <p>We've received your consultation request. Here are your booking details:</p>
              <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Service:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${serviceType}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Date:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${formattedDate}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Time:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${formattedTime} EST</td></tr>
                <tr><td style="padding: 8px; font-weight: bold;">Status:</td><td style="padding: 8px;">Pending Confirmation</td></tr>
              </table>
              ${notes ? `<p><strong>Your notes:</strong> ${notes}</p>` : ''}
              <p>We'll follow up shortly to confirm your appointment. If you need to make changes, please log into your dashboard.</p>
              <p style="margin-top: 32px;">Looking forward to working with you,<br><strong>The Rising Tide Digital Team</strong></p>
            </div>
            <div style="background: #f5f5f5; padding: 16px; text-align: center; font-size: 12px; color: #666;">
              Rising Tide Digital LLC · Wilmington, NC
            </div>
          </div>
        `,
      });

      // Email to admin
      const adminEmail = process.env.ADMIN_SEED_EMAIL || process.env.GMAIL_USER;
      await transporter.sendMail({
        from: `"Rising Tide Digital" <${process.env.GMAIL_USER}>`,
        to: adminEmail,
        subject: `New Booking: ${serviceType} — ${formattedDate}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>New Booking Received</h2>
            <p><strong>Client:</strong> ${user.name} (${user.email})</p>
            <p><strong>Phone:</strong> ${user.phone || 'Not provided'}</p>
            <p><strong>Service:</strong> ${serviceType}</p>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Time:</strong> ${formattedTime} EST</p>
            ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
            <p><a href="${process.env.APP_URL}/admin.html">View in Admin Dashboard</a></p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error('Email send failed:', emailErr);
      // Don't fail the booking if email fails
    }

    res.status(201).json({ booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function getMyBookings(req, res) {
  try {
    const bookings = await prisma.booking.findMany({
      where: { userId: req.user.id },
      orderBy: [{ date: 'desc' }, { timeSlot: 'desc' }],
    });
    res.json({ bookings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function cancelBooking(req, res) {
  try {
    const bookingId = parseInt(req.params.id);
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.userId !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    if (booking.status === 'cancelled') return res.status(400).json({ error: 'Booking is already cancelled' });

    // Must be more than 24 hours away
    const bookingDateTime = new Date(`${booking.date}T${booking.timeSlot}:00`);
    const now = new Date();
    const hoursUntil = (bookingDateTime - now) / (1000 * 60 * 60);
    if (hoursUntil < 24) {
      return res.status(400).json({ error: 'Bookings cannot be cancelled within 24 hours of the appointment' });
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'cancelled' },
    });

    res.json({ booking: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { getAvailableSlots, createBooking, getMyBookings, cancelBooking };
