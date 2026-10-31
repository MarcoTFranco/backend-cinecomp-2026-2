# Infra Challenge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar testes automatizados (≥70% cobertura), Dockerfile multi-stage e pipeline CI/CD de 6 etapas com deploy no Render ao backend CineComp API.

**Architecture:** O backend existente (Node.js/Express/SQLite/Sequelize) não é alterado funcionalmente — apenas `src/config/database.js` recebe uma linha para usar `:memory:` quando `NODE_ENV=test`. Testes unitários cobrem os 4 services diretamente; testes de integração usam Supertest contra o `app.js`. A pipeline GitHub Actions executa 6 jobs sequenciais, com os jobs 4-6 restritos ao branch `main`.

**Tech Stack:** Jest 29, Supertest 7, ESLint 8, Docker (node:20-alpine), GitHub Actions, SonarCloud, Gitleaks, Trivy, Render Deploy Hook, ghcr.io

---

## Mapa de Arquivos

| Arquivo | Ação |
|---------|------|
| `package.json` | Modificar — adicionar devDependencies e scripts |
| `src/config/database.js` | Modificar — usar `:memory:` quando `NODE_ENV=test` |
| `jest.config.js` | Criar |
| `tests/helpers/setTestEnv.js` | Criar — define `NODE_ENV=test` antes de qualquer módulo |
| `.eslintrc.json` | Criar |
| `tests/unit/authService.test.js` | Criar |
| `tests/unit/movieService.test.js` | Criar |
| `tests/unit/favoriteService.test.js` | Criar |
| `tests/unit/userService.test.js` | Criar |
| `tests/integration/auth.test.js` | Criar |
| `tests/integration/movies.test.js` | Criar |
| `tests/integration/favorites.test.js` | Criar |
| `tests/integration/users.test.js` | Criar |
| `Dockerfile` | Criar |
| `.dockerignore` | Criar |
| `sonar-project.properties` | Criar |
| `.github/workflows/ci-cd.yml` | Criar |
| `README.md` | Criar |

---

## Task 1: Instalar devDependencies e configurar scripts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Instalar Jest, Supertest e ESLint**

```bash
cd infra/backend-cinecomp-2026-2
npm install --save-dev jest@29 supertest@7 eslint@8
```

- [ ] **Step 2: Adicionar scripts no package.json**

Abra `package.json` e substitua o bloco `"scripts"` por:

```json
"scripts": {
  "dev": "nodemon src/server.js",
  "start": "node src/server.js",
  "seed": "node src/utils/seedDatabase.js",
  "reset-db": "node src/utils/resetDatabase.js",
  "test": "jest",
  "test:coverage": "jest --coverage",
  "lint": "eslint src/ --ext .js"
}
```

- [ ] **Step 3: Verificar que os pacotes foram instalados**

```bash
node -e "require('jest'); require('supertest'); require('eslint'); console.log('OK')"
```

Esperado: `OK`

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add jest, supertest, eslint devDependencies"
```

---

## Task 2: Configurar Jest e helper de ambiente de testes

**Files:**
- Create: `jest.config.js`
- Create: `tests/helpers/setTestEnv.js`

- [ ] **Step 1: Criar o helper que define NODE_ENV=test**

Crie o arquivo `tests/helpers/setTestEnv.js`:

```js
process.env.NODE_ENV = "test";
```

- [ ] **Step 2: Criar jest.config.js**

Crie `jest.config.js` na raiz do projeto:

```js
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  setupFiles: ["./tests/helpers/setTestEnv.js"],
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/utils/seedDatabase.js",
    "!src/utils/resetDatabase.js",
    "!src/docs/**"
  ],
  coverageThreshold: {
    global: {
      lines: 70,
      functions: 70,
      branches: 70
    }
  },
  coverageReporters: ["text", "lcov"]
};
```

- [ ] **Step 3: Verificar que o Jest encontra os arquivos de teste (nenhum ainda, deve retornar 0 suites)**

```bash
npx jest --listTests
```

Esperado: nenhuma saída (nenhum arquivo de teste ainda).

- [ ] **Step 4: Commit**

```bash
git add jest.config.js tests/helpers/setTestEnv.js
git commit -m "chore: configure jest with in-memory sqlite test environment"
```

---

## Task 3: Configurar ESLint

**Files:**
- Create: `.eslintrc.json`

- [ ] **Step 1: Criar .eslintrc.json**

```json
{
  "env": {
    "node": true,
    "es2021": true,
    "jest": true
  },
  "extends": "eslint:recommended",
  "parserOptions": {
    "ecmaVersion": 2021
  },
  "rules": {
    "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "no-console": "off"
  }
}
```

- [ ] **Step 2: Rodar o lint para verificar que o código existente passa**

```bash
npm run lint
```

Esperado: sem erros (0 problems).

Se houver erros, corrija-os antes de continuar. Os mais comuns são variáveis declaradas mas não usadas.

- [ ] **Step 3: Commit**

```bash
git add .eslintrc.json
git commit -m "chore: add eslint configuration"
```

---

## Task 4: Modificar database.js para suportar banco em memória nos testes

**Files:**
- Modify: `src/config/database.js`

- [ ] **Step 1: Atualizar src/config/database.js**

Substitua o conteúdo completo do arquivo por:

```js
const fs = require("fs");
const path = require("path");
const { Sequelize } = require("sequelize");

const isTest = process.env.NODE_ENV === "test";
const databaseDir = path.resolve(__dirname, "../../database");
const databasePath = path.join(databaseDir, "cinecomp.sqlite");

function ensureDatabaseDirectory() {
  if (!isTest && !fs.existsSync(databaseDir)) {
    fs.mkdirSync(databaseDir, { recursive: true });
  }
}

ensureDatabaseDirectory();

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: isTest ? ":memory:" : databasePath,
  logging: false
});

module.exports = {
  sequelize,
  databaseDir,
  databasePath,
  ensureDatabaseDirectory
};
```

- [ ] **Step 2: Verificar que o servidor ainda sobe normalmente**

```bash
node -e "
  process.env.NODE_ENV = 'development';
  const { sequelize } = require('./src/config/database');
  sequelize.authenticate().then(() => { console.log('DB OK'); process.exit(0); });
"
```

Esperado: `DB OK`

- [ ] **Step 3: Verificar que o modo test usa :memory:**

```bash
node -e "
  process.env.NODE_ENV = 'test';
  const { sequelize } = require('./src/config/database');
  console.log(sequelize.options.storage);
"
```

Esperado: `:memory:`

- [ ] **Step 4: Commit**

```bash
git add src/config/database.js
git commit -m "feat: support in-memory sqlite when NODE_ENV=test"
```

---

## Task 5: Testes unitários — authService

**Files:**
- Create: `tests/unit/authService.test.js`

- [ ] **Step 1: Escrever os testes**

Crie `tests/unit/authService.test.js`:

```js
const { sequelize } = require("../../src/config/database");
require("../../src/models");
const authService = require("../../src/services/authService");

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

describe("authService.register", () => {
  it("registra um usuário com dados válidos", async () => {
    const user = await authService.register({
      name: "Test User",
      email: "test@example.com",
      password: "senha123"
    });

    expect(user).toMatchObject({ name: "Test User", email: "test@example.com" });
    expect(user).not.toHaveProperty("password");
  });

  it("lança 409 ao registrar e-mail duplicado", async () => {
    await authService.register({
      name: "Outro User",
      email: "dup@example.com",
      password: "senha123"
    });

    await expect(
      authService.register({ name: "Cópia", email: "dup@example.com", password: "senha123" })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("lança 400 quando campos obrigatórios estão ausentes", async () => {
    await expect(
      authService.register({ name: "", email: "", password: "" })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("lança 400 para e-mail inválido", async () => {
    await expect(
      authService.register({ name: "User", email: "nao-é-email", password: "senha123" })
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe("authService.login", () => {
  beforeAll(async () => {
    await authService.register({
      name: "Login User",
      email: "login@example.com",
      password: "minhasenha"
    });
  });

  it("retorna user e token com credenciais corretas", async () => {
    const result = await authService.login("login@example.com", "minhasenha");

    expect(result).toHaveProperty("token");
    expect(result.user).toMatchObject({ email: "login@example.com" });
  });

  it("lança 401 com senha incorreta", async () => {
    await expect(
      authService.login("login@example.com", "senhaerrada")
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("lança 401 com e-mail inexistente", async () => {
    await expect(
      authService.login("naoexiste@example.com", "qualquer")
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("lança 400 quando e-mail ou senha não são fornecidos", async () => {
    await expect(
      authService.login("", "")
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar que passam**

```bash
npx jest tests/unit/authService.test.js --verbose
```

Esperado: 8 testes passando.

- [ ] **Step 3: Commit**

```bash
git add tests/unit/authService.test.js
git commit -m "test: add unit tests for authService"
```

---

## Task 6: Testes unitários — movieService

**Files:**
- Create: `tests/unit/movieService.test.js`

- [ ] **Step 1: Escrever os testes**

Crie `tests/unit/movieService.test.js`:

```js
const { sequelize } = require("../../src/config/database");
require("../../src/models");
const movieService = require("../../src/services/movieService");

const validMovie = {
  title: "Inception",
  description: "Um ladrão que rouba segredos via sonhos.",
  genre: "Ficção Científica",
  director: "Christopher Nolan",
  releaseYear: 2010,
  rating: 8.8
};

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

describe("movieService.createMovie", () => {
  it("cria um filme com dados válidos", async () => {
    const movie = await movieService.createMovie(validMovie);
    expect(movie).toMatchObject({ title: "Inception", rating: 8.8 });
    expect(movie.id).toBeDefined();
  });

  it("lança 400 quando campos obrigatórios estão ausentes", async () => {
    await expect(
      movieService.createMovie({ title: "Sem campos" })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("lança 400 para rating fora do intervalo", async () => {
    await expect(
      movieService.createMovie({ ...validMovie, rating: 11 })
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe("movieService.getMovieById", () => {
  let movieId;

  beforeAll(async () => {
    const movie = await movieService.createMovie({ ...validMovie, title: "Matrix" });
    movieId = movie.id;
  });

  it("retorna o filme pelo ID", async () => {
    const movie = await movieService.getMovieById(movieId);
    expect(movie.title).toBe("Matrix");
  });

  it("lança 404 para ID inexistente", async () => {
    await expect(movieService.getMovieById(999999)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("movieService.getMovies", () => {
  it("retorna lista paginada", async () => {
    const result = await movieService.getMovies({ page: 1, limit: 5 });
    expect(result).toHaveProperty("movies");
    expect(result).toHaveProperty("pagination");
    expect(result.pagination.page).toBe(1);
  });

  it("filtra filmes pelo campo search", async () => {
    const result = await movieService.getMovies({ search: "Matrix" });
    expect(result.movies.some((m) => m.title === "Matrix")).toBe(true);
  });

  it("filtra filmes por minRating", async () => {
    const result = await movieService.getMovies({ minRating: "9" });
    result.movies.forEach((m) => expect(m.rating).toBeGreaterThanOrEqual(9));
  });
});

describe("movieService.updateMovie", () => {
  let movieId;

  beforeAll(async () => {
    const movie = await movieService.createMovie({ ...validMovie, title: "Para Atualizar" });
    movieId = movie.id;
  });

  it("atualiza o título do filme", async () => {
    const updated = await movieService.updateMovie(movieId, { title: "Atualizado" });
    expect(updated.title).toBe("Atualizado");
  });

  it("lança 404 para ID inexistente", async () => {
    await expect(
      movieService.updateMovie(999999, { title: "X" })
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("movieService.deleteMovie", () => {
  it("deleta o filme pelo ID", async () => {
    const movie = await movieService.createMovie({ ...validMovie, title: "Para Deletar" });
    await expect(movieService.deleteMovie(movie.id)).resolves.toBeUndefined();
    await expect(movieService.getMovieById(movie.id)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("lança 404 para ID inexistente", async () => {
    await expect(movieService.deleteMovie(999999)).rejects.toMatchObject({ statusCode: 404 });
  });
});
```

- [ ] **Step 2: Rodar os testes**

```bash
npx jest tests/unit/movieService.test.js --verbose
```

Esperado: todos os testes passando.

- [ ] **Step 3: Commit**

```bash
git add tests/unit/movieService.test.js
git commit -m "test: add unit tests for movieService"
```

---

## Task 7: Testes unitários — favoriteService e userService

**Files:**
- Create: `tests/unit/favoriteService.test.js`
- Create: `tests/unit/userService.test.js`

- [ ] **Step 1: Criar tests/unit/favoriteService.test.js**

```js
const { sequelize } = require("../../src/config/database");
require("../../src/models");
const authService = require("../../src/services/authService");
const movieService = require("../../src/services/movieService");
const favoriteService = require("../../src/services/favoriteService");

let userId;
let movieId;

const validMovie = {
  title: "Favorito Filme",
  description: "Descrição",
  genre: "Ação",
  director: "Diretor",
  releaseYear: 2020,
  rating: 7.5
};

beforeAll(async () => {
  await sequelize.sync({ force: true });
  const user = await authService.register({
    name: "Fav User",
    email: "favuser@example.com",
    password: "senha123"
  });
  userId = user.id;
  const movie = await movieService.createMovie(validMovie);
  movieId = movie.id;
});

afterAll(async () => {
  await sequelize.close();
});

describe("favoriteService.addFavorite", () => {
  it("adiciona um filme aos favoritos", async () => {
    const movie = await favoriteService.addFavorite(userId, movieId);
    expect(movie.id).toBe(movieId);
  });

  it("lança 409 ao adicionar favorito duplicado", async () => {
    await expect(
      favoriteService.addFavorite(userId, movieId)
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("lança 404 para filme inexistente", async () => {
    await expect(
      favoriteService.addFavorite(userId, 999999)
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("favoriteService.getFavorites", () => {
  it("retorna os filmes favoritos do usuário", async () => {
    const favorites = await favoriteService.getFavorites(userId);
    expect(Array.isArray(favorites)).toBe(true);
    expect(favorites.length).toBeGreaterThan(0);
  });
});

describe("favoriteService.removeFavorite", () => {
  it("remove o favorito com sucesso", async () => {
    await expect(
      favoriteService.removeFavorite(userId, movieId)
    ).resolves.toBeUndefined();
  });

  it("lança 404 ao remover favorito inexistente", async () => {
    await expect(
      favoriteService.removeFavorite(userId, movieId)
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
```

- [ ] **Step 2: Criar tests/unit/userService.test.js**

```js
const { sequelize } = require("../../src/config/database");
require("../../src/models");
const authService = require("../../src/services/authService");
const userService = require("../../src/services/userService");

let userId;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  const user = await authService.register({
    name: "Profile User",
    email: "profile@example.com",
    password: "senha123"
  });
  userId = user.id;
});

afterAll(async () => {
  await sequelize.close();
});

describe("userService.getProfile", () => {
  it("retorna o perfil do usuário pelo ID", async () => {
    const profile = await userService.getProfile(userId);
    expect(profile).toMatchObject({ email: "profile@example.com" });
    expect(profile).not.toHaveProperty("password");
  });

  it("lança 404 para ID inexistente", async () => {
    await expect(userService.getProfile(999999)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("userService.updateProfile", () => {
  it("atualiza o nome do usuário", async () => {
    const updated = await userService.updateProfile(userId, { name: "Novo Nome" });
    expect(updated.name).toBe("Novo Nome");
  });

  it("lança 400 ao tentar atualizar a senha por esta rota", async () => {
    await expect(
      userService.updateProfile(userId, { password: "nova" })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("lança 404 para ID inexistente", async () => {
    await expect(
      userService.updateProfile(999999, { name: "X" })
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
```

- [ ] **Step 3: Rodar os testes unitários**

```bash
npx jest tests/unit/ --verbose
```

Esperado: todos os testes passando.

- [ ] **Step 4: Commit**

```bash
git add tests/unit/favoriteService.test.js tests/unit/userService.test.js
git commit -m "test: add unit tests for favoriteService and userService"
```

---

## Task 8: Testes de integração — rotas de auth

**Files:**
- Create: `tests/integration/auth.test.js`

- [ ] **Step 1: Criar tests/integration/auth.test.js**

```js
const request = require("supertest");
const app = require("../../src/app");
const { sequelize } = require("../../src/config/database");
require("../../src/models");

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

describe("POST /api/auth/register", () => {
  it("retorna 201 com usuário criado", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Novo User",
      email: "novo@example.com",
      password: "senha123"
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("id");
    expect(res.body.data).not.toHaveProperty("password");
  });

  it("retorna 409 para e-mail duplicado", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Dup User",
      email: "dup@example.com",
      password: "senha123"
    });

    const res = await request(app).post("/api/auth/register").send({
      name: "Dup User",
      email: "dup@example.com",
      password: "senha123"
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("retorna 400 para corpo inválido", async () => {
    const res = await request(app).post("/api/auth/register").send({ name: "" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  beforeAll(async () => {
    await request(app).post("/api/auth/register").send({
      name: "Login User",
      email: "logintest@example.com",
      password: "minhasenha"
    });
  });

  it("retorna 200 com token para credenciais válidas", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "logintest@example.com",
      password: "minhasenha"
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("token");
  });

  it("retorna 401 para senha incorreta", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "logintest@example.com",
      password: "errada"
    });
    expect(res.status).toBe(401);
  });

  it("retorna 400 para campos ausentes", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Rodar os testes de integração de auth**

```bash
npx jest tests/integration/auth.test.js --verbose
```

Esperado: todos os testes passando.

- [ ] **Step 3: Commit**

```bash
git add tests/integration/auth.test.js
git commit -m "test: add integration tests for auth routes"
```

---

## Task 9: Testes de integração — rotas de filmes

**Files:**
- Create: `tests/integration/movies.test.js`

- [ ] **Step 1: Criar tests/integration/movies.test.js**

```js
const request = require("supertest");
const app = require("../../src/app");
const { sequelize } = require("../../src/config/database");
require("../../src/models");

let token;

const validMovie = {
  title: "Interstellar",
  description: "Viagem pelo espaço.",
  genre: "Ficção Científica",
  director: "Christopher Nolan",
  releaseYear: 2014,
  rating: 8.6
};

beforeAll(async () => {
  await sequelize.sync({ force: true });

  await request(app).post("/api/auth/register").send({
    name: "Movie User",
    email: "movies@example.com",
    password: "senha123"
  });

  const loginRes = await request(app).post("/api/auth/login").send({
    email: "movies@example.com",
    password: "senha123"
  });

  token = loginRes.body.data.token;
});

afterAll(async () => {
  await sequelize.close();
});

describe("GET /api/movies", () => {
  it("retorna 200 com lista paginada", async () => {
    const res = await request(app).get("/api/movies");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("movies");
    expect(res.body.data).toHaveProperty("pagination");
  });

  it("aceita parâmetros de paginação", async () => {
    const res = await request(app).get("/api/movies?page=1&limit=5");
    expect(res.status).toBe(200);
    expect(res.body.data.pagination.limit).toBe(5);
  });
});

describe("POST /api/movies", () => {
  it("retorna 401 sem token", async () => {
    const res = await request(app).post("/api/movies").send(validMovie);
    expect(res.status).toBe(401);
  });

  it("retorna 400 para dados inválidos", async () => {
    const res = await request(app)
      .post("/api/movies")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Incompleto" });
    expect(res.status).toBe(400);
  });

  it("retorna 201 com filme criado", async () => {
    const res = await request(app)
      .post("/api/movies")
      .set("Authorization", `Bearer ${token}`)
      .send(validMovie);
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty("id");
  });
});

describe("GET /api/movies/:id", () => {
  let movieId;

  beforeAll(async () => {
    const res = await request(app)
      .post("/api/movies")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...validMovie, title: "Para Buscar" });
    movieId = res.body.data.id;
  });

  it("retorna 200 com o filme", async () => {
    const res = await request(app).get(`/api/movies/${movieId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("Para Buscar");
  });

  it("retorna 404 para ID inexistente", async () => {
    const res = await request(app).get("/api/movies/999999");
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/movies/:id", () => {
  let movieId;

  beforeAll(async () => {
    const res = await request(app)
      .post("/api/movies")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...validMovie, title: "Para Atualizar" });
    movieId = res.body.data.id;
  });

  it("retorna 401 sem token", async () => {
    const res = await request(app).put(`/api/movies/${movieId}`).send({ title: "X" });
    expect(res.status).toBe(401);
  });

  it("retorna 200 com filme atualizado", async () => {
    const res = await request(app)
      .put(`/api/movies/${movieId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Atualizado" });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("Atualizado");
  });
});

describe("DELETE /api/movies/:id", () => {
  let movieId;

  beforeAll(async () => {
    const res = await request(app)
      .post("/api/movies")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...validMovie, title: "Para Deletar" });
    movieId = res.body.data.id;
  });

  it("retorna 401 sem token", async () => {
    const res = await request(app).delete(`/api/movies/${movieId}`);
    expect(res.status).toBe(401);
  });

  it("retorna 200 ao deletar", async () => {
    const res = await request(app)
      .delete(`/api/movies/${movieId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("retorna 404 após deleção", async () => {
    const res = await request(app).get(`/api/movies/${movieId}`);
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Rodar os testes**

```bash
npx jest tests/integration/movies.test.js --verbose
```

Esperado: todos os testes passando.

- [ ] **Step 3: Commit**

```bash
git add tests/integration/movies.test.js
git commit -m "test: add integration tests for movies routes"
```

---

## Task 10: Testes de integração — favorites e users

**Files:**
- Create: `tests/integration/favorites.test.js`
- Create: `tests/integration/users.test.js`

- [ ] **Step 1: Criar tests/integration/favorites.test.js**

```js
const request = require("supertest");
const app = require("../../src/app");
const { sequelize } = require("../../src/config/database");
require("../../src/models");

let token;
let movieId;

const validMovie = {
  title: "Fav Movie",
  description: "Descrição",
  genre: "Drama",
  director: "Diretor",
  releaseYear: 2019,
  rating: 7.0
};

beforeAll(async () => {
  await sequelize.sync({ force: true });

  await request(app).post("/api/auth/register").send({
    name: "Fav User",
    email: "favtest@example.com",
    password: "senha123"
  });

  const loginRes = await request(app).post("/api/auth/login").send({
    email: "favtest@example.com",
    password: "senha123"
  });
  token = loginRes.body.data.token;

  const movieRes = await request(app)
    .post("/api/movies")
    .set("Authorization", `Bearer ${token}`)
    .send(validMovie);
  movieId = movieRes.body.data.id;
});

afterAll(async () => {
  await sequelize.close();
});

describe("GET /api/favorites", () => {
  it("retorna 401 sem token", async () => {
    const res = await request(app).get("/api/favorites");
    expect(res.status).toBe(401);
  });

  it("retorna 200 com lista de favoritos", async () => {
    const res = await request(app)
      .get("/api/favorites")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe("POST /api/favorites/:movieId", () => {
  it("retorna 401 sem token", async () => {
    const res = await request(app).post(`/api/favorites/${movieId}`);
    expect(res.status).toBe(401);
  });

  it("retorna 201 ao adicionar favorito", async () => {
    const res = await request(app)
      .post(`/api/favorites/${movieId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(201);
  });

  it("retorna 409 ao adicionar favorito duplicado", async () => {
    const res = await request(app)
      .post(`/api/favorites/${movieId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(409);
  });
});

describe("DELETE /api/favorites/:movieId", () => {
  it("retorna 200 ao remover favorito", async () => {
    const res = await request(app)
      .delete(`/api/favorites/${movieId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("retorna 404 ao remover favorito inexistente", async () => {
    const res = await request(app)
      .delete(`/api/favorites/${movieId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Criar tests/integration/users.test.js**

```js
const request = require("supertest");
const app = require("../../src/app");
const { sequelize } = require("../../src/config/database");
require("../../src/models");

let token;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  await request(app).post("/api/auth/register").send({
    name: "Profile User",
    email: "userstest@example.com",
    password: "senha123"
  });

  const loginRes = await request(app).post("/api/auth/login").send({
    email: "userstest@example.com",
    password: "senha123"
  });
  token = loginRes.body.data.token;
});

afterAll(async () => {
  await sequelize.close();
});

describe("GET /api/users/me", () => {
  it("retorna 401 sem token", async () => {
    const res = await request(app).get("/api/users/me");
    expect(res.status).toBe(401);
  });

  it("retorna 200 com perfil do usuário autenticado", async () => {
    const res = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ email: "userstest@example.com" });
    expect(res.body.data).not.toHaveProperty("password");
  });
});

describe("PUT /api/users/me", () => {
  it("retorna 401 sem token", async () => {
    const res = await request(app).put("/api/users/me").send({ name: "Novo" });
    expect(res.status).toBe(401);
  });

  it("retorna 200 ao atualizar o nome", async () => {
    const res = await request(app)
      .put("/api/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Nome Atualizado" });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Nome Atualizado");
  });

  it("retorna 400 ao tentar atualizar a senha por esta rota", async () => {
    const res = await request(app)
      .put("/api/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ password: "novasenha" });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 3: Rodar todos os testes**

```bash
npx jest --verbose
```

Esperado: todos os testes passando.

- [ ] **Step 4: Verificar cobertura**

```bash
npm run test:coverage
```

Esperado: cobertura ≥70% em linhas, funções e branches. Se estiver abaixo de 70%, verifique quais arquivos têm baixa cobertura no relatório e adicione casos de teste faltantes para cobri-los.

- [ ] **Step 5: Commit**

```bash
git add tests/integration/favorites.test.js tests/integration/users.test.js
git commit -m "test: add integration tests for favorites and users routes"
```

---

## Task 11: Dockerfile e .dockerignore

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`

- [ ] **Step 1: Criar Dockerfile**

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY .env.example .env
EXPOSE 3000
CMD ["node", "src/server.js"]
```

- [ ] **Step 2: Criar .dockerignore**

```
node_modules
database
tests
coverage
docs
.env
*.sqlite
.git
.github
*.md
```

- [ ] **Step 3: Fazer o build local para verificar**

```bash
docker build -t cinecomp-api:test .
```

Esperado: build concluído sem erros. Deve haver 2 stages no output.

- [ ] **Step 4: Verificar que a imagem sobe**

```bash
docker run --rm -e JWT_SECRET=test-secret -p 3001:3000 cinecomp-api:test &
sleep 3
curl http://localhost:3001/api/health
```

Esperado: `{"success":true,"status":"ok",...}`

```bash
docker stop $(docker ps -q --filter ancestor=cinecomp-api:test)
```

- [ ] **Step 5: Commit**

```bash
git add Dockerfile .dockerignore
git commit -m "feat: add multi-stage Dockerfile"
```

---

## Task 12: Configurar SonarCloud

**Files:**
- Create: `sonar-project.properties`

- [ ] **Step 1: Criar conta no SonarCloud**

Acesse https://sonarcloud.io e faça login com sua conta GitHub.

- [ ] **Step 2: Criar organização e projeto no SonarCloud**

1. Clique em "+" → "Analyze new project"
2. Selecione o repositório `backend-cinecomp-2026-2`
3. Escolha "With GitHub Actions"
4. Anote o `projectKey` e o `organization` exibidos na tela (formato: `seu-usuario_backend-cinecomp-2026-2`)

- [ ] **Step 3: Criar sonar-project.properties**

Substitua `SEU_USUARIO` pelo seu username do GitHub:

```properties
sonar.projectKey=SEU_USUARIO_backend-cinecomp-2026-2
sonar.organization=SEU_USUARIO
sonar.sources=src
sonar.tests=tests
sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.exclusions=src/utils/seedDatabase.js,src/utils/resetDatabase.js,src/docs/**
```

- [ ] **Step 4: Adicionar SONAR_TOKEN como secret no GitHub**

1. No SonarCloud: My Account → Security → Generate Token → copie o token
2. No GitHub: repositório → Settings → Secrets and variables → Actions → New repository secret
3. Nome: `SONAR_TOKEN`, valor: token copiado

- [ ] **Step 5: Commit**

```bash
git add sonar-project.properties
git commit -m "chore: add sonar-project.properties for SonarCloud"
```

---

## Task 13: Pipeline GitHub Actions

**Files:**
- Create: `.github/workflows/ci-cd.yml`

- [ ] **Step 1: Criar o diretório e o arquivo do workflow**

```bash
mkdir -p .github/workflows
```

Crie `.github/workflows/ci-cd.yml`:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint-test:
    name: "1. Lint e Testes"
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Instalar dependências
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Testes com cobertura
        run: npm run test:coverage

      - uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/

  secret-scan:
    name: "2. Análise de Segredos"
    needs: lint-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  sonarqube:
    name: "3. Análise de Qualidade (SonarCloud)"
    needs: secret-scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Instalar dependências
        run: npm ci

      - name: Gerar relatório de cobertura
        run: npm run test:coverage

      - uses: SonarSource/sonarcloud-github-action@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}

  container-scan:
    name: "4. Segurança de Containers (Trivy)"
    needs: sonarqube
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build da imagem Docker
        run: docker build -t cinecomp-api:${{ github.sha }} .

      - name: Scan com Trivy
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: "cinecomp-api:${{ github.sha }}"
          format: "table"
          exit-code: "1"
          ignore-unfixed: true
          severity: "HIGH,CRITICAL"

  push:
    name: "5. Build e Push da Imagem"
    needs: container-scan
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ghcr.io/${{ github.repository }}:latest
            ghcr.io/${{ github.repository }}:${{ github.sha }}

  deploy:
    name: "6. Deploy no Render"
    needs: push
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Acionar deploy no Render
        run: curl -X POST "${{ secrets.RENDER_DEPLOY_HOOK_URL }}"
```

- [ ] **Step 2: Adicionar RENDER_DEPLOY_HOOK_URL como secret no GitHub**

1. No Render: acesse seu serviço → Settings → Deploy Hook → copie a URL
2. No GitHub: Settings → Secrets and variables → Actions → New repository secret
3. Nome: `RENDER_DEPLOY_HOOK_URL`, valor: URL copiada

- [ ] **Step 3: Fazer push para o branch develop para testar as 3 primeiras etapas**

```bash
git checkout -b develop
git add .github/workflows/ci-cd.yml
git commit -m "ci: add github actions pipeline with 6 sequential stages"
git push -u origin develop
```

- [ ] **Step 4: Verificar no GitHub Actions que as etapas 1-3 passam**

Acesse: repositório → Actions → pipeline em execução.

Esperado: jobs `lint-test`, `secret-scan` e `sonarqube` com status verde. Jobs 4-6 devem ser pulados (skipped) pois não estamos no branch `main`.

- [ ] **Step 5: Fazer merge para main e verificar pipeline completa**

```bash
git checkout main
git merge develop
git push origin main
```

Esperado: todos os 6 jobs executados e verdes no GitHub Actions, e deploy refletido no Render.

---

## Task 14: README.md — Documentação Técnica

**Files:**
- Create: `README.md`

- [ ] **Step 1: Criar README.md**

Substitua `SEU_USUARIO` e `SEU_SERVICO_RENDER` pelos valores reais:

```markdown
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
   │ 1. lint-test│  ESLint + Jest (≥70% cobertura)
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

Em pushes para `develop`, apenas as etapas 1-3 são executadas.

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
| node:20-alpine | Imagem base mínima reduz superfície de ataque |
| Multi-stage build | devDependencies (Jest, nodemon) não entram na imagem de produção |
| Todos os secrets via GitHub Secrets | Nenhuma credencial hardcoded no código ou no Dockerfile |
| JWT_SECRET obrigatório via env no Render | Nunca usar o valor padrão do `.env.example` em produção |

## Quality Gate — SonarCloud

O Quality Gate padrão do SonarCloud bloqueia o pipeline quando:
- Há bugs de segurança classificados como Critical ou Blocker
- A cobertura de código novo cai abaixo de 80%
- O número de code smells excede o threshold configurado

A integração é feita via `sonar-project.properties` + `SONAR_TOKEN` (secret). O relatório LCOV gerado pelo Jest (`coverage/lcov.info`) é enviado ao SonarCloud para calcular cobertura.

## Variáveis de Ambiente

| Variável | Descrição | Obrigatória em produção |
|----------|-----------|------------------------|
| `PORT` | Porta do servidor | Não (padrão: 3000) |
| `JWT_SECRET` | Chave secreta JWT | Sim |
| `JWT_EXPIRES_IN` | Expiração do token | Não (padrão: 7d) |
| `FRONTEND_URL` | URL do frontend para CORS | Não |
```

- [ ] **Step 2: Commit e push**

```bash
git add README.md
git commit -m "docs: add technical README with pipeline architecture and security decisions"
git push origin main
```

---

## Self-Review

**Cobertura da spec:**
- [x] Testes com Jest + Supertest cobrindo ≥70% — Tasks 5-10
- [x] ESLint — Task 3
- [x] SonarCloud Quality Gate — Tasks 12, 13
- [x] Gitleaks para scan de segredos — Task 13
- [x] Trivy para segurança de containers — Task 13
- [x] Dockerfile multi-stage — Task 11
- [x] Push para ghcr.io — Task 13
- [x] Deploy automatizado no Render — Task 13
- [x] README.md com arquitetura, segurança, Quality Gate e branches — Task 14
- [x] Branch strategy (main/develop/feature) — Task 13

**Consistência de tipos/nomes:** `sequelize`, `authService`, `movieService`, `favoriteService`, `userService` — nomes consistentes entre tasks.

**Sem placeholders:** todas as tasks contêm código completo.
