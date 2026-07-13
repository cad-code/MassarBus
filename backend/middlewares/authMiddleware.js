// backend/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');


// 1 -PROTECTION : Vérifier si le Token JWT est valide

exports.protect = async (req, res, next) => {
  let token;

  // On vérifie si un token est envoyé dans les Headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extraire le token
      token = req.headers.authorization.split(' ')[1];

      //  LA SOLUTION EST ICI : On bloque la chaîne de caractères "null" envoyée par Flutter
      if (token === 'null' || token === '') {
        return res.status(401).json({ message: "Accès refusé, token manquant ou corrompu." });
      }

      // Décoder et vérifier le token avec notre clé secrète
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Trouver l'utilisateur dans la BDD
      req.user = await User.findById(decoded.userId).select('-passwordHash');

      if (!req.user) {
        return res.status(401).json({ message: "Utilisateur non trouvé avec ce token." });
      }

      // Si le compte a été désactivé entre temps
      if (!req.user.isActive) {
        return res.status(403).json({ message: "Ce compte a été désactivé." });
      }

      // Tout est bon, on laisse passer à la suite !
      next();
    } catch (error) {
      // On loggue juste le message d'erreur court pour ne pas spammer le terminal
      console.error("Erreur JWT :", error.message);
      return res.status(401).json({ message: "Non autorisé, token invalide ou expiré." });
    }
  } else {
    // Si aucun header Authorization n'est présent
    return res.status(401).json({ message: "Accès refusé, aucun token fourni." });
  }
};


//AUTORISATION : Vérifier les Rôles (RBAC)

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Accès refusé. Le rôle '${req.user.role}' n'est pas autorisé à effectuer cette action.` 
      });
    }
    next();
  };
};