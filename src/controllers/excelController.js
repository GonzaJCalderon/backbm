const { sequelize } = require('../models'); // Reemplaza con la ruta correcta.
const { Bien, Stock, DetallesBien } = require('../models');
const { v4: uuidv4 } = require('uuid');
const XLSX = require('xlsx');
const fs = require('fs').promises;
const cloudinary = require('cloudinary').v2;


// Configuración de Cloudinary
// Configuración de Cloudinary
cloudinary.config({
    cloud_name: 'dtx5ziooo',
    api_key: '154721198775314',
    api_secret: '4HXf6T4SIh_Z5RjmeJtmM6hEYdk',
  });

// Función para subir fotos a Cloudinary
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



const processExcel = async (req, res) => {
    try {
        console.log('Procesando archivo Excel.');

        if (!req.file) {
            return res.status(400).json({ message: 'No se subió ningún archivo Excel.' });
        }

        console.log('Ruta del archivo recibido:', req.file.path);
        if (!(await fs.access(req.file.path).then(() => true).catch(() => false))) {
            return res.status(400).json({ message: 'El archivo subido no existe.' });
        }

        const workbook = XLSX.readFile(req.file.path);
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        if (!data || data.length === 0) {
            return res.status(400).json({ message: 'La planilla no contiene datos válidos.' });
        }

        const bienes = data.map((row) => ({
            idTemporal: uuidv4(),
            Tipo: row.Tipo || '',
            Descripción: row.Descripción || '',
            Precio: row.Precio || 0,
            Marca: row.Marca || '',
            Modelo: row.Modelo || '',
            CantidadStock: row['Cantidad Stock'] || 0,
        }));

        await fs.unlink(req.file.path);
        console.log('Archivo temporal eliminado correctamente.');

        res.status(200).json({
            message: 'Planilla procesada correctamente.',
            bienes,
        });
    } catch (error) {
        console.error('Error procesando el archivo Excel:', error);
        res.status(500).json({ message: 'Error interno al procesar la planilla.', detalles: error.message });
    }
};

const subirFotoACloudinary = async (fotoBase64) => {
  if (!fotoBase64 || typeof fotoBase64 !== 'string' || !fotoBase64.startsWith('data:image')) {
      throw new Error('El archivo de la foto está vacío o no es válido.');
  }

  try {
      return new Promise((resolve, reject) => {
          const base64Data = fotoBase64.replace(/^data:image\/\w+;base64,/, ''); // Elimina el encabezado `data:image`
          const buffer = Buffer.from(base64Data, 'base64'); // Convierte a buffer

          cloudinary.uploader.upload_stream({ resource_type: 'image' }, (error, result) => {
              if (error) {
                  console.error('Error al subir foto a Cloudinary:', error);
                  return reject(new Error('Error al subir la foto a Cloudinary.'));
              }
              resolve({ secure_url: result.secure_url });
          }).end(buffer);
      });
  } catch (error) {
      console.error('Error interno al procesar la foto:', error.message);
      throw new Error('Error interno al procesar la foto.');
  }
};




const finalizarCreacionBienes = async (req, res) => {
  let transaction;

  try {
    const { bienes } = req.body;

    if (!Array.isArray(bienes) || bienes.length === 0) {
      return res.status(400).json({ message: 'No se proporcionaron bienes para registrar.' });
    }

    const propietario_uuid = req.user.uuid; // Obtener el propietario desde el token
    if (!propietario_uuid) {
      return res.status(401).json({ message: 'Usuario no autenticado.' });
    }

    transaction = await sequelize.transaction();

    const bienesGuardados = [];

    for (const bien of bienes) {
      // Validar campos obligatorios
      if (!bien.tipo || !bien.marca || !bien.modelo || bien.cantidadStock <= 0) {
        console.error(`Datos obligatorios faltantes para el bien: ${JSON.stringify(bien)}`);
        continue; // salta este bien, sigue con el siguiente
      }

      // Subir fotos del array bien.fotos (si existen)
      const fotosSubidas = bien.fotos?.length
        ? await Promise.all(
            bien.fotos.map(async (fotoBase64, index) => {
              try {
                // Asume que subirFotoACloudinary(fotoBase64) devuelve { secure_url: '...'}
                return await subirFotoACloudinary(fotoBase64);
              } catch (error) {
                console.error(`Error al subir la foto ${index + 1}:`, error.message);
                throw new Error('Error al subir una o más fotos.');
              }
            })
          )
        : [];

      // Verificar si ya existe el bien con (tipo, marca, modelo, propietario_uuid)
      const bienExistente = await Bien.findOne({
        where: { tipo: bien.tipo, marca: bien.marca, modelo: bien.modelo, propietario_uuid },
        transaction,
      });

      let nuevoBien;
      if (bienExistente) {
        // Ya existe => Actualizar stock
        const stockExistente = await Stock.findOne({
          where: { bien_uuid: bienExistente.uuid },
          transaction,
        });

        if (stockExistente) {
          await stockExistente.update(
            { cantidad: stockExistente.cantidad + bien.cantidadStock },
            { transaction }
          );
        } else {
          await Stock.create(
            {
              cantidad: bien.cantidadStock,
              bien_uuid: bienExistente.uuid,
              usuario_uuid: propietario_uuid, // si tu tabla stock tiene este campo
            },
            { transaction }
          );
        }
        nuevoBien = bienExistente;
      } else {
        // Crear un nuevo Bien
        nuevoBien = await Bien.create(
          {
            tipo: bien.tipo,
            descripcion: bien.descripcion,
            precio: bien.precio,
            marca: bien.marca,
            modelo: bien.modelo,
            // Guardar las fotos subidas a Cloudinary a nivel "Bien"
            fotos: fotosSubidas.map((f) => f.secure_url),
            propietario_uuid, // Asigna el propietario
          },
          { transaction }
        );

        // Crear Stock
        await Stock.create(
          {
            cantidad: bien.cantidadStock,
            bien_uuid: nuevoBien.uuid,
            usuario_uuid: propietario_uuid, // asume que tu stock tiene este campo
          },
          { transaction }
        );
      }

      // Crear tantos registros en DetallesBien como indique la cantidadStock
      // Si es 'teléfono móvil' con IMEIs => usar la IMEI correspondiente y su foto
      for (let i = 0; i < bien.cantidadStock; i++) {
        if (bien.tipo.toLowerCase() === 'teléfono móvil' && bien.imeis && bien.imeis[i]) {
          const imei = bien.imeis[i];
          // Toma la foto i-ésima si existe. Sino, null
          const foto = fotosSubidas[i]?.secure_url || null;

          // Verificar si ya existe un DetallesBien con ese IMEI
          const imeiExistente = await DetallesBien.findOne({
            where: { identificador_unico: imei },
            transaction,
          });

          if (!imeiExistente) {
            await DetallesBien.create(
              {
                bien_uuid: nuevoBien.uuid,
                identificador_unico: imei,
                foto, // Guardamos la foto en el campo 'foto' de DetallesBien
              },
              { transaction }
            );
          }
        } else {
          // No es teléfono móvil => o no tiene IMEIs => generar identificador random
          const identificador = `${nuevoBien.uuid}-${uuidv4()}`;
          const foto = fotosSubidas[i]?.secure_url || null;

          await DetallesBien.create(
            {
              bien_uuid: nuevoBien.uuid,
              identificador_unico: identificador,
              foto,
            },
            { transaction }
          );
        }
      }

      // Agregar a bienesGuardados la info
      bienesGuardados.push({ bien: nuevoBien.toJSON(), stock: bien.cantidadStock });
    }

    await transaction.commit();
    return res.status(201).json({
      message: 'Bienes registrados correctamente.',
      bienes: bienesGuardados,
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('Error al finalizar la creación de bienes:', error.message);
    return res.status(500).json({
      message: 'Error al registrar los bienes.',
      detalles: error.message,
    });
  }
};








const subirFotosPorBien = async (req, res) => {
    console.log('Archivos recibidos en req.files:', req.files);

    if (!req.files || req.files.length === 0) {
        console.error('No se subieron imágenes.');
        return res.status(400).json({ message: 'No se subieron imágenes.' });
    }

    try {
        const fotos = await Promise.all(
            req.files.map((file) => {
                return new Promise((resolve, reject) => {
                    cloudinary.uploader.upload_stream(
                        { resource_type: 'image' },
                        (error, result) => {
                            if (error) {
                                console.error('Error al subir imagen:', error);
                                return reject(error);
                            }
                            console.log('Resultado de Cloudinary:', result);
                            resolve(result.secure_url); // Devuelve la URL segura de la imagen
                        }
                    ).end(file.buffer); // Usamos el buffer de la imagen
                });
            })
        );

        console.log('Fotos subidas correctamente:', fotos);

        return res.status(200).json({ fotos });
    } catch (error) {
        console.error('Error interno al procesar las fotos:', error);
        return res.status(500).json({ message: 'Error interno al procesar las fotos.' });
    }
};





// Exportar las funciones
module.exports = {
    processExcel,
    subirFotos,
    finalizarCreacionBienes,
    subirFotosPorBien,
     subirFotoACloudinary,

};