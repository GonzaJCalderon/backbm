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

const subirFotoACloudinary = async (foto) => {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream({ resource_type: 'image' }, (error, result) => {
            if (error) {
                console.error('Error al subir foto a Cloudinary:', error);
                return reject(error);
            }
            console.log('Resultado de Cloudinary:', result); // Verifica el resultado aquí
            resolve({ secure_url: result.secure_url });
        }).end(foto.buffer);
    });
};


const finalizarCreacionBienes = async (req, res) => {
    try {
        const { bienes } = req.body;

        if (!Array.isArray(bienes) || bienes.length === 0) {
            return res.status(400).json({ message: 'No se proporcionaron bienes para registrar.' });
        }

        const bienesNormalizados = bienes.map((bien) => ({
            tipo: bien.tipo || bien.Tipo,
            descripcion: bien.descripcion || bien['Descripción'],
            precio: bien.precio || bien.Precio,
            marca: bien.marca || bien.Marca,
            modelo: bien.modelo || bien.Modelo,
            fotos: bien.fotos || [],
            cantidadStock: bien.cantidadStock || bien.CantidadStock,
        }));

        const transaction = await sequelize.transaction();

        const bienesGuardados = [];
        for (const bien of bienesNormalizados) {
            if (!bien.tipo || !bien.precio) {
                throw new Error(`El bien con tipo "${bien.tipo}" tiene campos faltantes.`);
            }

            // Subir fotos si existen
            const fotosSubidas = bien.fotos.length ? await subirFotos(bien.fotos) : [];
            bien.fotos = fotosSubidas; // Asigna las fotos subidas al bien

            // Crear el bien
            const nuevoBien = await Bien.create(
                {
                    tipo: bien.tipo,
                    descripcion: bien.descripcion || '',
                    precio: bien.precio,
                    marca: bien.marca || '',
                    modelo: bien.modelo || '',
                    fotos: fotosSubidas, // Almacenar fotos correctamente
                    propietario_uuid: req.user.uuid,
                },
                { transaction }
            );

            // Crear stock
            const nuevoStock = await Stock.create(
                {
                    uuid: uuidv4(),
                    bien_uuid: nuevoBien.uuid,
                    cantidad: bien.cantidadStock || 0, // Aquí debería reflejar correctamente el valor enviado
                    usuario_uuid: req.user.uuid,
                },
                { transaction }
            );
            
            console.log('Cantidad de stock procesada:', bien.cantidadStock); // Debug
            
            

            // Crear identificadores únicos
            const identificadores = Array.from(
                { length: bien.cantidadStock || 1 },
                () => ({
                    bien_uuid: nuevoBien.uuid,
                    identificador_unico: `${bien.tipo.toUpperCase()}-${uuidv4()}`,
                })
            );
            await DetallesBien.bulkCreate(identificadores, { transaction });

            bienesGuardados.push({
                bien: nuevoBien.toJSON(),
                stock: nuevoStock.toJSON(),
                identificadores,
            });
        }

        await transaction.commit();
        res.status(201).json({
            message: 'Bienes creados exitosamente.',
            bienes: bienesGuardados,
        });
    } catch (error) {
        console.error('Error al finalizar la creación de bienes:', error);
        res.status(500).json({ message: 'Error al registrar los bienes.', detalles: error.message });
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
