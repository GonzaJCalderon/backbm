const { DetallesBien, Bien } = require('../models');
const { v4: uuidv4 } = require('uuid');

/**
 * Solo validar existencia y propiedad.
 */
const validarExistenciaYPropiedadDeImei = async (imei, vendedorId, transaction, options = {}) => {
  const { debug = false } = options;

  if (debug) {
    console.log(`🔍 Buscando IMEI: ${imei}`);
  }

  const imeiExistente = await DetallesBien.findOne({
    where: { identificador_unico: imei },
    include: [{
      model: Bien,
      as: 'detalleBien',
      attributes: ['uuid', 'propietario_uuid'],
    }],
    transaction,
  });

  if (imeiExistente) {
    if (!imeiExistente.detalleBien) {
      throw new Error(`El IMEI ${imei} existe pero no se pudo verificar el propietario.`);
    }

    if (imeiExistente.detalleBien.propietario_uuid !== vendedorId) {
      throw new Error(`El IMEI ${imei} ya está registrado y NO pertenece al vendedor.`);
    }

  } else {
    if (debug) {
      console.log(`✅ IMEI ${imei} no existe en el sistema. Libre para registrar.`);
    }
  }
};


/**
 * Nueva función: validar o crear automáticamente IMEI
 */
const validarYOcrearImeiSiNoExiste = async (imei, bien, vendedorId, transaction, options = {}) => {
  const { debug = false, fotoUrl = null } = options;

  if (debug) {
    console.log(`🔎 Verificando IMEI: ${imei}`);
  }

  let imeiExistente = await DetallesBien.findOne({
    where: { identificador_unico: imei },
    include: [{
      model: Bien,
      as: 'detalleBien',
      attributes: ['uuid', 'propietario_uuid'],
    }],
    transaction,
  });

  if (imeiExistente) {
    if (!imeiExistente.detalleBien) {
      throw new Error(`El IMEI ${imei} existe pero no tiene propietario asociado.`);
    }

    if (imeiExistente.detalleBien.propietario_uuid !== vendedorId) {
      throw new Error(`El IMEI ${imei} ya existe pero pertenece a otro vendedor.`);
    }

    return imeiExistente; // 👍 IMEI existente y válido
  }

  // ✅ Crear nuevo detalle
  const nuevoDetalle = await DetallesBien.create({
    uuid: uuidv4(),
    bien_uuid: bien.uuid,
    identificador_unico: imei,
    estado: 'disponible',
    foto: fotoUrl || null,
  }, { transaction });

  if (debug && fotoUrl) {
    console.log(`📸 Foto asignada al IMEI ${imei}: ${fotoUrl}`);
  }

  return nuevoDetalle;
};


// 👇 Exportar ambas
module.exports = {
  validarExistenciaYPropiedadDeImei,
  validarYOcrearImeiSiNoExiste
};
