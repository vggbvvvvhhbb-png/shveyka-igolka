# Shveyka 🧵

MVP-помощник по шитью на швейной машине Brother LS-200s.
Каталог тканей, швов, проектов с подсказками по настройкам.

## Стек
- pnpm workspaces
- apps/web — Next.js 15 (App Router)
- packages/core — типы и Zod-валидаторы
- packages/db — Drizzle ORM + Supabase Postgres

## Локальный запуск

pnpm install
pnpm db:push
pnpm seed
pnpm dev
