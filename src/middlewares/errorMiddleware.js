function errorMiddleware(error, req, res, _next) {
  const statusCode = error.statusCode || 500;

  if (process.env.NODE_ENV !== "test" && statusCode >= 500) {
    console.error(error.stack || error.message);
  }

  if (error.errors) {
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Erro de validacao",
      errors: error.errors
    });
  }

  return res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? "Erro interno do servidor" : error.message
  });
}

module.exports = errorMiddleware;
