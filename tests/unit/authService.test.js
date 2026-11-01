const { setupTestDb } = require("../helpers/dbSetup");
const authService = require("../../src/services/authService");

setupTestDb();

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
      authService.register({ name: "User", email: "nao-e-email", password: "senha123" })
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
