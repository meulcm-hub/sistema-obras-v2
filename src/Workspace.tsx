import { useEffect, useState } from 'react'
import { modules, canSeeCosts } from './modules'
import { ModuleScreen } from './ModuleScreen'
import { supabase } from './lib/supabase'

type Obra = { id: string; nome: string; cidade: string | null; perfil: string }
type Props = { obra: Obra; userId: string; dark: boolean; toggleTheme: () => void; back: () => void; sair: () => void }
const groups = ['Campo','Planejamento','Financeiro','Qualidade','Equipe','Cadastros','CRM']
type Shortcut = { id: string; modulo: string; posicao: number }
export function Workspace({ obra, userId, dark, toggleTheme, back, sair }: Props) {
  const allowed = modules.filter(m=>!m.costs || canSeeCosts(obra.perfil))
  const moduleKey = 'obras.module.' + userId + '.' + obra.id
  const [active, setActive] = useState(()=>{ try { return sessionStorage.getItem(moduleKey) || 'inicio' } catch { return 'inicio' } })
  const [favorites, setFavorites] = useState<Shortcut[]>([])
  const [shortcutMessage, setShortcutMessage] = useState('')
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(()=>localStorage.getItem('obras.menu.collapsed')==='true')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expanded, setExpanded] = useState<string[]>(['Campo','Cadastros'])
  const current = allowed.find(m=>m.id===active) ?? allowed[0]
  const found = allowed.filter(m=>m.title.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(query.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'')))
  function navigate(id: string) { if(!allowed.some(m=>m.id===id)) return; try { sessionStorage.setItem(moduleKey,id) } catch { /* storage may be disabled */ } setActive(id);setMobileOpen(false);setSearchOpen(false);setQuery('') }
  function toggleMenu() { setCollapsed(v=>{ localStorage.setItem('obras.menu.collapsed',String(!v)); return !v }) }
  useEffect(()=>{
    const handler=(e: KeyboardEvent)=>{
      if((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==='k'){e.preventDefault(); setSearchOpen(v=>!v)}
      if((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==='b'){e.preventDefault(); toggleMenu()}
      if(e.key==='Escape'){setSearchOpen(false);setMobileOpen(false)}
    }
    window.addEventListener('keydown',handler);return ()=>window.removeEventListener('keydown',handler)
  },[])
  async function loadFavorites() {
    if(!supabase)return
    const {data,error}=await supabase.from('atalhos_usuario').select('id,modulo,posicao').eq('usuario_id',userId).eq('obra_id',obra.id).order('posicao')
    if(!error) setFavorites(data??[])
  }
  useEffect(()=>{void loadFavorites()},[obra.id,userId])
  async function pin() {
    if(!supabase)return
    setShortcutMessage('')
    const existing=favorites.find(f=>f.modulo===current.id)
    const result=existing
      ? await supabase.from('atalhos_usuario').delete().eq('id',existing.id).eq('usuario_id',userId)
      : await supabase.from('atalhos_usuario').insert({usuario_id:userId,obra_id:obra.id,modulo:current.id,posicao:favorites.length})
    if(result.error){setShortcutMessage('Não foi possível atualizar o atalho.');return}
    await loadFavorites()
  }
  const pinned=favorites.some(x=>x.modulo===current.id)
  const navButton=(m: typeof modules[number])=><button key={m.id} className={'nav-item '+(current.id===m.id?'active':'')} onClick={()=>navigate(m.id)} aria-current={current.id===m.id?'page':undefined}><span>{m.title}</span>{m.ready && <i className="ready-dot" aria-label="Disponível"/>}</button>
  return <div className={'app workspace-app '+(dark?'dark ':'')+(collapsed?'menu-collapsed ':'')+(mobileOpen?'mobile-open':'')}>
    <aside className="workspace-sidebar" aria-label="Menu principal">
      <div className="ws-brand"><div className="brand-mark">SO<span> / </span>02</div><strong>SISTEMA DE OBRAS LCM</strong><small>{obra.nome}</small></div>
      <div className="ws-nav">
        <div className="nav-caption">PRINCIPAL</div>{allowed.filter(m=>m.group==='Principal').map(navButton)}
        <div className="nav-caption">SEUS ATALHOS</div>{favorites.length?favorites.map(f=>allowed.find(m=>m.id===f.modulo)).filter((m):m is typeof modules[number]=>Boolean(m)).map(navButton):<p className="nav-help">Fixe suas telas favoritas usando a estrela.</p>}
        {groups.map(group=>{const list=allowed.filter(m=>m.group===group);return list.length>0&&<div key={group} className="nav-group"><button className="nav-group-button" aria-expanded={expanded.includes(group)} onClick={()=>setExpanded(v=>v.includes(group)?v.filter(x=>x!==group):[...v,group])}>{group}<span>{expanded.includes(group)?'−':'+'}</span></button>{expanded.includes(group)&&<div>{list.map(navButton)}</div>}</div>})}
      </div>
      <div className="ws-footer"><button onClick={back}>Trocar obra</button><button onClick={sair}>Sair</button></div>
    </aside>
    <main className="workspace-main">
      <header className="ws-topbar"><div className="ws-top-left"><button className="icon-button desktop-menu" title="Recolher menu (Ctrl+B)" onClick={toggleMenu}>☰</button><button className="icon-button mobile-menu" title="Abrir menu" onClick={()=>setMobileOpen(!mobileOpen)}>☰</button><div><strong>{obra.nome}</strong><small>{obra.cidade || 'Local não informado'} · {obra.perfil}</small></div></div><div className="ws-top-actions"><button className="search-button" onClick={()=>setSearchOpen(true)}>Buscar módulo <kbd>Ctrl K</kbd></button><button className="icon-button" onClick={toggleTheme} title="Alternar tema">{dark?'☀':'◐'}</button></div></header>
      <div className="workspace-content">
        <div className="workspace-breadcrumb"><span>GESTÃO INTEGRADA / {current.group.toUpperCase()}</span><button className={'pin-button '+(pinned?'pinned':'')} onClick={()=>void pin()} aria-label={pinned?'Remover dos atalhos':'Fixar nos atalhos'}>{pinned?'★':'☆'} <span>{pinned?'Fixado':'Fixar nos atalhos'}</span></button></div>
        {shortcutMessage&&<div className="notice">{shortcutMessage}</div>}
        {current.id==='inicio'?<section className="module-screen"><div className="module-title"><div><div className="eyebrow">VISÃO DA OBRA</div><h1>Bem-vindo ao Sistema de Obras</h1><p className="workspace-muted">Acompanhe sua obra em um único lugar.</p></div></div><div className="dashboard-cards">
          <div className="workspace-panel"><div className="eyebrow">OBRA ATIVA</div><h2>{obra.nome}</h2><p>{obra.cidade || 'Local não informado'}</p><button className="secondary" onClick={back}>Alterar obra</button></div>
          <div className="workspace-panel"><div className="eyebrow">SEU ACESSO</div><h2>{obra.perfil}</h2><p>Permissões vinculadas à obra.</p></div>
          <div className="workspace-panel"><div className="eyebrow">DESENVOLVIMENTO</div><h2>Etapa 2</h2><p>Menu e estrutura dos módulos. Os indicadores serão liberados com suas fontes de dados.</p></div>
        </div><h2 className="section-heading">Áreas de gestão</h2><div className="area-grid">{groups.map(g=>{const list=allowed.filter(m=>m.group===g);return list.length>0&&<button className="area-card" key={g} onClick={()=>{setExpanded(v=>v.includes(g)?v:[...v,g]);navigate((list.find(m=>m.ready)??list[0]).id)}}><span className="eyebrow">{list.length} TELAS PREVISTAS</span><strong>{g}</strong><small>Abrir área</small></button>})}</div></section>
        : current.id==='rapido'?<section className="module-screen"><div className="module-title"><h1>Lançamento rápido</h1></div><div className="dashboard-cards">{['pagamentos','lancamentos'].map(id=>{const item=allowed.find(m=>m.id===id);return item&&<button key={id} className="area-card" onClick={()=>navigate(id)}><strong>{item.title}</strong><small>Previsto nas próximas etapas</small></button>})}</div></section>
        : <ModuleScreen key={current.id+obra.id} module={current} obraId={obra.id} perfil={obra.perfil}/>}
      </div>
      <footer className="ws-bottom">SISTEMA DE OBRAS LCM · V2 <span>AMBIENTE DE TESTE</span></footer>
    </main>
    {mobileOpen&&<button className="mobile-overlay" aria-label="Fechar menu" onClick={()=>setMobileOpen(false)}/>}
    <nav className="mobile-bottom" aria-label="Navegação rápida">{[['inicio','Início'],['diario','Diário'],['presenca','Presença']].map(([id,title])=><button key={id} className={current.id===id?'active':''} onClick={()=>navigate(id)}>{title}</button>)}<button onClick={()=>setMobileOpen(v=>!v)}>Mais</button></nav>
    {searchOpen&&<div className="search-overlay" onClick={()=>setSearchOpen(false)}><div className="search-dialog" role="dialog" aria-modal="true" aria-label="Buscar módulos" onClick={e=>e.stopPropagation()}><div className="panel-heading"><h2>Buscar módulo</h2><button className="icon-button" onClick={()=>setSearchOpen(false)}>×</button></div><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Digite o nome da tela" onKeyDown={e=>{if(e.key==='Enter'&&found.length)navigate(found[0].id)}}/><div className="search-results">{found.map(m=><button key={m.id} onClick={()=>navigate(m.id)}>{m.title}<small>{m.group}</small></button>)}</div></div></div>}
  </div>
}
