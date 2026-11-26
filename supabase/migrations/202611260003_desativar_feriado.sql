-- Etapa 2: desativação lógica autorizada de feriados, preservando a auditoria.
begin;

create or replace function public.desativar_feriado(p_obra uuid, p_feriado uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $func$
declare v_linhas integer;
begin
  if auth.uid() is null or not public.usuario_tem_perfil(
    p_obra, array['Administrador', 'Engenheiro']::text[]
  ) then
    raise exception 'Operação não autorizada.' using errcode = '42501';
  end if;

  update public.feriados
  set excluido_em = now()
  where id = p_feriado
    and obra_id = p_obra
    and excluido_em is null;

  get diagnostics v_linhas = row_count;
  if v_linhas <> 1 then
    raise exception 'Registro indisponível.' using errcode = 'P0002';
  end if;
end;
$func$;

revoke all on function public.desativar_feriado(uuid, uuid) from public, anon, authenticated;
grant execute on function public.desativar_feriado(uuid, uuid) to authenticated;
revoke update (excluido_em) on public.feriados from authenticated;
commit;
