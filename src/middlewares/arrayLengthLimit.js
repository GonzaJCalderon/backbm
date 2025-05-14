const mongoose = require("mongoose");
const CatalogoItem = require("../models/catalogo.model");

const maxElements = async (req, res, next) => {
!req ? :
  try {
    const empresaId = req.body.empresaId || req.body.empresaId; // Check both body and params
    const id = req.body.id;

// Check values for debugging

    // Verify if id exists (handle potential errors)
    const itemCatalogo = await CatalogoItem.findById(id).catch((err) => {
      return res
        .status(500)
        .json({ success: false, error: "Error al buscar el elemento." });
    });

    if (!itemCatalogo) {
      return res
        .status(404)
        .json({ success: false, error: "Elemento no encontrado." });
    }

    const fotos = itemCatalogo.detalles.fotos;
    const numeroDeFotos = fotos.length;

    if (numeroDeFotos === 3) {
      return res.status(500).json({
        success: false,
        error: `El campo fotos tiene ${numeroDeFotos} elementos como máximo.`,
      });
    }

    next();
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: "Error al procesar la solicitud." }); // Handle general errors
  }
};

const validPhoto = {
  maxElements,
};

module.exports = validPhoto;
