'use strict';

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@stemacademia.com' },
    update: {},
    create: {
      email: 'admin@stemacademia.com',
      passwordHash: adminPassword,
      firstName: 'Мадияр',
      lastName: 'STEM',
      role: 'ADMIN',
      position: 'Администратор системы',
      department: 'Администрация',
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@stemacademia.ru' },
    update: {},
    create: {
      email: 'manager@stemacademia.ru',
      passwordHash: userPassword,
      firstName: 'Елена',
      lastName: 'Петрова',
      middleName: 'Сергеевна',
      role: 'MANAGER',
      position: 'Руководитель отдела поставок',
      department: 'Отдел поставок',
    },
  });

  const accountant = await prisma.user.upsert({
    where: { email: 'accountant@stemacademia.ru' },
    update: {},
    create: {
      email: 'accountant@stemacademia.ru',
      passwordHash: userPassword,
      firstName: 'Ирина',
      lastName: 'Козлова',
      middleName: 'Николаевна',
      role: 'ACCOUNTANT',
      position: 'Главный бухгалтер',
      department: 'Бухгалтерия',
    },
  });

  await prisma.user.upsert({
    where: { email: 'viewer@stemacademia.ru' },
    update: {},
    create: {
      email: 'viewer@stemacademia.ru',
      passwordHash: userPassword,
      firstName: 'Дмитрий',
      lastName: 'Орлов',
      middleName: 'Павлович',
      role: 'VIEWER',
      position: 'Менеджер',
      department: 'Отдел продаж',
    },
  });

  const documents = [
    {
      number: 'ДОГ-2024-001',
      title: 'Договор поставки школьного оборудования №1',
      type: 'CONTRACT',
      status: 'SIGNED',
      description: 'Договор на поставку интерактивных досок для МБОУ «Школа №15»',
      amount: 1250000,
      counterparty: 'МБОУ «Средняя общеобразовательная школа №15»',
      createdById: manager.id,
      tags: ['школа', 'интерактивные доски', 'поставка'],
    },
    {
      number: 'СЧФ-2024-042',
      title: 'Счёт-фактура на оборудование для лабораторий',
      type: 'INVOICE',
      status: 'APPROVED',
      description: 'Счёт-фактура на химическое и биологическое лабораторное оборудование',
      amount: 487500,
      counterparty: 'МБОУ «Гимназия №3»',
      createdById: accountant.id,
      assignedToId: manager.id,
      tags: ['лаборатория', 'счёт-фактура'],
    },
    {
      number: 'АКТ-2024-018',
      title: 'Акт приёмки-передачи компьютерного оборудования',
      type: 'ACT',
      status: 'REVIEW',
      description: 'Акт приёмки компьютеров и периферии для компьютерного класса',
      amount: 890000,
      counterparty: 'МБОУ «Лицей №7»',
      createdById: manager.id,
      assignedToId: accountant.id,
      tags: ['компьютеры', 'акт приёмки'],
    },
    {
      number: 'СПЦ-2024-005',
      title: 'Спецификация: Мебель для школьных классов',
      type: 'SPECIFICATION',
      status: 'DRAFT',
      description: 'Техническая спецификация на школьную мебель — парты, стулья, шкафы',
      amount: 320000,
      counterparty: 'МБОУ «Школа №22»',
      createdById: admin.id,
      tags: ['мебель', 'спецификация'],
    },
    {
      number: 'ПИС-2024-011',
      title: 'Письмо о согласовании условий поставки',
      type: 'LETTER',
      status: 'ARCHIVED',
      description: 'Официальное письмо с предложением о сотрудничестве',
      counterparty: 'Управление образования г. Краснодара',
      createdById: manager.id,
      tags: ['письмо', 'согласование'],
    },
    {
      number: 'ДОГ-2024-002',
      title: 'Договор технического обслуживания оборудования',
      type: 'CONTRACT',
      status: 'REJECTED',
      description: 'Договор на годовое техническое обслуживание установленного оборудования',
      amount: 95000,
      counterparty: 'МБОУ «Школа №8»',
      createdById: manager.id,
      tags: ['обслуживание', 'договор'],
    },
  ];

  for (const doc of documents) {
    const existing = await prisma.document.findUnique({ where: { number: doc.number } });
    if (!existing) {
      const created = await prisma.document.create({ data: doc });
      await prisma.activityLog.create({
        data: {
          documentId: created.id,
          userId: doc.createdById,
          action: 'CREATED',
          details: { status: doc.status },
        },
      });
    }
  }

  console.log('Seed complete.');
  console.log('  admin@stemacademia.com / admin123');
  console.log('  manager@stemacademia.ru / user123');
  console.log('  accountant@stemacademia.ru / user123');
  console.log('  viewer@stemacademia.ru / user123');
}

main()
  .catch((e) => { console.error('Seed error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
