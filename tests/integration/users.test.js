const request = require("supertest");
const app = require("../../src/app");
const { setupTestDb } = require("../helpers/dbSetup");
const { registerAndLogin } = require("../helpers/authHelper");

let token;

setupTestDb();

beforeAll(async () => {
  token = await registerAndLogin("userstest@example.com", "Profile User");
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
