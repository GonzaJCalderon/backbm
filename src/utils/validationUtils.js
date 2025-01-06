/**
 * Middleware para verificar que los campos requeridos estén presentes en los datos proporcionados.
 * @param {Array} campos - Lista de nombres de campos requeridos.
 * @returns {Function} - Middleware que valida los campos requeridos.
 */

/**
 * Middleware para verificar que los campos requeridos estén presentes en los datos proporcionados.
 * @param {Array} campos - Lista de nombres de campos requeridos.
 * @returns {Function} - Middleware que valida los campos requeridos.
 */

const validarCampos = (campos) => (req, res, next) => {
  try {
    const faltantes = campos.filter((campo) => {
      if (campo === 'direccion') {
        const { direccion } = req.body;
        // Verifica los campos requeridos en la dirección
        return !direccion || !direccion.calle || !direccion.altura || !direccion.departamento;
      }

      // Para otros campos, verificamos que no estén undefined o null
      return !req.body[campo];
    });

    if (faltantes.length > 0) {
      console.log('Campos faltantes:', faltantes); // Log para depuración
      return res.status(400).json({
        message: `Faltan los siguientes campos: ${faltantes.join(', ')}`,
      });
    }

    next();
  } catch (error) {
    console.error('Error en la validación de campos:', error);
    return res.status(500).json({ message: 'Error interno en la validación.' });
  }
};




module.exports = {
  validarCampos,
};
