require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // --- Admin user ---
  const adminEmail = process.env.ADMIN_SEED_EMAIL;
  const adminPassword = process.env.ADMIN_SEED_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error('ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD must be set in .env');
  }

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        name: 'Admin',
        email: adminEmail,
        passwordHash,
        role: 'admin',
      },
    });
    console.log(`Admin created: ${adminEmail}`);
  } else {
    console.log(`Admin already exists: ${adminEmail}`);
  }

  // --- Service products ---
  const products = [
    {
      name: 'Starter Package',
      description: 'Perfect for small businesses and startups launching their first professional web presence.',
      price: 50000, // $500.00 in cents
      category: 'Web Design',
      features: [
        '5-page responsive website',
        'Mobile-first design',
        'Contact form',
        'Google Maps integration',
        'Basic SEO setup',
        '1 round of revisions',
        '30-day post-launch support',
      ],
    },
    {
      name: 'Standard Package',
      description: 'Ideal for growing businesses that need a robust website with more pages and functionality.',
      price: 100000, // $1,000.00 in cents
      category: 'Web Design',
      features: [
        'Up to 10 pages',
        'Custom design system',
        'Blog or news section',
        'Email newsletter integration',
        'Google Analytics setup',
        'On-page SEO optimization',
        'Social media links & Open Graph tags',
        '2 rounds of revisions',
        '60-day post-launch support',
      ],
    },
    {
      name: 'Premium Package',
      description: 'Full-featured solution for established businesses requiring advanced functionality and custom development.',
      price: 150000, // $1,500.00+ in cents
      category: 'Web Design',
      features: [
        'Unlimited pages',
        'Custom UI/UX design',
        'E-commerce or booking integration',
        'CMS for easy content updates',
        'Advanced SEO strategy',
        'Performance optimization',
        'Accessibility compliance (WCAG 2.1)',
        'Custom forms & automations',
        'Unlimited revisions',
        '90-day post-launch support',
        'Priority response',
      ],
    },
    {
      name: 'Basic Maintenance Plan',
      description: 'Keep your site healthy with essential monthly maintenance and monitoring.',
      price: 5000, // $50.00/mo
      category: 'Maintenance',
      features: [
        'Monthly software & plugin updates',
        'Weekly backups',
        'Uptime monitoring',
        'Security scans',
        '1 hour of content updates/month',
      ],
    },
    {
      name: 'Standard Maintenance Plan',
      description: 'Full maintenance coverage with performance checks and priority support.',
      price: 10000, // $100.00/mo
      category: 'Maintenance',
      features: [
        'Everything in Basic',
        'Daily backups',
        'Monthly performance report',
        'Up to 3 hours of content updates/month',
        'Priority email support',
      ],
    },
    {
      name: 'Premium Maintenance Plan',
      description: 'Enterprise-grade care for mission-critical websites with hands-on support.',
      price: 17500, // $175.00/mo
      category: 'Maintenance',
      features: [
        'Everything in Standard',
        'Hourly backups',
        'Monthly strategy call',
        'Up to 6 hours of content updates/month',
        'Same-day emergency response',
        'Quarterly SEO review',
      ],
    },
    {
      name: 'Local SEO Package',
      description: 'Get found by customers in Wilmington and across the Cape Fear region.',
      price: 75000, // $750.00
      category: 'Add-Ons',
      features: [
        'Google Business Profile optimization',
        'Local citation building',
        'Keyword research & targeting',
        'On-page SEO implementation',
        'Monthly ranking report',
      ],
    },
    {
      name: 'Logo & Brand Identity',
      description: 'Professional logo design with a cohesive brand style guide.',
      price: 40000, // $400.00
      category: 'Add-Ons',
      features: [
        'Custom logo design (3 concepts)',
        'Color palette selection',
        'Typography pairing',
        'Brand style guide PDF',
        'File delivery in all formats (SVG, PNG, PDF)',
      ],
    },
  ];

  for (const product of products) {
    const existing = await prisma.product.findFirst({ where: { name: product.name } });
    if (!existing) {
      await prisma.product.create({ data: product });
      console.log(`Product created: ${product.name}`);
    } else {
      console.log(`Product already exists: ${product.name}`);
    }
  }

  // --- Default time slots: Mon-Fri, 9am-4pm ---
  const days = [1, 2, 3, 4, 5]; // Mon=1 ... Fri=5
  const times = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];

  for (const dayOfWeek of days) {
    for (const time of times) {
      await prisma.timeSlot.upsert({
        where: { dayOfWeek_time: { dayOfWeek, time } },
        update: {},
        create: { dayOfWeek, time, active: true },
      });
    }
  }
  console.log('Time slots seeded: Mon-Fri, 9am-4pm');

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
