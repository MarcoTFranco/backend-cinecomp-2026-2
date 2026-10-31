# CineComp API

API REST para gerenciamento de filmes e favoritos, com autenticação JWT.

[![CI/CD Pipeline](https://github.com/SEU_USUARIO/backend-cinecomp-2026-2/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/SEU_USUARIO/backend-cinecomp-2026-2/actions/workflows/ci-cd.yml)

## Como rodar localmente

```bash
npm install
npm run seed
npm run dev
```

Acesse: http://localhost:3000/api/docs

## Como rodar os testes

```bash
npm test                # testes
npm run test:coverage   # com relatório de cobertura
npm run lint            # lint
```

## Arquitetura da Pipeline

A pipeline CI/CD é implementada com GitHub Actions e executa 6 etapas sequenciais em cada push para `main`:

```
push → main
         │
   ┌─────▼──────┐
   │ 1. lint-   │  ESLint + Jest (≥70% cobertura)
   │    test    │
   └─────┬──────┘
   ┌─────▼──────┐
   │2. secret-  │  Gitleaks — bloqueia se token/senha no código
   │   scan     │
   └─────┬──────┘
   ┌─────▼──────┐
   │3. sonarqube│  SonarCloud Quality Gate
   └─────┬──────┘
   ┌─────▼──────┐
   │4. container│  Trivy — scan HIGH/CRITICAL na imagem Docker
   │   scan     │
   └─────┬──────┘
   ┌─────▼──────┐
   │5. push     │  Build multi-stage + push para ghcr.io
   └─────┬──────┘
   ┌─────▼──────┐
   │6. deploy   │  Render Deploy Hook
   └────────────┘
```

Em pushes para `develop`, apenas as etapas 1-3 são executadas (jobs 4-6 têm `if: github.ref == 'refs/heads/main'`).

## Fluxo de Branches

```
feature/* ──PR──▶ develop ──PR──▶ main
                    │                │
               etapas 1-3      pipeline completa
                                + deploy Render
```

## Decisões de Segurança

| Decisão | Motivo |
|---------|--------|
| Gitleaks no step 2 | Impede que tokens sejam expostos acidentalmente no histórico Git |
| Trivy com exit-code 1 | Bloqueia deploy de imagens com vulnerabilidades HIGH/CRITICAL |
| node:20-alpine | Imagem base mínima reduz superfície de ataque vs node:20 |
| Multi-stage build | devDependencies (Jest, nodemon) não entram na imagem de produção |
| Todos os secrets via GitHub Secrets | Nenhuma credencial hardcoded no código ou no Dockerfile |
| JWT_SECRET obrigatório via env no Render | Nunca usar o valor padrão do `.env.example` em produção |

## Quality Gate — SonarCloud

O Quality Gate padrão do SonarCloud bloqueia o pipeline quando:
- Há bugs de segurança classificados como Critical ou Blocker
- A cobertura de código novo cai abaixo de 80%
- O número de code smells excede o threshold configurado

A integração é feita via `sonar-project.properties` + `SONAR_TOKEN` (GitHub Secret). O relatório LCOV gerado pelo Jest (`coverage/lcov.info`) é enviado ao SonarCloud para calcular cobertura.

## Variáveis de Ambiente

| Variável | Descrição | Obrigatória em produção |
|----------|-----------|------------------------|
| `PORT` | Porta do servidor | Não (padrão: 3000) |
| `JWT_SECRET` | Chave secreta JWT | **Sim** |
| `JWT_EXPIRES_IN` | Expiração do token | Não (padrão: 7d) |
| `FRONTEND_URL` | URL do frontend para CORS | Não |

## Secrets Necessários no GitHub

| Secret | Como obter |
|--------|-----------|
| `SONAR_TOKEN` | SonarCloud → My Account → Security → Generate Token |
| `RENDER_DEPLOY_HOOK_URL` | Render → Service → Settings → Deploy Hook |
| `GITHUB_TOKEN` | Automático (GitHub Actions) |
