#!/usr/bin/env bash
# Уборка после этапа 11: мёртвая зависимость и мусор в рабочем дереве.
# Идемпотентно — можно запускать повторно.
set -euo pipefail

pnpm --filter @shveyka/db remove -D pg-mem 2>/dev/null || echo "pg-mem уже удалён"
rm -rf .temp
echo "Готово: pg-mem удалён, .temp/ очищен."
