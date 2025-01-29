module.exports = {
  secret: "01178b1c8c8304774044d6785db4129d330e67337c350dd0155482f4a32dd149",
  jwtExpiration: 3600, // 1 hour 3600
  jwtRefreshExpiration: 86400, // 24 hours 86400

  host: "http://10.100.1.80",
  // host: "http://localhost",
  port: "5005",

  /* for test */
  // jwtExpiration: 60,          // 1 minute
  // jwtRefreshExpiration: 120,  // 2 minutes
};
