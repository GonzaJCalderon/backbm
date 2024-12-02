const { Op } = require('sequelize');
const Bien = require('../models/Bien');
const Usuario = require('../models/Usuario');

const searchAll = async (req, res) => {
    const { query, tipo, marca, modelo, nombre, apellido, email, dni, cuit, direccion } = req.query;

    try {
        // Filtros de búsqueda de usuarios
        const userFilters = {};

        // Filtro de nombre (mínimo 3 caracteres)
        if (nombre) {
            userFilters.nombre = { [Op.iLike]: `%${nombre}%` };
        }

        if (apellido) userFilters.apellido = { [Op.iLike]: `%${apellido}%` };
        if (email) userFilters.email = { [Op.iLike]: `%${email}%` };
        if (dni) userFilters.dni = { [Op.iLike]: `%${dni}%` };
        if (cuit) userFilters.cuit = { [Op.iLike]: `%${cuit}%` };

        if (direccion) {
            // Ajustar según la estructura del modelo de dirección
            userFilters['direccion.calle'] = { [Op.iLike]: `%${direccion}%` };
        }

        console.log('Filtros de usuario:', userFilters);

        const users = await Usuario.findAll({
            where: userFilters
        });

        // Filtros de búsqueda de bienes
        const bienesFilters = {
            [Op.or]: [
                { tipo: { [Op.iLike]: `%${tipo || query || ''}%` } },
                { marca: { [Op.iLike]: `%${marca || query || ''}%` } },
                { modelo: { [Op.iLike]: `%${modelo || query || ''}%` } },
                { descripcion: { [Op.iLike]: `%${query || ''}%` } }
            ]
        };

        const bienes = await Bien.findAll({
            where: bienesFilters
        });

        // Devolver resultados
        res.status(200).json({
            usuarios: users || [],
            bienes: bienes || []
        });
    } catch (error) {
        console.error('Error en la búsqueda:', error.message);
        res.status(500).json({
            message: 'Ocurrió un error en la búsqueda',
            error: error.message
        });
    }
};

module.exports = { searchAll };
