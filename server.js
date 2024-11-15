// Importar dependencias
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const sequelize = require('./src/config/db'); // Configuración de Sequelize
const path = require('path');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { verifyToken, verificarPermisos } = require('./src/middlewares/authMiddleware'); // Importación de middlewares

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: 'dtx5ziooo',
  api_key: '154721198775314',
  api_secret: '4HXf6T4SIh_Z5RjmeJtmM6hEYdk'
});

// Crear función para cargar imágenes a Cloudinary
const uploadFileToCloudinary = async (file) => {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'bienes_muebles', // O el nombre de la carpeta que prefieras
      use_filename: true,
      unique_filename: false,
      resource_type: 'auto' // Detecta automáticamente el tipo de archivo
    });
    return result.secure_url; // Devuelve la URL segura de la imagen subida
  } catch (error) {
    throw new Error('Error al subir la imagen a Cloudinary');
  }
};

// Importar modelos
const { Usuario, Bien, Transaccion } = require('./src/models');

const app = express();
const PORT = process.env.PORT || 5005;

// Configuración de CORS
const corsOptions = {
  origin: [
    'http://localhost:3000',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));

// Middleware para analizar el cuerpo de las solicitudes JSON
app.use(express.json());
// Middleware para analizar el cuerpo de las solicitudes URL-encoded
app.use(express.urlencoded({ extended: true }));

// Configuración de cookie-parser
app.use(cookieParser());

// Servir la carpeta 'uploads' públicamente
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware para procesar archivos con multer
const uploadFotos = multer({ dest: 'uploads/' }); // Ajusta según tus necesidades

// Rutas
const bienesRoutes = require('./src/routes/bienes');
const usuariosRoutes = require('./src/routes/usuarios');
const authRoutes = require('./src/routes/auth');
const salesRoutes = require('./src/routes/sales');
const stockRoutes = require('./src/routes/stock');

// Usar rutas
app.use('/bienes', bienesRoutes);
app.use('/usuarios', usuariosRoutes);
app.use('/auth', authRoutes);
app.use('/sales', salesRoutes);
app.use('/stock', stockRoutes);

// Verificar la conexión a la base de datos
sequelize.authenticate()
  .then(() => {
    console.log('Conexión a la base de datos exitosa');
  })
  .catch(err => {
    console.error('No se pudo conectar a la base de datos:', err);
  });

// Rutas específicas para bienes (crear un nuevo bien y subir fotos)
const router = require('express').Router();

router.post('/add',
  verifyToken,  // Middleware para verificar el token
  verificarPermisos(['administrador', 'usuario']),  // Middleware para verificar permisos
  uploadFotos.array('fotos', 5), // Para permitir subir varias fotos
  async (req, res) => {  // Callback para manejar la creación del bien
    try {
      const { descripcion, precio, tipo, marca, modelo, cantidad, vendedorId, fecha } = req.body;
      const fotos = req.files || [];  // Asegúrate de que req.files esté presente

      if (fotos.length === 0) {
        return res.status(400).json({ error: 'No se han cargado fotos' });
      }

      // Array para almacenar las URLs de las fotos
      const fotosURLs = [];

      // Subir cada foto a Cloudinary
      for (const foto of fotos) {
        const fotoURL = await uploadFileToCloudinary(foto);
        fotosURLs.push(fotoURL);
      }

      // Crear el nuevo bien
      const nuevoBien = await Bien.create({
        descripcion,
        precio,
        tipo,
        marca,
        modelo,
        stock: cantidad,
        vendedorId,
        fecha,
        fotos: fotosURLs  // Almacenar las URLs de las fotos
      });

      res.status(201).json(nuevoBien);
    } catch (error) {
      console.error('Error al crear el bien:', error);
      res.status(500).json({ error: 'Error al crear el bien' });
    }
  }
);

// Agregar la ruta para bienes al servidor
app.use('/bienes', router);

// Sincronizar la base de datos
// sequelize.sync({ alter: true })
//   .then(() => {
//     console.log('Base de datos sincronizada');
//   })
//   .catch(error => {
//     console.error('Error al sincronizar la base de datos:', error);
//   });

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
