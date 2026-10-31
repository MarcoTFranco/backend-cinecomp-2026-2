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
