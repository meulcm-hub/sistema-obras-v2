export type ModuleDef = {
  id: string
  title: string
  group: string
  description: string
  when: string
  steps: string[]
  costs?: boolean
  ready?: boolean
}
const entry = (id: string, title: string, group: string, costs = false): ModuleDef => ({
  id, title, group, costs,
  description: 'Módulo previsto na especificação do Sistema de Obras.',
  when: 'Disponível após a implementação e validação desta etapa.',
  steps: ['Acompanhe o andamento do desenvolvimento.'],
})
export const modules: ModuleDef[] = [
  entry('inicio','Início','Principal'),
  entry('executiva','Visão Executiva','Principal',true),
  entry('relatorios','Relatórios','Principal'),
  entry('assistente','Assistente','Principal'),
  entry('rapido','Lançamento rápido','Principal',true),
  ...[
    ['diario','Diário de Obra'],['presenca','Presença'],['producao','Produção'],
    ['estrutura','Programação Estrutura'],['monitoramento','Monitoramento'],['unidades','Unidades'],['estacas','Estacas']
  ].map(([id,title])=>entry(id,title,'Campo')),
  ...[
    ['semanal','Planejamento Semanal'],['cronograma','Cronograma'],['tempos','Tempos de Serviço'],['prazo','Prazo e Mão de Obra'],['quantitativos','Quantitativos'],['levantamento','Levantamento do Projeto'],['gestao','Gestão à Vista']
  ].map(([id,title])=>entry(id,title,'Planejamento')),
  ...[
    ['lancamentos','Lançamentos'],['pagamentos','Pagamentos da equipe'],['orcamento_analitico','Orçamento Analítico'],['cotacoes','Cotações'],['compras','Compras'],['contratos','Contratos'],['medicoes','Medições'],['equipamentos','Equipamentos'],['contas','Contas a Pagar'],['orcamento','Orçamento'],['fluxo','Fluxo de Caixa'],['concorrencia','Mapa de Concorrência']
  ].map(([id,title])=>entry(id,title,'Financeiro',true)),
  ...[
    ['inspecoes','Inspeções de Serviço'],['vistoria_aptos','Vistoria Aptos'],['vistoria_lojas','Vistoria Lojas'],['fvs','Qualidade (FVS)'],['biblioteca','Biblioteca de Checklists'],['checklist','Checklist de Campo'],['ficha','Ficha de Vistoria']
  ].map(([id,title])=>entry(id,title,'Qualidade')),
  entry('pessoas','Pessoas','Equipe'),entry('servicos','Serviços','Equipe'),
  entry('painel','Painel','Cadastros'),entry('dados_projeto','Dados do Projeto','Cadastros'),
  { id:'feriados',title:'Feriados',group:'Cadastros',ready:true,
    description:'Cadastre as datas não úteis que deverão ser consideradas no cronograma da obra.',
    when:'No início da obra e sempre que houver atualização do calendário.',
    steps:['Consulte as datas cadastradas.','Adicione ou edite um feriado.','Confirme a gravação.'] },
  entry('demandas','Demandas','CRM'),entry('fornecedores','Fornecedores','CRM'),entry('interacoes','Interações','CRM')
]
export function canSeeCosts(role: string) {
  return ['Administrador','Engenheiro','Diretoria'].includes(role)
}
export function canEditModule(id: string, role: string) {
  return id === 'feriados' && ['Administrador','Engenheiro'].includes(role)
}
