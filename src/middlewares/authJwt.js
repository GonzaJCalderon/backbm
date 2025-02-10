const jwt = require("jsonwebtoken");
const config = require("../config/auth.config");
const { TokenExpiredError } = jwt;

const catchError = (err, res) => {
  if (res.headersSent) return; // Previene múltiples respuestas

  if (err instanceof TokenExpiredError) {
    return res.status(401).json({ message: "Unauthorized! Access Token está vencido!" });
  }

  return res.status(401).json({ message: "Unauthorized!" });
};

const verifyToken = (req, res, next) => {
  let token = req.headers["authorization"];

  if (!token) {
    return res.status(403).json({ message: "No hay Token en la solicitud" });
  }

  //  Manejar token con o sin "Bearer"
  token = token.startsWith("Bearer ") ? token.split(" ")[1] : token.trim();

  jwt.verify(token, config.secret, (err, decoded) => {
    if (err) {
      return catchError(err, res);
    }

    req.userId = decoded.id;
    next(); // Continuar si el token es válido
  });
};

module.exports = { verifyToken };






const authJwt = {
  verifyToken
};
module.exports = authJwt;
