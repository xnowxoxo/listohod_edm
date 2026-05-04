'use strict';

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const adminPassword = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@stemacademia.com' },
    update: {
      firstName: 'Мадияр',
      lastName: 'STEM',
      role: 'ADMIN',
      isActive: true,
    },
    create: {
      email: 'admin@stemacademia.com',
      passwordHash: adminPassword,
      firstName: 'Мадияр',
      lastName: 'STEM',
      role: 'ADMIN',
      position: 'Администратор системы',
      department: 'Администрация',
      isActive: true,
    },
  });

  console.log('Seed complete.');
  console.log('  admin@stemacademia.com / admin123');
}

main()
  .catch((e) => { console.error('Seed error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
