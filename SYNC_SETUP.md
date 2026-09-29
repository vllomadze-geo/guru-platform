# Настройка синхронизации GURU

## 1. Подготовить Supabase

1. Открыть проект Supabase.
2. В `SQL Editor` выполнить файл `supabase_workspace_setup.sql`.
3. Затем выполнить `supabase_workspace_egress_migration.sql`.
4. Только после успешной миграции разворачивать версию API с оптимизацией Egress.
5. В `Project Settings → API` скопировать `Project URL` и серверный
   `service_role` key.

## 2. Настроить локальный сервер

Создать `.env.local` в корне проекта:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
LIVE_RELOAD=0
```

`service_role` нельзя помещать в клиентский JavaScript, публиковать или
коммитить. `.env.local` исключён из Git.

Перезапустить сервер:

```bash
npm run dev:plain
```

Проверить:

```text
http://localhost:3000/api/supabase-test
```

Ожидаемый статус: `connected` либо `configured_no_rows`.

## 3. Синхронизация проектов

После подключения приложение при старте:

1. синхронизирует только реестр проектов;
2. не загружает workspace всех проектов массово;
3. загружает полный workspace только при открытии конкретного проекта;
4. перед заменой локальных данных создаёт backup в `localStorage`;
5. перед облачной перезаписью предыдущая версия архивируется триггером в
   `guru_workspace_versions`;
6. обычное сохранение использует короткий RPC для проверки версии и запись;
7. полный GET перед записью выполняется только при конфликте.

Открыть `localhost:3000` и по очереди проверить SIVRCE, iCleaning и
«Коричное яблоко».

## 4. Настроить Vercel

Добавить те же две переменные в `Project Settings → Environment Variables`:

- `NEXT_PUBLIC_SUPABASE_URL`;
- `SUPABASE_SERVICE_ROLE_KEY`.

После добавления выполнить новый deploy. Переменные должны быть доступны
только серверным функциям.
