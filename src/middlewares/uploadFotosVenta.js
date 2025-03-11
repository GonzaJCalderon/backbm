const multer = require("multer");
const cloudinary = require("cloudinary").v2;

// 🔐 Configuración de Cloudinary
cloudinary.config({
  cloud_name: "dtx5ziooo",
  api_key: "154721198775314",
  api_secret: "4HXf6T4SIh_Z5RjmeJtmM6hEYdk",
});

// 📌 Almacenamiento en memoria para evitar archivos temporales
const storageFotosVenta = multer.memoryStorage();

// 📌 Configuración de Multer con validaciones mejoradas
const uploadFotosVenta = multer({
  storage: storageFotosVenta,
  limits: { fileSize: 5 * 1024 * 1024 }, // Máximo 5MB por imagen
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      console.warn(`⚠️ Archivo no permitido: ${file.originalname}`);
      return cb(new Error("Solo se permiten archivos de imagen."), false);
    }
    cb(null, true);
  },
}).any();

// 📌 Función para subir archivos a Cloudinary
const uploadFileToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "image" },
      (error, result) => {
        if (error) {
          console.error("❌ Error en Cloudinary:", error);
          return reject(error);
        }
        resolve(result.secure_url);
      }
    );
    stream.end(fileBuffer);
  });
};

// 📌 Middleware para procesar la subida de imágenes
const uploadFotosVentaMiddleware = async (req, res, next) => {
  console.log("📌 Iniciando middleware de subida de fotos para Venta...");

  uploadFotosVenta(req, res, async (err) => {
    if (err) {
      console.error("❌ Error en Multer:", err);
      return res.status(400).json({ error: err.message });
    }

    console.log("📌 Archivos recibidos por Multer:", req.files);

    if (!req.files || req.files.length === 0) {
      console.warn("⚠️ No se recibieron imágenes.");
      req.uploadedPhotosVenta = {};
      return next();
    }

    try {
      const uploadedPhotosVenta = {};

      // 🔄 Subir imágenes a Cloudinary de forma concurrente
      const uploadPromises = req.files.map(async (file) => {
        console.log(`📸 Subiendo archivo: ${file.originalname}...`);

        try {
          const fotoUrl = await uploadFileToCloudinary(file.buffer);
          console.log("✅ Foto subida a Cloudinary:", fotoUrl);

          // 🔍 Verificar a qué bien pertenece la imagen
          console.log(`📌 Campo recibido: ${file.fieldname}`);
          const matchFotos = file.fieldname.match(/venta\[(\d+)\]\[fotos\]\[(\d+)\]/);
          const matchImei = file.fieldname.match(/venta\[(\d+)\]\[imeis\]\[(\d+)\]\[foto\]/);

          if (matchFotos) {
            const ventaIndex = matchFotos[1];
            if (!uploadedPhotosVenta[ventaIndex]) {
              uploadedPhotosVenta[ventaIndex] = { fotos: [], imeis: {} };
            }
            uploadedPhotosVenta[ventaIndex].fotos.push(fotoUrl);
            console.log(`✅ Foto asignada a bien[${ventaIndex}]: ${fotoUrl}`);
          } else if (matchImei) {
            const ventaIndex = matchImei[1];
            const imeiIndex = matchImei[2];

            if (!uploadedPhotosVenta[ventaIndex]) {
              uploadedPhotosVenta[ventaIndex] = { fotos: [], imeis: {} };
            }

            uploadedPhotosVenta[ventaIndex].imeis[imeiIndex] = fotoUrl;
            console.log(`✅ Foto asignada a IMEI [${ventaIndex}][${imeiIndex}]: ${fotoUrl}`);
          } else {
            console.warn("⚠️ Campo no reconocido en el formulario:", file.fieldname);
          }
        } catch (uploadError) {
          console.error("❌ Error al subir imagen a Cloudinary:", uploadError);
        }
      });

      await Promise.all(uploadPromises); // Esperar a que todas las imágenes suban

      req.uploadedPhotosVenta = uploadedPhotosVenta;
      console.log("✅ Fotos procesadas exitosamente:", JSON.stringify(uploadedPhotosVenta, null, 2));
      next();
    } catch (error) {
      console.error("❌ Error en la subida de imágenes:", error);
      return res.status(500).json({ error: "Error al subir fotos." });
    }
  });
};

// 📌 Exportar middleware
module.exports = { uploadFotosVentaMiddleware };
