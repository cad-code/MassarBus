// backend/controllers/authController.js
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "Cet email est déjà utilisé." });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name,
      email,
      passwordHash,
      role,
      phone
    });

    res.status(201).json({
      message: "Utilisateur créé avec succès !",
      userId: newUser._id
    });

  } catch (error) {
    res.status(500).json({ message: "Erreur serveur lors de l'inscription.", error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    // Vérifier que le compte est toujours actif avant d'autoriser la connexion
    if (!user.isActive) {
      return res.status(403).json({ message: "Ce compte a été désactivé par l'administration." });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Mot de passe incorrect." });
    }

    // Génération d'un JWT valide 30 jours pour authentifier les requêtes du client
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(200).json({
      message: "Connexion réussie.",
      token: token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        email: user.email
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Erreur serveur lors de la connexion.", error: error.message });
  }
};