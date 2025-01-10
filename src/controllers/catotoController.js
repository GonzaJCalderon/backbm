exports.saludoCatoto = async (req, res) => {

    return res.status(200).json({ saludo: 'Catoto says: Hello!' });

};