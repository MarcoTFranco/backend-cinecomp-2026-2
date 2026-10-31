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
