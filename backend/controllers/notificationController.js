const Notification = require('../models/Notification');

exports.getMyNotifications = async (req, res) => {
  try {
    const parentId = req.user._id || req.user.id;

    const notifications = await Notification.find({ parentId: parentId })
      .populate('studentId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      count: notifications.length,
      notifications
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des notifications:", error);
    res.status(500).json({ message: "Erreur lors de la récupération des notifications.", error: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const parentId = req.user._id || req.user.id;

    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, parentId: parentId }, // Vérifie que la notification appartient au parent connecté
      { isRead: true },
      { returnDocument: 'after' }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification introuvable ou non autorisée." });
    }

    res.status(200).json({ message: "Notification marquée comme lue.", notification });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la mise à jour.", error: error.message });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const parentId = req.user._id || req.user.id;

    await Notification.updateMany(
      { parentId: parentId, isRead: false },
      { isRead: true }
    );

    res.status(200).json({ message: "Toutes les notifications ont été marquées comme lues." });
  } catch (error) {
    res.status(500).json({ message: "Erreur globale.", error: error.message });
  }
};

exports.deleteAllNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ parentId: req.user._id });

    res.status(200).json({ message: "Toutes les notifications ont été supprimées avec succès." });
  } catch (error) {
    console.error("Erreur suppression notifications :", error);
    res.status(500).json({ message: "Erreur serveur lors de la suppression." });
  }
};