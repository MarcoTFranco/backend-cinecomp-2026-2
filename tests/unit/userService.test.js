const { setupTestDb } = require("../helpers/dbSetup");
const authService = require("../../src/services/authService");
const userService = require("../../src/services/userService");

let userId;

setupTestDb();

beforeAll(async () => {
  const user = await authService.register({
    name: "Profile User",
    email: "profile@example.com",
    password: "senha123"
  });
  userId = user.id;
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
      userService.updateProfile(999999, { name: "Inexistente" })
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
