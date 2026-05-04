# StemAcademia EDM — Developer Handoff Document

> **Версия:** май 2026  
> **Назначение:** Документ передачи проекта следующему разработчику.  
> Написан на основе реального кода и текущего состояния системы.  
> Автор предыдущего разработчика больше не доступен — этот документ должен быть достаточным для самостоятельной работы.

---

## Содержание

1. [Общее описание проекта](#1-общее-описание-проекта)
2. [Архитектура проекта](#2-архитектура-проекта)
3. [Полный стек технологий](#3-полный-стек-технологий)
4. [Как запустить проект](#4-как-запустить-проект)
5. [Env и конфигурация](#5-env-и-конфигурация)
6. [⚠️ Что компания должна заменить перед использованием](#6-️-что-компания-должна-заменить-перед-использованием)
7. [База данных и Prisma](#7-база-данных-и-prisma)
8. [Бизнес-логика](#8-бизнес-логика)
9. [Хранение файлов](#9-хранение-файлов)
10. [Auth и безопасность](#10-auth-и-безопасность)
11. [Frontend и UI-логика](#11-frontend-и-ui-логика)
12. [Technical debt и ограничения](#12-technical-debt-и-ограничения)
13. [Production readiness](#13-production-readiness)
14. [Практические рекомендации следующему разработчику](#14-практические-рекомендации-следующему-разработчику)
15. [Передача компании](#15-передача-компании)
16. [Финальный summary](#16-финальный-summary)

---

## 1. Общее описание проекта

**Название:** StemAcademia EDM (Electronic Document Management)

**Для чего:** Внутренняя система электронного документооборота компании StemAcademia, занимающейся оснащением школ оборудованием. Заменяет бумажный и email-документооборот внутри компании.

**Бизнес-задача:** Создание, согласование, подписание и архивирование корпоративных документов (договоры, акты, счета-фактуры, спецификации, письма, приказы) с историей действий, цепочкой согласующих и итоговым PDF с листом согласования.

**Основные пользователи:** бухгалтеры, менеджеры, логисты, юристы — сотрудники без технических знаний.

**Реализованные ключевые сценарии:**
- Регистрация / вход / подтверждение email / сброс пароля
- Создание документа с вложением PDF
- Отправка на согласование нескольким согласующим параллельно
- Согласование / отклонение / возврат на доработку с комментарием
- Скачивание итогового PDF с листом согласования и QR-кодом
- Встроенный просмотр PDF прямо в карточке документа
- Замена файла вложения с безопасным сбросом согласования
- Архивирование и разархивирование документов
- Уведомления о событиях согласования
- Dashboard с задачами, активностью и статистикой
- Раздел «Мои документы» с 4 категориями
- Управление пользователями (admin only): создание, роли, деактивация, удаление
- Дедлайн документа с визуальной индикацией просрочки

---

## 2. Архитектура проекта

### Структура папок

```
Listohod/                       ← корень проекта
├── .env                        ← реальные секреты (НЕ коммитить)
├── .env.example                ← шаблон без секретов
├── .gitignore
├── README.md
├── HANDOFF.md                  ← этот документ
├── docker-compose.yml          ← весь стек: DB + backend + frontend
│
├── backend/                    ← NestJS REST API
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma       ← единственный источник истины по структуре БД
│   │   │   ├── seed.js             ← АКТУАЛЬНЫЙ seed (запускается при каждом старте)
│   │   └── cleanup.js          ← одноразовый скрипт очистки БД
│   └── src/
│       ├── main.ts             ← точка входа: CORS, ValidationPipe, Swagger, uploads
│       ├── app.module.ts
│       ├── auth/               ← login, register, verify-email, forgot/reset password
│       ├── users/              ← CRUD пользователей (только ADMIN)
│       ├── documents/          ← основная логика: CRUD, workflow, итоговый PDF
│       ├── attachments/        ← загрузка/замена/удаление файлов
│       ├── comments/           ← комментарии к документам
│       ├── notifications/      ← in-app уведомления
│       ├── dashboard/          ← статистика, задачи, лента активности
│       ├── storage/            ← абстракция: local или S3
│       ├── email/              ← SMTP или dev-режим
│       └── prisma/             ← PrismaService (обёртка)
│
└── frontend/                   ← Next.js 14 App Router
    └── src/
        ├── app/
        │   ├── login/
        │   ├── register/
        │   ├── verify-email/
        │   ├── forgot-password/
        │   ├── reset-password/
        │   └── (dashboard)/    ← защищённые маршруты (требуют auth)
        │       ├── layout.tsx  ← auth guard + sidebar
        │       ├── dashboard/
        │       ├── documents/
        │       ├── documents/[id]/   ← карточка документа
        │       ├── my-documents/
        │       ├── archive/
        │       ├── notifications/
        │       └── users/
        ├── components/
        │   ├── documents/
        │   │   ├── attachments-panel.tsx
        │   │   ├── create-document-dialog.tsx
        │   │   ├── pdf-preview-dialog.tsx
        │   │   └── submit-for-review-dialog.tsx
        │   ├── layout/
        │   │   └── sidebar.tsx
        │   └── ui/             ← shadcn-совместимые компоненты
        ├── lib/
        │   ├── api.ts          ← axios клиент с JWT-интерцептором
        │   ├── constants.ts    ← статусы, типы, роли, переходы
        │   └── utils.ts
        ├── store/
        │   └── auth.ts         ← Zustand auth store с persist
        └── types/
            └── index.ts        ← TypeScript типы всех сущностей
```

### Связи между частями системы

```
Browser (порт 3000)
    │  HTTP REST + Bearer JWT
    ▼
Next.js frontend
    │  axios → API_URL/api/*
    ▼
NestJS backend (порт 3001)
    │  Prisma ORM
    ▼
PostgreSQL (порт 5432 внутри Docker / 5450 на хосте)
    
NestJS backend
    │  LocalStorageService (по умолчанию)
    ▼
Docker volume uploads_data  (или S3-compatible при STORAGE_DRIVER=s3)
```

### Как работает Docker

`docker-compose.yml` запускает три сервиса:

| Сервис | Образ/контекст | Порт внутри → наружу |
|---|---|---|
| `postgres` | postgres:16-alpine | 5432 → 5450 |
| `backend` | ./backend/Dockerfile | 3001 → 3001 |
| `frontend` | ./frontend/Dockerfile | 3000 → 3000 |

**Порядок старта:** `postgres` (healthcheck) → `backend` → `frontend`.

**CMD backend-контейнера:**
```sh
prisma db push --accept-data-loss && node prisma/seed.js && node dist/src/main.js
```
Это значит: при каждом старте применяется схема к БД, создаётся/обновляется admin-аккаунт, потом стартует приложение.

**Volumes:**
- `postgres_data` — данные PostgreSQL
- `uploads_data` — файлы вложений при local storage

> ⚠️ `docker compose down -v` удаляет оба volume — все данные и все загруженные файлы исчезнут безвозвратно.

---

## 3. Полный стек технологий

### Frontend

| Категория | Технология | Версия |
|---|---|---|
| Framework | Next.js (App Router) | 14.2.3 |
| Language | TypeScript | 5.4 |
| Styling | Tailwind CSS | 3.4 |
| Font | Plus Jakarta Sans | Google Fonts |
| UI компоненты | Radix UI (Dialog, Select, DropdownMenu и др.) | разные |
| Иконки | Lucide React | 0.376 |
| Toasts | Sonner | 1.5 |
| Data fetching | TanStack React Query v5 | 5.32 |
| State management | Zustand (+ persist middleware) | 4.5 |
| Forms | React Hook Form | 7.51 |
| Validation | Zod | 3.23 |
| HTTP-клиент | Axios | 1.6 |
| Charts | Recharts | 2.12 |
| Утилиты | date-fns, clsx, tailwind-merge, class-variance-authority | разные |

### Backend

| Категория | Технология | Версия |
|---|---|---|
| Framework | NestJS | 10 |
| Language | TypeScript | 5.4 |
| Runtime | Node.js | 20 |
| Auth | @nestjs/jwt + passport-jwt + bcryptjs | — |
| Validation | class-validator + class-transformer | — |
| API docs | @nestjs/swagger (Swagger UI) | — |
| ORM | Prisma | 5.11 |
| PDF generation | pdf-lib + @pdf-lib/fontkit | — |
| QR-codes | qrcode | 1.5 |
| Email | Nodemailer | 8 |
| File upload | Multer (memory storage) | — |
| S3 storage | @aws-sdk/client-s3 | — |

### Database & Infrastructure

| Компонент | Технология |
|---|---|
| СУБД | PostgreSQL 16 (Alpine) |
| ORM | Prisma 5.11 |
| Schema management | `prisma db push` (не migrations) |
| Контейнеризация | Docker + Docker Compose 3.9 |

---

## 4. Как запустить проект

### Требования

- Docker Desktop (или Docker Engine + Compose v2)
- Node.js 20+ (только для локальной разработки без Docker)
- Git

### Запуск через Docker (рекомендуется)

```bash
# 1. Клонировать репозиторий
git clone <url> && cd Listohod

# 2. Создать .env из примера
cp .env.example .env

# 3. Отредактировать .env — заменить секреты (см. раздел 6)
#    Минимум: JWT_SECRET должен быть изменён

# 4. Запустить всё
docker compose up -d --build

# Ждать ~30-60 секунд пока backend полностью стартует
docker logs stemacademia_backend --follow
# Успешный старт: "Nest application successfully started"
```

**Доступы после запуска:**
- Frontend: http://localhost:3000
- API: http://localhost:3001
- Swagger UI: http://localhost:3001/api/docs
- PostgreSQL: localhost:5450 (user/pass из .env)

**Вход в систему:**
```
admin@stemacademia.com / admin123
```

### Перезапуск и обновление

```bash
# Только перезапустить (без пересборки)
docker compose up -d

# Пересобрать backend (после изменений в коде)
docker compose up -d --build backend

# Пересобрать всё
docker compose up -d --build

# Посмотреть логи
docker logs stemacademia_backend --tail=50
docker logs stemacademia_frontend --tail=50

# Остановить (данные сохраняются)
docker compose down

# Полный сброс (удаляет ВСЕ данные!)
docker compose down -v
```

### Запуск без Docker (локальная разработка)

Нужен запущенный PostgreSQL. Можно поднять только БД через Docker:

```bash
# Только база данных
docker compose up -d postgres
```

**Backend:**
```bash
cd backend
cp .env.example .env
# Отредактировать .env: поставить DATABASE_URL и другие переменные
npm install
npx prisma db push
node prisma/seed.js
npm run start:dev   # hot reload, порт 3001
```

**Frontend:**
```bash
cd frontend
npm install
# Создать .env.local:
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local
npm run dev         # порт 3000
```

### Проверка после запуска

1. `docker logs stemacademia_backend` — ищи `"Nest application successfully started"`
2. Открыть http://localhost:3000 — должна появиться страница входа
3. Войти как `admin@stemacademia.com / admin123`
4. Проверить dashboard — должна показываться статистика
5. http://localhost:3001/api/docs — Swagger должен открываться

### Подключение к базе данных

```bash
# Через docker exec
docker exec -it stemacademia_db psql -U listohod -d listohod

# Через Prisma Studio (из backend/)
cd backend
DATABASE_URL="postgresql://listohod:listohod_secret@localhost:5450/listohod" npx prisma studio
```

---

## 5. Env и конфигурация

**Основной `.env` находится в корне проекта** и используется Docker Compose. Для локальной разработки без Docker — копировать в `backend/.env`.

### Полный список переменных

#### База данных

| Переменная | Обязательна | Пример | Описание |
|---|---|---|---|
| `POSTGRES_USER` | Да | `stemacademia` | Имя пользователя PostgreSQL |
| `POSTGRES_PASSWORD` | Да | `strong_password` | Пароль БД |
| `POSTGRES_DB` | Да | `stemacademia` | Имя базы данных |

#### Backend

| Переменная | Обязательна | Пример | Описание |
|---|---|---|---|
| `JWT_SECRET` | **Критично** | `min_32_chars_random` | Секрет для подписи JWT-токенов. Если утечёт — все сессии скомпрометированы |
| `JWT_EXPIRES_IN` | Нет | `7d` | Срок жизни токена. Форматы: `7d`, `24h`, `3600` |
| `PORT` | Нет | `3001` | Порт NestJS (в Docker всегда 3001) |
| `NODE_ENV` | Нет | `production` | Влияет на логирование |
| `CORS_ORIGIN` | Нет | `https://yourdomain.com` | Разрешённые origins для CORS. По умолчанию `*` — небезопасно для продакшна |
| `UPLOAD_DIR` | Нет | `/app/uploads` | Путь для хранения файлов при local storage. В Docker задаётся через volume |

#### Frontend

| Переменная | Обязательна | Описание |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Да | URL бэкенда, доступный из браузера. В Docker: `http://localhost:3001`. В продакшне: `https://api.yourdomain.com`. Вшивается при сборке образа (build arg) — при смене URL нужен `--build` |
| `FRONTEND_URL` | Да | URL фронтенда. Используется бэкендом для ссылок в письмах верификации и сброса пароля |

#### SMTP (email)

| Переменная | Обязательна | Описание |
|---|---|---|
| `SMTP_HOST` | Нет | Хост SMTP-сервера. Если пустой — dev-режим (письма не отправляются, токены возвращаются в API-ответе) |
| `SMTP_PORT` | Нет | Порт. `587` для TLS/STARTTLS, `465` для SSL |
| `SMTP_USER` | При SMTP_HOST | Логин/email отправителя |
| `SMTP_PASS` | При SMTP_HOST | Пароль или App Password |
| `SMTP_FROM` | Нет | Имя отправителя. Пример: `"StemAcademia <noreply@company.ru>"` |

#### Storage (файлы вложений)

| Переменная | Обязательна | Описание |
|---|---|---|
| `STORAGE_DRIVER` | Нет | `local` (по умолчанию) или `s3` |
| `S3_BUCKET` | При s3 | Имя S3-бакета |
| `S3_REGION` | При s3 | Регион. Для Cloudflare R2: `auto` |
| `S3_ENDPOINT` | При s3 | Endpoint. Для R2: `https://xxx.r2.cloudflarestorage.com` |
| `S3_ACCESS_KEY_ID` | При s3 | Access Key ID |
| `S3_SECRET_ACCESS_KEY` | При s3 | Secret Access Key |
| `S3_PUBLIC_URL` | При s3 | Публичный URL для доступа к файлам |

### Текущий .env (реальное состояние)

В текущем `.env` в корне проекта **уже заполнены реальные SMTP-данные** — это личная почта разработчика. Их нужно заменить немедленно (см. следующий раздел).

---

## 6. ⚠️ Что компания должна заменить перед использованием

> **Это критически важный раздел.** Не запускать систему в боевом режиме без выполнения пунктов ниже.

### 1. SMTP-данные (личный email разработчика)

**Где:** `.env` в корне проекта.

**Что сейчас:** Заполнены личные данные разработчика (email и App Password в `.env`).

**Примечание:** Реальные данные намеренно не указаны в документе — они хранятся только в локальном `.env` и не попадают в репозиторий.

**Почему нельзя оставить:** Письма системы (верификация email, сброс пароля) будут уходить с личной почты разработчика. Если разработчик закроет аккаунт или сменит пароль — вся email-аутентификация перестанет работать.

**На что заменить:**
```
SMTP_HOST=smtp.yandex.ru        # или Gmail, или корпоративный SMTP
SMTP_PORT=587
SMTP_USER=noreply@stemacademia.ru
SMTP_PASS=<app_password_компании>
SMTP_FROM="StemAcademia <noreply@stemacademia.ru>"
```
Создать корпоративный ящик. Для Gmail — создать App Password в настройках Google Account → Security → 2FA → App passwords.

---

### 2. JWT_SECRET

**Где:** `.env`, переменная `JWT_SECRET`.

**Что сейчас:** `super_secret_jwt_key_change_in_production`

**Почему нельзя оставить:** Это публично известная строка. Кто угодно, зная этот секрет, может сгенерировать валидный JWT и войти под любым пользователем.

**На что заменить:**
```bash
# Сгенерировать надёжный секрет:
openssl rand -base64 48
# Или:
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```
Результат вставить в `.env`. Длина — минимум 32 символа.

---

### 3. Пароль базы данных

**Где:** `.env`, переменные `POSTGRES_PASSWORD` (и `POSTGRES_USER`, `POSTGRES_DB`).

**Что сейчас:** `listohod_secret`

**Почему нельзя оставить:** Слабый предсказуемый пароль. PostgreSQL через Docker выставлен на порт `5450` хоста — если сервер в сети, база доступна снаружи.

**На что заменить:** Сильный случайный пароль (20+ символов). Также желательно изменить `POSTGRES_USER` и `POSTGRES_DB` на корпоративные.

> ⚠️ После смены credentials нужен `docker compose down -v && docker compose up -d --build` — иначе postgres-volume останется со старым паролем.

---

### 4. Пароль admin-аккаунта

**Где:** `backend/prisma/seed.js`, строка `bcrypt.hash('admin123', 10)`.

**Что сейчас:** Пароль `admin123`.

**Почему нельзя оставить:** Стандартный пароль по умолчанию, первое что проверяют при атаке.

**На что заменить:** После первого входа зайти в систему и сменить пароль через интерфейс, **или** изменить строку в `seed.js`:
```js
const adminPassword = await bcrypt.hash('НовыйСильныйПароль!2026', 10);
```
После изменения seed.js нужно пересобрать backend: `docker compose up -d --build backend`.

---

### 5. Домены и URL

**Где:** `.env`, переменные `NEXT_PUBLIC_API_URL` и `FRONTEND_URL`.

**Что сейчас:** `http://localhost:3001` и `http://localhost:3000`

**На что заменить:** Реальные домены компании:
```
NEXT_PUBLIC_API_URL=https://api.stemacademia.ru
FRONTEND_URL=https://stemacademia.ru
```
После смены — пересобрать frontend: `docker compose up -d --build frontend`.

---

### 6. Название системы

**Где:** `backend/src/email/email.service.ts` (HTML письма), `frontend/src/components/layout/sidebar.tsx`, `frontend/src/app/layout.tsx`.

**Что сейчас:** «StemAcademia» везде.

**Что сделать:** Поиском по `StemAcademia` найти все вхождения и заменить на название компании.

---

### 7. CORS origin

**Где:** `backend/src/main.ts`

**Что сейчас:** `CORS_ORIGIN` не установлен → по умолчанию `*` (разрешены все origins).

**На что заменить:** В `.env` добавить:
```
CORS_ORIGIN=https://stemacademia.ru
```

---

## 7. База данных и Prisma

### Модели (кратко)

| Модель | Назначение |
|---|---|
| `User` | Пользователи. Роли: `ADMIN, MANAGER, ACCOUNTANT, VIEWER, LOGISTICS` |
| `Document` | Документы. Статусы: `DRAFT, REVIEW, APPROVED, SIGNED, REJECTED, NEEDS_REVISION, ARCHIVED` |
| `Attachment` | Файловые вложения документа |
| `ApprovalStep` | Шаги согласования. `order=0` — инициатор, `order>0` — согласующие |
| `Approval` | История решений (аудит) |
| `Comment` | Комментарии к документам |
| `ActivityLog` | Лог действий: `CREATED, UPDATED, STATUS_CHANGED, FILE_REPLACED` |
| `Notification` | In-app уведомления |

### Как применяется схема

**Вместо migrations используется `db push`:**
```bash
prisma db push --accept-data-loss
```

Это выполняется автоматически при каждом старте backend-контейнера.

> ⚠️ **Риск:** `--accept-data-loss` означает, что при несовместимых изменениях схемы Prisma удалит данные без предупреждения. Например, переименование поля = удаление старого + создание нового пустого.
>
> **Для безопасного изменения схемы:** Всегда делать резервную копию БД перед любым `prisma db push`.

### Как работает seed

Файл `backend/prisma/seed.js` — единственный актуальный seed. Запускается при каждом старте контейнера:
```js
await prisma.user.upsert({
  where: { email: 'admin@stemacademia.com' },
  update: { firstName: 'Мадияр', lastName: 'STEM', role: 'ADMIN', isActive: true },
  create: { /* ... */ }
});
```

Это upsert — безопасно, ничего не ломает. Создаёт admin если его нет, обновляет если есть.

> ⚠️ Файл `backend/prisma/seed.ts` — **мёртвый код**, не используется. Можно удалить.

### Cleanup script

`backend/prisma/cleanup.js` — одноразовый скрипт для полной очистки данных:

```bash
# Запуск при работающем Docker (prod-режим)
cd backend
DATABASE_URL="postgresql://listohod:listohod_secret@localhost:5450/listohod" node prisma/cleanup.js

# Что делает: удаляет все документы, вложения, комментарии, логи, уведомления,
# всех пользователей кроме admin@stemacademia.com, очищает папку uploads
```

### Как изменить схему

1. Отредактировать `backend/prisma/schema.prisma`
2. Сделать backup БД: `docker exec stemacademia_db pg_dump -U listohod listohod > backup.sql`
3. Применить: `docker compose up -d --build backend` (автоматически выполнит db push)
4. Или вручную: `DATABASE_URL=... npx prisma db push`

### Переход на Prisma Migrations (рекомендуется для продакшна)

Текущий подход (`db push`) не сохраняет историю изменений схемы и опасен в продакшне. Переход:
```bash
cd backend
DATABASE_URL=... npx prisma migrate dev --name init
# Создаст папку prisma/migrations/ с историей
# Затем заменить db push на prisma migrate deploy в Dockerfile CMD
```

---

## 8. Бизнес-логика

### Создание документа

Любой авторизованный пользователь. Номер генерируется автоматически по типу: `ДОГ-2026-001`, `АКТ-2026-002`. Статус при создании — `DRAFT`.

Поля: название, тип (7 вариантов), контрагент, сумма, валюта, описание, теги, ответственный, **срок исполнения** (`dueDate`, опциональный).

**Код:** `backend/src/documents/documents.service.ts` → `create()`, `generateNumber()`

---

### Замена файла вложения

Доступна создателю и admin при любом статусе кроме `SIGNED`.

**Если статус `REVIEW` или `APPROVED`:** ApprovalStep удаляются, документ → `DRAFT`, в лог пишется `FILE_REPLACED`.

**Иначе (DRAFT, NEEDS_REVISION, REJECTED, ARCHIVED):** просто замена файла, статус не меняется.

Пользователь видит предупреждение в диалоге если согласование будет сброшено.

**Код:** `backend/src/attachments/attachments.service.ts` → `replace()`

---

### Workflow согласования

**Шаг 1 — Отправка на согласование** (`submitForReview`):
- Только создатель, из статусов `DRAFT`, `REJECTED`, `NEEDS_REVISION`
- Нужно выбрать хотя бы одного согласующего из активных пользователей
- Создаётся `ApprovalStep order=0` (инициатор, сразу `APPROVED`) и N шагов `order=1..N` (PENDING)
- Документ → `REVIEW`
- Уведомления всем согласующим

**Шаг 2 — Параллельное согласование** (`decideApproval`):
- Все согласующие (`order > 0`) имеют статус `PENDING` одновременно
- Каждый решает независимо, не ждёт других

**Решения:**
- `APPROVED`: помечает свой шаг. Если ВСЕ шаги approved → документ → `APPROVED`, уведомление создателю
- `REJECTED`: документ немедленно → `REJECTED`, уведомление создателю с комментарием
- `NEEDS_REVISION`: документ → `NEEDS_REVISION` (комментарий **обязателен**), уведомление создателю

**Переходы статусов (через `changeStatus`):**

| Из | В | Кто может |
|---|---|---|
| `DRAFT` | `ARCHIVED` | любой авторизованный |
| `REVIEW` | `DRAFT` (отозвать) | создатель или admin |
| `APPROVED` | `SIGNED` | любой |
| `APPROVED` | `REJECTED` | любой |
| `SIGNED` | `ARCHIVED` | любой |
| `REJECTED` | `DRAFT` или `ARCHIVED` | любой |
| `NEEDS_REVISION` | `DRAFT` | любой |
| `ARCHIVED` | `DRAFT` | любой |

**Переход `DRAFT → REVIEW` только через submit-for-review** (с выбором согласующих), не через changeStatus.

**Код:** `backend/src/documents/documents.service.ts`

---

### Итоговый PDF (лист согласования)

**Доступен только при статусах `APPROVED`, `SIGNED`, `ARCHIVED`** и только если у документа есть PDF-вложение.

**Что генерируется:**
- Берётся первый PDF-файл из вложений
- К нему добавляется дополнительная страница — «Лист согласования»
- Страница содержит: шапку с синей полосой, метаданные документа, таблицу ApprovalStep с решениями, QR-код с данными документа, футер с датой формирования

**Кириллические шрифты:** используются системные шрифты из Docker-контейнера (Liberation Sans или Noto Sans). Если шрифты не найдены — fallback на Helvetica (без кириллицы).

**Endpoint:** `GET /api/documents/:id/final`

**Код:** `backend/src/documents/stamp.service.ts`

---

### Уведомления

In-app уведомления. Нет WebSocket — обновляются **polling'ом каждые 30 секунд** в sidebar.

Типы: `APPROVAL_REQUIRED`, `DOCUMENT_APPROVED`, `DOCUMENT_REJECTED`, `DOCUMENT_NEEDS_REVISION`, `DOCUMENT_RESUBMITTED`, `DOCUMENT_SIGNED`

**Код:** `backend/src/notifications/notifications.service.ts`

---

### Дедлайн документа

Поле `dueDate` (DateTime?, опциональное). Задаётся при создании или редактировании. **Не влияет на статусный workflow** — чисто визуальный элемент. Отображается:
- В списке документов: строка под номером, красным + «просрочен» если дата прошла
- В карточке документа: с иконкой AlertCircle
- Просрочка не подсвечивается для `SIGNED` и `ARCHIVED`

---

### Просмотр PDF

Кнопка «глаз» появляется при наведении на PDF-вложение в панели вложений карточки документа. Клик → Modal (90vh) с нативным браузерным PDF viewer.

**Реализация:** fetch с JWT → blob → createObjectURL → `<iframe>`. Не требует изменений backend. Blob URL освобождается при закрытии диалога.

**Компонент:** `frontend/src/components/documents/pdf-preview-dialog.tsx`

---

### Удаление и деактивация пользователей (только ADMIN)

**Деактивация:** `isActive = false`. Пользователь не может войти. Данные сохраняются.

**Жёсткое удаление:**
- Запрещено если у пользователя есть хотя бы 1 созданный документ — защита целостности истории
- При удалении (транзакция): `assignedToId → null`, удаление его ApprovalStep/Approval/Comment/ActivityLog/User
- Нельзя удалить самого себя

**Код:** `backend/src/users/users.service.ts` → `hardDelete()`

---

## 9. Хранение файлов

### Текущий режим: Local Storage

По умолчанию `STORAGE_DRIVER=local`.

**Как работает:**
- Файлы хранятся в директории `uploads/` относительно процесса NestJS
- В Docker: volume `uploads_data`, путь внутри контейнера `/app/uploads`
- При загрузке: Multer читает файл в память (`memoryStorage`), потом `fs.writeFileSync(key, buffer)`
- Ключ файла: `{timestamp}-{random}.ext` (например: `1746275636-892345678.pdf`)
- В БД хранится `storedName` = этот ключ

**Код:** `backend/src/storage/local-storage.service.ts`

### S3-compatible Storage

**Как переключить:**
```env
STORAGE_DRIVER=s3
S3_BUCKET=my-bucket
S3_REGION=auto
S3_ENDPOINT=https://xxx.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=key_id
S3_SECRET_ACCESS_KEY=secret_key
S3_PUBLIC_URL=https://pub.r2.dev
```

Поддерживает любой S3-совместимый сервис: AWS S3, Cloudflare R2, MinIO.

**Код:** `backend/src/storage/s3-storage.service.ts`

**Переключение:** `backend/src/storage/storage.module.ts` — фабричный provider, читает `STORAGE_DRIVER` при старте.

### Риски local storage

| Риск | Последствие |
|---|---|
| `docker compose down -v` | Все загруженные файлы удалены безвозвратно |
| Рестарт контейнера без volume | Файлы исчезнут |
| Горизонтальное масштабирование | Разные инстансы не видят файлы друг друга |
| Отсутствие резервных копий | Потеря при сбое диска |

**Для продакшна:** Использовать S3 или Cloudflare R2. Переключение занимает 5 минут (только `.env`).

> ⚠️ При переключении с local на S3 **существующие файлы** не мигрируют автоматически. Нужно вручную перенести файлы из volume в S3-бакет с теми же ключами (`storedName`).

---

## 10. Auth и безопасность

### Flow аутентификации

**Login:**
1. `POST /api/auth/login` → bcrypt.compare → JWT sign (`{sub, email, role}`) → возвращает `{accessToken, user}`
2. Frontend: `localStorage.setItem('token', accessToken)` + Zustand persist

**Session restore:**
1. При загрузке Zustand rehydrate из localStorage
2. `(dashboard)/layout.tsx` вызывает `fetchMe()` → `GET /api/auth/me` → обновляет user в store
3. Если запрос вернул 401 → `logout()` → редирект на `/login`

**JWT в запросах:**
- `frontend/src/lib/api.ts` — interceptor читает `localStorage.getItem('token')` на каждый запрос
- 401 ответ → очистка токена → `window.location.href = '/login'` (кроме `/auth/` эндпоинтов)

**Регистрация:**
1. `POST /api/auth/register` → создаёт пользователя с `emailVerified: false` + UUID-токен верификации
2. Отправляет письмо (или в dev-mode возвращает токен в ответе)
3. `POST /api/auth/verify-email?token=...` → `emailVerified: true`

**Admin-созданные пользователи:** создаются с `emailVerified: true` — могут сразу входить без верификации.

**Забыл пароль:**
1. `POST /api/auth/forgot-password` → UUID-токен с TTL 1 час → письмо
2. `POST /api/auth/reset-password` → bcrypt новый пароль, токен удаляется

**Dev-mode email:** Если `SMTP_HOST` не задан — токены верификации и сброса возвращаются в теле API-ответа как `devVerificationToken` / `devResetToken`. Видно в Swagger UI.

### Уязвимые места (важно для продакшна)

| Проблема | Риск | Решение |
|---|---|---|
| `CORS_ORIGIN=*` | CSRF-уязвимость | Установить конкретный origin |
| Нет rate limiting | Brute-force на `/auth/login` | Добавить `@nestjs/throttler` |
| JWT не ревокируется | Украденный токен валиден до истечения | Добавить blacklist или refresh-token |
| Нет HTTPS | MITM, перехват токенов | Nginx + Let's Encrypt перед Docker |
| `JWT_SECRET` default | Полная компрометация | Заменить немедленно (раздел 6) |
| Нет 2FA | — | Добавить при необходимости |

---

## 11. Frontend и UI-логика

### Основные страницы

| Маршрут | Файл | Описание |
|---|---|---|
| `/login` | `app/login/page.tsx` | Вход. Default credentials: `admin@stemacademia.com / admin123` |
| `/register` | `app/register/page.tsx` | Регистрация |
| `/dashboard` | `app/(dashboard)/dashboard/page.tsx` | Главная с action cards, задачами, активностью |
| `/documents` | `app/(dashboard)/documents/page.tsx` | Список всех документов с фильтрами |
| `/documents/[id]` | `app/(dashboard)/documents/[id]/page.tsx` | Карточка документа — самая сложная страница |
| `/my-documents` | `app/(dashboard)/my-documents/page.tsx` | 4 вкладки: созданные/ожидающие/доработка/архив |
| `/archive` | `app/(dashboard)/archive/page.tsx` | Архивные документы |
| `/notifications` | `app/(dashboard)/notifications/page.tsx` | Список уведомлений |
| `/users` | `app/(dashboard)/users/page.tsx` | Управление пользователями (только ADMIN) |

### Auth guard

`app/(dashboard)/layout.tsx` — проверяет `isAuthenticated` из Zustand. Если false — редирект на `/login`. Дожидается гидрации (`_hasHydrated`) чтобы не было flash.

### Компоненты документов

- `attachments-panel.tsx` — загрузка/замена/удаление/просмотр PDF вложений
- `create-document-dialog.tsx` — форма создания (Dialog)
- `pdf-preview-dialog.tsx` — встроенный просмотрщик PDF
- `submit-for-review-dialog.tsx` — выбор согласующих, отправка на согласование

### Zustand store

`store/auth.ts` — `persist` middleware, ключ `auth-storage` в localStorage. Хранит: `{token, user, isAuthenticated}`.

> ⚠️ Токен хранится **дважды**: в Zustand (через persist в `auth-storage`) и отдельно через `localStorage.setItem('token')`. API-клиент читает `localStorage.getItem('token')`. Это избыточность, но не баг.

### React Query

Каждый запрос имеет `queryKey`. Важные ключи:
```
['dashboard']          — статистика дашборда
['documents', ...]     — список документов
['document', id]       — карточка одного документа
['my-tasks']           — мои pending задачи
['notifications-unread-count'] — polling в sidebar
['users']              — список пользователей
```

При мутациях (создание/изменение/удаление) нужно вызывать `qc.invalidateQueries({ queryKey: [...] })` для обновления связанных данных.

### Стиль и константы

Все статусы, типы, роли, цвета и переходы — в `frontend/src/lib/constants.ts`. Если добавляете новый статус или роль — добавьте туда же.

Цветовая палитра: тёплый teal (`#0d9488`) как основной акцент, stone-900 как тёмный sidebar, `#f8f7f4` как фоновый тёплый цвет.

### Что легко сломать

1. **`(dashboard)/layout.tsx`** — если сломать auth guard, все защищённые страницы станут публичными
2. **`lib/api.ts`** — interceptor с 401-логикой. Неправильное изменение → бесконечный редирект
3. **`lib/constants.ts`** — STATUS_TRANSITIONS используется и на frontend (кнопки действий) и на backend. Они должны совпадать
4. **`attachments-panel.tsx`** — сложный компонент с 4 мутациями и тремя диалогами. Осторожно с состояниями

---

## 12. Technical debt и ограничения

### Что хорошо работает

- Полный auth-цикл с email верификацией
- Workflow согласования с параллельным подтверждением
- Итоговый PDF с листом согласования и QR-кодом
- Замена файла с безопасным сбросом согласования
- Встроенный PDF viewer
- Абстракция хранилища (local / S3)
- Раздел «Мои документы» с 4 категориями
- Деактивация и безопасное удаление пользователей
- Дедлайн с визуальной индикацией просрочки

### Временные решения / technical debt

| Проблема | Где | Что сделать |
|---|---|---|
| `db push` вместо migrations | `Dockerfile CMD` | Перейти на `prisma migrate` |
| ~~seed.ts~~ | ~~удалён~~ | ✅ Уже удалён |
| Уведомления через polling 30s | sidebar.tsx | Добавить WebSocket/SSE |
| Нет rate limiting | API | `@nestjs/throttler` |
| CORS = `*` | main.ts | Установить origin |
| Нет HTTPS | — | Nginx + Let's Encrypt |
| Нет refresh token | auth flow | JWT живёт 7 дней — при краже долго валиден |
| Нет централизованного logging | — | Winston или Pino |
| Нет мониторинга / alerting | — | Prometheus + Grafana или Sentry |
| Нет тестов | — | Jest/Supertest для критических эндпоинтов |
| Нет email-уведомлений о согласовании | — | Только in-app сейчас |
| `avatarUrl` в User — не реализовано | schema.prisma | Реализовать загрузку или удалить поле |
| `metadata Json?` в Document — не используется | schema.prisma | Реализовать или удалить поле |

### Что опасно менять без понимания

- `STATUS_TRANSITIONS` в `documents.service.ts` — изменение ломает workflow
- `approvalSteps` логика (order 0 = initiator) — завязана на PDF stamp service
- Multer `memoryStorage` → если изменить на diskStorage, сломается storage abstraction
- `sanitize()` в `users.service.ts` — гарантирует что passwordHash никогда не утечёт в API

---

## 13. Production readiness

### Чеклист перед боевым запуском

- [ ] Заменить SMTP на корпоративный (раздел 6.1)
- [ ] Заменить JWT_SECRET (раздел 6.2)
- [ ] Сменить пароль БД (раздел 6.3)
- [ ] Сменить пароль admin (раздел 6.4)
- [ ] Установить реальные домены в env (раздел 6.5)
- [ ] Установить CORS_ORIGIN вместо `*`
- [ ] Настроить HTTPS (Nginx / Caddy / Traefik перед Docker)
- [ ] Переключить storage на S3 (раздел 9)
- [ ] Настроить резервное копирование БД (pg_dump по расписанию)
- [ ] Настроить резервное копирование S3-бакета
- [ ] Добавить rate limiting для auth эндпоинтов
- [ ] Перейти на Prisma migrations (раздел 7)
- [ ] Убрать `--accept-data-loss` из CMD

### HTTPS — минимальная конфигурация (Nginx)

```nginx
server {
    listen 443 ssl;
    server_name api.stemacademia.ru;
    
    ssl_certificate /etc/letsencrypt/live/.../fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/.../privkey.pem;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Резервное копирование БД

```bash
# Ежедневный dump (добавить в cron)
docker exec stemacademia_db pg_dump -U listohod listohod | gzip > backup_$(date +%Y%m%d).sql.gz

# Восстановление
gunzip -c backup_20260503.sql.gz | docker exec -i stemacademia_db psql -U listohod listohod
```

---

## 14. Практические рекомендации следующему разработчику

### С чего начать

1. Прочитать этот документ целиком
2. Запустить проект через Docker: `docker compose up -d --build`
3. Открыть http://localhost:3000, войти как admin
4. Открыть Swagger: http://localhost:3001/api/docs
5. Прочитать `backend/prisma/schema.prisma` — структура данных
6. Прочитать `backend/src/documents/documents.service.ts` — ядро бизнес-логики
7. Прочитать `frontend/src/app/(dashboard)/documents/[id]/page.tsx` — самая сложная страница

### В каком порядке смотреть код

```
1. schema.prisma                    — понять структуру данных
2. documents.service.ts             — главная бизнес-логика
3. documents.controller.ts          — все API endpoints
4. attachments.service.ts           — файловая логика, замена
5. stamp.service.ts                 — генерация PDF
6. auth.service.ts                  — аутентификация
7. storage/storage.module.ts        — абстракция хранилища
8. frontend/lib/constants.ts        — статусы, типы, роли, переходы
9. frontend/lib/api.ts              — HTTP-клиент
10. frontend/store/auth.ts          — auth state
```

### Что проверить сразу после запуска

```bash
# 1. Все контейнеры запущены
docker ps

# 2. Нет ошибок в логах
docker logs stemacademia_backend --tail=20

# 3. API отвечает
curl http://localhost:3001/api/docs -o /dev/null -s -w "%{http_code}"
# Ожидается: 200

# 4. БД доступна
docker exec stemacademia_db psql -U listohod -d listohod -c "SELECT count(*) FROM users;"
# Ожидается: 1 (только admin)
```

### Сценарии для ручного тестирования после изменений

1. Войти как admin, создать документ, прикрепить PDF
2. Создать второго пользователя через Users page
3. Отправить документ на согласование (выбрать второго пользователя)
4. Войти как второй пользователь, принять решение
5. Скачать итоговый PDF — проверить лист согласования
6. Открыть PDF через встроенный viewer
7. Заменить файл у документа в статусе REVIEW — проверить что согласование сбросилось
8. Архивировать документ, найти его в Archive

### Как безопасно вносить изменения

**Перед изменением schema.prisma:**
```bash
docker exec stemacademia_db pg_dump -U listohod listohod > backup_before_$(date +%Y%m%d%H%M).sql
```

**После изменений backend:**
```bash
cd backend && npm run build  # проверить что TypeScript компилируется
docker compose up -d --build backend
docker logs stemacademia_backend --tail=20
```

**После изменений frontend:**
```bash
cd frontend && npx tsc --noEmit  # TypeScript check
docker compose up -d --build frontend
```

**Никогда не менять в продакшне:**
- Не делать `docker compose down -v` при работающей системе
- Не менять `STATUS_TRANSITIONS` без понимания всех последствий
- Не удалять `approvalSteps order=0` логику в workflow

---

## 15. Передача компании

### Что передать вместе с проектом

| Что | Формат |
|---|---|
| Исходный код | Git-репозиторий (GitHub / GitLab / Gitea) |
| Этот документ | `HANDOFF.md` в репозитории |
| Рабочий `.env` | Отдельно, НЕ в репозиторий |
| Инструкция по первому запуску | Раздел 4 этого документа |
| Доступы к инфраструктуре | Письмом или в защищённом хранилище (Bitwarden, 1Password) |

### Что передать отдельно от кода

- Рабочий `.env` файл с реальными данными (SMTP, DB, JWT)
- Доступы к хостингу / VPS где будет разворачиваться система
- Доступы к DNS-провайдеру для настройки домена
- Логин/пароль к S3-бакету или решение по хранилищу файлов
- Доступы к почтовому сервису для SMTP

### Что НЕ должно попасть в репозиторий

- Файл `.env` (в `.gitignore` уже добавлен)
- Любые пароли, ключи, токены
- Личные данные разработчика (email, пароли приложений)

### Что проговорить устно или письменно

1. Текущий `.env` содержит личный SMTP разработчика — заменить в первый день
2. `JWT_SECRET` — дефолтный, заменить до первого публичного доступа
3. Пароли БД и admin — сменить перед открытием доступа сотрудникам
4. Файлы сейчас хранятся в Docker-volume — нужно решить по S3 до продакшна
5. Нет HTTPS — добавить перед открытием доступа сотрудникам
6. Нет резервного копирования — настроить в первую неделю

---

## 16. Финальный summary

### Что уже готово

Система полностью функциональна как MVP для внутреннего документооборота:
- Весь auth-цикл (регистрация → верификация → вход → сброс пароля)
- Полный workflow согласования с параллельным подтверждением
- Итоговый PDF с листом согласования и QR-кодом
- Встроенный PDF viewer прямо в карточке документа
- Замена файла с безопасным сбросом согласования
- Управление пользователями и ролями
- Архив, уведомления, дедлайн документа
- Раздел «Мои документы» с 4 категориями
- Docker-запуск одной командой

### Что требует немедленного внимания

1. **Личный SMTP разработчика в `.env`** — самое срочное
2. **JWT_SECRET дефолтный** — менять до первого входа посторонних
3. **Пароль admin `admin123`** — менять до передачи сотрудникам
4. **Нет HTTPS** — перед открытием системы сотрудникам
5. **Local file storage** — при любом сбое Docker файлы исчезнут

### Что следующий разработчик должен понять в первую очередь

1. `db push` = нет истории миграций — делать backup перед любым изменением схемы
2. Workflow согласования завязан на `ApprovalStep.order` — не менять логику без понимания
3. `NEXT_PUBLIC_API_URL` вшивается в сборку — при смене URL нужен `--build`
4. Уведомления через polling — если нужен real-time, нужен WebSocket/SSE
5. Файлы в Docker volume исчезают при `down -v` — до S3 нельзя делать это в продакшне

### Что компания должна заменить в первую очередь

| Приоритет | Что | Где |
|---|---|---|
| 🔴 Немедленно | SMTP credentials разработчика | `.env` → SMTP_* переменные |
| 🔴 Немедленно | JWT_SECRET | `.env` |
| 🔴 До первого входа сотрудников | Пароль admin@stemacademia.com | seed.js + сменить через UI |
| 🟡 До публичного доступа | HTTPS | Nginx + Let's Encrypt |
| 🟡 До публичного доступа | CORS origin | `.env` → CORS_ORIGIN |
| 🟡 До публичного доступа | Пароль БД | `.env` → POSTGRES_PASSWORD |
| 🟢 До продакшна | S3 для файлов | `.env` → STORAGE_DRIVER=s3 |
| 🟢 До продакшна | Резервное копирование БД | cron + pg_dump |
| 🟢 При возможности | Prisma migrations | Замена db push |

---

*Документ создан на основе реального кода проекта. Версия: май 2026.*
