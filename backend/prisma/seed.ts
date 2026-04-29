import { PrismaClient, Role, DocumentType, DocumentStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@listohod.ru' },
    update: {},
    create: {
      email: 'admin@listohod.ru',
      passwordHash: adminPassword,
      firstName: 'Алексей',
      lastName: 'Смирнов',
      middleName: 'Иванович',
      role: Role.ADMIN,
      position: 'Системный администратор',
      department: 'ИТ-отдел',
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@listohod.ru' },
    update: {},
    create: {
      email: 'manager@listohod.ru',
      passwordHash: userPassword,
      firstName: 'Елена',
      lastName: 'Петрова',
      middleName: 'Сергеевна',
      role: Role.MANAGER,
      position: 'Руководитель отдела поставок',
      department: 'Отдел поставок',
    },
  });

  const accountant = await prisma.user.upsert({
    where: { email: 'accountant@listohod.ru' },
    update: {},
    create: {
      email: 'accountant@listohod.ru',
      passwordHash: userPassword,
      firstName: 'Ирина',
      lastName: 'Козлова',
      middleName: 'Николаевна',
      role: Role.ACCOUNTANT,
      position: 'Главный бухгалтер',
      department: 'Бухгалтерия',
    },
  });

  const viewer = await prisma.user.upsert({
    where: { email: 'viewer@listohod.ru' },
    update: {},
    create: {
      email: 'viewer@listohod.ru',
      passwordHash: userPassword,
      firstName: 'Дмитрий',
      lastName: 'Орлов',
      middleName: 'Павлович',
      role: Role.VIEWER,
      position: 'Менеджер',
      department: 'Отдел продаж',
    },
  });

  const documents = [
    {
      number: 'ДОГ-2024-001',
      title: 'Договор поставки школьного оборудования №1',
      type: DocumentType.CONTRACT,
      status: DocumentStatus.SIGNED,
      description: 'Договор на поставку интерактивных досок для МБОУ «Школа №15»',
      amount: 1250000,
      counterparty: 'МБОУ «Средняя общеобразовательная школа №15»',
      createdById: manager.id,
      tags: ['школа', 'интерактивные доски', 'поставка'],
    },
    {
      number: 'СЧФ-2024-042',
      title: 'Счёт-фактура на оборудование для лабораторий',
      type: DocumentType.INVOICE,
      status: DocumentStatus.APPROVED,
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
      type: DocumentType.ACT,
      status: DocumentStatus.REVIEW,
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
      type: DocumentType.SPECIFICATION,
      status: DocumentStatus.DRAFT,
      description: 'Техническая спецификация на школьную мебель — парты, стулья, шкафы',
      amount: 320000,
      counterparty: 'МБОУ «Школа №22»',
      createdById: admin.id,
      tags: ['мебель', 'спецификация'],
    },
    {
      number: 'ПИС-2024-011',
      title: 'Письмо о согласовании условий поставки',
      type: DocumentType.LETTER,
      status: DocumentStatus.ARCHIVED,
      description: 'Официальное письмо с предложением о сотрудничестве',
      counterparty: 'Управление образования г. Краснодара',
      createdById: manager.id,
      tags: ['письмо', 'согласование'],
    },
    {
      number: 'ДОГ-2024-002',
      title: 'Договор технического обслуживания оборудования',
      type: DocumentType.CONTRACT,
      status: DocumentStatus.REJECTED,
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
      const created = await prisma.document.create({ data: doc as any });

      await prisma.activityLog.create({
        data: {
          documentId: created.id,
          userId: doc.createdById,
          action: 'CREATED',
          details: { status: doc.status },
        },
      });

      if (doc.status !== DocumentStatus.DRAFT) {
        await prisma.comment.create({
          data: {
            documentId: created.id,
            authorId: doc.createdById,
            text: 'Документ создан и направлен на согласование.',
          },
        });
      }
    }
  }

  console.log('Seeding complete.');
  console.log('\nAccounts:');
  console.log('  admin@listohod.ru / admin123 (Администратор)');
  console.log('  manager@listohod.ru / user123 (Менеджер)');
  console.log('  accountant@listohod.ru / user123 (Бухгалтер)');
  console.log('  viewer@listohod.ru / user123 (Просмотр)');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
