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

// 🛠️ Nueva configuración de Multer
const uploadFotosVenta = multer({
  storage: storageFotosVenta,
  limits: { fileSize: 5 * 1024 * 1024 }, // Límite de 5MB por archivo
}).any(); // Permite múltiples archivos con cualquier nombre

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

// Middleware de subida de fotos para venta
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

        // Extraemos el índice y el tipo de campo
        const fieldName = file.fieldname;
        const match = fieldName.match(/venta\[(\d+)\]\[(fotos|imeis)\](\[(\d+)\]\[foto\])?/);

        if (match) {
          const ventaIndex = match[1];
          const field = match[2];
          const imeiIndex = match[4];

          if (!uploadedPhotosVenta[ventaIndex]) {
            uploadedPhotosVenta[ventaIndex] = {};
          }

          if (field === "fotos") {
            if (!uploadedPhotosVenta[ventaIndex][field]) {
              uploadedPhotosVenta[ventaIndex][field] = [];
            }
            uploadedPhotosVenta[ventaIndex][field].push(fotoUrl);
          } else if (field === "imeis" && imeiIndex !== undefined) {
            if (!uploadedPhotosVenta[ventaIndex][field]) {
              uploadedPhotosVenta[ventaIndex][field] = [];
            }

            if (!uploadedPhotosVenta[ventaIndex][field][imeiIndex]) {
              uploadedPhotosVenta[ventaIndex][field][imeiIndex] = {};
            }

            uploadedPhotosVenta[ventaIndex][field][imeiIndex]["foto"] = fotoUrl;
          }
        } else {
          console.warn("⚠️ Archivo no reconocido:", file.fieldname);
        }
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
