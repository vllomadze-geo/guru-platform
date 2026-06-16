# ГУРУ, v1.0 Supabase connection test

## Что изменено

- Видимая версия интерфейса поднята до `v1.0`.
- Добавлен индикатор подключения Supabase в верхней части рабочего интерфейса.
- Добавлена serverless-функция Vercel: `api/supabase-test.js`.
- Функция проверяет переменные Vercel:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Функция пробует прочитать таблицу `guru_projects`.
- Логика Gate 0–7 не изменялась.

## Возможные статусы

- `Supabase: подключено` — сайт видит Supabase и таблицу `guru_projects`.
- `Supabase: подключено, строк не видно` — подключение есть, но ключ не видит строку проекта, чаще всего из-за RLS.
- `Supabase: подключено, доступ закрыт RLS` — база доступна, но политики безопасности закрывают чтение.
- `Supabase: переменные не найдены` — в Vercel не добавлены переменные окружения.
- `Supabase: функция недоступна` — serverless-функция `/api/supabase-test` не задеплоилась.

## Как обновить

Загрузить в GitHub содержимое папки `guru_platform_v1_0_supabase_test`:

```text
README.md
app.js
styles.css
index.html
seed-data.js
supabase-test.js
api/
data/
```

Commit:

```text
Update to v1.0: add Supabase connection test
```

После деплоя открыть production-сайт и проверить статус Supabase.
