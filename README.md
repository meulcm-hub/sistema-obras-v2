# Sistema de Obras v2

Nova aplicação em React + Vite + TypeScript, com Supabase (PostgreSQL, Auth e RLS). O sistema atual continua funcionando em paralelo e não é alterado por este projeto.

## Estado atual

- Etapa 1 em construção: fundação React, tela inicial, login por link mágico e seleção de obra.
- Migração inicial do banco em `supabase/migrations`.
- Nenhuma planilha real, dado pessoal ou segredo deve ser enviado a este repositório público.

## Rodar localmente

Requisitos: Node.js 20.19+ ou 22.12+.

1. Instale as dependências: `npm install`.
2. Copie `.env.example` para `.env.local`.
3. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os dados do projeto Supabase.
4. Inicie: `npm run dev`.
5. Para validar a compilação: `npm run build`.

Nunca use a chave `service_role` no navegador, no GitHub ou em arquivos `VITE_*`. A chave publicável/anon é própria para o cliente, mas a segurança depende das políticas RLS.

## Preparar o Supabase

1. Crie um projeto no painel do Supabase.
2. Somente após revisão e validação em ambiente de teste, abra **SQL Editor** e execute o conteúdo de `supabase/migrations/202611260001_initial_schema.sql`.
3. Em **Authentication → URL Configuration**, configure a URL local `http://localhost:5173` e, depois, a URL de produção.
4. Em **Authentication → Providers → Email**, mantenha habilitado o acesso por e-mail.
5. Copie a Project URL e a chave publicável para o arquivo local `.env.local`.

### Primeiro acesso de Administrador

A primeira conta precisa ser criada em **Authentication → Users**. O cadastro automático por link está desabilitado no cliente; desabilite também o cadastro público na configuração de autenticação. Em seguida, o dono deve cadastrar a primeira obra e o vínculo de Administrador pelo SQL Editor, substituindo os valores de exemplo:

```sql
insert into public.obras (nome, cidade, criado_por)
values ('Obra de Teste', 'Cidade de Teste', 'UUID-DO-USUARIO')
returning id;

-- Use o ID retornado acima:
insert into public.usuarios_obra (obra_id, usuario_id, perfil)
values ('UUID-DA-OBRA', 'UUID-DO-USUARIO', 'Administrador');
```

Não execute com dados reais em ambiente de teste compartilhado. A criação inicial de obra e do primeiro administrador é manual intencionalmente; não existe cadastro público de obras nem autoelevação de perfil.

## Segurança e regras

- Permissões no banco com Row Level Security (RLS).
- Usuário só consulta obras às quais tem vínculo ativo.
- Perfis iniciais: Administrador, Engenheiro, Diretoria, Encarregado e Consulta.
- Nenhum segredo de servidor no frontend.
- Dados de pensão alimentícia não fazem parte de tabelas compartilhadas.
- Exclusões futuras serão lógicas, com auditoria.
- Datas de negócio devem respeitar `America/Sao_Paulo`.

## Publicação

Ainda não há deploy. Arquivos e documentos ficarão no Google Drive; integração pendente. O plano gratuito deve ser utilizado sem upgrade automático. O envio de links de login e a auditoria automática no banco ainda precisam ser validados. Não publicar até configurar e testar o Supabase, as permissões e o fluxo de login. A publicação será uma etapa separada e autorizada.
