const multer = require("multer");
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
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Solo se permiten archivos de imagen."), false);
    }
    cb(null, true);
  },
}).any();

// Función para subir archivos a Cloudinary
const uploadFileToCloudinary = async (fileBuffer) => {
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

        // 🔹 Para fotos generales (venta[i][fotos])
        const matchFotos = file.fieldname.match(/venta\[(\d+)\]\[fotos\]/);
        if (matchFotos) {
          const ventaIndex = matchFotos[1];
          if (!uploadedPhotosVenta[ventaIndex]) {
            uploadedPhotosVenta[ventaIndex] = { fotos: [], imeis: {} };
          }
          uploadedPhotosVenta[ventaIndex].fotos.push(fotoUrl);
          continue;
        }

        // 🔹 Para fotos de IMEIs (venta[i][imeis][j][foto])
     // 🔹 Para fotos de IMEIs (venta[i][imeis][j][foto])
const matchImei = file.fieldname.match(/venta\[(\d+)\]\[imeis\]\[(\d+)\]\[foto\]/);
if (matchImei) {
  const ventaIndex = matchImei[1];
  const imeiIndex = matchImei[2];

  if (!uploadedPhotosVenta[ventaIndex]) {
    uploadedPhotosVenta[ventaIndex] = { fotos: [], imeis: {} };
  }

  if (!uploadedPhotosVenta[ventaIndex].imeis) {
    uploadedPhotosVenta[ventaIndex].imeis = {};
  }

  uploadedPhotosVenta[ventaIndex].imeis[imeiIndex] = fotoUrl;
  console.log(`✅ Foto asignada a IMEI ${imeiIndex}: ${fotoUrl}`);
  continue;
}


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

module.exports = { uploadFotosVentaMiddleware, uploadFileToCloudinary, uploadFotosVenta };
