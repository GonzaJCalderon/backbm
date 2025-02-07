module.exports = {
  apps: [{
    name: "backbm",
    script: "./server.js", // ajusta la ruta a tu punto de entrada
    env: {
      NODE_ENV: "development",
      DB_USE: 'remote',
    }
  }]
}
