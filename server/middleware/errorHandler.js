const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  console.error("[Server Error]:", err.stack || err.message);

  if (err.name === "CastError") {
    return res.status(404).json({ success: false, message: "Resource not found." });
  }
  if (err.code === 11000) {
    return res.status(409).json({ success: false, message: "A record with that value already exists." });
  }
  if (err.name === "ValidationError") {
    return res.status(400).json({ success: false, message: "Invalid input." });
  }
  if (err.name === "MulterError" || err.message === "Only PDF files are supported!") {
    return res.status(400).json({ success: false, message: "Invalid file upload." });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ success: false, message: "Request payload is too large." });
  }

  const status = Number.isInteger(err.statusCode) ? err.statusCode : 500;
  const message =
    err.isOperational && status < 500 ? err.message : "An unexpected server error occurred.";
  res.status(status).json({ success: false, message });
};

module.exports = errorHandler;
