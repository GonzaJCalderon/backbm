module.exports = {
  secret: process.env.JWT_SECRET,
  refreshSecret: process.env.REFRESH_SECRET_KEY,
  jwtExpiration: 1800, // 30 min
  jwtRefreshExpiration: 604800, // 7 días
};
