const multer = require("multer");
const path = require("path");
const cloudinary = require("cloudinary").v2;

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: "dtx5ziooo",
  api_key: "154721198775314",
  api_secret: "4HXf6T4SIh_Z5RjmeJtmM6hEYdk",
});

// Configuración de almacenamiento en memoria para Multer
const storageFotosVenta = multer.memoryStorage();

// Configuración de Multer (acepta múltiples archivos)
const uploadFotosVenta = multer({
  storage: storageFotosVenta,
  limits: { fileSize: 5 * 1024 * 1024 }, // Límite de 5MB por archivo
}).any();

// Función para subir archivos a Cloudinary
const uploadFileToCloudinary = async (fileBuffer) => {
  console.log("📌 Subiendo archivo a Cloudinary...");
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

// Middleware de subida de fotos para la venta
const uploadFotosVentaMiddleware = async (req, res, next) => {
  console.log("📌 Iniciando middleware de subida de fotos para Venta...");

  uploadFotosVenta(req, res, async (err) => {
    if (err) {
      console.error("❌ Error al cargar fotos con Multer:", err);
      return res.status(400).json({ error: err.message });
    }

    console.log("📌 Verificando req.files:", req.files);

    if (!req.files || req.files.length === 0) {
      console.warn("⚠️ No se recibieron fotos.");
      req.uploadedPhotosVenta = {};
      return next();
    }

    try {
      const uploadedPhotosVenta = {};

      for (const file of req.files) {
        console.log("📌 Subiendo archivo a Cloudinary:", file.originalname);
        const fotoUrl = await uploadFileToCloudinary(file.buffer);
        console.log("✅ Foto subida con éxito:", fotoUrl);

        // Procesar fotos generales (campo: venta[i][fotos])
        const matchFotos = file.fieldname.match(/venta\[(\d+)\]\[fotos\]/);
        if (matchFotos) {
          const ventaIndex = matchFotos[1];
          if (!uploadedPhotosVenta[ventaIndex]) {
            // Inicializamos con un objeto que tendrá tanto fotos generales como de imeis
            uploadedPhotosVenta[ventaIndex] = { fotos: [], imeis: {} };
          }
          uploadedPhotosVenta[ventaIndex].fotos.push(fotoUrl);
          continue; // Continuar al siguiente archivo
        }

        // Procesar fotos individuales de IMEIS (campo: venta[i][imeis][j][foto])
        const matchImei = file.fieldname.match(/venta\[(\d+)\]\[imeis\]\[(\d+)\]\[foto\]/);
        if (matchImei) {
          const ventaIndex = matchImei[1];
          const imeiIndex = matchImei[2];
          if (!uploadedPhotosVenta[ventaIndex]) {
            uploadedPhotosVenta[ventaIndex] = { fotos: [], imeis: {} };
          }
          // Se guarda la foto asociada a este IMEI
          uploadedPhotosVenta[ventaIndex].imeis[imeiIndex] = fotoUrl;
          continue;
        }

        // Si el campo no coincide con ninguno de los dos patrones, se muestra una advertencia
        console.warn("⚠️ Campo no reconocido:", file.fieldname);
      }

      req.uploadedPhotosVenta = uploadedPhotosVenta;
      console.log("✅ Fotos subidas correctamente para Venta:", uploadedPhotosVenta);
      next();
    } catch (uploadError) {
      console.error("❌ Error al subir fotos a Cloudinary:", uploadError);
      return res.status(500).json({ error: "Error al subir fotos a Cloudinary." });
    }
  });
};

module.exports = { 
  uploadFotosVentaMiddleware, 
  uploadFileToCloudinary, 
  uploadFotosVenta 
};
