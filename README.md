# CineComp API — Desafio de Infraestrutura

API REST para gerenciamento de filmes e favoritos, com autenticação JWT.

[![CI/CD Pipeline](https://github.com/MarcoTFranco/backend-cinecomp-2026-2/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/MarcoTFranco/backend-cinecomp-2026-2/actions/workflows/ci-cd.yml)

---

## Créditos

A aplicação backend utilizada neste projeto foi desenvolvida originalmente por **[@jpedroreiss](https://github.com/jpedroreiss)** e está disponível em:
[github.com/jpedroreiss/backend-cinecomp-2026-2](https://github.com/jpedroreiss/backend-cinecomp-2026-2)

Este repositório é uma extensão do projeto original, com a adição de toda a infraestrutura de testes automatizados, containerização e pipeline CI/CD como parte do **Desafio de Infraestrutura da Comp Júnior 2026.2**.

---

## Como rodar localmente

```bash
npm install
npm run seed
npm run dev
```

Acesse: http://localhost:3000/api/docs

## Como rodar os testes

```bash
npm test                # executa os testes
npm run test:coverage   # testes com relatório de cobertura
npm run lint            # verificação de lint
```

Cobertura atual: **~86%** (meta do desafio: ≥70%)

---

## Arquitetura da Pipeline

A pipeline CI/CD é implementada com **GitHub Actions** e executa 6 etapas sequenciais em cada push para `main`:

```
push para main
      |
      v
[1. lint-test] -----> ESLint + Jest com relatório de cobertura
      |
      v
[2. secret-scan] ---> Gitleaks — bloqueia se token/senha no código
      |
      v
[3. sonarqube] -----> SonarCloud Quality Gate
      |
      v
[4. container-scan] > Trivy — scan de vulnerabilidades HIGH/CRITICAL
      |
      v
[5. push] ----------> Build multi-stage Docker + push para ghcr.io
      |
      v
[6. deploy] --------> Render Deploy Hook — disponibiliza em produção
```

Em pushes para `develop`, apenas as etapas 1–3 são executadas (jobs 4–6 têm `if: github.ref == 'refs/heads/main'`).

---

## Fluxo de Branches

```
feature/* --PR--> develop --PR--> main
                    |               |
               etapas 1-3     pipeline completa
                               + deploy Render
```

| Branch | O que dispara |
|--------|--------------|
| `feature/*` | Nada automaticamente — abre PR para `develop` |
| `develop` | Etapas 1–3 (lint, testes, qualidade) |
| `main` | Pipeline completa + deploy no Render |

---

## Decisões de Segurança

| Decisão | Motivo |
|---------|--------|
| Gitleaks na etapa 2 | Impede tokens/senhas no histórico Git |
| Trivy com exit-code 1 | Bloqueia deploy com vulnerabilidades HIGH/CRITICAL |
| `node:20-alpine` | Imagem mínima reduz superfície de ataque |
| Multi-stage build | `devDependencies` (Jest, nodemon) não entram em produção |
| Secrets via GitHub Secrets | Nenhuma credencial hardcoded no código |
| `JWT_SECRET` obrigatório no Render | Nunca usar o valor padrão do `.env.example` |

---

## Quality Gate — SonarCloud

O Quality Gate bloqueia o pipeline quando:
- Há bugs de segurança classificados como **Critical** ou **Blocker**
- A cobertura de código novo cai abaixo de **80%**
- O número de code smells excede o threshold configurado

A integração usa `sonar-project.properties` + secret `SONAR_TOKEN`. O relatório LCOV gerado pelo Jest (`coverage/lcov.info`) é enviado ao SonarCloud para calcular cobertura.

---

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
