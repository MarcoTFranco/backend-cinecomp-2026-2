# Design: Desafio de Infraestrutura — CineComp API

**Data:** 2026-10-30  
**Projeto:** backend-cinecomp-2026-2  
**Objetivo:** Adicionar testes automatizados, Dockerfile multi-stage e pipeline CI/CD completa com 6 etapas ao backend existente da CineComp API.

---

## 1. Contexto

O backend é uma API REST Node.js/Express com SQLite (Sequelize), JWT, CRUD de filmes e favoritos. Não possui testes automatizados, Dockerfile nem CI/CD. O desafio exige cobertura ≥70%, pipeline GitHub Actions com 6 etapas sequenciais e deploy automatizado no Render.

---

## 2. Estrutura de Arquivos

Arquivos adicionados ao repositório existente:

```
backend-cinecomp-2026-2/
├── .github/
│   └── workflows/
│       └── ci-cd.yml
├── tests/
│   ├── unit/
│   │   ├── authService.test.js
│   │   ├── movieService.test.js
│   │   ├── favoriteService.test.js
│   │   └── userService.test.js
│   └── integration/
│       ├── auth.test.js
│       ├── movies.test.js
│       ├── favorites.test.js
│       └── users.test.js
├── Dockerfile
├── .dockerignore
├── .eslintrc.json
├── sonar-project.properties
├── jest.config.js
└── README.md
```

**Modificações no código existente:**
- `src/config/database.js` — aceitar `DATABASE_URL=:memory:` quando `NODE_ENV=test`
- `package.json` — adicionar `jest`, `supertest`, `eslint` em devDependencies e scripts `test`, `test:coverage`, `lint`

---

## 3. Estratégia de Testes

**Framework:** Jest + Supertest  
**Banco em testes:** SQLite `:memory:` via `DATABASE_URL=:memory:` + `NODE_ENV=test`  
**Meta:** ≥70% de cobertura (projeção: ~80%)

### Testes Unitários (`tests/unit/`)
Testam os services diretamente, sem camada HTTP:

| Arquivo | Casos |
|---------|-------|
| `authService.test.js` | registro OK, email duplicado (409), login senha errada (401), geração de JWT válido |
| `movieService.test.js` | busca com filtros, paginação, criação inválida (400), criação OK |
| `favoriteService.test.js` | adicionar OK, duplicado (409), remover OK, remover inexistente (404) |
| `userService.test.js` | buscar por ID, atualizar perfil |

### Testes de Integração (`tests/integration/`)
Testam as rotas via Supertest com o `app.js` real:

| Arquivo | Rotas cobertas |
|---------|---------------|
| `auth.test.js` | `POST /api/auth/register`, `POST /api/auth/login` |
| `movies.test.js` | `GET /api/movies`, `GET /api/movies/:id`, `POST`, `PUT`, `DELETE` |
| `favorites.test.js` | `GET /api/favorites`, `POST /api/favorites/:id`, `DELETE /api/favorites/:id` |
| `users.test.js` | `GET /api/users/me`, `PUT /api/users/me` |

---

## 4. Dockerfile (Multi-stage)

```dockerfile
# Stage 1: dependências de produção
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: imagem final
FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY .env.example .env
EXPOSE 3000
CMD ["node", "src/server.js"]
```

**Resultado:** imagem ~150MB menor por excluir devDependencies (Jest, nodemon).  
**`.dockerignore`:** `node_modules`, `database/`, `tests/`, `.env`, `*.sqlite`, `.github/`

---

## 5. Pipeline CI/CD — GitHub Actions

Arquivo: `.github/workflows/ci-cd.yml`  
Trigger: `push` e `pull_request` para `main`; etapas 1-3 também rodam em `develop`.

### Etapas Sequenciais

| # | Job | Ferramenta | Falha se |
|---|-----|-----------|----------|
| 1 | `lint-test` | ESLint + Jest + relatório de cobertura | lint errors ou testes falhando ou cobertura <70% |
| 2 | `secret-scan` | Gitleaks | token/senha encontrado no histórico |
| 3 | `sonarqube` | SonarCloud | Quality Gate reprovado (bugs críticos, code smells excessivos) |
| 4 | `container-scan` | Trivy (severity HIGH,CRITICAL) | vulnerabilidade HIGH ou CRITICAL encontrada |
| 5 | `push` | `docker/build-push-action` → `ghcr.io` | falha no push |
| 6 | `deploy` | `curl` no Render Deploy Hook | falha no webhook |

### Secrets Necessários

| Secret | Como obter |
|--------|-----------|
| `SONAR_TOKEN` | SonarCloud → My Account → Security |
| `RENDER_DEPLOY_HOOK_URL` | Render → Service → Settings → Deploy Hook |
| `GITHUB_TOKEN` | Automático (Actions) — usado para push no ghcr.io |

---

## 6. SonarQube

Arquivo: `sonar-project.properties`

```properties
sonar.projectKey=<usuario>_backend-cinecomp-2026-2
sonar.organization=<usuario>
sonar.sources=src
sonar.tests=tests
sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.exclusions=src/utils/seedDatabase.js,src/utils/resetDatabase.js,src/docs/**
```

Quality Gate padrão do SonarCloud: falha com bugs críticos de segurança ou cobertura <70% em código novo.

---

## 7. Fluxo de Branches

```
feature/* ──PR──▶ develop ──PR──▶ main
                    │                │
               etapas 1-3       pipeline completa
                                 + deploy Render
```

- `main` → produção, pipeline completa com deploy
- `develop` → integração, roda lint + testes + Sonar
- `feature/*` → desenvolvimento, PR para `develop`

---

## 8. Decisões de Segurança

- **Segredos:** nunca commitados — todos via GitHub Secrets; `.env` no `.gitignore`
- **Scan de segredos (Gitleaks):** bloqueia o pipeline se encontrar padrões de token/senha
- **Trivy:** bloqueia build de imagem com vulnerabilidades HIGH/CRITICAL
- **JWT_SECRET:** obrigatório via variável de ambiente no Render (não usar o valor do `.env.example`)
- **Imagem mínima:** `node:20-alpine` reduz superfície de ataque vs `node:20`

---

## 9. Documentação Técnica (README.md)

O `README.md` cobrirá:
- Arquitetura da pipeline (diagrama de etapas)
- Como rodar localmente
- Como configurar os secrets
- Fluxo de branches
- Funcionamento do Quality Gate
- Decisões de segurança adotadas
