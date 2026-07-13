//backend/controllers/userController.js
const User = require('../models/User');
const Student = require('../models/Student');
const bcrypt = require('bcryptjs');

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des utilisateurs.", error: error.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "Un utilisateur avec cet email existe déjà." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      passwordHash: hashedPassword,
      role,
      phone
    });

    res.status(201).json({
      message: "Utilisateur créé avec succès.",
      user: { _id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error("🔴 ERREUR CRÉATION USER :", error);
    res.status(500).json({ message: "Erreur lors de la création.", error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "Vous ne pouvez pas supprimer votre propre compte administrateur." });
    }

    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Utilisateur supprimé avec succès." });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la suppression.", error: error.message });
  }
};

exports.updateFcmToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;

    await User.findByIdAndUpdate(
      req.user._id,
      { fcmToken: fcmToken },
      { new: true }
    );

    res.status(200).json({ message: "Token FCM mis à jour avec succès." });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la mise à jour du token.", error: error.message });
  }
};

exports.getParentProfile = async (req, res) => {
  try {
    const parent = await User.findById(req.user._id).select('-passwordHash');

    if (!parent) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // Compte le nombre d'enfants associés au parent connecté
    const childrenCount = await Student.countDocuments({ parentId: req.user._id });

    res.status(200).json({
      name: parent.name,
      email: parent.email,
      phone: parent.phone,
      childrenCount: childrenCount
    });
  } catch (error) {
    console.error("Erreur récupération profil :", error);
    res.status(500).json({ message: "Erreur lors de la récupération du profil", error: error.message });
  }
};