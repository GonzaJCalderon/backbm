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
    console.log('Archivo recibido:', file);
    console.log('Mimetype:', file.mimetype);
    console.log('Nombre original:', file.originalname);
    const extension = path.extname(file.originalname).toLowerCase();
    const allowedMimetypes = ['.jpg', '.jpeg', '.png', '.gif'];
    if (allowedMimetypes.includes(extension)) {
      return cb(null, true);
    } else {
      cb(new Error(`Tipo de archivo no permitido. 
        Solo se aceptan: ${allowedMimetypes.join(', ')}
        Recibido: ${file.mimetype}`), false);
    }
  }
});

module.exports = upload;
