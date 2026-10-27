# Деплой на сервер

Сайт живёт на VPS (`shveyka-igolka.ru`, Caddy с авто-HTTPS). Контейнеры
поднимает `docker compose`: `web` — сайт, `bot` — Telegram-бот, `caddy` —
обратный прокси.

## Как это работает сейчас

`push` в `main` → GitHub Actions (`.github/workflows/deploy.yml`) подключается
к серверу по SSH и делает:

1. `git pull` в каталоге с репозиторием;
2. `docker compose build web bot` — образы собираются, старые контейнеры
   продолжают работать;
3. `docker compose run --rm web pnpm db:migrate` — схема БД обновляется
   **до** старта нового кода;
4. `docker compose up -d web bot` — переключение на новые образы;
5. проверка healthcheck: если контейнер не поздоровался за минуту, деплой
   падает и в лог уходят последние 50 строк.

Ручной деплой не нужен: тот же процесс запускается кнопкой **Run workflow**
в разделе Actions.

## Настройка (один раз)

### На сервере

Каталог с репозиторием и `.env` должны лежать на сервере. Проверить:

```bash
docker compose ls          # где лежат compose-файлы
ls /opt/shveyka            # или где там репозиторий
cat /opt/shveyka/.env      # DATABASE_URL, NEXT_PUBLIC_SITE_URL, ключи AI
```

В `.env` обязательно:

| Переменная             | Зачем                                                    |
| ---------------------- | -------------------------------------------------------- |
| `DATABASE_URL`         | база Supabase                                            |
| `NEXT_PUBLIC_SITE_URL` | `https://shveyka-igolka.ru` — sitemap, robots, canonical |
| `AI_PROVIDER` + ключ   | провайдер ответа (`relay` + `RELAY_API_KEY`)             |
| `OWNER_KEY`            | необязательно: пусто — личные страницы открыты всем      |

Для бота отдельно `apps/bot/.env` с `BOT_TOKEN`.

### Ключ для CI

CI заходит на сервер по ключу. Ключ создаётся один раз:

```bash
ssh-keygen -t ed25519 -C shveyka-deploy -f ~/.ssh/shveyka_deploy
cat ~/.ssh/shveyka_deploy.pub
```

Публичный ключ добавляется на сервер:

```bash
echo "ssh-ed25519 AAAA... shveyka-deploy" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Приватный ключ (`~/.ssh/shveyka_deploy`, без `.pub`) кладётся в GitHub:
**Settings → Secrets and variables → Actions → New repository secret**,
имя `DEPLOY_SSH_KEY`, значение — всё содержимое файла целиком.

### Переменные GitHub

Там же, во вкладке **Variables**, добавляются:

| Имя           | Значение               | Пример          |
| ------------- | ---------------------- | --------------- |
| `DEPLOY_HOST` | адрес сервера          | `77.221.140.72` |
| `DEPLOY_USER` | пользователь для входа | `root`          |
| `DEPLOY_PATH` | каталог с репозиторием | `/opt/shveyka`  |

Пока `DEPLOY_HOST` или `DEPLOY_SSH_KEY` не заданы, шаг деплоя **пропускается**
без ошибки — репозиторий можно пушить, не поднимая сайт.

## Ключ сервера закреплён в workflow

В `deploy.yml` прописан публичный ключ сервера (`ssh-ed25519`). Если сервер
переедет или ключ сменится — деплой перестанет подключаться, и ключ надо
обновить вручную в файле workflow.

## Если деплой не прошёл

Посмотреть состояние на сервере:

```bash
cd /opt/shveyka
docker compose ps
docker compose logs --tail 100 web
```

Откатиться на предыдущий коммит:

```bash
cd /opt/shveyka
git log --oneline -5
git checkout <нужный-коммит>
docker compose up -d --build web bot
```

## Отдельно о схеме БД

`pnpm db:migrate` применяет файлы из `packages/db/migrations` по порядку и
помечает применённые в таблице `drizzle.__drizzle_migrations`. Файлы
написаны идемпотентно (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT
EXISTS`), поэтому повторный запуск на уже применённой базе ничего не ломает.

Локальная разработка по-прежнему может пользоваться `pnpm db:push` — он
сравнивает схему с базой и приводит её к состоянию из кода.
