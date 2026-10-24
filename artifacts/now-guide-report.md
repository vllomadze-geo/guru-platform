# Проверка путеводителя «Сейчас»

Локальная сборка: `2.3.526+84bcd752a74c`. Команда `npm run build` прошла, 42 подключённых ресурса совпали с отпечатком сборки.

## Переходы и данные

- iCleaning: десять переходов, включая кнопки «Назад», «Далее» и «К текущему» для Gate 0 и Gate 7. У целевых блоков проверены раскрытие, видимость заголовка и класс подсветки. Экспорт до и после совпал побайтно, по 1 563 729 байт.
- Коричное яблоко: десять переходов по Gate 2 с кнопками «Назад» и «Далее». Экспорт до и после имеет одинаковые размер 22 258 055 байт и SHA-256 `d5e8b5f6e360c77ffa30210b98f8a5e9fb8341bf6ad73d8a7c025aefc48848c9`. Отдельный переход к карточке `card-2` Gate 0 подтвердил раскрытие, видимость заголовка и подсветку.
- Сравнение полных экспортов включает все поля `updated_at`. В копии iCleaning заполнение тестовой задачи изменило статус на «Готово» и выделило кнопку «Далее».
- Все изменения данных во время заполнения тестовой задачи выполнены только на изолированной копии.

## navigationReadiness

| Gate | iCleaning total/done | Коричное яблоко total/done |
| --- | ---: | ---: |
| 0 | 9/5 | 9/8 |
| 1 | 12/0 | 12/2 |
| 2 | 16/0 | 15/0 |
| 3 | 5/1 | 5/4 |
| 4 | 15/0 | 15/0 |
| 5 | 6/0 | 6/0 |
| 6 | 27/0 | 27/0 |
| 7 | 0/0 | 0/0 |
| 8 | 1/0 | 1/0 |
| Итого | 91/6 | 90/14 |

Число блоков пути и готовых блоков равно сумме `total` и `done` по `diagnostics.gates[gate].navigationReadiness` для обоих проектов. Подробности: [полная диагностика](now-guide-diagnostics-results.json), [общий smoke-тест](now-guide-smoke-results-combined.json), [адресный переход Коричного яблока](now-guide-korich-navigation-results.json).

## Скриншоты

- Карточки: [iCleaning](now-guide-icleaning.png), [Коричное яблоко](now-guide-korichnoe-yabloko.png).
- Переходы: [Gate 0](now-guide-icleaning-gate0.png), [Gate 2](now-guide-icleaning-gate2.png), [Gate 7](now-guide-icleaning-gate7.png).

## Прогоны

Без ошибок: `scripts/now-guide-smoke.mjs`, `scripts/gate-navigation-performance-smoke.mjs`, `scripts/gate2-service-block-smoke.mjs`, `scripts/gate2-setup-wizard-smoke.mjs`, `scripts/gate2-company-services-smoke.mjs`, `scripts/gate2-product-services-step4-smoke.mjs`, `scripts/gate1-company-unified-container-smoke.mjs`, проверка синтаксиса изменённых JavaScript-файлов и `npm run build`.

Изменённые файлы путеводителя и проверки: `app.js`, `now-guide.js`, `gate2-service-block.js`, `index.html`, `styles.css`, `scripts/now-guide-smoke.mjs`, `build-info.js`.

Не проверено: заполнение Gate 7 на Коричном яблоке, поскольку в исходной копии Gate 7 нет задач; ручной просмотр SIVRCE и ГУРУ; полный набор исторических smoke-тестов. `gate1-seo-central-smoke.mjs` содержит ожидания старой версии и старого распределения карточек. `export-diagnostics-smoke.mjs` и `gate0-product-scope-smoke.mjs` не завершились в тестовом Chrome; их успешность не заявляется.
