# StemAcademia — Система электронного документооборота

Внутренняя система ЭДО для компании StemAcademia по оснащению школ.

## Стек

- **Бэкенд:** NestJS 10, Prisma ORM, PostgreSQL, JWT
- **Фронтенд:** Next.js 14, TypeScript, Tailwind CSS, TanStack Query, Zustand
- **Инфраструктура:** Docker Compose

## Быстрый старт (Docker)

```bash
cp .env.example .env
docker compose up -d --build
```

Система будет доступна:
- Фронтенд: http://localhost:3000
- API: http://localhost:3001
- Swagger: http://localhost:3001/api/docs

## Разработка без Docker

### Бэкенд
```bash
cd backend
cp .env.example .env
# Настройте DATABASE_URL в .env
npm install
npx prisma db push
node prisma/seed.js
npm run start:dev
```

### Фронтенд
```bash
cd frontend
npm install
npm run dev
```

## Настройка email (SMTP)

По умолчанию система работает в **dev-режиме**: письма не отправляются, токены подтверждения возвращаются прямо в ответе API и логируются в консоли бэкенда.

Для включения реальной отправки добавьте в `.env`:

```env
SMTP_HOST=smtp.gmail.com        # или smtp.yandex.ru / mail.ru / etc.
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your_app_password
SMTP_FROM=StemAcademia <noreply@stemacademia.ru>
FRONTEND_URL=https://your-domain.com
```

Как только `SMTP_HOST` заполнен, отправка включается автоматически. Поддерживаются любые SMTP-провайдеры (Gmail, Яндекс, Mail.ru, Mailgun, Brevo и т.д.).

> **Gmail:** используйте App Password (не обычный пароль), включите 2FA и создайте пароль приложения в настройках безопасности Google.

> **Яндекс:** включите «Пароли приложений» в настройках, `SMTP_HOST=smtp.yandex.ru`, `SMTP_PORT=465` или `587`.

## Тестовые аккаунты

| Email | Пароль | Роль |
|-------|--------|------|
| admin@stemacademia.com | admin123 | Администратор |
| manager@stemacademia.ru | user123 | Менеджер |
| accountant@stemacademia.ru | user123 | Бухгалтер |
| viewer@stemacademia.ru | user123 | Наблюдатель |

## Роли и права

| Роль | Просмотр | Создание | Смена статуса | Управление пользователями |
|------|----------|----------|---------------|--------------------------|
| ADMIN | ✓ | ✓ | ✓ | ✓ |
| MANAGER | ✓ | ✓ | ✓ | — |
| ACCOUNTANT | ✓ | ✓ | ✓ | — |
| VIEWER | ✓ | — | — | — |

## Жизненный цикл документа

```
DRAFT → REVIEW → APPROVED → SIGNED → ARCHIVED
              ↘ REJECTED → DRAFT
```

## Структура проекта

```
/
├── backend/              # NestJS API
│   ├── src/
│   │   ├── auth/         # JWT аутентификация
│   │   ├── documents/    # CRUD документов, смена статусов
│   │   ├── users/        # Управление пользователями
│   │   ├── comments/     # Комментарии к документам
│   │   ├── attachments/  # Загрузка файлов
│   │   ├── dashboard/    # Статистика
│   │   └── prisma/       # Prisma service
│   └── prisma/
│       ├── schema.prisma
│       └── seed.js
├── frontend/             # Next.js 14
│   └── src/
│       ├── app/          # App Router pages
│       ├── components/   # UI компоненты
│       ├── lib/          # API клиент, утилиты
│       ├── store/        # Zustand (auth)
│       └── types/        # TypeScript типы
└── docker-compose.yml
```
