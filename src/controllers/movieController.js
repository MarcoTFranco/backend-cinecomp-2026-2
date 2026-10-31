const movieService = require("../services/movieService");

async function getMovies(req, res, next) {
  try {
    const { movies, pagination } = await movieService.getMovies(req.query);
    return res.json({
      success: true,
      data: { movies, pagination }
    });
  } catch (error) {
    return next(error);
  }
}

async function getMovieById(req, res, next) {
  try {
    const movie = await movieService.getMovieById(req.params.id);
    return res.json({
      success: true,
      data: movie
    });
  } catch (error) {
    return next(error);
  }
}

async function createMovie(req, res, next) {
  try {
    const movie = await movieService.createMovie(req.body);
    return res.status(201).json({
      success: true,
      message: "Filme criado com sucesso",
      data: movie
    });
  } catch (error) {
    return next(error);
  }
}

async function updateMovie(req, res, next) {
  try {
    const movie = await movieService.updateMovie(req.params.id, req.body);
    return res.json({
      success: true,
      message: "Filme atualizado com sucesso",
      data: movie
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteMovie(req, res, next) {
  try {
    await movieService.deleteMovie(req.params.id);
    return res.json({
      success: true,
      message: "Filme excluido com sucesso"
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getMovies,
  getMovieById,
  createMovie,
  updateMovie,
  deleteMovie
};
