'use strict';

/**
 * cleanup.js — очистка базы данных до состояния "только администратор".
 * Удаляет все документы, вложения, комментарии, логи, уведомления и всех
 * пользователей кроме admin@stemacademia.com.
 *
 * Запуск (Docker):
 *   cd backend && DATABASE_URL="postgresql://listohod:listohod_secret@localhost:5450/listohod" node prisma/cleanup.js
 *
 * Запуск (локальная разработка, .env в папке backend):
 *   cd backend && node prisma/cleanup.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Пробуем подгрузить .env из backend/ или из корня проекта
function loadEnv() {
  const candidates = [
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '..', '..', '.env'),
  ];
  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) continue;
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const m = line.match(/^([^#=\s]+)\s*=\s*(.+)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
      }
    }
    break;
  }
}

loadEnv();

const prisma = new PrismaClient();

async function cleanup() {
  console.log('🧹 Начинаю очистку базы данных...\n');

  // Порядок важен: сначала зависимые таблицы, потом родительские
  const actLogs = await prisma.activityLog.deleteMany({});
  console.log(`  ✓ ActivityLog    — удалено ${actLogs.count}`);

  const steps = await prisma.approvalStep.deleteMany({});
  console.log(`  ✓ ApprovalStep   — удалено ${steps.count}`);

  const approvals = await prisma.approval.deleteMany({});
  console.log(`  ✓ Approval       — удалено ${approvals.count}`);

  const comments = await prisma.comment.deleteMany({});
  console.log(`  ✓ Comment        — удалено ${comments.count}`);

  const notifications = await prisma.notification.deleteMany({});
  console.log(`  ✓ Notification   — удалено ${notifications.count}`);

  const attachments = await prisma.attachment.deleteMany({});
  console.log(`  ✓ Attachment     — удалено ${attachments.count}`);

  const documents = await prisma.document.deleteMany({});
  console.log(`  ✓ Document       — удалено ${documents.count}`);

  const users = await prisma.user.deleteMany({
    where: { email: { not: 'admin@stemacademia.com' } },
  });
  console.log(`  ✓ User           — удалено ${users.count} (admin сохранён)`);

  // Чистим файлы из UPLOAD_DIR
  const uploadDir = process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.join(__dirname, '..', 'uploads');

  if (fs.existsSync(uploadDir)) {
    const files = fs.readdirSync(uploadDir).filter((f) => f !== '.gitkeep');
    for (const file of files) {
      try {
        fs.unlinkSync(path.join(uploadDir, file));
      } catch (_) {
        // игнорируем ошибки удаления отдельных файлов
      }
    }
    console.log(`  ✓ Uploads        — удалено ${files.length} файл(ов) из ${uploadDir}`);
  } else {
    console.log(`  ℹ Uploads        — директория не найдена (${uploadDir}), пропускаем`);
  }

  console.log('\n✅ Очистка завершена.');
  console.log('   В системе остался: admin@stemacademia.com / admin123');
}

cleanup()
  .catch((e) => {
    console.error('\n❌ Ошибка при очистке:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
