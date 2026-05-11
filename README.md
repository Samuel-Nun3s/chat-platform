# Accord

> _Conversas tranquilas, trocadas com cuidado._

Plataforma de mensagens em tempo real construída como projeto pessoal de portfolio. Frontend em React + TypeScript, backend em NestJS com PostgreSQL e Redis. O escopo prioriza profundidade sobre quantidade de features — autenticação completa com rotação de refresh token, presença de membros em chats privados e grupos, confirmações de entrega e leitura em tempo real, upload de avatar, soft delete de mensagens, etc.

Não é um produto pra produção — é um lugar pra estudar arquitetura, modelagem e UX em uma stack moderna.

<p align="center">
  <img src="docs/screenshots/tela-de-login.png" alt="Tela de login" width="48%" />
  &nbsp;&nbsp;
  <img src="docs/screenshots/chat-group.png" alt="Conversa em grupo" width="48%" />
</p>

## Features

**Autenticação**
- Registro e login com email + senha (bcrypt, 10 rounds)
- Access token JWT (15 min) + Refresh token JWT (7 dias)
- **Rotação de refresh token** por `tokenVersion` no DB — refresh tokens antigos viram inválidos automaticamente
- Auto-refresh transparente no frontend em qualquer 401, com retry da requisição original

**Conversas**
- Chats privados (limitados a 2 membros, bloqueio de duplicatas no backend)
- Grupos com nome e foto customizada (admin-only)
- Adicionar/remover membros, sair de grupo, apagar conversa (DELETE membership)
- Busca de usuários por nome ou email com debounce

**Mensagens em tempo real**
- WebSocket via Socket.IO com **Redis adapter** (pub/sub) — preparado pra escalar horizontalmente
- JWT verificado em `handleConnection` — usuário entra automaticamente em todas as suas salas (`chat:<id>` e sala pessoal `user:<id>`)
- Soft delete via `deletedAt`
- Confirmações de **entregue** (✓✓ cinza) e **lida** (✓✓ azul) por mensagem, agregadas por chat
- Notificação em tempo real de novos chats (quando alguém te adiciona) e remoções (kick)
- Badge de não-lidas na sidebar

**Perfil**
- Upload de foto (multer + disk storage, validação de tipo e tamanho 5MB)
- Edição de nome
- Fotos servidas estaticamente em `/uploads`

**Segurança**
- Guards de membership em todos os endpoints de chat (HTTP + WebSocket)
- Guards de admin para gerenciar membros e foto do grupo
- `senderId` das mensagens sempre vem do JWT — não do payload do cliente
- Validação com `class-validator` em todos os DTOs

**UX**
- Dark mode com paleta verde-sage refinada
- Tipografia editorial (Fraunces serif + Geist + JetBrains Mono)
- Glassmorphism nos modais (`backdrop-filter`)
- Responsivo: em mobile a sidebar e o chat alternam baseado no chat ativo, modais viram bottom sheets
- Tradução completa pt-BR (incluindo erros do backend)

## Stack

**Backend** — NestJS 11 · TypeORM · PostgreSQL 16 · Redis 7 · Socket.IO · Passport (JWT) · class-validator · bcrypt · multer

**Frontend** — React 19 · TypeScript · Vite · Zustand (com `persist` middleware) · fetch nativo · Socket.IO client · CSS Modules

## Arquitetura

```
chat-platform/
├── backend/
│   └── src/
│       ├── main.ts                 # bootstrap, CORS, Redis adapter, static assets
│       ├── app.module.ts
│       ├── health.controller.ts    # GET /health
│       ├── config/
│       │   ├── database.config.ts  # TypeORM (synchronize: true em dev)
│       │   └── redis-io.adapter.ts # adapter pub/sub do socket.io
│       ├── common/
│       │   ├── guards/             # JwtAuthGuard, JwtRefreshGuard, WsJwtGuard
│       │   ├── filters/            # WsExceptionFilter (emite 'error' para o socket)
│       │   └── decorators/
│       └── modules/
│           ├── auth/               # register, login, refresh com token rotation
│           ├── users/              # me, update, avatar upload, search
│           ├── chats/              # criar, listar, members, avatar (group)
│           ├── messages/           # listar, soft delete, mark as delivered/read
│           └── gateway/            # ChatGateway — handlers WS + notifyUser()
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── AuthPage/           # split layout (brand + form)
│       │   └── ChatPage/           # sidebar + main area
│       ├── components/
│       │   ├── Sidebar/            # lista de chats, busca, badges
│       │   ├── ChatWindow/         # header, lista de mensagens, ticks
│       │   ├── MessageInput/
│       │   └── common/
│       │       ├── ConfirmModal/
│       │       ├── NewChatModal/
│       │       ├── ProfileModal/
│       │       ├── ManageMembersModal/
│       │       └── Toast/
│       ├── hooks/useSocket.ts      # connect, mark_as_read, listeners
│       ├── services/
│       │   ├── api.ts              # fetch wrapper com auto-refresh em 401
│       │   ├── socket.ts           # singleton do socket.io client
│       │   └── privateChat.ts      # find-or-create para chats privados
│       ├── store/                  # zustand: authStore (persist), chatStore, toastStore
│       └── utils/avatar.ts         # API_BASE + helper de URL de avatar
├── docker-compose.yml              # Postgres + Redis
├── .env.example                    # vars para docker-compose
├── backend/.env.example
└── frontend/.env.example
```

## Banco de dados

| Tabela | Descrição |
|---|---|
| `users` | id, name, email, password (bcrypt), avatarUrl, tokenVersion |
| `chats` | id, type (`private`\|`group`), name, avatarUrl |
| `chat_members` | chatId, userId, role (`admin`\|`member`), joinedAt |
| `messages` | id, chatId, senderId, content, type, createdAt, deletedAt |
| `read_receipts` | messageId, userId, deliveredAt, readAt |

> O backend usa `synchronize: true` do TypeORM em dev — o schema é recriado/atualizado a partir das entidades a cada start. Não há migrations; ao parar e reiniciar os containers do banco os dados podem ser perdidos. **Não é configuração para produção.**

## Como rodar

### Pré-requisitos

- Node.js 20+
- Docker e Docker Compose
- (Opcional) NestJS CLI: `npm install -g @nestjs/cli`

### 1. Clone e configure variáveis de ambiente

```bash
git clone <url>
cd chat-platform

# .env do root é usado pelo docker-compose para subir Postgres e Redis
cp .env.example .env

# o backend lê suas próprias variáveis
cp backend/.env.example backend/.env

# o frontend só precisa do VITE_API_BASE (opcional, tem fallback)
cp frontend/.env.example frontend/.env
```

Edite os dois `.env` (root e backend) com os mesmos valores de `DB_*`, `REDIS_*` e gere segredos fortes pros JWT:

```bash
# duas chaves aleatórias diferentes
openssl rand -base64 32
openssl rand -base64 32
```

### 2. Suba Postgres e Redis

```bash
docker compose up -d
```

### 3. Backend

```bash
cd backend
npm install
npm run start:dev
```

Disponível em `http://localhost:3000`. Verifique com:

```bash
curl http://localhost:3000/health
# {"status":"ok","service":"accord-backend","timestamp":"..."}
```

### 4. Frontend

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

Acesse `http://localhost:5173`.

### Primeira utilização

1. Cadastre-se em duas contas (uma janela normal + uma anônima funciona)
2. Em uma das contas, abra "Nova conversa" → busque o outro usuário → crie um chat privado
3. Em uma das contas, crie um grupo e adicione o outro
4. Troque mensagens, observe ticks ✓ → ✓✓ → ✓✓ azul, badges de não-lida, etc.

## Variáveis de ambiente

| Variável | Onde | Descrição |
|---|---|---|
| `PORT` | backend | Porta do servidor (default `3000`) |
| `CORS_ORIGIN` | backend | Origem permitida no CORS (default `http://localhost:5173`) |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | root + backend | Conexão Postgres |
| `REDIS_HOST` / `REDIS_PORT` | backend | Conexão Redis |
| `JWT_SECRET` | backend | Chave do access token |
| `JWT_REFRESH_SECRET` | backend | Chave do refresh token |
| `JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | backend | Tempo de expiração (ex: `15m`, `7d`) |
| `SALT_ROUNDS` | backend | Rounds do bcrypt |
| `VITE_API_BASE` | frontend | URL do backend (default `http://localhost:3000`) |

## Endpoints

### HTTP

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `GET` | `/health` | público | health check |
| `POST` | `/auth/register` | público | registro |
| `POST` | `/auth/login` | público | login |
| `POST` | `/auth/refresh` | Bearer refresh | rotaciona tokens |
| `GET` | `/users/me` | JWT | usuário logado |
| `PATCH` | `/users/me` | JWT | atualiza nome |
| `POST` | `/users/me/avatar` | JWT | upload de avatar (multipart) |
| `GET` | `/users/search?q=` | JWT | busca por nome/email |
| `GET` | `/chats` | JWT | meus chats |
| `POST` | `/chats` | JWT | cria chat |
| `GET` | `/chats/:id/members` | JWT membro | membros do chat |
| `POST` | `/chats/:id/members` | JWT membro | adiciona membro |
| `DELETE` | `/chats/:id/members/:userId` | JWT (admin OU self) | remove membro |
| `POST` | `/chats/:id/avatar` | JWT admin | upload de avatar do grupo |
| `GET` | `/chats/:id/messages` | JWT membro | histórico de mensagens |

### WebSocket events

**Cliente → Servidor:** `join_chat`, `send_message`, `mark_as_delivered`, `mark_as_read`, `mark_chat_as_read`, `delete_message`

**Servidor → Cliente:** `new_message`, `new_chat`, `chat_left`, `message_delivered`, `message_read`, `message_deleted`

## Testes

| Camada | Framework | Cobertura |
|---|---|---|
| Backend | Jest + ts-jest | 40 testes unitários nos services (`auth`, `chats`, `messages`, `users`) com repositórios e JwtService mockados. Cobre fluxos críticos: rotação de refresh token, regras de membership em chats privados/grupos, soft delete de mensagens, marcação de entregue/lida. |
| Frontend | Vitest | 15 testes na `chatStore` (unread, lastActivity, removeChat, upsertReceipt) e na utility `findOrCreatePrivateChat` (find vs create, condições de match). |

```bash
# Backend
cd backend && npm test
# 4 test suites, 40 tests, ~1.7s

# Frontend
cd frontend && npm test
# 2 test files, 15 tests, <500ms
```

> Próximos passos: tests e2e dos controllers via supertest (a infra já está pronta em `backend/test/`) e component tests no front com `@testing-library/react`.

## Decisões intencionais

- **Sem migrations** — `synchronize: true` é mais rápido para iterar em dev e suficiente para portfolio. Em produção mudaria para migrations geradas por `typeorm-ts-node-esm`.
- **Disco local pra avatares** — funciona em dev; produção usaria S3 ou similar.
- **`fetch` nativo no frontend** — sem Axios (versões recentes do Axios tiveram CVEs); o wrapper em [api.ts](frontend/src/services/api.ts) cobre o suficiente.
- **Zustand** ao invés de Redux — menos boilerplate para o tamanho do projeto.
- **CSS Modules** — sem CSS-in-JS; cada componente tem seu `.module.css`.

## Licença

[MIT](./LICENSE) — Samuel Nunes
