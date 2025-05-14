const { sequelize } = require('../models');
// 🔹 Guardar bienes en base al Excel + fotos + IMEIs
const { notificarAdministradorInternamente } = require('../services/notficacionesService');
const { Bien, Stock, DetallesBien } = require('../models');
const { v4: uuidv4 } = require('uuid');
const ExcelJS = require('exceljs');
const cloudinary = require('cloudinary').v2;

// 🔐 Configuración de Cloudinary
cloudinary.config({
    cloud_name: 'dtx5ziooo',
    api_key: '154721198775314',
    api_secret: '4HXf6T4SIh_Z5RjmeJtmM6hEYdk',
});

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

// 🔹 Subir base64 a Cloudinary
const subirFotoACloudinary = async (fotoBase64) => {
    if (!fotoBase64 || typeof fotoBase64 !== 'string' || !fotoBase64.startsWith('data:image')) {
        throw new Error('Formato de imagen no válido.');
    }

    try {
        const resultado = await cloudinary.uploader.upload(fotoBase64, { resource_type: 'image' });
        return resultado.secure_url;
    } catch (error) {
        console.error("❌ Error al subir foto a Cloudinary:", error.message);
        throw new Error('Error al subir la foto a Cloudinary.');
    }
};


const finalizarCreacionBienes = async (req, res) => {
  let transaction;

  try {
    const propietarioUuid = req.user.empresaUuid || req.user.uuid;

    if (!req.body.bienes || !Array.isArray(req.body.bienes) || req.body.bienes.length === 0) {
      return res.status(400).json({ message: 'No se proporcionaron bienes para registrar.' });
    }

    transaction = await sequelize.transaction();
    const bienesGuardados = [];

    for (const bien of req.body.bienes) {
      if (!bien.Tipo || !bien.Marca || !bien.Modelo) continue;

      // 1️⃣ Crear el bien primero
      const nuevoBien = await Bien.create({
        uuid: uuidv4(),
        tipo: bien.Tipo,
        descripcion: bien.Descripción,
        precio: bien.Precio,
        marca: bien.Marca,
        modelo: bien.Modelo,
        propietario_uuid: propietarioUuid,
      }, { transaction });

      // 2️⃣ Crear stock
      await Stock.create({
        uuid: uuidv4(),
        bien_uuid: nuevoBien.uuid,
        cantidad: bien.CantidadStock || 1,
        usuario_uuid: propietarioUuid,
      }, { transaction });

      // 3️⃣ IMEIs (teléfonos móviles)
      if (bien.Tipo.toLowerCase() === 'teléfono móvil' && bien.ImeisImagenes) {
        for (const [imei, { precio, imagenes }] of Object.entries(bien.ImeisImagenes)) {
          const existeImei = await DetallesBien.findOne({
            where: { identificador_unico: imei },
            transaction,
          });

          if (existeImei) {
            await notificarAdministradorInternamente({
              adminUuid: null,
              descripcion: `Intento de registrar IMEI duplicado al cargar bien por lote.`,
              uuidSospechoso: imei,
              tipo: 'imei',
            });
            continue; // ⛔ ignoramos el duplicado pero lo notificamos
          }

          const fotosSubidas = imagenes?.length > 0
            ? await Promise.all(imagenes.slice(0, 4).map(subirFotoACloudinary))
            : [];

          await DetallesBien.create({
            uuid: uuidv4(),
            bien_uuid: nuevoBien.uuid,
            identificador_unico: imei,
            estado: 'disponible',
            foto: fotosSubidas[0] || null,
            precio: precio || bien.Precio || 0,
          }, { transaction });
        }
      }

      // 4️⃣ Otros identificadores únicos
      if (
        bien.Tipo.toLowerCase() !== 'teléfono móvil' &&
        Array.isArray(bien.IdentificadoresUnicos) &&
        bien.IdentificadoresUnicos.length > 0
      ) {
        for (const idUnico of bien.IdentificadoresUnicos) {
          const existe = await DetallesBien.findOne({
            where: { identificador_unico: idUnico },
            transaction,
          });

          if (existe) {
            await notificarAdministradorInternamente({
              adminUuid: null,
              descripcion: `Registro masivo: identificador duplicado (${idUnico})`,
              uuidSospechoso: idUnico,
              tipo: 'identificador',
            });
            continue;
          }

          await DetallesBien.create({
            uuid: uuidv4(),
            bien_uuid: nuevoBien.uuid,
            identificador_unico: idUnico,
            estado: 'disponible',
            foto: null,
          }, { transaction });
        }
      }

      bienesGuardados.push({ bien: nuevoBien.toJSON() });
    }

    await transaction.commit();
    return res.status(201).json({
      message: '✅ Bienes registrados correctamente.',
      bienes: bienesGuardados,
    });

  } catch (error) {
    if (transaction) await transaction.rollback();
    return res.status(500).json({
      message: '❌ Error interno al registrar bienes.',
      error: error.message,
    });
  }
};


// 🔹 Subida de fotos (usada por frontend individualmente por bien)
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

module.exports = {
    processExcel,
    subirFotos,
    finalizarCreacionBienes,
    subirFotosPorBien,
    subirFotoACloudinary,
};
