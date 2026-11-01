const { setupTestDb } = require("../helpers/dbSetup");
const movieService = require("../../src/services/movieService");

const validMovie = {
  title: "Inception",
  description: "Um ladrão que rouba segredos via sonhos.",
  genre: "Ficção Científica",
  director: "Christopher Nolan",
  releaseYear: 2010,
  rating: 8.8
};

setupTestDb();

describe("movieService.createMovie", () => {
  it("cria um filme com dados válidos", async () => {
    const movie = await movieService.createMovie(validMovie);
    expect(movie).toMatchObject({ title: "Inception", rating: 8.8 });
    expect(movie.id).toBeDefined();
  });

  it("lança 400 quando campos obrigatórios estão ausentes", async () => {
    await expect(
      movieService.createMovie({ title: "Sem campos" })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("lança 400 para rating fora do intervalo", async () => {
    await expect(
      movieService.createMovie({ ...validMovie, rating: 11 })
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe("movieService.getMovieById", () => {
  let movieId;

  beforeAll(async () => {
    const movie = await movieService.createMovie({ ...validMovie, title: "Matrix" });
    movieId = movie.id;
  });

  it("retorna o filme pelo ID", async () => {
    const movie = await movieService.getMovieById(movieId);
    expect(movie.title).toBe("Matrix");
  });

  it("lança 404 para ID inexistente", async () => {
    await expect(movieService.getMovieById(999999)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("movieService.getMovies", () => {
  it("retorna lista paginada", async () => {
    const result = await movieService.getMovies({ page: 1, limit: 5 });
    expect(result).toHaveProperty("movies");
    expect(result).toHaveProperty("pagination");
    expect(result.pagination.page).toBe(1);
  });

  it("filtra filmes pelo campo search", async () => {
    const result = await movieService.getMovies({ search: "Matrix" });
    expect(result.movies.some((m) => m.title === "Matrix")).toBe(true);
  });

  it("filtra filmes por minRating", async () => {
    const result = await movieService.getMovies({ minRating: "9" });
    result.movies.forEach((m) => expect(m.rating).toBeGreaterThanOrEqual(9));
  });
});

describe("movieService.updateMovie", () => {
  let movieId;

  beforeAll(async () => {
    const movie = await movieService.createMovie({ ...validMovie, title: "Para Atualizar" });
    movieId = movie.id;
  });

  it("atualiza o título do filme", async () => {
    const updated = await movieService.updateMovie(movieId, { title: "Atualizado" });
    expect(updated.title).toBe("Atualizado");
  });

  it("lança 404 para ID inexistente", async () => {
    await expect(
      movieService.updateMovie(999999, { title: "X" })
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("movieService.deleteMovie", () => {
  it("deleta o filme pelo ID", async () => {
    const movie = await movieService.createMovie({ ...validMovie, title: "Para Deletar" });
    await expect(movieService.deleteMovie(movie.id)).resolves.toBeUndefined();
    await expect(movieService.getMovieById(movie.id)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("lança 404 para ID inexistente", async () => {
    await expect(movieService.deleteMovie(999999)).rejects.toMatchObject({ statusCode: 404 });
  });
});
