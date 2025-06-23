const requireAPIKey = (req, res, next) => {
  const API_KEY = process.env.API_KEY;
  const { key } = req.query;

  if (key === API_KEY) {
    next();
  } else {
    res.status(404).json({
      message: "API key is not existence!",
    });
  }
};

module.exports = requireAPIKey;
