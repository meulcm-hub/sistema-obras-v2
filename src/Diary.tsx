import {useEffect,useRef,useState} from 'react'
import type {FormEvent} from 'react'
import {supabase} from './lib/supabase'
import {enqueue,listPending,removePending} from './lib/diaryQueue'
import type {DailyPayload,PendingDaily} from './lib/diaryQueue'

type Activity={id:string;atividade:string;etapa:string}
type DailyRow=DailyPayload&{id:string;ultima_operacao:string;diario_servicos:{atividade_id:string}[]}
const roles=['Administrador','Engenheiro','Encarregado']
const counts=[['pedreiros','Pedreiros'],['serventes','Serventes'],['carpinteiros','Carpinteiros'],['armadores','Armadores'],['bombeiros','Bombeiros'],['eletricistas','Eletricistas'],['terceiros','Terceiros']] as const
const climates=['Sol','Nublado','Chuva','Não informado']
function today(){const p=new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());return ['year','month','day'].map(t=>p.find(x=>x.type===t)?.value).join('-')}
const initial=():DailyPayload=>({data:today(),clima_manha:'Não informado',clima_tarde:'Não informado',produtivo:true,pedreiros:0,serventes:0,carpinteiros:0,armadores:0,bombeiros:0,eletricistas:0,terceiros:0,equipamentos:'',ocorrencias:''})
const labelDate=(d:string)=>d.split('-').reverse().join('/')
const total=(r:DailyPayload)=>counts.reduce((s,[k])=>s+r[k],0)
export function Diary({obraId,perfil,userId}:{obraId:string;perfil:string;userId:string}){
  const editable=roles.includes(perfil)
  const [rows,setRows]=useState<DailyRow[]>([])
  const [activities,setActivities]=useState<Activity[]>([])
  const [pending,setPending]=useState<PendingDaily[]>([])
  const [search,setSearch]=useState('')
  const [from,setFrom]=useState(today().slice(0,7)+'-01')
  const [to,setTo]=useState('')
  const [online,setOnline]=useState(navigator.onLine)
  const [loading,setLoading]=useState(true)
  const [message,setMessage]=useState('')
  const [open,setOpen]=useState(false)
  const [editing,setEditing]=useState<DailyRow|null>(null)
  const [payload,setPayload]=useState<DailyPayload>(initial)
  const [selected,setSelected]=useState<string[]>([])
  const [saving,setSaving]=useState(false)
  const [syncing,setSyncing]=useState(false)
  const [storageReady,setStorageReady]=useState(false)
  const requests=useRef(0)
  const syncLock=useRef(false)
  const activeRef=useRef(true)
  async function queueRead(){
    try{const items=await listPending(userId,obraId);if(activeRef.current){setPending(items);setStorageReady(true)};return items}
    catch{if(activeRef.current){setStorageReady(false);setMessage('O armazenamento local não está disponível. Verifique as permissões do navegador.')};return []}
  }
  async function load(){
    if(!supabase||!navigator.onLine){setLoading(false);return}
    const seq=++requests.current
    setLoading(true)
    try{
      const {data:acts,error:actError}=await supabase.from('cronograma').select('id,atividade,etapa').eq('obra_id',obraId).is('excluido_em',null).order('atividade')
      if(seq!==requests.current||!activeRef.current)return
      if(actError){setMessage('Não foi possível carregar as atividades do cronograma.');setLoading(false);return}
      setActivities(acts??[])
      const collected:DailyRow[]=[]
      for(let page=0;page<100;page++){
        let query=supabase.from('diario').select('id,data,clima_manha,clima_tarde,produtivo,pedreiros,serventes,carpinteiros,armadores,bombeiros,eletricistas,terceiros,equipamentos,ocorrencias,ultima_operacao,diario_servicos(atividade_id)').eq('obra_id',obraId).is('excluido_em',null).order('data',{ascending:false}).range(page*100,page*100+99)
        if(from)query=query.gte('data',from)
        if(to)query=query.lte('data',to)
        const {data,error}=await query
        if(seq!==requests.current||!activeRef.current)return
        if(error){setMessage('Não foi possível consultar o Diário de Obra. Confira sua conexão e permissões.');return}
        const part=(data??[]) as DailyRow[]
        collected.push(...part)
        if(part.length<100)break
      }
      if(activeRef.current&&seq===requests.current)setRows(collected)
    }catch{if(activeRef.current)setMessage('Falha de conexão ao consultar o Diário.')}
    finally{if(activeRef.current&&seq===requests.current)setLoading(false)}
  }
  async function sync(){
    if(!supabase||!navigator.onLine||syncLock.current||!editable||!activeRef.current)return
    const client=supabase
    syncLock.current=true;setSyncing(true)
    let changed=false
    try{
      const {data:{session}}=await client.auth.getSession()
      if(session?.user.id!==userId||!activeRef.current)return
      const items=await queueRead()
      for(const item of items){
        if(!activeRef.current||!navigator.onLine)break
        const {error}=await client.rpc('salvar_diario',{p_obra:obraId,p_id:item.id,p_revisao:item.revision,p_operacao:item.operation,p_dados:item.payload,p_servicos:item.services})
        if(error){
          const friendly=error.code==='40001'?'Conflito de edição: atualize e revise o registro.':error.code==='23505'?'Já existe um diário nesta data.':error.code==='42501'?'Acesso de gravação não autorizado.':'Não foi possível sincronizar. Confira a conexão ou os dados.'
          await enqueue({...item,error:friendly})
        }else{await removePending(item.operation);changed=true}
      }
      await queueRead()
      if(changed){if(activeRef.current)setMessage('Registros sincronizados.');await load()}
    }catch{if(activeRef.current)setMessage('Sincronização interrompida. Os registros pendentes foram mantidos neste dispositivo.')}
    finally{syncLock.current=false;if(activeRef.current)setSyncing(false)}
  }
  useEffect(()=>{
    activeRef.current=true
    void queueRead().then(()=>{if(navigator.onLine)void sync()})
    const up=()=>{setOnline(true);void sync();void load()}
    const down=()=>setOnline(false)
    window.addEventListener('online',up);window.addEventListener('offline',down)
    return()=>{activeRef.current=false;requests.current++;window.removeEventListener('online',up);window.removeEventListener('offline',down)}
  },[obraId,userId])
  useEffect(()=>{void load()},[from,to,obraId])
  function start(row?:DailyRow){
    setEditing(row??null);setPayload(row?{...initial(),...row}:initial());setSelected(row?.diario_servicos.map(x=>x.atividade_id)??[]);setOpen(true);setMessage('')
  }
  function change<K extends keyof DailyPayload>(key:K,value:DailyPayload[K]){setPayload(p=>({...p,[key]:value}))}
  async function save(e:FormEvent<HTMLFormElement>){
    e.preventDefault();if(!editable||saving||!payload.data)return
    if(counts.some(([k])=>!Number.isInteger(payload[k])||payload[k]<0||payload[k]>10000)){setMessage('Revise os quantitativos do efetivo.');return}
    const recordId=editing?.id??crypto.randomUUID()
    if(pending.some(x=>x.id===recordId||x.payload.data===payload.data)){setMessage('Já existe um lançamento pendente para este registro ou data. Sincronize ou descarte a pendência primeiro.');return}
    setSaving(true)
    try{
      const clean:DailyPayload={data:payload.data,clima_manha:payload.clima_manha,clima_tarde:payload.clima_tarde,produtivo:payload.produtivo,pedreiros:payload.pedreiros,serventes:payload.serventes,carpinteiros:payload.carpinteiros,armadores:payload.armadores,bombeiros:payload.bombeiros,eletricistas:payload.eletricistas,terceiros:payload.terceiros,equipamentos:payload.equipamentos,ocorrencias:payload.ocorrencias}
      await enqueue({operation:crypto.randomUUID(),id:recordId,revision:editing?.ultima_operacao??null,userId,obraId,payload:clean,services:selected,createdAt:Date.now()})
      setOpen(false);await queueRead();setMessage(navigator.onLine?'Registro salvo na fila de envio.':'Registro salvo neste dispositivo. Será enviado quando a conexão retornar.')
      if(navigator.onLine)void sync()
    }catch{setMessage('Não foi possível gravar no dispositivo. O formulário foi mantido para você tentar novamente.')}
    finally{setSaving(false)}
  }
  async function discard(item:PendingDaily){if(!window.confirm('Descartar esta pendência local? Ela pode ainda não ter sido enviada ao servidor.'))return;try{await removePending(item.operation);await queueRead();if(navigator.onLine)void load()}catch{setMessage('Não foi possível remover a pendência local.')}}
  async function deactivate(row:DailyRow){if(!supabase||!editable||!online||!window.confirm('Desativar o diário? O histórico será preservado.'))return;const {data,error}=await supabase.from('diario').update({excluido_em:new Date().toISOString()}).eq('obra_id',obraId).eq('id',row.id).eq('ultima_operacao',row.ultima_operacao).select('id');if(error||data?.length!==1)setMessage('Não foi possível desativar o diário.');else await load()}
  const visible=rows.filter(r=>[r.ocorrencias,r.equipamentos,...r.diario_servicos.map(s=>activities.find(a=>a.id===s.atividade_id)?.atividade??'')].join(' ').toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')))
  return <section className="module-screen">
    <div className="module-title"><div><div className="eyebrow">CAMPO / DIÁRIO</div><h1>Diário de Obra</h1><p>Registre o andamento diário, o efetivo e as condições do canteiro.</p></div>{editable&&<button className="workspace-action" onClick={()=>start()}>+ Novo diário</button>}</div>
    <div className="module-stamp"><div><b>Para que serve</b><p>Documentar o clima, equipe, serviços, equipamentos e ocorrências do dia.</p></div><div><b>Quando usar</b><p>Ao final de cada jornada de trabalho, inclusive nos dias não produtivos.</p></div><div><b>Passos</b><p>Selecione a data, informe o efetivo, vincule atividades e registre ocorrências. Salve e confira a sincronização.</p></div></div>
    <div className="workspace-panel diary-status"><strong>{online?'Conectado':'Sem conexão'}</strong><span>{pending.length} pendência(s) local(is){storageReady?'':' · armazenamento local indisponível'}</span><button className="secondary" disabled={!online||syncing||!pending.length} onClick={()=>void sync()}>{syncing?'Sincronizando…':'Sincronizar agora'}</button></div>
    {message&&<div className="notice" role="status">{message}</div>}
    {pending.length>0&&<div className="workspace-panel"><h2>Lançamentos pendentes</h2>{pending.map(item=><div className="pending-row" key={item.operation}><span><strong>{labelDate(item.payload.data)}</strong> · {item.error??'Aguardando sincronização'}</span><button className="table-button danger" disabled={syncing} onClick={()=>void discard(item)}>Descartar pendência</button></div>)}</div>}
    {open&&<div className="workspace-panel"><h2>{editing?'Editar diário':'Novo diário'}</h2><form className="diary-form" onSubmit={save}>
      <div className="diary-grid three"><label>Data<input type="date" required value={payload.data} onChange={e=>change('data',e.target.value)}/></label><label>Clima — manhã<select value={payload.clima_manha} onChange={e=>change('clima_manha',e.target.value)}>{climates.map(x=><option key={x}>{x}</option>)}</select></label><label>Clima — tarde<select value={payload.clima_tarde} onChange={e=>change('clima_tarde',e.target.value)}>{climates.map(x=><option key={x}>{x}</option>)}</select></label></div>
      <h3>Efetivo por função <small>Total: {total(payload)}</small></h3><div className="diary-grid counts">{counts.map(([key,title])=><label key={key}>{title}<input type="number" min={0} max={10000} step={1} required value={payload[key]} onChange={e=>change(key,Number(e.target.value))}/></label>)}</div>
      <h3>Serviços executados</h3><div className="activity-list">{activities.length?activities.map(a=><label key={a.id}><input type="checkbox" checked={selected.includes(a.id)} onChange={e=>setSelected(old=>e.target.checked?[...old,a.id]:old.filter(id=>id!==a.id))}/>{a.atividade}{a.etapa&&<small>{a.etapa}</small>}</label>):<p>Nenhuma atividade disponível; registre os detalhes em ocorrências.</p>}</div>
      <div className="diary-grid two"><label>Equipamentos<textarea maxLength={4000} rows={4} value={payload.equipamentos} onChange={e=>change('equipamentos',e.target.value)}/></label><label>Ocorrências e observações<textarea maxLength={10000} rows={4} value={payload.ocorrencias} onChange={e=>change('ocorrencias',e.target.value)}/></label></div>
      <label className="check-inline"><input type="checkbox" checked={payload.produtivo} onChange={e=>change('produtivo',e.target.checked)}/> Dia produtivo</label>
      <div className="diary-note">Fotos e avanço de unidades serão liberados após a integração de documentos e o cadastro de unidades. Em trabalho offline, mantenha esta sessão aberta e use somente dispositivos autorizados.</div>
      <div className="form-actions"><button type="submit" className="workspace-action" disabled={saving||!storageReady}>{saving?'Salvando…':'Salvar diário'}</button><button type="button" className="secondary" onClick={()=>setOpen(false)}>Cancelar</button></div>
    </form></div>}
    <div className="workspace-panel"><div className="panel-heading"><h2>Diários registrados</h2><span>{visible.length} registro(s) {online?'':'· última consulta disponível nesta tela'}</span></div><div className="filters"><label>Buscar<input placeholder="Serviço ou ocorrência" value={search} onChange={e=>setSearch(e.target.value)}/></label><label>De<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>Até<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label><button className="secondary" onClick={()=>{setFrom('');setTo('');setSearch('')}}>Limpar</button></div>
    {loading?<p>Carregando…</p>:<div className="table-wrap"><table className="workspace-table"><thead><tr><th>Data</th><th>Clima</th><th>Efetivo</th><th>Serviços</th><th>Produtivo</th><th>Ocorrências</th>{editable&&<th>Ações</th>}</tr></thead><tbody>{visible.map(r=><tr key={r.id}><td>{labelDate(r.data)}</td><td>{r.clima_manha} / {r.clima_tarde}</td><td>{total(r)}</td><td>{r.diario_servicos.map(s=>activities.find(a=>a.id===s.atividade_id)?.atividade??'Atividade arquivada').join('; ')||'—'}</td><td>{r.produtivo?'Sim':'Não'}</td><td>{r.ocorrencias||'—'}</td>{editable&&<td><button className="table-button" onClick={()=>start(r)}>Editar</button><button className="table-button danger" disabled={!online} onClick={()=>void deactivate(r)}>Desativar</button></td>}</tr>)}{!visible.length&&<tr><td colSpan={editable?7:6}>Nenhum diário encontrado no período.</td></tr>}</tbody></table></div>}</div>
  </section>
}
