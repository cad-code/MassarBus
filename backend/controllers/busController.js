// backend/controllers/busController.js
const Bus = require('../models/Bus');

// Récupérer tous les bus
exports.getAllBuses = async (req, res) => {
  try {
    const buses = await Bus.find();
    res.status(200).json(buses);
  } catch (error) {
    res.status(500).json({ message: "Erreur", error: error.message });
  }
};

// Créer un bus
exports.createBus = async (req, res) => {
  try {
    const bus = await Bus.create(req.body);
    res.status(201).json(bus);
  } catch (error) {
    res.status(500).json({ message: "Erreur", error: error.message });
  }
};

// Modifier un bus
exports.updateBus = async (req, res) => {
  try {
    const { plateNumber, capacity } = req.body;
    const updatedBus = await Bus.findByIdAndUpdate(
      req.params.id,
      { plateNumber, capacity },
      { new: true, runValidators: true }
    );

    if (!updatedBus) {
      return res.status(404).json({ message: "Bus introuvable." });
    }

    res.status(200).json(updatedBus);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la modification.", error: error.message });
  }
};

// Supprimer un bus
exports.deleteBus = async (req, res) => {
  try {
    const bus = await Bus.findByIdAndDelete(req.params.id);

    if (!bus) {
      return res.status(404).json({ message: "Bus introuvable." });
    }

    res.status(200).json({ message: "Bus supprimé avec succès." });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la suppression.", error: error.message });
  }
};