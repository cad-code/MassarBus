const Student = require('../models/Student');

exports.getMyChildren = async (req, res) => {
  try {
    // req.user est injecté par le middleware d'authentification (protect)
    const parentId = req.user._id;

    const children = await Student.find({ parentId: parentId })
      .populate('routeId', 'routeName');

    res.status(200).json(children);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des enfants", error: error.message });
  }
};