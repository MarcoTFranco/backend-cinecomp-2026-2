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
