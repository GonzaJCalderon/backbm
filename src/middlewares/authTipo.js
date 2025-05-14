// middlewares/verificarTipo.js

exports.verificarEmpresaJuridica = (req, res, next) => {
    const user = req.user;
  
    if (!user || user.tipo !== 'juridica') {
      return res.status(403).json({
        mensaje: 'Acceso denegado. Esta acción solo está permitida para personas jurídicas (empresas).',
      });
    }
  
    next();
  };
  