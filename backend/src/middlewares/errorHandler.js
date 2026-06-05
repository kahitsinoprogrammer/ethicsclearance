const errorHandler = (err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;

  const payload = {
    message: err.message || "Internal server error"
  };

  if (err.data !== undefined) {
    payload.data = err.data;
  }

  res.status(statusCode).json(payload);
};

module.exports = errorHandler;
