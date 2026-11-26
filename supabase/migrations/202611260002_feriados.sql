-- Etapa 2: calendário de feriados, por obra. Executar no ambiente de teste.
begin;
create table if not exists public.feriados (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras(id) on delete restrict,
  data date not null,
  nome text not null check (length(trim(nome)) between 2 and 160),
  criado_por uuid not null default auth.uid() references auth.users(id),
  criado_em timestamptz not null default now(),
  alterado_por uuid references auth.users(id),
  alterado_em timestamptz,
  excluido_em timestamptz
);
create unique index if not exists feriados_obra_data_ativos on public.feriados(obra_id,data) where excluido_em is null;
alter table public.feriados enable row level security;
revoke all on public.feriados from public, anon, authenticated;
grant select on public.feriados to authenticated;
grant insert (obra_id,data,nome) on public.feriados to authenticated;
grant update (data,nome,excluido_em) on public.feriados to authenticated;
drop policy if exists feriados_leitura on public.feriados;
create policy feriados_leitura on public.feriados for select to authenticated
using (excluido_em is null and public.usuario_tem_acesso(obra_id));
drop policy if exists feriados_insercao on public.feriados;
create policy feriados_insercao on public.feriados for insert to authenticated
with check (public.usuario_tem_perfil(obra_id,array['Administrador','Engenheiro']) and criado_por = auth.uid() and excluido_em is null);
drop policy if exists feriados_edicao on public.feriados;
create policy feriados_edicao on public.feriados for update to authenticated
using (excluido_em is null and public.usuario_tem_perfil(obra_id,array['Administrador','Engenheiro']))
with check (public.usuario_tem_perfil(obra_id,array['Administrador','Engenheiro']));
create or replace function public.feriados_atualizar_auditoria()
returns trigger language plpgsql set search_path = '' as $fn$
begin
  new.alterado_em := now();
  new.alterado_por := auth.uid();
  if new.excluido_em is not null and old.excluido_em is null then
    new.excluido_em := now();
  end if;
  return new;
end;
$fn$;
revoke all on function public.feriados_atualizar_auditoria() from public, anon, authenticated;
drop trigger if exists feriados_atualizacao on public.feriados;
create trigger feriados_atualizacao before update on public.feriados
for each row execute function public.feriados_atualizar_auditoria();
create or replace function public.feriados_registrar_auditoria()
returns trigger language plpgsql security definer set search_path = '' as $fn$
declare v_acao text; v_anterior jsonb;
begin
  v_acao := tg_op;
  if tg_op = 'UPDATE' then
    v_anterior := to_jsonb(old);
    if old.excluido_em is null and new.excluido_em is not null then v_acao := 'SOFT_DELETE'; end if;
  end if;
  insert into public.auditoria (obra_id, usuario_id, tabela, registro_id, acao, dados_anteriores, dados_novos)
  values (new.obra_id, auth.uid(), 'feriados', new.id::text, v_acao, v_anterior, to_jsonb(new));
  return new;
end;
$fn$;
revoke all on function public.feriados_registrar_auditoria() from public, anon, authenticated;
drop trigger if exists feriados_auditoria on public.feriados;
create trigger feriados_auditoria after insert or update on public.feriados
for each row execute function public.feriados_registrar_auditoria();
commit;
