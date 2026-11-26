-- Sistema de Obras v2 | Estrutura inicial
-- Aplicar somente em projeto novo, após revisão. Não inserir dados reais no repositório.

begin;

create extension if not exists pgcrypto;

create table if not exists public.obras (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) between 2 and 160),
  cidade text,
  ativa boolean not null default true,
  criado_por uuid not null references auth.users(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.usuarios_obra (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras(id) on delete restrict,
  usuario_id uuid not null references auth.users(id) on delete restrict,
  perfil text not null check (perfil in ('Administrador','Engenheiro','Diretoria','Encarregado','Consulta')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (obra_id, usuario_id)
);

create table if not exists public.auditoria (
  id bigint generated always as identity primary key,
  obra_id uuid not null references public.obras(id) on delete restrict,
  usuario_id uuid references auth.users(id) on delete restrict,
  tabela text not null,
  registro_id text not null,
  acao text not null check (acao in ('INSERT','UPDATE','SOFT_DELETE','LOGIN','EXPORT')),
  dados_anteriores jsonb,
  dados_novos jsonb,
  criado_em timestamptz not null default now()
);

create table if not exists public.atalhos_usuario (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  obra_id uuid references public.obras(id) on delete cascade,
  modulo text not null,
  posicao integer not null default 0,
  criado_em timestamptz not null default now(),
  unique (usuario_id, obra_id, modulo)
);

create index if not exists idx_usuarios_obra_usuario on public.usuarios_obra(usuario_id, ativo);
create index if not exists idx_usuarios_obra_obra on public.usuarios_obra(obra_id, ativo);
create index if not exists idx_auditoria_obra_data on public.auditoria(obra_id, criado_em desc);
create index if not exists idx_atalhos_usuario on public.atalhos_usuario(usuario_id, obra_id, posicao);

create or replace function public.usuario_tem_acesso(p_obra uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.usuarios_obra u
    where u.obra_id = p_obra and u.usuario_id = (select auth.uid()) and u.ativo = true
      and exists (select 1 from public.obras o where o.id = p_obra and o.ativa)
  );
$$;

create or replace function public.usuario_tem_perfil(p_obra uuid, p_perfis text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.usuarios_obra u
    where u.obra_id = p_obra
      and u.usuario_id = (select auth.uid())
      and u.ativo = true
      and u.perfil = any(p_perfis)
      and exists (select 1 from public.obras o where o.id = p_obra and o.ativa)
  );
$$;

alter table public.obras enable row level security;
alter table public.usuarios_obra enable row level security;
alter table public.auditoria enable row level security;
alter table public.atalhos_usuario enable row level security;

-- Obras: somente membros ativos podem consultar.
drop policy if exists "obras_select_membros" on public.obras;
create policy "obras_select_membros" on public.obras
for select to authenticated
using (ativa and public.usuario_tem_acesso(id));

-- Vínculos: cada usuário vê seu próprio vínculo; administradores veem os vínculos da obra.
drop policy if exists "usuarios_obra_select" on public.usuarios_obra;
create policy "usuarios_obra_select" on public.usuarios_obra
for select to authenticated
using (
  usuario_id = (select auth.uid())
  or public.usuario_tem_perfil(obra_id, array['Administrador'])
);

drop policy if exists "usuarios_obra_insert_admin" on public.usuarios_obra;
create policy "usuarios_obra_insert_admin" on public.usuarios_obra
for insert to authenticated
with check (public.usuario_tem_perfil(obra_id, array['Administrador']));

drop policy if exists "usuarios_obra_update_admin" on public.usuarios_obra;
create policy "usuarios_obra_update_admin" on public.usuarios_obra
for update to authenticated
using (public.usuario_tem_perfil(obra_id, array['Administrador']))
with check (public.usuario_tem_perfil(obra_id, array['Administrador']));

-- Auditoria: gravação exclusivamente pelo banco; leitura restrita à gestão.
drop policy if exists "auditoria_insert_membro" on public.auditoria;

create or replace function public.registrar_auditoria_base()
returns trigger
language plpgsql
security definer
set search_path = ''
as $auditoria$
declare
  v_obra uuid;
  v_anterior jsonb;
  v_novo jsonb;
  v_acao text;
begin
  v_novo := to_jsonb(new);
  v_anterior := case when tg_op = 'UPDATE' then to_jsonb(old) else null end;
  v_obra := case when tg_table_name = 'obras' then new.id else (v_novo->>'obra_id')::uuid end;
  v_acao := case when tg_op = 'UPDATE' and v_anterior->>'ativo' = 'true' and v_novo->>'ativo' = 'false' then 'SOFT_DELETE' when tg_op = 'UPDATE' and v_anterior->>'ativa' = 'true' and v_novo->>'ativa' = 'false' then 'SOFT_DELETE' else tg_op end;
  insert into public.auditoria (obra_id, usuario_id, tabela, registro_id, acao, dados_anteriores, dados_novos)
  values (v_obra, (select auth.uid()), tg_table_name, new.id::text, v_acao, v_anterior, v_novo);
  return new;
end;
$auditoria$;
revoke all on function public.registrar_auditoria_base() from public, anon, authenticated;

drop trigger if exists auditoria_obras on public.obras;
create trigger auditoria_obras after insert or update on public.obras
for each row execute function public.registrar_auditoria_base();
drop trigger if exists auditoria_vinculos on public.usuarios_obra;
create trigger auditoria_vinculos after insert or update on public.usuarios_obra
for each row execute function public.registrar_auditoria_base();

drop policy if exists "auditoria_select_gestao" on public.auditoria;
create policy "auditoria_select_gestao" on public.auditoria
for select to authenticated
using (public.usuario_tem_perfil(obra_id, array['Administrador','Engenheiro','Diretoria']));

-- Atalhos são privados por usuário.
drop policy if exists "atalhos_select_proprio" on public.atalhos_usuario;
create policy "atalhos_select_proprio" on public.atalhos_usuario
for select to authenticated
using (usuario_id = (select auth.uid()));

drop policy if exists "atalhos_insert_proprio" on public.atalhos_usuario;
create policy "atalhos_insert_proprio" on public.atalhos_usuario
for insert to authenticated
with check (
  usuario_id = (select auth.uid())
  and (obra_id is null or public.usuario_tem_acesso(obra_id))
);

drop policy if exists "atalhos_update_proprio" on public.atalhos_usuario;
create policy "atalhos_update_proprio" on public.atalhos_usuario
for update to authenticated
using (usuario_id = (select auth.uid()))
with check (
  usuario_id = (select auth.uid())
  and (obra_id is null or public.usuario_tem_acesso(obra_id))
);

drop policy if exists "atalhos_delete_proprio" on public.atalhos_usuario;
create policy "atalhos_delete_proprio" on public.atalhos_usuario
for delete to authenticated
using (usuario_id = (select auth.uid()));

grant usage on schema public to authenticated;
grant select on public.obras, public.usuarios_obra, public.auditoria, public.atalhos_usuario to authenticated;
revoke all on public.obras, public.usuarios_obra, public.auditoria, public.atalhos_usuario from anon;
revoke insert, update, delete on public.obras, public.auditoria from authenticated;
revoke update, delete on public.usuarios_obra from authenticated;
grant insert on public.usuarios_obra to authenticated;
grant update (perfil, ativo) on public.usuarios_obra to authenticated;
grant insert, update, delete on public.atalhos_usuario to authenticated;
revoke all on function public.usuario_tem_acesso(uuid) from public, anon;
revoke all on function public.usuario_tem_perfil(uuid, text[]) from public, anon;
grant execute on function public.usuario_tem_acesso(uuid) to authenticated;
grant execute on function public.usuario_tem_perfil(uuid, text[]) to authenticated;

-- IMPORTANTE: o primeiro Administrador deve ser cadastrado manualmente pelo dono
-- no SQL Editor, após criar a conta em Authentication > Users. Consulte README.md.

commit;
