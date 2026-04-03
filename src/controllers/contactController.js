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

async function submit(req, res) {
  try {
    const { name, email, phone, message, serviceInterest } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required' });
    }

    const submission = await prisma.contactSubmission.create({
      data: {
        name,
        email,
        phone: phone || null,
        message,
        serviceInterest: serviceInterest || null,
      },
    });

    // Send auto-reply to user
    try {
      const transporter = getTransporter();

      await transporter.sendMail({
        from: `"Rising Tide Digital" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: "We received your message — Rising Tide Digital",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <div style="background: #0a1628; padding: 24px; text-align: center;">
              <h1 style="color: #c9a84c; margin: 0; font-size: 24px;">Rising Tide Digital</h1>
              <p style="color: #fff; margin: 8px 0 0; font-size: 14px;">Built for the coast. Designed to grow.</p>
            </div>
            <div style="padding: 32px;">
              <h2>Thanks for reaching out, ${name}!</h2>
              <p>We've received your message and will be in touch within 1–2 business days.</p>
              <div style="background: #f5f5f5; padding: 16px; border-left: 4px solid #c9a84c; margin: 24px 0;">
                <p style="margin: 0 0 8px;"><strong>Your message:</strong></p>
                <p style="margin: 0; color: #555;">${message}</p>
              </div>
              <p>In the meantime, feel free to explore our <a href="${process.env.APP_URL}/services.html" style="color: #0a1628;">services</a> or <a href="${process.env.APP_URL}/booking.html" style="color: #0a1628;">book a free consultation</a>.</p>
              <p style="margin-top: 32px;">Warm regards,<br><strong>The Rising Tide Digital Team</strong><br>Wilmington, NC</p>
            </div>
            <div style="background: #f5f5f5; padding: 16px; text-align: center; font-size: 12px; color: #666;">
              Rising Tide Digital LLC · Wilmington, NC
            </div>
          </div>
        `,
      });

      // Notify admin
      const adminEmail = process.env.ADMIN_SEED_EMAIL || process.env.GMAIL_USER;
      await transporter.sendMail({
        from: `"Rising Tide Digital" <${process.env.GMAIL_USER}>`,
        to: adminEmail,
        subject: `New Contact: ${name} — ${serviceInterest || 'General Inquiry'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>New Contact Form Submission</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
            <p><strong>Service Interest:</strong> ${serviceInterest || 'Not specified'}</p>
            <p><strong>Message:</strong></p>
            <p style="background: #f5f5f5; padding: 12px;">${message}</p>
            <p><a href="${process.env.APP_URL}/admin.html">View in Admin Dashboard</a></p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error('Email send failed:', emailErr);
    }

    res.status(201).json({ message: 'Message received. We\'ll be in touch soon!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { submit };
