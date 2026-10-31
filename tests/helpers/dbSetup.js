const { sequelize } = require("../../src/config/database");
require("../../src/models");

function setupTestDb() {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });
}

module.exports = { setupTestDb };
