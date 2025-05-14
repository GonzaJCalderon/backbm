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

const validarCampos = () => (req, res, next) => {
  try {
    const {
      tipo,
      nombre, apellido, direccion,
      nombreResponsable, apellidoResponsable,
      domicilioResponsable,
      email, password
    } = req.body;

    const camposFaltantes = [];

    // Campos comunes
    if (!email) camposFaltantes.push('email');
    if (!password) camposFaltantes.push('password');
    if (!tipo) camposFaltantes.push('tipo');

    if (tipo === 'fisica') {
      if (!nombre) camposFaltantes.push('nombre');
      if (!apellido) camposFaltantes.push('apellido');
      if (!direccion || !direccion.calle || !direccion.altura || !direccion.departamento) {
        camposFaltantes.push('direccion');
      }
    }

    if (tipo === 'juridica') {
      if (!nombreResponsable) camposFaltantes.push('nombreResponsable');
      if (!apellidoResponsable) camposFaltantes.push('apellidoResponsable');
      if (!domicilioResponsable ||
          !domicilioResponsable.calle ||
          !domicilioResponsable.altura ||
          !domicilioResponsable.departamento) {
        camposFaltantes.push('domicilioResponsable');
      }
    }

    if (camposFaltantes.length > 0) {
      return res.status(400).json({
        message: `Faltan los siguientes campos: ${camposFaltantes.join(', ')}`
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({ message: 'Error interno en la validación.' });
  }
};






module.exports = {
  validarCampos,
};
