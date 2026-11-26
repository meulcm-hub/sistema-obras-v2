# Sistema de Obras v2 — instruções para o Claude (leia tudo antes de responder)

> Este arquivo é o ponto de partida do projeto. Ele explica **o que já existe**, **o que já foi feito** e **o que vamos construir agora (opção 3: banco de dados)**. Leia inteiro, inclusive o Anexo A, antes da primeira resposta.

## 1. Quem sou e como falar comigo

- Sou responsável pela gestão de obras e pelo acompanhamento do sistema.
- **Não sou programador.** Fale sempre em **português do Brasil**, linguagem simples. Quando eu precisar fazer algo fora do código (criar conta, copiar chave, clicar em publicar), explique passo a passo onde clicar.
- Trabalhe **dentro desta pasta**: todo o código novo fica aqui.
- Faça uma etapa por vez. No fim de cada etapa: rode os testes, me mostre a tela funcionando e atualize a seção 9 (andamento) deste arquivo.
- **Não publique nada, não apague nada e não faça merge sem eu dizer "pode".**

### Primeira resposta esperada

Quando eu abrir a conversa pela primeira vez, faça isto:

1. Leia este arquivo inteiro.
2. Clone (ou baixe) o repositório público `https://github.com/marcosphilipedefreitas12-max/Sistema---Obras` numa subpasta `referencia/`. Leia `referencia/CLAUDE.md` e `referencia/apps-script/` (`Sistema.gs`, `Modulos.gs`, `Sistema.html`).
3. Me devolva **um resumo curto** do que entendeu e **confirme o plano de etapas** (seção 7). Ainda sem escrever código.

## 2. Regras fixas (valem para tudo)

1. **Nunca** coloque dados reais da obra (nomes de pessoas, CPF, valores reais, PIX, e-mails) no GitHub, em documento compartilhado ou em teste. Testes só com dados inventados.
2. Chaves secretas (Supabase service_role, chave da IA, Google) só em `.env` / segredos do servidor. O `.env` fica no `.gitignore`.
3. Toda permissão é conferida **no banco** (Row Level Security), não só escondendo botão na tela.
4. Nada é apagado de verdade: exclusão marca `excluido_em`; toda alteração vai para a tabela `auditoria`.
5. Datas no fuso **America/Sao_Paulo**, guardadas como `date` (sem hora), para não "cair no dia anterior".
6. Valores em R$ só para quem tem permissão de custos.
7. Telas de análise (Visão Executiva, Assistente): só com dados existentes — **nunca inventar** causa, valor ou previsão.
8. Pensão alimentícia é consulta **privada** de cada usuário: nunca em tabela compartilhada, nunca visível para outros.
9. O sistema atual **continua funcionando** até a versão nova estar pronta e conferida. Não mexer na planilha original nem no projeto Apps Script atual.
10. Visual "prancha técnica" igual ao atual: grafite `#22272b`, fundo `#eceeec`, azul `#1f3864` para ações, amarelo `#f2b705` só para destaque/foco; fontes Barlow Condensed (títulos) e IBM Plex Sans; tema claro e escuro por variáveis CSS (sem cor fixa no CSS); celular em 390 px.

## 3. O que já existe (sistema atual, versão 1)

- **Arquitetura atual**: uma planilha Google por obra = banco de dados; telas em Google Apps Script (`Sistema.gs` + `Modulos.gs` + `Sistema.html`, HtmlService, `google.script.run`); um só endereço atende várias obras (`?obra=<id>`); acesso = compartilhamento da planilha; implantação "Executar como: Usuário que acessa".
- **Publicação atual**: um projeto "atualizador" copia `apps-script/*` do `main` do GitHub para o projeto do sistema de hora em hora.
- **Por que vamos mudar**: cada clique abre a planilha inteira no Google e lê as abas → o sistema demora para abrir e para trocar de tela, e não funciona sem internet. Na opção 3 os dados vão para um banco de dados de verdade e a planilha vira só relatório.

### Telas fixas do menu

- **Início**: resumo da obra com gráficos próprios em SVG (cores `--s0..--s3`, testadas para daltonismo nos dois temas).
- **Visão Executiva**: prazo, custo e qualidade num período; alertas e análise só com dados existentes. Prazo contratual configurável.
- **Relatórios** (impressão/PDF) e **Assistente** (IA opcional, desligado por padrão, só lê e propõe; nada grava sem confirmação; limite mensal).
- **Seus atalhos** por usuário (botão ☆ "Fixar nos atalhos"), busca Ctrl+K (Enter abre a 1ª), Ctrl+B esconde o menu (lembrado no navegador), barra inferior no celular (Início, Diário, Presença, Mais).
- **Lançamento rápido**: um único atalho que substitui "Pagamentos da equipe" + "Lançamentos" nos atalhos; abre 2 cartões → pagamento da equipe ou lançamento comum. É só porta de entrada; as duas telas continuam no Financeiro.

### Áreas e telas

| Área | Telas que gravam | Telas só de consulta |
|---|---|---|
| Campo | Diário de Obra, Presença (com horas extras), Produção, Programação Estrutura, Monitoramento, Unidades (mapa de controle), Estacas | — |
| Planejamento | Planejamento Semanal (quadro da semana, reprogramar), Cronograma, Tempos de Serviço | Prazo e Mão de Obra, Quantitativos, Levantamento do Projeto, Gestão à Vista |
| Financeiro | Lançamentos, Pagamentos da equipe (Diaristas + Fichados CLT), Orçamento Analítico, Cotações, Compras, Contratos, Medições, Equipamentos | Contas a Pagar, Orçamento, Fluxo de Caixa, Mapa de Concorrência |
| Qualidade | Inspeções de Serviço, Vistoria Aptos, Vistoria Lojas, Qualidade (FVS), Biblioteca de Checklists | Checklist de Campo, Ficha de Vistoria |
| Equipe | Pessoas, Serviços | — |
| Cadastros | — | Painel, Dados do Projeto, Feriados |
| CRM | Demandas, Fornecedores, Interações | — |

Cada tela tem: carimbo no topo (título, para que serve, quando usar, passos), lista com filtros (período De/até + períodos rápidos quando a chave é data), formulário novo/editar, fotos quando o módulo tem fotos (reduzidas no navegador para 1600 px JPEG, enviadas uma a uma). Telas de consulta mostram a aba como ela aparece e só deixam editar célula de entrada (número, data, lista ou vazia, sem fórmula). Tabelas com linhas verticais separando as colunas.

### Perfis

| Perfil | O que pode |
|---|---|
| Administrador | Tudo: perfis, migrações, classificar Diário antigo, link da planilha |
| Engenheiro | Gravar em todas as telas e ver valores em R$ |
| Diretoria | Ver tudo, inclusive custos |
| Encarregado | Gravar nas telas de campo, sem valores em R$ |
| Consulta | Só ver; botões de gravar somem |

### Ligações entre as telas

- **Presença → Pagamentos da equipe**: dias P, ½, TR e CH viram diárias; horas extras viram diárias extras (diarista) ou valor de HE (fichado).
- **Pagamentos da equipe → Lançamentos**: cada pagamento é uma linha de Lançamentos (Mão de obra) com etiqueta `[DIARIAS aaaa-mm-dd a aaaa-mm-dd]` ou `[CLT aaaa-mm ADIANTAMENTO|SALARIO|BENEFICIOS]` nas Observações. Lançamentos com essas etiquetas ganham a marca "Equipe".
- **Cotação fechada → Compra → Lançamento**: botão "Gerar compra" (usa o pagamento do fornecedor escolhido, anota "Compra nº X" na cotação) e depois "Lançar em Lançamentos" (etiqueta `[COMPRA n]`, sem duplicar).
- **Diário → Unidades**: bloco "Avanço nas unidades" (várias unidades de uma vez; Iniciado / Andamento % / Concluído) grava no histórico; Concluído também põe a data de pronto.
- **Inspeções/FVS → Unidades**: campo Local com lista de unidades + áreas comuns; aparecem na ficha da unidade.
- **Cronograma → Diário**: "Serviços executados" escolhidos da lista de atividades do Cronograma.

## 4. Histórico do que foi feito (versão 1, em ordem)

1. CRM (Demandas, Fornecedores, Interações), menu lateral, várias obras num só link, perfis de acesso, tema claro/escuro, Início com gráficos, Visão Executiva, Assistente (IA), fotos no Drive, telas de consulta.
2. **Pagamento de Diaristas**: conta dias da Presença até hoje menos períodos já lançados; lança em Lançamentos.
3. **Fichados (CLT)** na mesma tela: valor digitado do holerite do RH (o sistema não calcula folha oficial) + Relatório para o RH com impressão/PDF.
4. **Estimativa de folha** atrás do botão "🔒 Ficha do mês": INSS progressivo, IRRF com redução da Lei 15.270/2025, faltas + DSR, VT 6% limitado ao lançado em Benefícios, adiantamento %, pensão alimentícia privada.
5. **Chuva (CH)**: funcionário fica na obra aguardando → diarista recebe; falta só se justifica com atestado (A); diarista que falta não recebe.
6. **Horas extras** lançadas na Presença: diarista ganha +1 diária a cada bloco de horas; fichado recebe HE + reflexo no DSR; sábado compensado = todas as horas são extras.
7. **Menu novo**: atalhos por usuário, áreas recolhíveis, Ctrl+K, esconder menu, barra no celular.
8. FJ retirado das opções (falta justificada = atestado).
9. **Diário**: filtro de data; Serviços executados padronizados pela lista do Cronograma; detalhe em Ocorrências.
10. **Pagamentos**: previsão de pagamento; pagamento parcial divide a linha (paga + saldo).
11. **Unidades — mapa de controle** + aba Unidades – Histórico; Pagamentos da equipe movido para o Financeiro.
12. **Ligações entre abas** (Local, Diário → Unidades, Cotação → Compra → Lançamento).
13. **Lançamento rápido** (um atalho, duas portas).
14. **Classificar registros antigos do Diário** pela lista do Cronograma (sugestão de um colega da obra), filtro "Serviço", busca sem acento.
15. Linhas verticais entre as colunas das tabelas.

### Ideias já conversadas e ainda não feitas

- Melhorias de velocidade na versão 1 (cache, carregar sob demanda) — substituídas pela opção 3.
- Cotação de serviço → Contrato; Compra entregue → aviso no Diário; Planejamento Semanal ↔ Diário (PPC automático); e-mail diário de avisos; Equipamentos no Diário.
- Atraso nas Unidades: só quando o Cronograma tiver datas previstas por serviço × pavimento (ainda vai ser montado).
- Próximos módulos: **Projetistas e órgãos** (revisões de projeto, protocolos PBH/Bombeiros/concessionárias) e **Serviços da obra**.

## 5. Arquitetura nova (opção 3)

```
 Celular / computador (tela do sistema, funciona offline)
        │  lê e grava só o que precisa
        ▼
 Banco de dados na nuvem  (tabelas + login + fotos + regras de acesso)
        │  cópia automática (a cada hora)
        ▼
 Planilha Google  (só relatório / backup / conferência)
```

| Peça | Escolha | Observação |
|---|---|---|
| Banco | Supabase (PostgreSQL) | Banco + login + Storage + RLS num lugar só; plano gratuito para começar |
| Login | Link mágico por e-mail (Supabase Auth); duas etapas para Administrador | Substitui "compartilhar a planilha" |
| Tela | PWA em React + Vite + TypeScript | Abre no navegador e instala no celular |
| Hospedagem | Vercel, Netlify ou GitHub Pages | Publica a cada mudança aprovada |
| Offline | IndexedDB + fila de envio | Diário e Presença funcionam sem sinal |
| Fotos | Supabase Storage (ou manter Google Drive guardando o link) | Pasta por obra / tela / registro |
| Planilha | Rotina automática banco → planilha | Diretoria e RH continuam vendo como sempre |
| Assistente | Edge Function com a chave em segredo | Chave nunca vai para a tela |

Preços e limites dos planos mudam: conferir no site antes de contratar. Se eu pedir outra tecnologia (Firebase, AppSheet), adapte o plano.

## 6. Modelo de dados

Toda tabela tem: `id`, `obra_id`, `criado_em`, `criado_por`, `alterado_em`, `alterado_por`, `excluido_em`. Colunas que hoje são **fórmula** (totais, saldos, %, status automático) **não** são gravadas: viram views SQL ou cálculo na tela.

**Base**: `obras` (nome, prazo contratual, início, configurações CLT/HE) · `usuarios_obra` (usuário, obra, perfil) · `pessoas` (nome, função, vínculo diarista/CLT/prestador, empresa, forma de pagamento, diária, salário, etapa do custo, CPF, PIX/banco, entrada, saída, situação, observações, diarista_ate — CPF/PIX/salário com acesso restrito) · `servicos` (serviço, unidade, meta por pessoa/dia, preço por produção, etapa) · `feriados`.

**Campo**: `diario` (data, clima manhã/tarde, efetivo por função: pedreiros, serventes, carpinteiro, armadores, bombeiro, eletricista, terceiros; equipamentos; ocorrências; dia produtivo; fotos) + `diario_servicos` (várias atividades do cronograma por dia) · `presenca` (pessoa, data, código — 1 linha por pessoa e dia; hoje é grade mês × pessoa) · `horas_extras` (data, pessoa, horas, tipo do dia) · `producao` (data, serviço, local, equipe, contrato, unidade, quantidade, pessoas, dias, observações, item do orçamento) · `estrutura` (pavimento, código, previsto e real: início, laje concretada, término) · `monitoramento` (instrumento, tipo, ponto/vizinho, fase, data, leituras inicial/atual, trincas novas, responsável) · `estacas` (nº, trecho, datas de locação/perfuração/concretagem, diâmetro, profundidades, volumes, status) · `unidades` (código apto/loja, tipo, pavimento, vistoria final, pendências) + `unidade_servicos` (19 serviços com data de pronto) + `unidade_historico` (data, serviço, evento, %, responsável, observação).

**Planejamento**: `cronograma` (id, etapa, atividade, responsável, depende de 1 e 2, início fixo, duração em dias úteis, % concluído, observações; início/término/status calculados) · `planejamento_semanal` (data, atividade, local, equipe, qtd, unidade, restrição, restrição resolvida, concluída, motivo, observações, dias da semana; PPC calculado) · `tempos_servico` (etapa, serviço, SINAPI, coeficientes, qtd, profissionais, fator de ajuste, id no cronograma).

**Financeiro**: `lancamentos` (data, etapa, descrição, fornecedor, NF, categoria, qtd, valor, vencimento, observações, contrato, forma, status Lançado/Enviado ao financeiro/Agendado/Pago/Cancelado, data do pagamento, linha digitável/PIX, comprovante, parcela, item do orçamento, **origem / origem_id / periodo_de / periodo_ate** no lugar das etiquetas de texto) · `orcamento_itens` · `cotacoes` + `cotacao_propostas` (hoje até 4 fornecedores; no banco, quantos quiser) · `compras` · `contratos` · `medicoes` (bruto, retenção e líquido calculados) · `equipamentos` · `folha_config` (faixas INSS/IR do ano, adiantamento, VT, regras de HE).

**Qualidade**: `inspecoes`, `fvs` (local = unidade ou área comum) · `vistorias` (unidade, tipo apto/loja, itens OK/NC/NA, situação, entrega) · `checklist_itens`.

**CRM e sistema**: `crm_demandas`, `crm_fornecedores`, `crm_interacoes` (colunas de `SIS_COLS` em `Sistema.gs`) · `auditoria` · `atalhos_usuario`.

As abas só de consulta (Orçamento, Fluxo de Caixa, Mapa de Concorrência, Gestão à Vista, Painel…) viram relatórios calculados — sem tabela própria. As colunas exatas de cada aba de hoje estão em `SIS_MODULOS` (`Modulos.gs`).

### Regras de negócio a copiar (conferir com testes)

**Códigos de presença** (`SIS_PRES_COD`):

| Código | Significado | Diarista recebe? | Conta |
|---|---|---|---|
| P | Presente | 1 diária | trabalhado |
| ½ | Meio período | ½ diária | meio dia |
| TR | Treinamento/integração | sim | trabalhado |
| CH | Chuva/obra parada, na obra aguardando | sim | justificado |
| F | Falta sem justificativa | não | falta (tira DSR do fichado) |
| S | Suspensão | não | falta |
| A | Atestado médico (única falta justificada) | não | justificado |
| FE, FG, AF, OB | Férias, folga/compensação, afastado, outra obra | não | justificado |
| FJ | Antigo, só leitura de marcações velhas | — | justificado |

- **Diaristas**: em aberto = dias pagos × diária + diárias de HE, até hoje, menos períodos já lançados. Situação: Lançado / Enviado ao financeiro / Agendado (data de previsão) / Pago. Pagamento parcial divide a linha (paga + saldo, mesmo período). "Diarista até": no dia seguinte vira fichado.
- **Fichados**: valor oficial = holerite digitado. Estimativa só atrás do 🔒: INSS progressivo, IRRF + redução da Lei 15.270/2025, faltas F/S + DSR por semana, VT 6% limitado ao lançado em Benefícios no mês, adiantamento %, HE + reflexo no DSR. **Todo janeiro atualizar as faixas** (hoje: 2026, tabela `FOLHA` em `Sistema.html`). Pensão: % e base, abate no IR (conta iterada), privada.
- **Horas extras**: tipo do dia útil / sábado compensado (todas extras) / domingo ou feriado. Regras: útil 50%, sábado 50%, DF 100%, divisor 220, bloco 3 h, parcial inteiro ou proporcional. Diarista: cada bloco = +1 diária. Fichado: salário ÷ divisor × (1+%) × horas.
- **Diário**: serviços = atividades do Cronograma (várias por dia); textos antigos → sugestão da atividade mais parecida (palavras raras pesam mais, sem acento/maiúscula; sem correspondência forte = "Outro (ver Ocorrências)").
- **Unidades**: 19 serviços, pesos iguais, % = prontos ÷ 19. Situação por prioridade: pendência > aguardando vistoria > concluída > em execução > não iniciada. Uma torre só. Atraso só com data prevista.
- **Cronograma**: início/término por dependências e dias úteis, descontando feriados.
- Gravações simultâneas não podem se atropelar (no banco: transações).

## 7. Etapas de construção

Quando eu disser **"faça a etapa N"**, siga a descrição abaixo. Cada etapa termina com testes passando, tela mostrada (desktop e 390 px) e a seção 9 atualizada.

- **Etapa 0 — Leitura e plano**: ler este arquivo + o repositório de referência; resumo e confirmação do plano. Sem código.
- **Etapa 1 — Projeto, banco e login**: projeto React + Vite + TypeScript (PWA); migrações SQL em `supabase/migrations`; tabelas `obras`, `usuarios_obra`, `auditoria`, `atalhos_usuario`; RLS (usuário só vê as suas obras; Consulta só lê; R$ só para Administrador/Engenheiro/Diretoria); login por link mágico; tela de escolher obra. Me guiar para criar a conta no Supabase e preencher o `.env`.
- **Etapa 2 — Menu, visual e tela genérica**: menu igual ao atual (topo fixo, atalhos ☆, áreas recolhíveis, Ctrl+K, Ctrl+B, barra no celular), carimbo com serve/quando/passos, temas claro/escuro, e um componente de tela genérica (lista + filtros + período + formulário + fotos) configurado por um arquivo de definição como `SIS_MODULOS`. Testar com `feriados`.
- **Etapa 3 — Cadastros e equipe**: `pessoas` (dados sensíveis restritos), `servicos`, `feriados`, CRM.
- **Etapa 4 — Campo**: `diario` + `diario_servicos`, `presenca` (grade mês × pessoa com campo de HE), `horas_extras`, bloco "Avanço nas unidades". **Offline** para Diário e Presença, avisando o que ainda não subiu.
- **Etapa 5 — Pagamentos da equipe**: Diaristas e Fichados CLT com todas as regras da seção 6, Ficha do mês 🔒, Relatório para o RH (PDF). Testes com casos inventados que deem o mesmo valor do sistema atual.
- **Etapa 6 — Financeiro**: lançamentos, orçamento, cotações + propostas, compras, contratos, medições, equipamentos; totais em views; "Gerar compra", "Lançar em Lançamentos", Lançamento rápido; consultas Contas a Pagar, Orçamento, Fluxo de Caixa, Mapa de Concorrência.
- **Etapa 7 — Planejamento**: cronograma calculado, planejamento semanal (quadro, reprogramar, PPC 12 semanas), tempos de serviço, estrutura, monitoramento, estacas; consultas Prazo e Mão de Obra, Quantitativos, Gestão à Vista.
- **Etapa 8 — Qualidade e Unidades**: inspeções, FVS, vistorias, checklist, mapa de controle das unidades com ficha (histórico, inspeções, vistorias, pendências, fotos).
- **Etapa 9 — Início, Visão Executiva, Relatórios, Assistente**: gráficos próprios, análise só com dados existentes, PDFs, IA numa Edge Function com limite mensal.
- **Etapa 10 — Importação e cópia para a planilha**: (a) importar uma planilha da obra para o banco, sem duplicar se rodar de novo, com relatório do que entrou e do que não entrou (inclui converter a grade de presença e ler as etiquetas `[DIARIAS…]`, `[CLT…]`, `[COMPRA n]`); (b) cópia automática banco → planilha de relatório nas mesmas abas e colunas. Me explicar como autorizar o Google sem expor chaves.
- **Etapa 11 — Revisão final**: RLS testada perfil por perfil, cada tela abrindo em menos de 1 s com 2 anos de dados inventados, 390 px, tema escuro, offline, backup diário. Lista do que falta antes de usar na obra.

## 8. Migração e virada (sem parar a obra)

1. **Ensaio**: importar uma **cópia** da planilha num banco de teste e conferir totais (nº de lançamentos, soma por mês, dias de presença por pessoa, % das unidades). Tem que bater.
2. **Paralelo (1 a 2 semanas)**: equipe segue no sistema atual; importação toda noite no novo para eu testar.
3. **Virada** num dia combinado (sexta à tarde): importação final, planilha fica somente leitura para a equipe, todos passam ao link novo.
4. **Depois**: a planilha só recebe a cópia automática (RH, diretoria).
5. **Plano de volta**: o sistema atual só é desligado depois de 1 mês sem problemas.

Levar também as configurações que hoje estão em Script Properties (prazo contratual, "diarista até", regras CLT/HE, pastas de fotos) — só o Administrador exporta. Pensão alimentícia não é migrada.

**O que não pode ser perdido**: lançamentos e pagamentos (inclusive cancelados), presença de todos os meses, Diário com fotos, medições/contratos/retenções, histórico das unidades, vistorias e pendências.

**LGPD**: CPF, PIX, salário e presença são dados pessoais — acesso só para quem precisa, registrado na auditoria; quem sai da obra perde o acesso, mas os registros ficam pelo tempo exigido.

**Manutenção**: todo janeiro atualizar INSS/IR; manter este `CLAUDE.md` atualizado a cada etapa.

## 9. Andamento (o Claude atualiza esta seção)

- [ ] Etapa 0 — Leitura e plano
- [ ] Etapa 1 — Projeto, banco e login
- [ ] Etapa 2 — Menu, visual e tela genérica
- [ ] Etapa 3 — Cadastros e equipe
- [ ] Etapa 4 — Campo
- [ ] [ ] Etapa 5 — Pagamentos da equipe
- [ ] Etapa 6 — Financeiro
- [ ] Etapa 7 — Planejamento
- [ ] Etapa 8 — Qualidade e Unidades
- [ ] Etapa 9 — Início, Visão Executiva, Relatórios, Assistente
- [ ] Etapa 10 — Importação e cópia para a planilha
- [ ] Etapa 11 — Revisão final

Decisões tomadas e pendências: fundação reaproveitada na branch `etapa-1-fundacao` da conta LCM; compilação em validação, banco e autenticação ainda não conectados. Anexos ficam exclusivamente no Google Drive, banco guarda metadados e vínculo. Sem contratação de recursos pagos ou publicação sem autorização.

---

# Anexo A — Regras detalhadas do sistema atual (cópia do CLAUDE.md da versão 1)

> Referência técnica da versão 1 em Apps Script. Os nomes de funções (`sis…`) e de abas servem para localizar a lógica no repositório de referência. Na versão nova, siga as seções 1 a 9 acima quando houver diferença.


- Usuário: equipe responsável pela gestão de obras. Falar e escrever **em português do Brasil**, linguagem simples (ele não é programador).
- Arquitetura: **planilha Google = banco de dados**; telas em **Apps Script** (`apps-script/Sistema.gs` (CRM) + `apps-script/Modulos.gs` (menu e leitura/gravação genérica das abas) + `apps-script/Sistema.html`, HtmlService, `google.script.run`); `docs/index.html` = página de entrada no GitHub Pages, sem dados.
- **Nunca** colocar dados da obra (nomes de pessoas, CPF, valores reais, PIX, e-mails) neste repositório — ele é público.
- Funções do servidor começam com `sis` para não colidir com o `Script_Obra.gs` que já existe no mesmo projeto (ele define `onOpen`, `irPara`, `abrirMenuLateral` etc. — não redefinir).
- Abas do CRM: `CRM Demandas`, `CRM Fornecedores`, `CRM Interações`. Colunas em `SIS_COLS` (`Sistema.gs`); acrescentar colunas sempre **no fim** para não desalinhar dados existentes.
- Abas da obra lidas (não alterar): Cotações (cabeçalho linha 5, propostas K/L, P/Q, U/V, Z/AA, escolhido AJ, status AM), Contratos (linha 4), Medições (linha 4), Lançamentos (linha 4), Compras (linha 4), Pessoas (nomes em B a partir da linha 6), Resumo!B2 (nome da obra).
- Várias obras: um só deploy. A tela chama tudo por `sisChamar(obraId, fn, args)` (lista branca de funções); o servidor abre a planilha com `sisSS_()` (openById da obra escolhida ou, sem obra, a planilha onde o script está). Nunca usar `SpreadsheetApp.getActiveSpreadsheet()` direto. Registro das obras e do Modelo em Script Properties (`SIS_OBRAS`, `SIS_MODELO`). Acesso = compartilhamento da planilha (app roda como quem acessa). URL `.../exec?obra=<id>` abre direto.
- Perfis (`Sistema.gs`): aba `Sistema Perfis` por obra; `sisPermitir_` confere no servidor em `sisChamar`; `sisPermissoes_` vai na carga (`PM` na tela). Botões de gravar têm a classe `so-grava` (somem no perfil Consulta). Valores em R$ só para `PM.custos`.
- Menu (`montarMenu`, `Sistema.html`): topo fixo (Início, Visão Executiva, Relatórios, Assistente) + "Seus atalhos" (por usuário, UserProperties `SIS_ATALHOS` via `sisAtalhos`; botão ☆ "Fixar nos atalhos" no carimbo) + Áreas recolhíveis de `SIS_GRUPOS` (campo, plan, custo=Financeiro, qual, equipe, cad; ícones SVG em `ICO`). Permissão de custos é a flag `custo: true` do módulo (não o grupo). Busca com Ctrl+K (Enter abre a 1ª), Ctrl+B / botão esconde o menu (lembrado no navegador), celular com barra inferior (Início, Diário, Presença, Mais). Só o corpo do menu é redesenhado na busca. Atalho virtual **Lançamento rápido** (`rapido`, `abrirRapido`): substitui os dois atalhos Pagamentos da equipe + Lançamentos (`atalhosLista` troca os dois por ele, na posição do primeiro); janela com 2 cards → `ir('diaristas')` ou `ir('lancamentos')` + formulário novo. É só porta de entrada: as duas telas continuam no Financeiro, sem mudança.
- Tema: variáveis CSS em `:root` e `:root[data-tema="escuro"]`; não usar cor fixa no CSS, criar variável. Gráficos do Início em SVG próprio (`painel()`), cores `--s0..--s3` (validadas para daltonismo nos dois temas).
- Publicação: o `atualizador/` (projeto separado do dono, gatilho de hora em hora) copia `apps-script/*` do `main` para o projeto do sistema e atualiza a implantação. Ou seja, **juntar no main = publicar em até 1 h**. Só fazer merge com autorização do responsável pelo projeto.
- Implantação SEMPRE "Executar como: Usuário que acessa" (senão quem tem o link mexe em tudo com a conta do dono).
- Fotos (`Modulos.gs`): módulo com `fotos: '<letra>'` ganha bloco de fotos no formulário; arquivos no Drive (`DriveApp`, pasta por obra em Script Property `SIS_FOTOS_<idPlanilha>`, subpasta por tela e por chave do registro). A foto é reduzida no navegador (1600 px, JPEG) e enviada uma a uma.
- Presença: códigos em `SIS_PRES_COD` (`Modulos.gs`). Mudou o que conta como trabalhado/falta? Atualizar também `sisPresencaAtualizar_` (migração única, só Administrador, só se reconhecer a fórmula antiga). Fórmulas usam `SUMPRODUCT(COUNTIFS(..., {"P","TR"}, ...))` (funciona no Sheets, Excel e LibreOffice).
- Planejamento: `dias: 'N'` no módulo liga o quadro da semana (`desenharQuadro`), o seletor de dias no formulário e `sisPlanReprogramar`. Coluna N da aba guarda "Seg, Ter, …" (vazia = semana toda).
- Assistente (`Modulos.gs`, `sisIa*`): chave em Script Property `SIS_IA_CHAVE` (nunca no repositório), modelo `SIS_IA_MODELO`, limite mensal `SIS_IA_LIMITE`, uso `SIS_IA_USO_<aaaa-mm>`. Só leitura + propostas; nada grava sem confirmação na tela. Desligado por padrão.
- Visão Executiva: `sisExecutivo(obraId, de, ate)` (troca de obra dentro da chamada; acesso continua pelo compartilhamento) + `exCalc`/`exAlertas`/`exAnalise` na tela. Regra: alertas e análise só com dados existentes — nunca inventar causa, valor ou previsão. Prazo contratual em Script Property `SIS_PRAZO_<idPlanilha>`.
- Pagamento de diaristas (`sisDiaristas*`, `Modulos.gs`): conta dias P/½/TR + CH (chuva: fica na obra aguardando; `diaria: 1` em `SIS_PRES_COD`) da Presença; falta/atestado não paga diarista; FJ tem `oculto: true` (só lê marcações antigas; falta justificada = A); (linha da pessoa achada pelo nome) até hoje, menos os períodos já lançados. Pagamentos = linhas da aba Lançamentos (Mão de obra) com `[DIARIAS aaaa-mm-dd a aaaa-mm-dd]` nas Observações; status O (Lançado/Pago/Cancelado), data P. Situação ao lançar: Lançado / Enviado ao financeiro / Agendado (data = previsão, no Vencimento I) ou Pago; `sisDiaristaPrevisao` muda previsão; `sisDiaristaPago(lanc, data, valor)` com valor menor divide a linha (paga + nova linha com o saldo, mesma marca). `sisComTrava_` é reentrante (`SIS_TRAVA`). "Diarista até" (quem foi fichado) em Script Property `SIS_DIAR_ATE_<idPlanilha>` por linha de Pessoas. Aba "Fichados (CLT)" na mesma tela (`sisFichados(mes)`, `sisFichadoLancar`): valor digitado do holerite do RH (o sistema não calcula folha), tag `[CLT aaaa-mm ADIANTAMENTO|SALARIO|BENEFICIOS]`; quem tem "diarista até" vira fichado no dia seguinte; "Relatório para o RH" = presença do mês. Estimativa de folha só na tela (`FOLHA`, `folhaEstimar` em `Sistema.html`): INSS progressivo, IRRF + redução da Lei 15.270/2025, faltas F/S + DSR por semana, VT 6% limitado ao lançado em BENEFICIOS no mês, adiantamento %; tudo só no botão "🔒 Ficha do mês" (gaveta, nada à mostra no cartão). Pensão alimentícia (% e base; abate no IR, conta iterada) = consulta privada em UserProperties `SIS_PENS_<idPlanilha>` (`sisPensao`), nunca na planilha nem para outros usuários; config em Script Property `SIS_CLT_CFG_<idPlanilha>` (`sisFichadoConfig`). **Todo janeiro atualizar as faixas de `FOLHA`.** O valor que vale é o do holerite.
- Horas extras (`sisPresencaHE`, `sisHe*_`, `Modulos.gs`): lançadas na tela Presença (campo HE por pessoa/dia), guardadas na aba **Horas Extras** (criada pelo sistema: 1 linha por pessoa+dia: Data, Linha Pessoas, Nome, Horas, Tipo). Tipo do dia: UTIL / SAB (sábado compensado: todas as horas são extras) / DF (domingo ou data da aba Feriados). Regras em `SIS_CLT_CFG_<id>.he` (util 50, sab 50, df 100, divisor 220, bloco 3, parcial inteiro|proporcional), tela "Regras de hora extra". Diarista: cada `bloco` h = +1 diária (entra no valor em aberto). Fichado: salário ÷ divisor × (1+%) × h + reflexo no DSR na Ficha do mês, e colunas no Relatório para o RH.
- Diário (`servicos: 'M'`, `descricao: 'N'` no módulo): "Serviços executados" = atividades do Cronograma (B/C linhas 7–67, `sisAtividades`), várias por dia separadas por "; "; o detalhe (onde e o quê) vai em Ocorrências (N). Registros antigos com texto livre: botão "Classificar pela lista do Cronograma" (só Administrador) → `sugerirAtividade` (palavras raras pesam mais; sem match forte = "Outro (ver Ocorrências)") → `sisDiarioClassificar` grava a atividade em M e move o texto para N ("Executado: … | Ocorrência: …"). Filtro "Serviço" na lista (`SERVF`). `chave()` compara sem acento, pontuação ou maiúscula. Tabelas com coluna-chave de data ganham filtro De/até + períodos rápidos (`PERIODO`, `periodoTab`).
- Unidades = **Mapa de controle** (`mapa: true` → `vUnidades`; aba "Tabela" volta à tabela genérica). `sisUnidades` lê Unidades (A–Z, 19 serviços E–W = data de pronto, Y vistoria final, Z pendências), Vistoria Aptos (AI NC … AQ situação, AR entrega) / Vistoria Lojas (V … AD, AE), Inspeções/FVS cujo Local cita a unidade (`sisUnCita_`) e a aba **Unidades – Histórico** (criada pelo sistema: Data, Unidade, Serviço, Evento, %, Responsável, Observação). Situação: pendência > aguardando vistoria > concluída > em execução > não iniciada; % = prontos ÷ 19, pesos iguais (como a planilha). Uma torre só (sem coluna de bloco: não inventar). Grava: `sisUnidadeServico` (data de pronto + histórico), `sisUnidadeEvento` (Iniciado/Andamento/Observação), `sisUnidadePendencia` (coluna Z). Fotos por unidade (`fotosPasta: true`, sem coluna). Atraso só quando existir data prevista (não existe ainda). Pagamentos da equipe fica em Financeiro; lançamentos com [DIARIAS/[CLT ganham etiqueta "Equipe" em Lançamentos.
- Ligações entre abas (`Modulos.gs`): Inspeções/FVS têm `local: 'C'` → campo Local com lista das unidades + áreas comuns (`campoLocal`, `sisUnidadesNomes`). Diário: bloco "Avanço nas unidades" (`blocoLote`) → `sisUnidadesLote(data, col, unidades, Iniciado|Andamento|Concluído, %)` grava no Unidades – Histórico (Concluído também põe a data na aba Unidades). Cotação Fechada + fornecedor escolhido → botão "Gerar compra" (`sisCotacaoCompra`: 1ª linha sem material em Compras, usa o Nº já numerado, pagamento do fornecedor escolhido; escreve "Compra nº X" em AN). Compra → "Lançar em Lançamentos" (`sisCompraLancar`, marca `[COMPRA n]`, Material, sem duplicar; `sisComprasLancadas`).
- Abas de consulta: `sisConsultaLer` (aba inteira, valores exibidos, máscaras de fórmula/negrito/fundo, listas) e `sisConsultaGravar` (1 célula sem fórmula, linha ≥ 3). Na tela só é editável número/data/lista ou célula vazia de coluna de entrada. Objetivo do responsável pelo projeto: a equipe não precisar abrir a planilha (link só para Administrador).
- `google.script.run` não aceita `Date` no retorno: converter para texto `yyyy-MM-dd` (`sisIso_`). Datas sempre no fuso da PLANILHA (`sisTz_()`), e texto → data com `sisData_`/`sisDia_` (meio-dia), nunca `new Date(a, m, d)` — o fuso do projeto de script pode ser outro e a data cai no dia anterior.
- Escapar todo texto vindo da planilha com `esc()` antes de pôr no HTML.
- Cada tela da planilha é um item de `SIS_MODULOS` (`Modulos.gs`): aba, linha do cabeçalho (`hdr`, `hdr2` se o nome está mesclado na linha de cima), primeira/última linha de dados, coluna-chave, última coluna, colunas da lista (`mostrar`) e os textos `serve` / `quando` / `passos`. Ao mudar o layout de uma aba na planilha, atualizar aqui.
- `sisAbaSalvar` nunca grava em célula com fórmula (confere a 1ª linha de dados).
- Testar fora do Google: `node tests/teste.js` (mock fictício `window.SIS_MOCK(fn, args)` + Playwright); conferir também em 390 px. Teste com a estrutura real da planilha só fora do repositório.
- Visual: "prancha técnica" — carimbo no topo de cada tela, grafite #22272b, fundo #eceeec, azul #1f3864 para ações, amarelo #f2b705 só para marcador ativo/foco/guia; Barlow Condensed (títulos) + IBM Plex Sans.
- Próximas versões planejadas: módulo **Projetistas e órgãos** (revisões de projeto, protocolos PBH/Bombeiros/concessionárias) e **Serviços da obra** (cronograma, produção, inspeções e vistorias lidas das abas existentes).
