const mongoSanitize = require('express-mongo-sanitize');

module.exports = (req, res, next) => {
  // sanitize body
  if (req.body) req.body = mongoSanitize.sanitize(req.body);

  // sanitize params
  if (req.params) req.params = mongoSanitize.sanitize(req.params);

  next();
};