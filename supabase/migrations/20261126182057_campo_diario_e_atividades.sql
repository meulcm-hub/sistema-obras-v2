-- Campo: diário por obra, atividades do cronograma e revisão transacional.
create table public.cronograma (
 id uuid primary key default gen_random_uuid(),
 obra_id uuid not null references public.obras(id) on delete restrict,
 etapa text not null default '',
 atividade text not null check(length(trim(atividade)) between 2 and 180),
 responsavel text,
 inicio_fixo date,
 duracao integer check(duracao is null or duracao > 0),
 percentual numeric(5,2) not null default 0 check(percentual between 0 and 100),
 observacoes text,
 criado_por uuid not null references auth.users(id),
 criado_em timestamptz not null default now(),
 alterado_em timestamptz, alterado_por uuid references auth.users(id), excluido_em timestamptz,
 unique(obra_id,id)
);
create index cronograma_obra_ativo on public.cronograma(obra_id) where excluido_em is null;
create table public.diario (
 id uuid primary key default gen_random_uuid(),
 obra_id uuid not null references public.obras(id) on delete restrict,
 data date not null,
 clima_manha text not null check(clima_manha in ('Sol','Nublado','Chuva','Não informado')),
 clima_tarde text not null check(clima_tarde in ('Sol','Nublado','Chuva','Não informado')),
 pedreiros integer not null default 0 check(pedreiros between 0 and 10000),
 serventes integer not null default 0 check(serventes between 0 and 10000),
 carpinteiros integer not null default 0 check(carpinteiros between 0 and 10000),
 armadores integer not null default 0 check(armadores between 0 and 10000),
 bombeiros integer not null default 0 check(bombeiros between 0 and 10000),
 eletricistas integer not null default 0 check(eletricistas between 0 and 10000),
 terceiros integer not null default 0 check(terceiros between 0 and 10000),
 equipamentos text not null default '' check(length(equipamentos)<=4000),
 ocorrencias text not null default '' check(length(ocorrencias)<=10000),
 produtivo boolean not null default true,
 ultima_operacao uuid not null,
 criado_por uuid not null default auth.uid() references auth.users(id),
 criado_em timestamptz not null default now(),
 alterado_em timestamptz, alterado_por uuid references auth.users(id), excluido_em timestamptz,
 unique(obra_id,id)
);
create unique index diario_obra_data_ativo on public.diario(obra_id,data) where excluido_em is null;
create index diario_obra_data on public.diario(obra_id,data desc);
create table public.diario_servicos (
 id uuid primary key default gen_random_uuid(),
 obra_id uuid not null references public.obras(id) on delete restrict,
 diario_id uuid not null,
 atividade_id uuid not null,
 revisao uuid not null,
 criado_por uuid not null default auth.uid() references auth.users(id),
 criado_em timestamptz not null default now(),
 foreign key (obra_id,diario_id) references public.diario(obra_id,id) on delete restrict,
 foreign key (obra_id,atividade_id) references public.cronograma(obra_id,id) on delete restrict,
 unique(diario_id,revisao,atividade_id)
);
create index diario_servicos_obra_idx on public.diario_servicos(obra_id,diario_id,revisao);
create index diario_servicos_atividade_idx on public.diario_servicos(obra_id,atividade_id);
alter table public.cronograma enable row level security;
alter table public.diario enable row level security;
alter table public.diario_servicos enable row level security;
revoke all on public.cronograma,public.diario,public.diario_servicos from public,anon,authenticated;
grant select on public.cronograma,public.diario,public.diario_servicos to authenticated;
grant insert(id,obra_id,data,clima_manha,clima_tarde,pedreiros,serventes,carpinteiros,armadores,bombeiros,eletricistas,terceiros,equipamentos,ocorrencias,produtivo,ultima_operacao) on public.diario to authenticated;
grant update(data,clima_manha,clima_tarde,pedreiros,serventes,carpinteiros,armadores,bombeiros,eletricistas,terceiros,equipamentos,ocorrencias,produtivo,ultima_operacao,excluido_em) on public.diario to authenticated;
grant insert(obra_id,diario_id,atividade_id,revisao) on public.diario_servicos to authenticated;
create policy cronograma_leitura on public.cronograma for select to authenticated using (public.usuario_tem_acesso(obra_id) and excluido_em is null);
create policy diario_leitura on public.diario for select to authenticated using (
 public.usuario_tem_acesso(obra_id) and (excluido_em is null or public.usuario_tem_perfil(obra_id,array['Administrador','Engenheiro','Encarregado']))
);
create policy diario_insercao on public.diario for insert to authenticated with check (
 public.usuario_tem_perfil(obra_id,array['Administrador','Engenheiro','Encarregado']) and criado_por=(select auth.uid()) and excluido_em is null
);
create policy diario_edicao on public.diario for update to authenticated
using(excluido_em is null and public.usuario_tem_perfil(obra_id,array['Administrador','Engenheiro','Encarregado']))
with check(public.usuario_tem_perfil(obra_id,array['Administrador','Engenheiro','Encarregado']));
create policy diario_servicos_leitura on public.diario_servicos for select to authenticated using (
 public.usuario_tem_acesso(obra_id) and exists(select 1 from public.diario d where d.id=diario_id and d.obra_id=diario_servicos.obra_id and d.ultima_operacao=revisao and d.excluido_em is null)
);
create policy diario_servicos_insercao on public.diario_servicos for insert to authenticated with check (
 public.usuario_tem_perfil(obra_id,array['Administrador','Engenheiro','Encarregado']) and criado_por=(select auth.uid())
 and exists(select 1 from public.diario d where d.id=diario_id and d.obra_id=diario_servicos.obra_id and d.ultima_operacao=revisao and d.excluido_em is null)
 and exists(select 1 from public.cronograma c where c.id=atividade_id and c.obra_id=diario_servicos.obra_id and c.excluido_em is null)
);
create function public.campo_marcar_alteracao() returns trigger language plpgsql set search_path='' as $fn$
begin new.alterado_em:=now(); new.alterado_por:=auth.uid();
if new.excluido_em is not null and old.excluido_em is null then new.excluido_em:=now(); end if;
return new; end;
$fn$;
revoke all on function public.campo_marcar_alteracao() from public,anon,authenticated;
create trigger diario_alteracao before update on public.diario for each row execute function public.campo_marcar_alteracao();
create trigger cronograma_alteracao before update on public.cronograma for each row execute function public.campo_marcar_alteracao();
create schema if not exists private;
create function private.campo_auditoria() returns trigger language plpgsql security definer set search_path='' as $fn$
declare v_acao text:=tg_op; v_old jsonb;
begin
 if tg_op='UPDATE' then v_old:=to_jsonb(old); if (v_old->>'excluido_em') is null and (to_jsonb(new)->>'excluido_em') is not null then v_acao:='SOFT_DELETE'; end if; end if;
 insert into public.auditoria(obra_id,usuario_id,tabela,registro_id,acao,dados_anteriores,dados_novos)
 values(new.obra_id,auth.uid(),tg_table_name,new.id::text,v_acao,v_old,to_jsonb(new));
 return new;
end;
$fn$;
revoke all on function private.campo_auditoria() from public,anon,authenticated;
create trigger diario_audit after insert or update on public.diario for each row execute function private.campo_auditoria();
create trigger cronograma_audit after insert or update on public.cronograma for each row execute function private.campo_auditoria();
create trigger diario_servicos_audit after insert on public.diario_servicos for each row execute function private.campo_auditoria();
create function public.salvar_diario(p_obra uuid,p_id uuid,p_revisao uuid,p_operacao uuid,p_dados jsonb,p_servicos uuid[])
returns uuid language plpgsql security invoker set search_path='' as $fn$
declare atual uuid; v_linhas integer;
begin
 if auth.uid() is null or not public.usuario_tem_perfil(p_obra,array['Administrador','Engenheiro','Encarregado']) then raise exception 'Operação não autorizada.' using errcode='42501'; end if;
 if p_id is null or p_operacao is null or p_dados is null or coalesce(cardinality(p_servicos),0)>200 then raise exception 'Dados inválidos.' using errcode='22023'; end if;
 select d.ultima_operacao into atual from public.diario d where d.id=p_id and d.obra_id=p_obra and d.excluido_em is null for update;
 if atual = p_operacao then return p_id; end if;
 if atual is distinct from p_revisao then raise exception 'Registro alterado por outro usuário. Atualize antes de salvar.' using errcode='40001'; end if;
 if exists(select 1 from unnest(coalesce(p_servicos,array[]::uuid[])) s(id) where not exists(select 1 from public.cronograma c where c.id=s.id and c.obra_id=p_obra and c.excluido_em is null)) then raise exception 'Atividade inválida para esta obra.' using errcode='22023'; end if;
 if atual is null then
  insert into public.diario(id,obra_id,data,clima_manha,clima_tarde,pedreiros,serventes,carpinteiros,armadores,bombeiros,eletricistas,terceiros,equipamentos,ocorrencias,produtivo,ultima_operacao)
  values(p_id,p_obra,(p_dados->>'data')::date,p_dados->>'clima_manha',p_dados->>'clima_tarde',coalesce((p_dados->>'pedreiros')::int,0),coalesce((p_dados->>'serventes')::int,0),coalesce((p_dados->>'carpinteiros')::int,0),coalesce((p_dados->>'armadores')::int,0),coalesce((p_dados->>'bombeiros')::int,0),coalesce((p_dados->>'eletricistas')::int,0),coalesce((p_dados->>'terceiros')::int,0),coalesce(p_dados->>'equipamentos',''),coalesce(p_dados->>'ocorrencias',''),coalesce((p_dados->>'produtivo')::bool,true),p_operacao);
 else
  update public.diario set data=(p_dados->>'data')::date,clima_manha=p_dados->>'clima_manha',clima_tarde=p_dados->>'clima_tarde',pedreiros=coalesce((p_dados->>'pedreiros')::int,0),serventes=coalesce((p_dados->>'serventes')::int,0),carpinteiros=coalesce((p_dados->>'carpinteiros')::int,0),armadores=coalesce((p_dados->>'armadores')::int,0),bombeiros=coalesce((p_dados->>'bombeiros')::int,0),eletricistas=coalesce((p_dados->>'eletricistas')::int,0),terceiros=coalesce((p_dados->>'terceiros')::int,0),equipamentos=coalesce(p_dados->>'equipamentos',''),ocorrencias=coalesce(p_dados->>'ocorrencias',''),produtivo=coalesce((p_dados->>'produtivo')::bool,true),ultima_operacao=p_operacao
  where id=p_id and obra_id=p_obra and ultima_operacao=p_revisao and excluido_em is null;
  get diagnostics v_linhas=row_count;
  if v_linhas<>1 then raise exception 'Registro não disponível.' using errcode='40001'; end if;
 end if;
 insert into public.diario_servicos(obra_id,diario_id,atividade_id,revisao)
 select distinct p_obra,p_id,s.id,p_operacao from unnest(coalesce(p_servicos,array[]::uuid[])) s(id);
 return p_id;
end;
$fn$;
revoke all on function public.salvar_diario(uuid,uuid,uuid,uuid,jsonb,uuid[]) from public,anon,authenticated;
grant execute on function public.salvar_diario(uuid,uuid,uuid,uuid,jsonb,uuid[]) to authenticated;
