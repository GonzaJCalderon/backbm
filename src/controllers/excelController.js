const { Bien, Stock, DetallesBien } = require('../models');
const { sequelize } = require('../models');
const { notificarAdministradorInternamente } = require('../services/notficacionesService');
const { v4: uuidv4 } = require('uuid');
const cloudinary = require('cloudinary').v2;

const subirFotoACloudinary = async (fotoBase64) => {
  if (!fotoBase64 || typeof fotoBase64 !== 'string' || !fotoBase64.startsWith('data:image')) {
    throw new Error('Formato de imagen inválido');
  }

  try {
    const resultado = await cloudinary.uploader.upload(fotoBase64, { resource_type: 'image' });
    return resultado.secure_url;
  } catch (err) {
    console.error('❌ Error subiendo a Cloudinary:', err.message);
    throw err;
  }
};

const finalizarCreacionBienes = async (req, res) => {
  let transaction;

  try {
    console.log("📦 Datos recibidos para crear bienes:", JSON.stringify(req.body, null, 2));

    const propietarioUuid = req.user?.empresaUuid || req.user?.uuid;

    if (!propietarioUuid) {
      return res.status(400).json({ message: 'Usuario no válido (token sin UUID).' });
    }

    const { bienes } = req.body;

    if (!Array.isArray(bienes) || bienes.length === 0) {
      return res.status(400).json({ message: 'No se proporcionaron bienes para registrar.' });
    }

    transaction = await sequelize.transaction();
    const bienesGuardados = [];

    for (const [index, bien] of bienes.entries()) {
      try {
        if (!bien.Tipo || !bien.Marca || !bien.Modelo) {
          console.warn(`⚠️ Bien omitido por datos incompletos (index ${index}):`, bien);
          continue;
        }

        console.log(`🚀 Procesando bien ${index + 1}/${bienes.length}: ${bien.Marca} ${bien.Modelo}`);

        // Subir fotos generales
        let fotosSubidas = [];
        if (Array.isArray(bien.Fotos) && bien.Fotos.length > 0) {
          fotosSubidas = await Promise.all(
            bien.Fotos.slice(0, 4).map(async (base64, i) => {
              try {
                return await subirFotoACloudinary(base64);
              } catch (err) {
                console.warn(`⚠️ Error al subir foto general [${i}] del bien ${index}:`, err.message);
                return null;
              }
            })
          );
        }

        const nuevoBien = await Bien.create({
          uuid: uuidv4(),
          tipo: bien.Tipo,
          descripcion: bien.Descripción,
          precio: bien.Precio || 0,
          marca: bien.Marca,
          modelo: bien.Modelo,
          propietario_uuid: propietarioUuid,
          fotos: fotosSubidas.filter(Boolean),
        }, { transaction });

        await Stock.create({
          uuid: uuidv4(),
          bien_uuid: nuevoBien.uuid,
          cantidad: bien.CantidadStock || 1,
          propietario_uuid: propietarioUuid,
        }, { transaction });

        const esTelefono = bien.Tipo?.toLowerCase() === 'teléfono móvil';
        const cantidad = parseInt(bien.CantidadStock || 1, 10);

        if (esTelefono && bien.ImeisImagenes) {
          for (const [imei, data] of Object.entries(bien.ImeisImagenes)) {
            if (!imei) continue;

            const existe = await DetallesBien.findOne({
              where: { identificador_unico: imei },
              transaction,
            });

            if (existe) {
              await notificarAdministradorInternamente({
                adminUuid: null,
                descripcion: `Registro duplicado: IMEI ${imei}`,
                uuidSospechoso: imei,
                tipo: 'imei',
              });
              console.warn(`⚠️ IMEI duplicado detectado: ${imei}, se omitirá.`);
              continue;
            }

            const fotos = await Promise.all(
              (data.imagenes || []).slice(0, 4).map(async (img64, i) => {
                try {
                  return await subirFotoACloudinary(img64);
                } catch (e) {
                  console.warn(`⚠️ Error subiendo imagen IMEI [${i}] ${imei}:`, e.message);
                  return null;
                }
              })
            );

            await DetallesBien.create({
              uuid: uuidv4(),
              bien_uuid: nuevoBien.uuid,
              identificador_unico: imei,
              estado: 'disponible',
              foto: fotos.filter(Boolean)[0] || null,
              precio: data.precio || bien.Precio || 0,
              propietario_uuid: propietarioUuid,
            }, { transaction });
          }
        } else {
          const identificadores = [];
          const identificadoresUnicos = new Set();

          for (let i = 0; i < cantidad; i++) {
            const customId = Array.isArray(bien.IdentificadoresUnicos) && bien.IdentificadoresUnicos[i]
              ? bien.IdentificadoresUnicos[i]
              : `ID-${uuidv4().slice(0, 8)}-${Date.now()}-${i}`;

            if (identificadoresUnicos.has(customId)) {
              console.warn(`⚠️ Identificador duplicado localmente: ${customId} — se omitirá.`);
              continue;
            }

            identificadoresUnicos.add(customId);

            identificadores.push({
              uuid: uuidv4(),
              bien_uuid: nuevoBien.uuid,
              propietario_uuid: propietarioUuid,
              identificador_unico: customId,
              estado: 'disponible',
              foto: fotosSubidas.length > 0 ? (fotosSubidas[i] || fotosSubidas[0]) : null,
            });
          }

          console.log(`🧩 Generando ${identificadores.length} identificadores únicos para bien ${index}.`);
          console.log("📦 Identificadores generados:", JSON.stringify(identificadores, null, 2));

          try {
            await DetallesBien.bulkCreate(identificadores, { transaction });
          } catch (err) {
            console.error("❌ Error en DetallesBien.bulkCreate:", err.message);
            console.error("📦 Datos fallidos:", JSON.stringify(identificadores, null, 2));
            throw err;
          }
        }

        bienesGuardados.push({ bien: nuevoBien.toJSON() });

      } catch (e) {
        console.error(`❌ Error al procesar bien en índice ${index}:`, e.message);
        continue;
      }
    }

    await transaction.commit();

  return res.status(201).json({
  message: 'Bienes registrados correctamente.',
  bienes: bienesGuardados,
});


  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error("❌ Error general en finalizarCreacionBienes:", error);

    return res.status(500).json({
      message: '❌ Error interno al registrar bienes.',
      error: error.message,
    });
  }
};




// 🔹 Subida de fotos generales
const subirFotos = async (req, res) => {
  try {
    const archivos = req.files;
    const resultados = await Promise.all(
      archivos.map(async (archivo) => {
        const resultado = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { resource_type: "image" },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          ).end(archivo.buffer);
        });
        return { secure_url: resultado.secure_url };
      })
    );

    res.json({ fotos: resultados });
  } catch (error) {
    console.error('Error al subir fotos:', error);
    res.status(500).json({ error: 'Error al subir fotos.' });
  }
};

// 🔹 Procesar archivo Excel recibido
const processExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se subió ningún archivo Excel.' });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.worksheets[0];

    const data = [];
    worksheet.eachRow((row, rowIndex) => {
      if (rowIndex === 1) return; // Saltar encabezado

      data.push({
        idTemporal: uuidv4(),
        Tipo: row.getCell(1).value || '',
        Descripción: row.getCell(2).value || '',
        Precio: row.getCell(3).value || 0,
        Marca: row.getCell(4).value || '',
        Modelo: row.getCell(5).value || '',
        CantidadStock: row.getCell(6).value || 0,
      });
    });

    if (!data.length) {
      return res.status(400).json({ message: 'La planilla no contiene datos válidos.' });
    }

    res.status(200).json({
      message: 'Planilla procesada correctamente.',
      bienes: data,
    });
  } catch (error) {
    console.error('Error procesando el archivo Excel:', error);
    res.status(500).json({ message: 'Error interno al procesar la planilla.', detalles: error.message });
  }
};

// 🔹 Subida de fotos por bien
const subirFotosPorBien = async (req, res) => {
  if (!Array.isArray(req.files) || req.files.length === 0) {
    return res.status(400).json({ message: 'No se subieron imágenes.' });
  }

  try {
    const fotos = await Promise.all(
      req.files.map((file) => {
        return new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { resource_type: 'image' },
            (error, result) => {
              if (error) return reject(error);
              resolve(result.secure_url);
            }
          ).end(file.buffer);
        });
      })
    );

    return res.status(200).json({ fotos });
  } catch (error) {
    return res.status(500).json({ message: 'Error interno al procesar las fotos.' });
  }
};

// Exportación
module.exports = {
  processExcel,
  subirFotos,
  finalizarCreacionBienes,
  subirFotosPorBien,
  subirFotoACloudinary,
};
