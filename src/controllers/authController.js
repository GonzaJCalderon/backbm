const { Usuario } = require('../models'); 
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken'); 
const { validarCamposRequeridos } = require('../utils/validationUtils'); 
const config = require('../config/auth.config');

const loginUsuario = async (req, res) => {
    const { email, password } = req.body;


    try {
        // Buscar usuario por email
        const user = await Usuario.findOne({ where: { email } });


        if (!user) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        // Validar la contraseña
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }


        // 🚀 Si `rolDefinitivo` es `NULL`, asignamos un valor por defecto
        if (!user.rolDefinitivo) {
            user.rolDefinitivo = 'usuario';
        }

        // ✅ Enviar la contraseña en la respuesta (como texto plano o encriptada)
        const responseUser = {
            uuid: user.uuid,
            email: user.email,
            nombre: user.nombre,
            apellido: user.apellido,
            direccion: user.direccion,
            rolDefinitivo: user.rolDefinitivo,
            dni: user.dni,
        };

        // Generar token con rolDefinitivo
        const token = jwt.sign(
            {
                uuid: user.uuid,
                email: user.email,
                rolDefinitivo: user.rolDefinitivo // Incluye el rol en el token
            },
            config.secret,
            { expiresIn: config.jwtExpiration }
        );

        res.json({ usuario: responseUser, token });

    } catch (error) {
        console.error('🔥 Error en loginUsuario:', error);
        res.status(500).json({ 
            message: 'Error en el servidor', 
            error: error.message 
        });
    }
};

const activarCuenta = async (req, res) => {

    const { token, password } = req.body;
    console.log('🔐 Token recibido para activación:', token);

  
    if (!token || !password) {
      return res.status(400).json({ message: 'Faltan datos obligatorios' });
    }
  
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const usuario = await Usuario.findByPk(decoded.uuid);
  
      if (!usuario) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }
  
      // Solo permitir activación si no tenía password antes
      if (usuario.password) {
        return res.status(400).json({ message: 'La cuenta ya fue activada anteriormente' });
      }
  
      usuario.password = await bcrypt.hash(password, 10);
      usuario.estado = 'activo';
      usuario.mensajeBienvenidaEnviada = true;
  
      await usuario.save();
  
      return res.json({ success: true, message: 'Cuenta activada correctamente' });
  
    } catch (error) {
      console.error('❌ Error en activación:', error);
      return res.status(400).json({ message: 'Token inválido o expirado' });
    }
  };


module.exports = { loginUsuario, activarCuenta };
