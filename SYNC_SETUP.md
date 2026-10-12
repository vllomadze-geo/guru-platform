# Настройка синхронизации GURU

## 1. Подготовить Supabase

1. Открыть проект Supabase.
2. Если таблиц ещё нет, в `SQL Editor` выполнить `supabase_workspace_setup.sql`.
3. Перед деплоем обновлённого API выполнить
   `supabase_workspace_egress_migration.sql`. Миграция добавит триггер
   `guru_workspaces_archive_version` и короткую функцию проверки
   `guru_workspace_write_metadata`, не меняя таблицы и RLS. Без неё новая
   версия API не отправит запись в облако; локальная копия останется доступна.
4. В `Project Settings → API` скопировать `Project URL` и серверный
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

## 3. Первый перенос проектов

После подключения приложение при старте:

1. объединит локальный и облачный реестры проектов;
2. загрузит полный workspace из Supabase только при открытии проекта;
3. сравнит даты локальной и облачной версий и сохранит более новую;
4. перед заменой локальных данных создаст backup в `localStorage`;
5. при облачной перезаписи триггер PostgreSQL сохранит предыдущую версию в
   `guru_workspace_versions` без скачивания через API;
6. не отправит автоматически пустой seed для карточки без workspace.

Открыть `localhost:3000`, дождаться статуса Supabase и по очереди проверить
SIVRCE, iCleaning и «Коричное яблоко».

## 4. Настроить Vercel

Добавить те же две переменные в `Project Settings → Environment Variables`:

- `NEXT_PUBLIC_SUPABASE_URL`;
- `SUPABASE_SERVICE_ROLE_KEY`.

После добавления выполнить новый deploy. Переменные должны быть доступны
только серверным функциям.
