const validateDocumentNumber = (req, res, next) => {
  const nroDoc = parseInt(req.params.nroDoc, 10);

  if (isNaN(nroDoc)) {
    return res.status(400).json({
      success: false,
      message: 'El número de documento debe ser un número válido'
    });
  }

  if (!Number.isInteger(nroDoc)) {
    return res.status(400).json({
      success: false,
      message: 'El número de documento debe ser un número entero'
    });
  }

  // Cambiar el rango permitido
  if (nroDoc < 1000000 || nroDoc > 99999999) {
    return res.status(400).json({
      success: false,
      message: 'El número de documento debe estar entre 1.000.000 y 99.999.999'
    });
  }

  next();
};

module.exports = validateDocumentNumber;