const authJwt = require("./authJwt");
const verifySignUp = require("./verifySignUp");
const catalogo = require("./catalogo");
const validEmpresa = require("./empresa");
const storage = require("./uploads");
const validPhoto = require("./arrayLengthLimit");

module.exports = {
  authJwt,
  verifySignUp,
  catalogo,
  validEmpresa,
  storage,
  validPhoto,
};
