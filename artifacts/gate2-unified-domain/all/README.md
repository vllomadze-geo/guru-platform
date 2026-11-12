# Gate 2 · Единый шаблон блоков

Снимки сделаны в изолированном проекте на основе экспортированных данных. Каждый файл показывает верх блока и первые шаги; длинные блоки продолжаются ниже.

| Блок | Десктоп | 390 px |
| --- | --- | --- |
| Домен и HTTPS · Компания | [Снимок](desktop/company-domain.png) | [Снимок](mobile/company-domain.png) |
| Яндекс Метрика · счётчик · Компания | [Снимок](desktop/wizard-counter.png) | [Снимок](mobile/wizard-counter.png) |
| Яндекс Метрика · конверсионная цель · Компания | [Снимок](desktop/wizard-goal.png) | [Снимок](mobile/wizard-goal.png) |
| Яндекс Вебмастер · Компания | [Снимок](desktop/company-webmaster.png) | [Снимок](mobile/company-webmaster.png) |
| Яндекс Бизнес · Компания | [Снимок](desktop/company-yandex-business.png) | [Снимок](mobile/company-yandex-business.png) |
| Яндекс Директ · Компания | [Снимок](desktop/company-yandex-direct.png) | [Снимок](mobile/company-yandex-direct.png) |
| VK Реклама и пиксель · Компания | [Снимок](desktop/company-vk.png) | [Снимок](mobile/company-vk.png) |
| Telegram Ads · Компания | [Снимок](desktop/company-telegram-ads.png) | [Снимок](mobile/company-telegram-ads.png) |
| Meta Ads · Компания | [Снимок](desktop/company-meta-ads.png) | [Снимок](mobile/company-meta-ads.png) |
| Google Analytics 4 · Компания | [Снимок](desktop/company-ga4.png) | [Снимок](mobile/company-ga4.png) |
| Google Search Console · Компания | [Снимок](desktop/company-gsc.png) | [Снимок](mobile/company-gsc.png) |
| Google Ads · конверсии · Компания | [Снимок](desktop/company-google-ads.png) | [Снимок](mobile/company-google-ads.png) |
| Приём заявок · Компания | [Снимок](desktop/company-leads.png) | [Снимок](mobile/company-leads.png) |
| Юридическая защита · Компания | [Снимок](desktop/company-safety.png) | [Снимок](mobile/company-safety.png) |
| Посадочная товара · Продукт/Услуга | [Снимок](desktop/product-landing.png) | [Снимок](mobile/product-landing.png) |
| Яндекс Метрика · счётчик · Продукт/Услуга | [Снимок](desktop/product-counter.png) | [Снимок](mobile/product-counter.png) |
| Яндекс Метрика · цель · Продукт/Услуга | [Снимок](desktop/product-goal.png) | [Снимок](mobile/product-goal.png) |
| VK Реклама и пиксель · Продукт/Услуга | [Снимок](desktop/product-vk.png) | [Снимок](mobile/product-vk.png) |
| Приём заявок · Продукт/Услуга | [Снимок](desktop/product-lead.png) | [Снимок](mobile/product-lead.png) |
| Метрика · контрольный визит | [Снимок](desktop/panel-g2-metrika-goals-traffic.png) | [Снимок](mobile/panel-g2-metrika-goals-traffic.png) |
| Метрика · звонки | [Снимок](desktop/panel-g2-metrika-goals-calls.png) | [Снимок](mobile/panel-g2-metrika-goals-calls.png) |
| Метрика · email заявки | [Снимок](desktop/panel-g2-metrika-goals-email.png) | [Снимок](mobile/panel-g2-metrika-goals-email.png) |
| Метрика · виджеты | [Снимок](desktop/panel-g2-metrika-goals-widgets.png) | [Снимок](mobile/panel-g2-metrika-goals-widgets.png) |
| Метрика · KPI | [Снимок](desktop/panel-g2-metrika-goals-kpi.png) | [Снимок](mobile/panel-g2-metrika-goals-kpi.png) |
| Метрика · счётчик компании | [Снимок](desktop/panel-g2-metrika-company-counter.png) | [Снимок](mobile/panel-g2-metrika-company-counter.png) |
| Метрика · цели компании | [Снимок](desktop/panel-g2-metrika-company-goals.png) | [Снимок](mobile/panel-g2-metrika-company-goals.png) |
| Метрика · фильтр внутренних визитов | [Снимок](desktop/panel-g2-metrika-company-internal-filter.png) | [Снимок](mobile/panel-g2-metrika-company-internal-filter.png) |
| Метрика · учёт роботов | [Снимок](desktop/panel-g2-metrika-company-robots.png) | [Снимок](mobile/panel-g2-metrika-company-robots.png) |
| Метрика · визит продукта | [Снимок](desktop/panel-g2-metrika-product-counter.png) | [Снимок](mobile/panel-g2-metrika-product-counter.png) |
| Метрика · главная цель продукта | [Снимок](desktop/panel-g2-metrika-goals-primary.png) | [Снимок](mobile/panel-g2-metrika-goals-primary.png) |
| Метрика · дополнительные цели продукта | [Снимок](desktop/panel-g2-metrika-product-goals.png) | [Снимок](mobile/panel-g2-metrika-product-goals.png) |

## Изменения

- Все 19 действующих блоков со шагами используют общий шаблон номера, статуса, поля и раскрываемой инструкции. Старые двухколоночный сервисный шаблон, отдельные кнопки «Выполнено» и их стили удалены.
- Ещё 12 проверок Метрики используют общий заголовок блока и один столбец полей. У них нет нумерованных шагов, поэтому кружки и счётчик шагов к ним не добавлены.
- Ранее сохранённые карточки в «Связанных настройках» оставлены с их прежними полями; это исторические вложенные данные, а не самостоятельные шаговые блоки.
- Схема хранения и ключи `product_id`, `g2SetupWizardV1`, `metrikaQualityV360`, `metrikaCompanyV374`, `metrikaProductV367` не менялись.

## Проверка

- Изолированная копия экспорта проекта iCleaning: 31 блок, совпадение статусов с существующими расчётами, все 19 наборов шагов, отсутствие старой двухколоночной разметки, 390 px без прокрутки страницы по горизонтали.
- Проверены ручная отметка шага, запись и восстановление ID счётчика, поля аудита Метрики и главного действия продукта; исходные значения после проверки восстановлены в тестовой копии. Ошибок JavaScript нет.
- Светлая и тёмная темы проверены на шаговом блоке; сборка и проверка цветовой политики проходят. Сделано 31 снимок на десктопе и 31 на 390 px.

## Существующие дубли и границы проверки

- Сохранены прежние отдельные поля номера счётчика и цели в мастере настройки и в реестре Метрики компании. Адреса домена и посадочной страницы также остаются в исторических карточках наряду с источником «Платформа».
- Живые данные проекта «Коричное яблоко», внешние сервисы и Safari в этом прогоне не проверялись. Снимки показывают верх каждого блока; длинные блоки продолжаются ниже.
