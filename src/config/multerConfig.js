const multer = require('multer');
const path = require('path');

// Configuración de Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads')); // Guardar en la carpeta uploads del directorio raíz
  },
  filename: function (req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

// Configuración del middleware de Multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // Límite de 5 MB por archivo
  },
  fileFilter: (req, file, cb) => {
    // Aceptar solo ciertos tipos de archivos
    const filetypes = /jpeg|jpg|png|gif/; // Cambia esto según tus necesidades
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Error: Solo se permiten imágenes (JPEG, PNG, GIF)'));
    }
  }
});

module.exports = upload;
