const { Op } = require('sequelize');
const Bien = require('../models/Bien');
const Usuario = require('../models/Usuario');

const searchAll = async (req, res) => {
    const { query, tipo, marca, modelo, nombre, apellido } = req.query;

    try {
        // Buscar usuarios
        const users = await Usuario.findAll({
            where: {
                [Op.and]: [
                    nombre ? {
                        nombre: {
                            [Op.iLike]: `%${nombre}%`
                        }
                    } : null,
                    apellido ? {
                        apellido: {
                            [Op.iLike]: `%${apellido}%`
                        }
                    } : null
                ].filter(Boolean) // Elimina condiciones nulas
            }
        });

        // Buscar bienes
        const bienes = await Bien.findAll({
            where: {
                [Op.and]: [
                    query ? {
                        descripcion: {
                            [Op.iLike]: `%${query}%`
                        }
                    } : null,
                    tipo ? {
                        tipo: {
                            [Op.iLike]: `%${tipo}%`
                        }
                    } : null,
                    marca ? {
                        marca: {
                            [Op.iLike]: `%${marca}%`
                        }
                    } : null,
                    modelo ? {
                        modelo: {
                            [Op.iLike]: `%${modelo}%`
                        }
                    } : null
                ].filter(Boolean) // Elimina condiciones nulas
            }
        });

        res.json({ users, bienes });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { searchAll };
