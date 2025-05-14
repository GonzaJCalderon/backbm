const { validate: isUuid } = require('uuid');

const validarUuid = (req, res, next) => {
  const { uuid } = req.params;

  if (!uuid || !isUuid(uuid)) {
    return res.status(400).json({
      success: false,
      message: 'UUID inválido o no proporcionado en la URL.'
    });
  }

  next();
};

module.exports = { validarUuid };
