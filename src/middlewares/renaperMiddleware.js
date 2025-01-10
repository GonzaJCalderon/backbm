const validateDocumentNumber = (req, res, next) => {
    const nroDoc = parseInt(req.params.nroDoc);

    // Verificar si es un número válido
    if (isNaN(nroDoc)) {
        return res.status(400).json({
            success: false,
            message: 'El número de documento debe ser un número válido'
        });
    }

    // Verificar si es un número entero
    if (!Number.isInteger(nroDoc)) {
        return res.status(400).json({
            success: false,
            message: 'El número de documento debe ser un número entero'
        });
    }

    // Verificar el rango
    if (nroDoc < 5000000 || nroDoc > 99999999) {
        return res.status(400).json({
            success: false,
            message: 'El número de documento debe estar entre 5.000.000 y 99.999.999'
        });
    }

    next();
};

module.exports = validateDocumentNumber;