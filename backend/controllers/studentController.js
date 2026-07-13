// backend/controllers/studentController.js
const Student = require('../models/Student');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');

exports.createStudent = async (req, res) => {
  try {
    const { firstName, lastName, routeId, pickupStopId, emergencyContact, parentId } = req.body;

    const defaultDropoff = pickupStopId;

    const newStudent = await Student.create({
      firstName: firstName,
      lastName: lastName,
      routeId: routeId,
      pickupStopId: pickupStopId,
      emergencyContact: emergencyContact,
      parentId: parentId || null,
      dropoffStopId: defaultDropoff
    });

    res.status(201).json({ message: "Élève inscrit !", student: newStudent });
  } catch (error) {
    res.status(500).json({ message: "Erreur", error: error.message });
  }
};

exports.getAllStudents = async (req, res) => {
  try {
    const students = await Student.find()
      .populate('routeId')
      .populate('parentId', 'name email phone');

    const studentsWithStopDetails = students.map(student => {
      const studentObj = student.toObject();

      if (student.routeId && student.routeId.stops && student.pickupStopId) {
        const matchingStop = student.routeId.stops.find(
          stop => stop._id.toString() === student.pickupStopId.toString()
        );
        studentObj.pickupStop = matchingStop || null;
      } else {
        studentObj.pickupStop = null;
      }

      return studentObj;
    });

    res.status(200).json(studentsWithStopDetails);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};

exports.getMyChildren = async (req, res) => {
  try {
    const myChildren = await Student.find({ parentId: req.user._id })
      .populate('routeId', 'routeName stops');

    const childrenWithStopDetails = myChildren.map(student => {
      const studentObj = student.toObject();

      if (student.routeId && student.routeId.stops && student.pickupStopId) {
        // Recherche de l'arrêt correspondant dans la ligne de bus
        const matchingStop = student.routeId.stops.find(
          stop => stop._id.toString() === student.pickupStopId.toString()
        );
        studentObj.pickupStop = matchingStop || null;
      } else {
        studentObj.pickupStop = null;
      }

      return studentObj;
    });

    res.status(200).json({ children: childrenWithStopDetails });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération de vos enfants.", error: error.message });
  }
};

exports.toggleAbsence = async (req, res) => {
  try {
    const { isAbsentToday } = req.body;

    const student = await Student.findOne({ _id: req.params.id, parentId: req.user._id });
    if (!student) {
      return res.status(404).json({ message: "Élève introuvable." });
    }

    student.isAbsentToday = isAbsentToday;
    await student.save();

    res.status(200).json({
      message: isAbsentToday ? "Absence signalée au chauffeur." : "Présence confirmée.",
      student
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la mise à jour.", error: error.message });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    const studentId = req.params.id;

    const student = await Student.findByIdAndDelete(studentId);

    if (!student) {
      return res.status(404).json({ message: "Élève introuvable." });
    }

    res.status(200).json({ message: "Élève supprimé avec succès." });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la suppression.", error: error.message });
  }
};

exports.updateStudentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const studentId = req.params.id;

    const student = await Student.findByIdAndUpdate(
      studentId,
      { status: status },
      { returnDocument: 'after' }
    );

    if (!student) {
      return res.status(404).json({ message: "Élève introuvable." });
    }

    if (student.parentId) {
      let notifType = 'INFO';
      let notifTitle = 'Mise à jour du statut';
      let notifMessage = `Le statut de ${student.firstName} a été mis à jour.`;

      if (status === 'ON_BUS') {
        notifType = 'BOARDED';
        notifTitle = 'Enfant à bord';
        notifMessage = `${student.firstName} est monté(e) dans le bus.`;
      } else if (status === 'DROPPED_OFF') {
        notifType = 'DROPPED';
        notifTitle = 'Arrivée à destination';
        notifMessage = `${student.firstName} est descendu(e) du bus.`;
      }

      // Notification envoyée uniquement pour les changements significatifs
      if (status !== 'WAITING') {
        await Notification.create({
          parentId: student.parentId,
          studentId: student._id,
          type: notifType,
          title: notifTitle,
          message: notifMessage
        });
      }
    }

    res.status(200).json({ message: "Statut mis à jour et parent notifié !", student });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};