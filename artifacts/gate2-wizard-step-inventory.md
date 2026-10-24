# Gate 2: 12 единиц, 67 шагов

| unitId | step_id | Текст шага | verification_type | source_url |
|---|---|---|---|---|
| domain | address | Укажите основной адрес сайта. | self_reported_action | документация платформы → URL сайта |
| domain | platform | Выберите платформу сайта. | self_reported_action | документация платформы → пусто |
| domain | provider | Укажите регистратора домена и провайдера размещения. | self_reported_action | документация платформы → пусто |
| domain | dns_source | Откройте настройки домена у провайдера и получите его DNS-записи. | self_reported_action | документация платформы → пусто |
| domain | dns_set | Добавьте полученные записи в панели DNS. Не используйте чужой IP или шаблон. | self_reported_action | документация платформы → пусто |
| domain | open | Проверьте открытие основного адреса. | self_reported_action | документация платформы → URL сайта |
| domain | https | Проверьте HTTPS и сертификат в браузере. | self_reported_action | документация платформы → URL сайта |
| domain | redirect | Проверьте перенаправления на основной адрес. | self_reported_action | документация платформы → URL сайта |
| counter | create | Откройте Метрику и создайте или выберите существующий счётчик. | self_reported_action | metrika |
| counter | id | Скопируйте ID счётчика в GURU. | self_reported_action | metrikaCheck |
| counter | install | Установите код на сайт и опубликуйте изменения. | self_reported_action | tildaMetrika / metrikaCheck |
| counter | check | В Метрике проверьте наличие счётчика на рабочем URL. | self_reported_action | metrikaCheck |
| counter | visit | Откройте сайт с _ym_debug=2 и убедитесь, что контрольный визит зарегистрирован. | self_reported_action | metrikaCheck |
| goal | action | Определите действие клиента: отправка заявки, заказ или другое событие. | self_reported_action | metrikaGoal |
| goal | add | Откройте Метрика → Цели → Добавить цель. | self_reported_action | metrika |
| goal | type | Выберите тип, который соответствует фактическому действию. | self_reported_action | metrikaEvent |
| goal | name | Сохраните название цели. | self_reported_action | metrikaGoal |
| goal | id | Сохраните ID цели. | self_reported_action | metrikaGoal |
| goal | test | Выполните реальное действие на сайте. | self_reported_action | metrikaGoal |
| goal | report | Проверьте срабатывание цели в отладке и отчёте Метрики. | self_reported_action | metrikaGoal |
| vk | account | Откройте VK Рекламу и выберите рекламный кабинет. | self_reported_action | vk |
| vk | pixel | Добавьте пиксель для домена в разделе сайтов. | self_reported_action | vk |
| vk | install | Установите код на сайт через поддерживаемую интеграцию. | self_reported_action | tildaVk / vk |
| vk | publish | Опубликуйте изменения сайта. | self_reported_action | tildaVk / vk |
| vk | visit | Проверьте тестовое посещение в кабинете VK. | self_reported_action | vk |
| crm | system | Выберите CRM или фактически используемый способ получения заявок. | self_reported_action | справка CRM → адрес CRM |
| crm | connect | Подключите формы сайта к выбранной системе. | self_reported_action | справка CRM → пусто |
| crm | fields | Проверьте передачу имени, контакта, источника и страницы обращения. | self_reported_action | справка CRM → пусто |
| crm | utm | Проверьте UTM и привязку к продукту, если эти данные доступны. | self_reported_action | справка CRM → пусто |
| crm | send | Отправьте тестовую заявку. | self_reported_action | справка CRM → пусто |
| crm | receive | Убедитесь, что обращение получено и сохранено. | self_reported_action | справка CRM → пусто |
| webmaster | open | Откройте Яндекс Вебмастер и добавьте сайт или выберите существующий. | self_reported_action | webmaster |
| webmaster | rights | Подтвердите права на сайт доступным способом. | self_reported_action | webmaster |
| webmaster | robots | Проверьте robots.txt в анализаторе. | self_reported_action | robots |
| webmaster | sitemap | Найдите sitemap.xml и передайте его в Вебмастер, если используется. | self_reported_action | sitemap |
| webmaster | pages | Проверьте доступность важных коммерческих страниц для робота. | self_reported_action | webmaster |
| safety | https | Проверьте HTTPS на рабочем сайте. | self_reported_action | пусто |
| safety | policy | Откройте опубликованную политику обработки данных. | self_reported_action | URL политики из Gate 0 или пусто |
| safety | consent | Проверьте необходимые согласия и уведомления в формах. | self_reported_action | пусто |
| safety | spam | Проверьте защиту форм от спама. | self_reported_action | пусто |
| safety | test | Отправьте тестовую заявку и проверьте получение. | self_reported_action | пусто |
| landing | route | Выберите маршрут трафика: сайт, мессенджер или нативная лид-форма. | self_reported_action | пусто |
| landing | url | Укажите адрес маршрута выбранного продукта. | self_reported_action | URL продукта или пусто |
| landing | open | Откройте адрес и проверьте доступность. | self_reported_action | URL продукта или пусто |
| landing | mobile | Проверьте отображение на телефоне. | self_reported_action | URL продукта или пусто |
| landing | cta | Проверьте основной призыв к действию. | self_reported_action | URL продукта или пусто |
| landing | action | Выполните предусмотренное действие клиента. | self_reported_action | URL продукта или пусто |
| productCounter | inherit | Сверьте ID общего счётчика с настройками компании. | self_reported_action | metrikaCheck |
| productCounter | open | Откройте страницу выбранного продукта. | self_reported_action | metrikaCheck |
| productCounter | code | Проверьте наличие счётчика на странице. | self_reported_action | metrikaCheck |
| productCounter | visit | Выполните контрольный визит. | self_reported_action | metrikaCheck |
| productCounter | report | Подтвердите регистрацию визита в Метрике. | self_reported_action | metrikaCheck |
| productGoal | action | Укажите основное целевое действие продукта. | self_reported_action | metrikaGoal |
| productGoal | select | Выберите существующую цель компании. | self_reported_action | metrikaGoal |
| productGoal | id | Сверьте ID привязанной цели с Метрикой. | self_reported_action | metrika |
| productGoal | test | Выполните реальное тестовое действие. | self_reported_action | metrikaGoal |
| productGoal | report | Проверьте регистрацию конверсии. | self_reported_action | metrikaGoal |
| productVk | inherit | Сверьте пиксель с настройками компании. | self_reported_action | vk |
| productVk | event | Укажите нужное событие: заявка, покупка или другое. | self_reported_action | vk |
| productVk | install | Настройте передачу события через сайт или поддерживаемую интеграцию. | self_reported_action | tildaVk / vk |
| productVk | test | Выполните тестовое действие. | self_reported_action | vk |
| productVk | report | Проверьте регистрацию события в кабинете VK. | self_reported_action | vk |
| lead | open | Откройте страницу или другой целевой маршрут продукта. | self_reported_action | пусто |
| lead | action | Выполните действие клиента. | self_reported_action | пусто |
| lead | receive | Проверьте получение обращения. | self_reported_action | пусто |
| lead | source | Проверьте источник и привязку к выбранному продукту. | self_reported_action | пусто |
| lead | compare | Сверьте событие в аналитике с фактическим обращением. | self_reported_action | пусто |

`source_url` вычисляется при отметке шага: сперва ссылка из `g2wDocForStep`, затем адрес из `g2wOpenUrl`, иначе пустая строка. В таблице символьные значения соответствуют URL из `G2W_DOC` в `gate2-setup-wizard.js`: `metrika` = `https://metrika.yandex.ru/`, `metrikaCheck` = `https://yandex.ru/support/metrica/ru/general/check-counter`, `metrikaGoal` = `https://yandex.ru/support/metrica/ru/general/check-goal.html`, `metrikaEvent` = `https://www.yandex.ru/support/metrica/ru/general/goal-js-event`, `vk` = `https://ads.vk.com/`, `webmaster` = `https://webmaster.yandex.ru/`, `robots` = `https://yandex.ru/support/webmaster/ru/indexing-options/robots-txt-analyzer`, `sitemap` = `https://yandex.ru/support/webmaster/ru/controlling-robot/sitemap`, `tildaMetrika` = `https://help-ru.tilda.cc/statistics/yandex-metrika`, `tildaVk` = `https://help-ru.tilda.cc/vk-pixel`. Для `domain` сначала используется документация выбранной платформы (Tilda, WordPress, Vercel) или настроенный `hostingDocsUrl`; если документации нет, адрес сайта ставится только для `address`, `open`, `https`, `redirect`, иначе пусто. Для `crm` сначала используется справка выбранной CRM (Битрикс24, amoCRM) или `crmDocsUrl`; если её нет, `system` использует адрес выбранной CRM, остальные шаги остаются без URL. `verification_type` в отмеченном шаге всегда `self_reported_action`; отдельные автоматические проверки URL хранятся в `record.auto` с типом `automatic`.
