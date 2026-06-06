# CLAUDE.md

## Project Overview

Sistema de gestão patrimonial (bens móveis, imóveis, veículos e consumíveis) com ciclo de vida completo, carga patrimonial por usuário, inventário e depreciação.

## Stack

- **Backend**: Go 1.22 + Gin + GORM + PostgreSQL
- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS + Zustand
- **Auth**: JWT (access 60min / refresh 24h)

## Arquitetura Backend (SRP)

```
internal/
  config/      → carregamento de configuração (viper)
  domain/      → entidades + interfaces de repositório e serviço
  repository/  → acesso ao banco (um arquivo por entidade)
  service/     → regras de negócio (um arquivo por domínio)
  handler/     → controllers HTTP (um arquivo por recurso)
  middleware/  → auth, role, logger
pkg/
  database/    → conexão e migrations GORM
  jwt/         → geração e validação de tokens
  response/    → helpers de resposta HTTP padronizada
```

## Numeração de Patrimônio

Formato: `PAT-{TIPO}-{ANO}-{SEQUÊNCIA:06d}`
- Móvel:      `PAT-MOV-2024-000001`
- Imóvel:     `PAT-IMO-2024-000001`
- Veículo:    `PAT-VEI-2024-000001`
- Consumível: `PAT-CON-2024-000001`

## Roles de Usuário

| Role         | Permissões                                          |
|--------------|-----------------------------------------------------|
| ADMIN        | Tudo, incluindo baixas e exclusões                  |
| GESTOR       | CRUD de bens, custódias, movimentações              |
| RESPONSAVEL  | Visualizar e registrar manutenções                  |
| CONSULTA     | Somente leitura                                     |

## Comandos de Desenvolvimento

### Backend
```bash
cp .env.example .env    # configurar variáveis
make run                # iniciar servidor (porta 8080)
make build              # compilar binário
make test               # rodar testes
```

### Frontend
```bash
cd frontend
npm install
npm run dev             # iniciar (porta 3000)
npm run build           # build de produção
```

## Variáveis de Ambiente Obrigatórias

```
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
JWT_SECRET
```

## Padrões de Código

- Cada arquivo de domínio define: struct, interface de repositório, interface de serviço, DTOs de input
- Handlers só fazem: bind de input, chamada de serviço, resposta HTTP
- Serviços contêm toda a regra de negócio — não acessam o banco diretamente
- Repositórios só fazem queries — sem regra de negócio
- `pkg/response` para todas as respostas HTTP (nunca `c.JSON` direto nos handlers)
