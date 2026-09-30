# Своя игра 🍁

Сайт, где любой человек без регистрации собирает игру «Своя игра» (темы, вопросы, цены) и играет в неё на одном экране. Игры сохраняются в архив своей группы: ДКС, ДКП-1 или ДКП-2.

## Стек
React + TypeScript + Vite, Supabase (база данных), Netlify (хостинг).

## Запуск
```
npm install
npm run dev
```
Переменные окружения (необязательно, значения по умолчанию уже в коде):
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — см. `.env.example`.

## Деплой на Netlify
1. Netlify → Add new site → Import from GitHub → выбрать этот репозиторий.
2. Build command: `npm run build`, publish directory: `dist` (уже прописано в `netlify.toml`).
3. Deploy.

## База данных
Таблица `public.games` (group_code: dks / dkp1 / dkp2, title, author, board jsonb). RLS: читать и добавлять может любой, изменять и удалять нельзя.
