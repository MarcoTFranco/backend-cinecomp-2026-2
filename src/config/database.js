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
