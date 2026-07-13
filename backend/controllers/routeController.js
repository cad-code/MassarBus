// backend/controllers/routeController.js
const Route = require('../models/Route');

// Récupérer toutes les lignes
exports.getAllRoutes = async (req, res) => {
  try {
    // Remplace les IDs des références par les données des documents associés
    const routes = await Route.find()
      .populate('defaultDriver', 'name email')
      .populate('defaultBus', 'matricule brand');

    res.status(200).json(routes);
  } catch (error) {
    res.status(500).json({ message: "Erreur", error: error.message });
  }
};

// Créer une nouvelle ligne
exports.createRoute = async (req, res) => {
  try {
    const route = await Route.create(req.body);
    res.status(201).json(route);
  } catch (error) {
    res.status(500).json({ message: "Erreur", error: error.message });
  }
};

// Modifier une ligne
exports.updateRoute = async (req, res) => {
  try {
    const { routeName, stops, defaultDriver, defaultBus } = req.body;

    const updatedRoute = await Route.findByIdAndUpdate(
      req.params.id,
      { routeName, stops, defaultDriver, defaultBus },
      { new: true, runValidators: true }
    );

    if (!updatedRoute) {
      return res.status(404).json({ message: "Itinéraire introuvable." });
    }

    res.status(200).json(updatedRoute);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la modification.", error: error.message });
  }
};

// Supprimer une ligne
exports.deleteRoute = async (req, res) => {
  try {
    const route = await Route.findByIdAndDelete(req.params.id);

    if (!route) {
      return res.status(404).json({ message: "Itinéraire introuvable." });
    }

    res.status(200).json({ message: "Itinéraire supprimé avec succès." });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la suppression.", error: error.message });
  }
};