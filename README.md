# Beatitud CRM - versão corrigida para StackBlitz

Esta versão evita dependências `latest`, porque o StackBlitz pode quebrar com algumas versões novas do Vite/Rolldown.

## Rodar no StackBlitz

1. Crie um projeto Vite + React + TypeScript.
2. Arraste os arquivos desta pasta para o StackBlitz.
3. Crie um arquivo `.env` com:

```env
VITE_SUPABASE_URL=SUA_URL_DO_SUPABASE
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA_DO_SUPABASE
```

4. No terminal rode:

```bash
npm install
npm run dev
```

## Supabase

No Supabase, rode o arquivo `supabase.sql` no SQL Editor e crie seu usuário em Authentication > Users.

Nunca use a chave `service_role` no front-end.
