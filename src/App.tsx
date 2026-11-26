import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, supabaseConfigured } from './lib/supabase'
import { Workspace } from './Workspace'

type Obra = { id: string; nome: string; cidade: string | null; perfil: string }

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [catalog, setCatalog] = useState<{ userId: string; obras: Obra[] } | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const userId = session?.user.id
  const obras = catalog?.userId === userId ? catalog?.obras ?? [] : []
  const selected = obras.find(obra => obra.id === selectedId) ?? null
  const selectionKey = (id: string) => `obras.selected.${id}`
  function selectObra(obra: Obra | null) {
    if (!userId) return
    try { if (obra) localStorage.setItem(selectionKey(userId), obra.id); else localStorage.removeItem(selectionKey(userId)) } catch { /* storage may be disabled */ }
    setSelectedId(obra?.id ?? null)
  }
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginMode, setLoginMode] = useState<'password' | 'link'>('password')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [dark, setDark] = useState(()=>localStorage.getItem('obras.theme') === 'dark')
  function toggleTheme() { setDark(v=>{ localStorage.setItem('obras.theme',v?'light':'dark'); return !v }) }

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      if (_event === 'SIGNED_OUT') { setCatalog(null); setSelectedId(null) }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    let disposed = false
    let request = 0
    if (!userId || !supabase) { setCatalog(null); setSelectedId(null); return }
    const client = supabase
    async function loadObras() {
      const currentRequest = ++request
      const { data, error } = await client
        .from('usuarios_obra')
        .select('perfil, obras!inner(id, nome, cidade)')
        .eq('usuario_id', userId!)
        .eq('ativo', true)
      if (disposed || currentRequest !== request) return
      if (error) { setCatalog(null); setSelectedId(null); setMessage('Não foi possível carregar suas obras. Confira a conexão e atualize a página.'); return }
      const list = (data ?? []).flatMap(item => {
        const related = Array.isArray(item.obras) ? item.obras : [item.obras]
        return related.filter(Boolean).map(obra => ({ ...obra, perfil: item.perfil } as Obra))
      })
      let remembered: string | null = null
      try { remembered = localStorage.getItem(selectionKey(userId!)) } catch { /* storage may be disabled */ }
      const restored = list.find(obra => obra.id === remembered)
      if (remembered && !restored) { try { localStorage.removeItem(selectionKey(userId!)) } catch { /* storage may be disabled */ } }
      setCatalog({ userId: userId!, obras: list })
      setSelectedId(restored?.id ?? null)
      setMessage(list.length ? '' : 'Seu acesso ainda não foi vinculado a uma obra. Peça ao administrador para liberar seu usuário.')
    }
    void loadObras()
    const revalidate = () => { if (document.visibilityState === 'visible') void loadObras() }
    document.addEventListener('visibilitychange', revalidate)
    return () => { disposed = true; document.removeEventListener('visibilitychange', revalidate) }
  }, [userId])

  async function entrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || loading) return
    setLoading(true); setMessage('')
    try {
      if (loginMode === 'password') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) {
          setMessage(error.status === 429 ? 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' : 'Não foi possível entrar. Confira o e-mail e a senha cadastrados.')
        }
        setPassword('')
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { shouldCreateUser: false, emailRedirectTo: new URL(import.meta.env.BASE_URL, window.location.href).href },
        })
        setMessage(error ? (error.status === 429 || error.message.toLowerCase().includes('rate limit') ? 'Limite temporário de e-mails. Aguarde ou entre com sua senha.' : 'Não foi possível enviar o link. Confira o e-mail autorizado e tente novamente.') : 'Enviamos um link de acesso para seu e-mail. Abra a mensagem neste dispositivo.')
      }
    } catch {
      setMessage('Não foi possível conectar ao serviço de autenticação. Tente novamente.')
      setPassword('')
    } finally {
      setLoading(false)
    }
  }

  async function sair() {
    if (!supabase) return
    selectObra(null)
    await supabase.auth.signOut()
    setCatalog(null)
  }

  if (!supabaseConfigured) return (
    <main className="setup">
      <div className="setup-card">
        <div className="eyebrow">SISTEMA DE OBRAS · V2</div>
        <h1>Fundação em validação.<br /><span>Falta conectar o banco.</span></h1>
        <p>O projeto inicial foi criado. Para ativar o login, precisamos criar o projeto Supabase e preencher as duas configurações locais.</p>
        <div className="steps"><b>Próximo passo</b><ol><li>Criar o projeto no Supabase.</li><li>Validar a migração SQL em ambiente de teste.</li><li>Preencher o arquivo <code>.env.local</code> com a URL e a chave publicável.</li></ol></div>
        <a className="primary" href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">Abrir Supabase ↗</a>
      </div>
    </main>
  )

  if (session && selected) return <Workspace key={session.user.id + ':' + selected.id} obra={selected} userId={session.user.id} dark={dark} toggleTheme={toggleTheme} back={()=>selectObra(null)} sair={()=>void sair()} />

  return (
    <div className={dark ? 'app dark' : 'app'}>
      <aside className="sidebar">
        <div className="brand-mark">SO<span> / </span>02</div>
        <div className="brand-copy"><strong>SISTEMA DE OBRAS</strong><small>GESTÃO INTEGRADA</small></div>
        <div className="side-bottom"><span>AMBIENTE V2</span><button onClick={toggleTheme} aria-label="Alternar tema">{dark ? '☀' : '◐'}</button></div>
      </aside>
      <main className="main">
        <header className="topbar"><span>PLATAFORMA DE GESTÃO</span><span className="status"><i /> AMBIENTE DE CONFIGURAÇÃO</span></header>
        {!session ? (
          <section className="login-layout">
            <div className="intro"><div className="eyebrow">NOVA PLATAFORMA · ETAPA 01</div><h1>Obra bem gerida.<br /><em>Decisão bem feita.</em></h1><p>Uma base única para acompanhar campo, equipe, financeiro, planejamento e qualidade — com acesso controlado por obra.</p><div className="intro-rule" /><small>ACESSO SEGURO · USUÁRIOS AUTORIZADOS · CONTROLE DE PERMISSÕES</small></div>
            <form className="login-card" onSubmit={entrar}>
              <div className="eyebrow">IDENTIFICAÇÃO</div>
              <h2>Acessar sistema</h2>
              <p>{loginMode === 'password' ? 'Informe seu e-mail corporativo e sua senha cadastrada.' : 'Informe seu e-mail corporativo para receber um link seguro.'}</p>
              <label htmlFor="email">E-MAIL</label>
              <input id="email" type="email" autoComplete="email" required placeholder="voce@empresa.com.br" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} />
              {loginMode === 'password' && <>
                <label htmlFor="password">SENHA</label>
                <input id="password" type="password" autoComplete="current-password" required placeholder="Sua senha" value={password} onChange={e => setPassword(e.target.value)} disabled={loading} />
              </>}
              <button className="primary" type="submit" disabled={loading}>{loading ? 'AGUARDE…' : loginMode === 'password' ? 'ENTRAR' : 'ENVIAR LINK DE ACESSO'}</button>
              <button className="text-button" type="button" disabled={loading} onClick={() => { setLoginMode(loginMode === 'password' ? 'link' : 'password'); setPassword(''); setMessage('') }}>{loginMode === 'password' ? 'Entrar por link de e-mail' : 'Voltar para e-mail e senha'}</button>
              {message && <div className="notice" role="status">{message}</div>}
              <small>Seu acesso depende de cadastro autorizado e das permissões definidas no banco.</small>
            </form>
          </section>
        ) : (
          <section className="welcome"><div className="eyebrow">ACESSO AUTENTICADO</div><h1>{catalog?.userId === userId ? 'Escolha uma obra' : 'Carregando suas obras…'}</h1><p>{session.user.email}</p><div className="obra-grid">{obras.map(obra => <button className="obra-card" key={obra.id} onClick={() => selectObra(obra)}><span>OBRA / {obra.perfil.toUpperCase()}</span><strong>{obra.nome}</strong><small>{obra.cidade || 'Cidade não informada'}</small><b>ABRIR ÁREA →</b></button>)}</div>{message && <div className="notice">{message}</div>}<button className="text-button" onClick={sair}>Sair da conta</button></section>
        )}
        <footer>© {new Date().getFullYear()} SISTEMA DE OBRAS · V2 <span>AMBIENTE EM CONSTRUÇÃO</span></footer>
      </main>
    </div>
  )
}
