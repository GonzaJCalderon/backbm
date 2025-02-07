const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Verificar y crear la carpeta si no existe
const uploadPath = path.join(__dirname, '../uploads/excel/');
if (!fs.existsSync(uploadPath)) {
  console.log(`Creando carpeta para almacenamiento en: ${uploadPath}`);
  fs.mkdirSync(uploadPath, { recursive: true });
}

// Configuración de almacenamiento
const storageExcel = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

// Middleware de subida con validación de archivo
const uploadExcel = multer({
  storage: storageExcel,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = /xlsx|xls/;
    const isExtensionValid = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    const mimeTypeValid = file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                          file.mimetype === 'application/vnd.ms-excel';

    if (isExtensionValid && mimeTypeValid) {
      cb(null, true);
    } else {
      cb(new Error('Solo archivos Excel (XLSX, XLS) son permitidos.'));
    }
  },
}).single('archivoExcel');

// Middleware para manejar errores de multer
const multerErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError || err instanceof Error) {
    res.status(400).json({ message: err.message });
  } else {
    next();
  }
};

// Exportar correctamente
module.exports = {
  uploadExcel,         // Middleware principal
  multerErrorHandler,  // Middleware para manejar errores
};
