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
