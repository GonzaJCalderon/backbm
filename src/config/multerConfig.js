const path = require('path');
const multer = require('multer');

// Configuración de almacenamiento en memoria
const storage = multer.memoryStorage();

// Configuración del middleware de Multer
const uploadFotos = multer({
  storage: storageFotos,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedFiletypes = /jpeg|jpg|png/;
    const extname = allowedFiletypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedFiletypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Error: Solo se permiten imágenes JPG, JPEG y PNG'));
    }
  },
}).array('fotos', 10); // Asegúrate de que el campo sea 'fotos'
