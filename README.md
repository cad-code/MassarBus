# 🚌 MassarBus - Smart School Bus Tracking & Management System

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white)
![Flutter](https://img.shields.io/badge/Flutter-02569B?style=flat&logo=flutter&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-black?style=flat&logo=socket.io&badgeColor=010101)

MassarBus est un écosystème logiciel complet (Web & Mobile) conçu pour digitaliser, sécuriser et optimiser la gestion du transport scolaire. Ce système interconnecté permet le suivi GPS des bus en temps réel, la communication instantanée avec les parents, et l'automatisation logistique pour l'administration.

## ✨ Fonctionnalités Principales

### 🛡️ 1. Dashboard d'Administration (Web)
Interface centralisée pour la gestion complète de la flotte et des élèves.
- **Suivi en temps réel :** Carte interactive (Leaflet) affichant la position GPS exacte des bus et leur vitesse.
- **Génération CRON :** Automatisation quotidienne de l'affectation des chauffeurs et véhicules aux lignes.
- **Centre de Diffusion (Broadcast) :** Envoi d'alertes instantanées aux chauffeurs et/ou aux parents via WebSockets.
- **Rapports Automatisés :** Génération de synthèses PDF/Excel des présences, absences et incidents de la journée.
- **Gestion CRUD :** Administration complète des élèves, utilisateurs (chauffeurs/parents), lignes, arrêts et véhicules.

### 👨‍👩‍👧‍👦 2. Application Parent (Mobile)
Application conçue pour offrir une tranquillité d'esprit totale aux parents.
- **Tracking GPS :** Suivi en direct du bus scolaire de leurs enfants.
- **Gestion des Absences :** Possibilité de signaler une absence en un clic, mettant instantanément à jour la liste du chauffeur.
- **Notifications Push :** Alertes de proximité via Firebase (ex: "Le bus arrive dans 5 minutes").
- **Historique :** Accès à l'historique complet des trajets (embarquement/débarquement).

### 🚌 3. Application Chauffeur (Mobile)
Outil d'assistance à la conduite et de pointage.
- **Transmission GPS :** Envoi des coordonnées de localisation en arrière-plan via Socket.io.
- **Feuille de Route Dynamique :** Affichage des arrêts et de la liste des élèves attendus.
- **Mise à jour en direct :** Les élèves signalés absents par leurs parents sont visuellement marqués pour éviter les arrêts inutiles.

---

## 🛠️ Architecture & Stack Technique

Le projet repose sur une architecture **Monorepo** divisée en trois composants majeurs :

- **Backend (API REST & WebSockets) :** Node.js, Express.js, MongoDB (Mongoose), Socket.io (Temps réel), JWT (Authentification), Node-cron (Tâches planifiées).
- **Frontend (Web d'administration) :** React.js, Tailwind CSS, Framer Motion (Animations), React-Leaflet (Cartographie), jsPDF.
- **Mobile (Applications iOS/Android) :** Flutter, Dart, Firebase Cloud Messaging (FCM), Provider/Riverpod (State Management).

```text
MassarBus/
├── backend/          # Serveur Node.js & Base de données MongoDB
├── frontend/         # Dashboard React réservé aux administrateurs
├── massarbus_parent/ # Application Flutter pour les parents
└── massarbus_driver/ # Application Flutter pour les chauffeurs