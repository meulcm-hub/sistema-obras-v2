import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from './lib/supabase'
import type { ModuleDef } from './modules'
import { canEditModule } from './modules'

type Row = { id: string; data: string; nome: string }
type Props = { module: ModuleDef; obraId: string; perfil: string }
const dateLabel = (value: string) => value.split('-').reverse().join('/')
export function ModuleScreen({ module, obraId, perfil }: Props) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [available, setAvailable] = useState(false)
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [editing, setEditing] = useState<Row | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [date, setDate] = useState('')
  const [name, setName] = useState('')
  const editable = canEditModule(module.id, perfil)
  async function load() {
    if (!supabase || !module.ready) { setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase.from('feriados').select('id,data,nome').eq('obra_id', obraId).is('excluido_em', null).order('data')
    if (error) {
      setRows([]); setAvailable(false)
      setMessage('Não foi possível carregar os feriados. Confira se a migração da Etapa 2 foi aplicada e se seu acesso está autorizado.')
    } else {
      setRows(data ?? []); setAvailable(true); setMessage('')
    }
    setLoading(false)
  }
  useEffect(() => { void load() }, [obraId, module.id])
  function open(row?: Row) {
    setEditing(row ?? null); setDate(row?.data ?? ''); setName(row?.nome ?? ''); setFormOpen(true); setMessage('')
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !editable || busy || !name.trim() || !date) return
    setBusy(true); setMessage('')
    try {
      const values = { data: date, nome: name.trim() }
      const result = editing
        ? await supabase.from('feriados').update(values).eq('obra_id', obraId).eq('id', editing.id)
        : await supabase.from('feriados').insert({ ...values, obra_id: obraId })
      if (result.error) { setMessage(result.error.code === '23505' ? 'Já existe um feriado nesta data.' : 'Não foi possível salvar. Confira suas permissões e os dados.'); return }
      setFormOpen(false)
      await load()
    } finally { setBusy(false) }
  }
  async function remove(row: Row) {
    if (!supabase || !editable || busy || !window.confirm('Desativar este feriado? O histórico será preservado.')) return
    setBusy(true)
    try {
      const { error } = await supabase.rpc('desativar_feriado', { p_obra: obraId, p_feriado: row.id })
      if (error) { setMessage('Não foi possível desativar. Confira se a migração de desativação foi aplicada e se você tem permissão.'); return }
      await load()
    } finally { setBusy(false) }
  }
  const visible = rows.filter(row => (!from || row.data >= from) && (!to || row.data <= to) && row.nome.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')))
  return <section className="module-screen">
    <div className="module-title"><div><div className="eyebrow">{module.group.toUpperCase()} / {module.ready ? 'CADASTRO' : 'EM DESENVOLVIMENTO'}</div><h1>{module.title}</h1></div>{module.ready && editable && available && <button className="workspace-action" onClick={()=>open()}>+ Novo feriado</button>}</div>
    <div className="module-stamp"><div><b>Para que serve</b><p>{module.description}</p></div><div><b>Quando usar</b><p>{module.when}</p></div><div><b>Passos</b><p>{module.steps.join(' · ')}</p></div></div>
    {!module.ready ? <div className="workspace-panel"><div className="eyebrow">PRÓXIMAS ETAPAS</div><h2>Módulo em preparação</h2><p>Esta tela faz parte do plano aprovado. As funções e os dados serão liberados após validação.</p></div> : <>
      <div className="workspace-panel">
        <div className="panel-heading"><h2>Registros</h2><span>{available ? visible.length + ' registros' : 'Aguardando dados'}</span></div>
        <div className="filters"><label>Buscar<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nome do feriado" /></label><label>De<input type="date" value={from} onChange={e=>setFrom(e.target.value)} /></label><label>Até<input type="date" value={to} onChange={e=>setTo(e.target.value)} /></label><button className="secondary" onClick={()=>{setFrom('');setTo('');setSearch('')}}>Limpar</button></div>
        {message && <div role="status" className="notice">{message}</div>}
        {loading ? <p>Carregando registros…</p> : available && <div className="table-wrap"><table className="workspace-table"><thead><tr><th>Data</th><th>Descrição</th>{editable && <th>Ações</th>}</tr></thead><tbody>{visible.map(row=><tr key={row.id}><td>{dateLabel(row.data)}</td><td>{row.nome}</td>{editable && <td><button className="table-button" onClick={()=>open(row)}>Editar</button><button className="table-button danger" disabled={busy} onClick={()=>void remove(row)}>Desativar</button></td>}</tr>)}{!visible.length && <tr><td colSpan={editable?3:2}>Nenhum feriado encontrado.</td></tr>}</tbody></table></div>}
      </div>
      {formOpen && <div className="workspace-panel"><h2>{editing ? 'Editar feriado' : 'Novo feriado'}</h2><form className="record-form" onSubmit={save}><label>Data<input type="date" required value={date} onChange={e=>setDate(e.target.value)} /></label><label>Descrição<input required maxLength={160} value={name} onChange={e=>setName(e.target.value)} /></label><div className="form-actions"><button className="workspace-action" disabled={busy} type="submit">{busy?'Salvando…':'Salvar'}</button><button className="secondary" type="button" onClick={()=>setFormOpen(false)}>Cancelar</button></div></form></div>}
    </>}
  </section>
}
