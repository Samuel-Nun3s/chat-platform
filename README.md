# Chat Platform

Plataforma de mensagens em tempo real com suporte a conversas privadas e grupos. Construída com NestJS, WebSockets e Redis pub/sub para entrega de mensagens em escala horizontal.

## Funcionalidades

- Autenticação com JWT e refresh token rotation
- Conversas privadas e grupos
- Mensagens em tempo real via WebSockets
- Presença online e typing indicator
- Confirmação de leitura por mensagem
- Upload de mídia (AWS S3)
- Notificações push

## Stack

**Backend**
- NestJS
- TypeORM + PostgreSQL
- Redis (pub/sub e estado efêmero)
- Socket.io
- JWT (autenticação)
- Docker

**Frontend**
- React
- TypeScript

## Arquitetura

```
chat-platform/
├── backend/
│   └── src/
│       ├── modules/
│       │   ├── auth/        # JWT, refresh token, strategies
│       │   ├── users/       # Perfil, avatar, busca
│       │   ├── chats/       # Criar chat, membros, histórico
│       │   ├── messages/    # Salvar e buscar mensagens
│       │   └── gateway/     # WebSocket — eventos em tempo real
│       └── common/          # Guards, decorators, filters
├── frontend/
├── docker-compose.yml
└── .env
```

## Banco de dados

**PostgreSQL** — dados persistentes

| Tabela | Descrição |
|---|---|
| `users` | Usuários da plataforma |
| `chats` | Conversas privadas e grupos |
| `chat_members` | Membros de cada conversa |
| `messages` | Mensagens com suporte a texto, imagem e arquivo |
| `read_receipts` | Registro de leitura por mensagem |

**Redis** — estado efêmero e pub/sub

| Chave | TTL | Uso |
|---|---|---|
| `presence:{userId}` | 30s | Indicador de presença online |
| `typing:{chatId}:{userId}` | 3s | Typing indicator |
| canal `chat:{chatId}` | — | Pub/sub para entrega de mensagens entre instâncias |

## Como rodar

### Pré-requisitos

- Node.js 20+
- Docker e Docker Compose
- NestJS CLI (`npm install -g @nestjs/cli`)

### Setup

**1. Clone o repositório e entre na pasta**
```bash
git clone <url>
cd chat-platform
```

**2. Configure as variáveis de ambiente**
```bash
cp .env.example .env
```
Preencha os valores no `.env`. Consulte `env-setup.md` para instruções detalhadas.

**3. Suba os containers**
```bash
docker-compose up -d
```

**4. Instale as dependências do backend**
```bash
cd backend
npm install
```

**5. Suba o servidor**
```bash
npm run start:dev
```

O servidor estará disponível em `http://localhost:3000`.

> Consulte `setup.md` para um guia completo e detalhado de cada etapa.

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `PORT` | Porta do servidor |
| `DB_HOST` | Host do PostgreSQL |
| `DB_PORT` | Porta do PostgreSQL |
| `DB_USER` | Usuário do banco |
| `DB_PASSWORD` | Senha do banco |
| `DB_NAME` | Nome do banco |
| `REDIS_HOST` | Host do Redis |
| `REDIS_PORT` | Porta do Redis |
| `JWT_SECRET` | Chave secreta do access token |
| `JWT_REFRESH_SECRET` | Chave secreta do refresh token |
| `JWT_EXPIRES_IN` | Expiração do access token (ex: `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Expiração do refresh token (ex: `7d`) |
