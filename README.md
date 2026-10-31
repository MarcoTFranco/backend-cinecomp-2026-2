# CineComp API

API REST para gerenciamento de filmes e favoritos, com autenticaÃ§Ã£o JWT.

[![CI/CD Pipeline](https://github.com/MarcoTFranco/backend-cinecomp-2026-2/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/MarcoTFranco/backend-cinecomp-2026-2/actions/workflows/ci-cd.yml)

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
npm run test:coverage   # com relatÃ³rio de cobertura
npm run lint            # lint
```

## Arquitetura da Pipeline

A pipeline CI/CD Ã© implementada com GitHub Actions e executa 6 etapas sequenciais em cada push para `main`:

```
push â†’ main
         â”‚
   â”Œâ”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”
   â”‚ 1. lint-   â”‚  ESLint + Jest (â‰¥70% cobertura)
   â”‚    test    â”‚
   â””â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”˜
   â”Œâ”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”
   â”‚2. secret-  â”‚  Gitleaks â€” bloqueia se token/senha no cÃ³digo
   â”‚   scan     â”‚
   â””â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”˜
   â”Œâ”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”
   â”‚3. sonarqubeâ”‚  SonarCloud Quality Gate
   â””â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”˜
   â”Œâ”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”
   â”‚4. containerâ”‚  Trivy â€” scan HIGH/CRITICAL na imagem Docker
   â”‚   scan     â”‚
   â””â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”˜
   â”Œâ”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”
   â”‚5. push     â”‚  Build multi-stage + push para ghcr.io
   â””â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”˜
   â”Œâ”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”
   â”‚6. deploy   â”‚  Render Deploy Hook
   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

Em pushes para `develop`, apenas as etapas 1-3 sÃ£o executadas (jobs 4-6 tÃªm `if: github.ref == 'refs/heads/main'`).

## Fluxo de Branches

```
feature/* â”€â”€PRâ”€â”€â–¶ develop â”€â”€PRâ”€â”€â–¶ main
                    â”‚                â”‚
               etapas 1-3      pipeline completa
                                + deploy Render
```

## DecisÃµes de SeguranÃ§a

| DecisÃ£o | Motivo |
|---------|--------|
| Gitleaks no step 2 | Impede que tokens sejam expostos acidentalmente no histÃ³rico Git |
| Trivy com exit-code 1 | Bloqueia deploy de imagens com vulnerabilidades HIGH/CRITICAL |
| node:20-alpine | Imagem base mÃ­nima reduz superfÃ­cie de ataque vs node:20 |
| Multi-stage build | devDependencies (Jest, nodemon) nÃ£o entram na imagem de produÃ§Ã£o |
| Todos os secrets via GitHub Secrets | Nenhuma credencial hardcoded no cÃ³digo ou no Dockerfile |
| JWT_SECRET obrigatÃ³rio via env no Render | Nunca usar o valor padrÃ£o do `.env.example` em produÃ§Ã£o |

## Quality Gate â€” SonarCloud

O Quality Gate padrÃ£o do SonarCloud bloqueia o pipeline quando:
- HÃ¡ bugs de seguranÃ§a classificados como Critical ou Blocker
- A cobertura de cÃ³digo novo cai abaixo de 80%
- O nÃºmero de code smells excede o threshold configurado

A integraÃ§Ã£o Ã© feita via `sonar-project.properties` + `SONAR_TOKEN` (GitHub Secret). O relatÃ³rio LCOV gerado pelo Jest (`coverage/lcov.info`) Ã© enviado ao SonarCloud para calcular cobertura.

## VariÃ¡veis de Ambiente

| VariÃ¡vel | DescriÃ§Ã£o | ObrigatÃ³ria em produÃ§Ã£o |
|----------|-----------|------------------------|
| `PORT` | Porta do servidor | NÃ£o (padrÃ£o: 3000) |
| `JWT_SECRET` | Chave secreta JWT | **Sim** |
| `JWT_EXPIRES_IN` | ExpiraÃ§Ã£o do token | NÃ£o (padrÃ£o: 7d) |
| `FRONTEND_URL` | URL do frontend para CORS | NÃ£o |

## Secrets NecessÃ¡rios no GitHub

| Secret | Como obter |
|--------|-----------|
| `SONAR_TOKEN` | SonarCloud â†’ My Account â†’ Security â†’ Generate Token |
| `RENDER_DEPLOY_HOOK_URL` | Render â†’ Service â†’ Settings â†’ Deploy Hook |
| `GITHUB_TOKEN` | AutomÃ¡tico (GitHub Actions) |
