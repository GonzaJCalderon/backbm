const multer = require('multer');

// Configuración de Multer para almacenar en memoria
const storage = multer.memoryStorage();

// Configuración del middleware de Multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // Límite de 5 MB por archivo
  },
  fileFilter: (req, file, cb) => {
    // Aceptar solo ciertos tipos de archivos
    const allowedMimetypes = ['.jpg', '.jpeg', '.png', '.gif'];
    const extension = path.extname(file.originalname).toLowerCase();
    if (allowedMimetypes.includes(extension)) {
      return cb(null, true);
    } else {
      cb(new Error(`Tipo de archivo no permitido. Solo se aceptan: ${allowedMimetypes.join(', ')}`), false);
    }
  }
});

module.exports = upload;
