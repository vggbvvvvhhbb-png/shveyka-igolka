#!/bin/bash
# Обновление выкладки Shveyka на сервере.
#
# Использование (из папки с архивом исходников):
#   ./deploy.sh head.tar.gz
#
# Скрипт распаковывает архив, пересобирает образ и перезапускает стек.
set -euo pipefail

APP_DIR="/opt/shveyka"
ARCHIVE="${1:-$APP_DIR/head.tar.gz}"

cd "$APP_DIR"

echo "==> Распаковка $ARCHIVE"
tar xzf "$ARCHIVE"

echo "==> Пересборка образа"
docker compose build --progress plain

echo "==> Перезапуск стека"
docker compose up -d

echo "==> Статус"
docker compose ps

echo "==> Готово: http://$(hostname -I | awk '{print $1}')/"
