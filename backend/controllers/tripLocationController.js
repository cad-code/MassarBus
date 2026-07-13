// backend/controllers/tripLocationController.js
const TripLocation = require('../models/TripLocation');

// Récupérer l'historique GPS d'un trajet
exports.getTripHistory = async (req, res) => {
  try {
    const { tripId } = req.params;

    // Trie les positions par ordre chronologique et ne récupère que les champs utiles
    const locations = await TripLocation.find({ tripId })
      .sort({ createdAt: 1 })
      .select('location speed createdAt');

    if (!locations || locations.length === 0) {
      return res.status(404).json({ message: "Aucun historique GPS trouvé pour ce trajet." });
    }

    res.status(200).json({
      count: locations.length,
      history: locations
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération de l'historique.", error: error.message });
  }
};