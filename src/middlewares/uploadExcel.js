const multer = require('multer');

// 🔹 Configuración de almacenamiento en memoria para Excel
const storageExcel = multer.memoryStorage();

// 🔹 Middleware de subida con validaciones
const uploadExcel = multer({
  storage: storageExcel,
  limits: { fileSize: 10 * 1024 * 1024 }, // 🔺 Límite de 10MB (ajustable)
  fileFilter: (req, file, cb) => {
    console.log(`📂 Intentando subir archivo: ${file.originalname}`);

    const allowedExtensions = /\.(xlsx|xls)$/i;
    const isExtensionValid = allowedExtensions.test(file.originalname.toLowerCase());
    const mimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    const isMimeTypeValid = mimeTypes.includes(file.mimetype);

    if (isExtensionValid && isMimeTypeValid) {
      cb(null, true);
    } else {
      console.error(`❌ Archivo rechazado: ${file.originalname}`);
      cb(new Error('Solo archivos Excel (XLSX, XLS) son permitidos.'));
    }
  },
}).single('archivoExcel'); // Ahora solo permite subir un archivo a la vez

// 🔹 Middleware para manejar errores de multer
const multerErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError || err instanceof Error) {
    console.error(`❌ Error de carga de archivo: ${err.message}`);
    return res.status(400).json({ message: err.message });
  }
  next();
};

// 🔹 Exportar el middleware
module.exports = {
  uploadExcel,         // Middleware principal
  multerErrorHandler,  // Manejo de errores
};
