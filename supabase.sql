-- Rode este SQL no Supabase: SQL Editor > New query > Run

create table if not exists public.leads (
  id text primary key,
  nome text not null,
  instagram text default '',
  segmento text default '',
  origem text default '',
  cargo text default '',
  stage text default 'aquecimento',
  telefone text default '',
  empresa text default '',
  followup text default '',
  notas text default '',
  "criadoEm" text,
  "fotoUrl" text default '',
  "analiseIA" text default '',
  "analiseCustomizadaIA" text default '',
  created_at timestamptz default now()
);

alter table public.leads enable row level security;

drop policy if exists "Usuários autenticados podem ler leads" on public.leads;
drop policy if exists "Usuários autenticados podem criar leads" on public.leads;
drop policy if exists "Usuários autenticados podem atualizar leads" on public.leads;
drop policy if exists "Usuários autenticados podem deletar leads" on public.leads;

create policy "Usuários autenticados podem ler leads"
on public.leads for select
to authenticated
using (true);

create policy "Usuários autenticados podem criar leads"
on public.leads for insert
to authenticated
with check (true);

create policy "Usuários autenticados podem atualizar leads"
on public.leads for update
to authenticated
using (true)
with check (true);

create policy "Usuários autenticados podem deletar leads"
on public.leads for delete
to authenticated
using (true);
