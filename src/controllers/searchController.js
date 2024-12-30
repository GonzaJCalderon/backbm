const { Op } = require('sequelize');
const Bien = require('../models/Bien');
const Usuario = require('../models/Usuario');

const searchAll = async (req, res) => {
    const { query, tipo, marca, modelo, nombre, apellido, email, dni, cuit, direccion, page = 1, limit = 10 } = req.query;

    try {
        if (!query && !tipo && !marca && !modelo && !nombre && !apellido && !email && !dni && !cuit && !direccion) {
            return res.status(400).json({ message: 'Debe proporcionar al menos un criterio de búsqueda.' });
        }

        const userFilters = {};
        if (nombre) userFilters.nombre = { [Op.iLike]: `%${nombre}%` };
        if (apellido) userFilters.apellido = { [Op.iLike]: `%${apellido}%` };
        if (email) userFilters.email = { [Op.iLike]: `%${email}%` };
        if (dni) userFilters.dni = { [Op.iLike]: `%${dni}%` };
        if (cuit) userFilters.cuit = { [Op.iLike]: `%${cuit}%` };
        if (direccion) userFilters['direccion'] = { [Op.iLike]: `%${direccion}%` };

        const usuarios = await Usuario.findAndCountAll({
            where: userFilters,
            limit: parseInt(limit),
            offset: (page - 1) * limit,
        });

        const bienesFilters = {
            [Op.or]: [
                { tipo: { [Op.iLike]: `%${tipo || query || ''}%` } },
                { marca: { [Op.iLike]: `%${marca || query || ''}%` } },
                { modelo: { [Op.iLike]: `%${modelo || query || ''}%` } },
                { descripcion: { [Op.iLike]: `%${query || ''}%` } },
            ],
        };

        const bienes = await Bien.findAndCountAll({
            where: bienesFilters,
            limit: parseInt(limit),
            offset: (page - 1) * limit,
        });

        res.status(200).json({
            usuarios: {
                total: usuarios.count,
                results: usuarios.rows,
            },
            bienes: {
                total: bienes.count,
                results: bienes.rows,
            },
        });
    } catch (error) {
        console.error('Error en la búsqueda:', error.message);
        res.status(500).json({ message: 'Error en la búsqueda', error: error.message });
    }
};

module.exports = { searchAll };
