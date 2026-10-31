const request = require("supertest");
const app = require("../../src/app");

async function registerAndLogin(email, name = "Test User", password = "senha123") {
  await request(app).post("/api/auth/register").send({ name, email, password });
  const loginRes = await request(app).post("/api/auth/login").send({ email, password });
  return loginRes.body.data.token;
}

module.exports = { registerAndLogin };
