// src/pages/VueGlobale.jsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
// ✨ AJOUT DE Radio ET Send POUR LE BROADCAST
import { Users, Bus as BusIcon, UserCircle, Map as MapIcon, AlertTriangle, X, FileText, FileDown, CheckCircle2, UserMinus, Radio, Send, Clock } from 'lucide-react';

// ✨ IMPORT DES LIBRAIRIES POUR LE PDF
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- IMPORTATIONS LEAFLET ---
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const busIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png',
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -38],
});
// ----------------------------

// Délai (ms) au-delà duquel on considère que le serveur n'a pas répondu (pas d'ack reçu)
const BROADCAST_ACK_TIMEOUT = 6000;

const VueGlobale = () => {
  const [stats, setStats] = useState({ students: 0, routes: 0, users: 0 });

  const [routesData, setRoutesData] = useState([]);
  const [studentsData, setStudentsData] = useState([]);
  const [usersData, setUsersData] = useState([]);
  const [busesData, setBusesData] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [liveBuses, setLiveBuses] = useState({});
  const [emergencyAlert, setEmergencyAlert] = useState(null);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // ✨ ÉTAT POUR LE PANNEAU DES DÉTAILS DU BUS EN DIRECT
  const [selectedLiveTrip, setSelectedLiveTrip] = useState(null);

  // ✨ ÉTATS POUR LE CENTRE DE DIFFUSION
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [socketInstance, setSocketInstance] = useState(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState('all'); 
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);
  const [broadcastError, setBroadcastError] = useState(null);
  const [broadcastHistory, setBroadcastHistory] = useState([]);

  const getTodayKey = () => {
    const d = new Date();
    return `massarbus_incidents_${d.getFullYear()}_${d.getMonth() + 1}_${d.getDate()}`;
  };

  const [reportData, setReportData] = useState(() => {
    const savedIncidents = localStorage.getItem(getTodayKey());
    return {
      present: 0,
      absent: 0,
      incidents: savedIncidents ? JSON.parse(savedIncidents) : []
    };
  });

  const fesPosition = [34.03715, -4.99980];

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [studentsRes, routesRes, usersRes, busesRes] = await Promise.all([
          api.get('/students'), api.get('/routes'), api.get('/users'), api.get('/buses')
        ]);

        const fetchedRoutes = Array.isArray(routesRes.data) ? routesRes.data : (routesRes.data.routes || []);
        const fetchedUsers = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data.users || usersRes.data.data || []);
        const studentsList = Array.isArray(studentsRes.data) ? studentsRes.data : (studentsRes.data.students || []);
        const fetchedBuses = Array.isArray(busesRes.data) ? busesRes.data : (busesRes.data.buses || busesRes.data.data || []);

        const absentCount = studentsList.filter(s => s.isAbsentToday === true).length;
        const presentCount = studentsList.length - absentCount;

        setStats({ students: studentsList.length, routes: fetchedRoutes.length, users: fetchedUsers.length });

        setRoutesData(fetchedRoutes);
        setStudentsData(studentsList);
        setUsersData(fetchedUsers);
        setBusesData(fetchedBuses);

        setReportData(prev => ({
          ...prev,
          present: presentCount,
          absent: absentCount
        }));

      } catch (error) {
        console.error("Erreur REST", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('massarbus_token');
    if (!token) return;

    const socket = io('http://localhost:5000', { auth: { token } });
    setSocketInstance(socket);

    socket.on('connect', () => {
      console.log('🟢 Connecté au flux temps réel');
      setIsSocketConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('🔴 Déconnecté du flux temps réel');
      setIsSocketConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('🔴 Erreur de connexion Socket.io :', err.message);
      setIsSocketConnected(false);
    });

    socket.on('bus_moved', (data) => {
      const { busId, latitude, longitude, speed } = data;
      setLiveBuses((prev) => ({ ...prev, [busId]: { latitude, longitude, speed } }));
    });

    socket.on('admin_notification', (data) => {
      setEmergencyAlert(data);
      const newIncident = {
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        ligne: data.routeName || 'Alerte Système',
        msg: data.message
      };
      setReportData(prev => {
        const updatedIncidents = [newIncident, ...prev.incidents];
        localStorage.setItem(getTodayKey(), JSON.stringify(updatedIncidents));
        return { ...prev, incidents: updatedIncidents };
      });
      try { new Audio('https://www.soundjay.com/buttons/sounds/beep-01a.mp3').play(); } catch (e) {}
    });

    return () => socket.disconnect();
  }, []);

  const handleSendBroadcast = () => {
    if (!broadcastMessage.trim() || !socketInstance) return;

    if (!isSocketConnected) {
      setBroadcastError("Connexion temps réel indisponible. Le message ne peut pas être envoyé.");
      return;
    }

    setIsBroadcasting(true);
    setBroadcastError(null);

    const payload = {
      target: broadcastTarget,
      message: broadcastMessage,
      sender: 'Administration MassarBus',
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };

    let settled = false;
    const ackTimeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      setIsBroadcasting(false);
      setBroadcastError("Aucune confirmation reçue du serveur. Le message n'a probablement pas été diffusé.");
    }, BROADCAST_ACK_TIMEOUT);

    socketInstance.emit('send_broadcast', payload, (ack) => {
      if (settled) return;
      settled = true;
      clearTimeout(ackTimeout);
      setIsBroadcasting(false);

      if (ack && ack.success) {
        setBroadcastSuccess(true);
        setBroadcastHistory(prev => [{ ...payload, recipients: ack.recipients ?? null }, ...prev].slice(0, 20));
        setBroadcastMessage('');
        setTimeout(() => setBroadcastSuccess(false), 3000);
      } else {
        setBroadcastError((ack && ack.error) || "Échec de l'envoi du message par le serveur.");
      }
    });
  };

  const absentsList = studentsData.filter(s => s.isAbsentToday);
  const activeRoutesList = routesData.filter(r => r.defaultDriver || r.defaultBus);
  const tauxPresence = Math.round((reportData.present / (stats.students || 1)) * 100);

  const busDeployesAujourdhui = new Set(
    activeRoutesList
      .filter(route => route.defaultBus)
      .map(route => route.defaultBus._id || route.defaultBus)
  ).size;

  const handleGenerateReport = async (type) => {
    setIsGenerating(type);
    setDownloadSuccess(false);

    if (type === 'PDF') {
      try {
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 15;

        const colors = {
          dark: [24, 24, 27],
          amber: [245, 158, 11],
          emerald: [16, 185, 129],
          rose: [244, 63, 94],
          blue: [59, 130, 246],
          purple: [168, 85, 247],
          textMuted: [161, 161, 170],
        };

        // EN-TÊTE
        pdf.setFillColor(...colors.dark);
        pdf.rect(0, 0, pageWidth, 32, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(20);
        pdf.setTextColor(255, 255, 255);
        pdf.text('Massar', margin, 18);
        const massarWidth = pdf.getTextWidth('Massar');
        pdf.setTextColor(...colors.amber);
        pdf.text('Bus', margin + massarWidth, 18);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(...colors.textMuted);
        pdf.text('Rapport de synthèse quotidien', margin, 25);
        const todayStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        pdf.setFontSize(9);
        const dateWidth = pdf.getTextWidth(todayStr);
        pdf.setTextColor(255, 255, 255);
        pdf.text(todayStr, pageWidth - margin - dateWidth, 18);

        let y = 45;

        // CARTES PRÉSENTS / ABSENTS
        const cardWidth = (pageWidth - margin * 2 - 8) / 2;
        const cardHeight = 26;

        pdf.setFillColor(240, 253, 244);
        pdf.setDrawColor(...colors.emerald);
        pdf.roundedRect(margin, y, cardWidth, cardHeight, 3, 3, 'FD');
        pdf.setTextColor(...colors.emerald);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(20);
        pdf.text(String(reportData.present), margin + 8, y + 14);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Élèves présents', margin + 8, y + 21, { maxWidth: cardWidth - 12 });

        const card2X = margin + cardWidth + 8;
        pdf.setFillColor(255, 241, 242);
        pdf.setDrawColor(...colors.rose);
        pdf.roundedRect(card2X, y, cardWidth, cardHeight, 3, 3, 'FD');
        pdf.setTextColor(...colors.rose);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(20);
        pdf.text(String(reportData.absent), card2X + 8, y + 14);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Absences signalées', card2X + 8, y + 21, { maxWidth: cardWidth - 12 });

        y += cardHeight + 8;

        // STATS COMPLÉMENTAIRES
        const miniCardWidth = (pageWidth - margin * 2 - 3 * 6) / 4;
        const miniCardHeight = 20;
        const miniStats = [
          { value: `${tauxPresence}%`, label: 'Taux de présence', color: colors.blue, bg: [239, 246, 255] },
          { value: String(stats.routes), label: 'Lignes actives', color: colors.amber, bg: [255, 251, 235] },
          { value: String(busDeployesAujourdhui), label: 'Bus déployés aujourd\'hui', color: colors.purple, bg: [250, 245, 255] },
          { value: String(stats.students), label: 'Total élèves', color: colors.dark, bg: [244, 244, 245] },
        ];

        miniStats.forEach((stat, i) => {
          const x = margin + i * (miniCardWidth + 6);
          pdf.setFillColor(...stat.bg);
          pdf.setDrawColor(...stat.color);
          pdf.roundedRect(x, y, miniCardWidth, miniCardHeight, 2, 2, 'FD');
          pdf.setTextColor(...stat.color);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(13);
          pdf.text(stat.value, x + miniCardWidth / 2, y + 9, { align: 'center' });
          pdf.setFontSize(6.5);
          pdf.setFont('helvetica', 'normal');
          pdf.text(stat.label, x + miniCardWidth / 2, y + 15, { align: 'center', maxWidth: miniCardWidth - 4 });
        });

        y += miniCardHeight + 12;

        // TABLEAU DES AFFECTATIONS
        pdf.setTextColor(...colors.dark);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.text('Affectations du jour', margin, y);
        y += 6;

        const affectationsData = activeRoutesList.map(r => {
          const driver = usersData.find(u => u._id === (r.defaultDriver?._id || r.defaultDriver));
          const bus = busesData.find(b => b._id === (r.defaultBus?._id || r.defaultBus));
          return [
            r.routeName,
            driver ? (driver.name || driver.firstName) : 'Non assigné',
            bus ? bus.plateNumber : 'Non assigné'
          ];
        });

        if (affectationsData.length === 0) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          pdf.setTextColor(...colors.textMuted);
          pdf.text("Aucune ligne n'a de chauffeur ou de véhicule assigné.", margin, y + 6);
          y += 14;
        } else {
          autoTable(pdf, {
            startY: y,
            margin: { left: margin, right: margin },
            head: [['Ligne', 'Chauffeur', 'Véhicule ']],
            body: affectationsData,
            styles: { fontSize: 9, cellPadding: 3, textColor: [40, 40, 40] },
            headStyles: { fillColor: colors.blue, textColor: [255, 255, 255], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 248, 255] },
          });
          y = pdf.lastAutoTable.finalY + 12;
        }

        // TABLEAU DES ÉLÈVES ABSENTS
        pdf.setTextColor(...colors.dark);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.text('Détails des Absences', margin, y);
        y += 6;

        if (absentsList.length === 0) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          pdf.setTextColor(...colors.textMuted);
          pdf.text("Tous les élèves sont présents aujourd'hui.", margin, y + 6);
          y += 14;
        } else {
          const absentsData = absentsList.map(s => [
            `${s.firstName} ${s.lastName}`,
            s.routeId?.routeName || 'Ligne non définie'
          ]);
          autoTable(pdf, {
            startY: y,
            margin: { left: margin, right: margin },
            head: [['Nom de l\'élève', 'Ligne concernée']],
            body: absentsData,
            styles: { fontSize: 9, cellPadding: 3, textColor: [40, 40, 40] },
            headStyles: { fillColor: colors.rose, textColor: [255, 255, 255], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [255, 245, 248] },
          });
          y = pdf.lastAutoTable.finalY + 12;
        }

        // TABLEAU DES INCIDENTS
        pdf.setTextColor(...colors.dark);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.text('Journal des incidents du jour', margin, y);
        y += 6;

        if (reportData.incidents.length === 0) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          pdf.setTextColor(...colors.textMuted);
          pdf.text("Aucun incident signalé aujourd'hui.", margin, y + 6);
        } else {
          autoTable(pdf, {
            startY: y,
            margin: { left: margin, right: margin },
            head: [['Heure', 'Ligne', 'Message']],
            body: reportData.incidents.map(inc => [inc.time, inc.ligne, inc.msg]),
            styles: { fontSize: 9, cellPadding: 3, textColor: [40, 40, 40] },
            headStyles: { fillColor: colors.amber, textColor: [30, 30, 30], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [250, 250, 250] },
            columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 40 } },
          });
        }

        // PIED DE PAGE
        const pageCount = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          pdf.setPage(i);
          pdf.setDrawColor(220, 220, 220);
          pdf.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          pdf.setTextColor(...colors.textMuted);
          pdf.text('MassarBus © ' + new Date().getFullYear(), margin, pageHeight - 7);
          const pageLabel = `Page ${i} / ${pageCount}`;
          pdf.text(pageLabel, pageWidth - margin - pdf.getTextWidth(pageLabel), pageHeight - 7);
        }

        const dateStr = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
        pdf.save(`MassarBus_Rapport_${dateStr}.pdf`);
        setDownloadSuccess(true);
      } catch (error) {
        console.error("🔴 ERREUR DÉTAILLÉE PDF :", error);
        alert(`Erreur technique : ${error.message}`);
      }
    } else {
      setTimeout(() => setDownloadSuccess(true), 1500);
    }
    setIsGenerating(null);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  const todayDate = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="p-8 text-slate-200 space-y-8 relative h-full">

      <AnimatePresence>
        {emergencyAlert && (
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 50, scale: 0.9 }}
            className="fixed top-24 right-10 z-[9999] bg-red-600 text-white p-6 rounded-2xl shadow-2xl border border-red-400/50 backdrop-blur-md max-w-[400px]"
          >
            <div className="flex items-center justify-between mb-3 border-b border-red-500/50 pb-3">
              <h3 className="text-lg font-bold flex items-center gap-2"><AlertTriangle className="w-6 h-6 animate-pulse text-yellow-300" /> ALERTE INCIDENT</h3>
              <button onClick={() => setEmergencyAlert(null)} className="text-red-200 hover:text-white bg-red-700/50 rounded-full p-1"><X className="w-5 h-5" /></button>
            </div>
            <p className="font-medium text-white mb-2">Ligne : <span className="font-bold text-yellow-300 ml-1">{emergencyAlert.routeName}</span></p>
            <p className="text-white/90 text-sm bg-red-900/30 p-3 rounded-lg border border-red-500/30"><span className="font-bold block mb-1 text-red-200">Rapport :</span> {emergencyAlert.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-wide mb-2 flex items-center gap-3">
            <div className="w-2 h-8 bg-amber-500 rounded-full"></div> Vue Globale
          </h1>
          <p className="text-zinc-400 text-sm">Centre de contrôle MassarBus. Suivi cartographique en direct.</p>
        </div>

        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => setIsBroadcastModalOpen(true)}
            className="bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
          >
            <Radio className={`w-5 h-5 ${isSocketConnected ? 'text-amber-500 animate-pulse' : 'text-zinc-600'}`} /> Centre de Diffusion
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => setIsReportModalOpen(true)}
            className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
          >
            <FileText className="w-5 h-5" /> Rapport du Jour
          </motion.button>
        </div>
      </motion.div>

      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div variants={cardVariants} whileHover={{ y: -5 }} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl flex items-center justify-between group">
          <div>
            <p className="text-zinc-400 text-sm font-medium mb-1">Élèves Inscrits</p>
            {isLoading ? <div className="h-10 w-16 bg-zinc-800 rounded animate-pulse"></div> : <h3 className="text-4xl font-bold text-white group-hover:text-blue-400 transition-colors">{stats.students}</h3>}
          </div>
          <div className="p-4 rounded-xl bg-blue-500/10 text-blue-500"><Users strokeWidth={2} className="w-8 h-8" /></div>
        </motion.div>

        <motion.div variants={cardVariants} whileHover={{ y: -5 }} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl flex items-center justify-between group">
          <div>
            <p className="text-zinc-400 text-sm font-medium mb-1">Lignes Actives</p>
            {isLoading ? <div className="h-10 w-16 bg-zinc-800 rounded animate-pulse"></div> : <h3 className="text-4xl font-bold text-white group-hover:text-amber-400 transition-colors">{stats.routes}</h3>}
          </div>
          <div className="p-4 rounded-xl bg-amber-500/10 text-amber-500"><BusIcon strokeWidth={2} className="w-8 h-8" /></div>
        </motion.div>

        <motion.div variants={cardVariants} whileHover={{ y: -5 }} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl flex items-center justify-between group">
          <div>
            <p className="text-zinc-400 text-sm font-medium mb-1">Comptes Utilisateurs</p>
            {isLoading ? <div className="h-10 w-16 bg-zinc-800 rounded animate-pulse"></div> : <h3 className="text-4xl font-bold text-white group-hover:text-emerald-400 transition-colors">{stats.users}</h3>}
          </div>
          <div className="p-4 rounded-xl bg-emerald-500/10 text-emerald-500"><UserCircle strokeWidth={2} className="w-8 h-8" /></div>
        </motion.div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }}>
        <div className="flex items-center gap-2 mb-4">
          <MapIcon className="w-5 h-5 text-amber-500" />
          <h2 className="text-xl font-bold text-white">Carte du Réseau</h2>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-2 overflow-hidden shadow-2xl relative z-0">
          <MapContainer center={fesPosition} zoom={13} style={{ height: '550px', width: '100%', zIndex: 0 }} className="rounded-xl">
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />

            {routesData.map((route) => route.stops.map((stop) => {
              if (stop.location?.coordinates?.length === 2) {
                return (
                  <Marker
                    key={stop._id || stop.name}
                    position={[stop.location.coordinates[1], stop.location.coordinates[0]]}
                  >
                    <Popup className="custom-popup">
                      <span className="block font-bold text-blue-600 text-sm mb-1">{stop.name}</span>
                      <span className="block text-xs text-slate-500">Ligne : <span className="font-semibold text-slate-700">{route.routeName}</span></span>
                      <span className="block text-xs text-amber-600 font-bold mt-1">Arrêt N° {stop.order}</span>
                    </Popup>
                  </Marker>
                );
              }
              return null;
            }))}

            {Object.keys(liveBuses).map((busId) => {
              const bus = liveBuses[busId];
              
              const currentRoute = routesData.find(r => 
                (r.defaultBus && (r.defaultBus._id === busId || r.defaultBus === busId))
              );
              
              const vehicle = busesData.find(b => b._id === busId);

              const routeAbsents = currentRoute 
                ? studentsData.filter(s => s.isAbsentToday && (s.routeId === currentRoute._id || s.routeId?._id === currentRoute._id))
                : [];

              return (
                <Marker key={busId} position={[bus.latitude, bus.longitude]} icon={busIcon}>
                  <Popup>
                    <div className="p-1 space-y-2 text-zinc-800 min-w-[240px]">
                      <div className="border-b border-zinc-200 pb-1.5 flex items-center justify-between gap-4">
                        <span className="font-bold text-amber-600 flex items-center gap-1">🚌 Bus Actif</span>
                        <span className="text-xs bg-emerald-100 text-emerald-700 font-black px-2 py-0.5 rounded-md">
                          {bus.speed} km/h
                        </span>
                      </div>
                      
                      <div>
                        <span className="block text-[9px] uppercase tracking-wider text-zinc-400 font-bold">Itinéraire</span>
                        <span className="text-xs font-bold text-zinc-900">
                          {currentRoute?.routeName || "Ligne non définie"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-0.5">
                        <div>
                          <span className="block text-[9px] uppercase tracking-wider text-zinc-400 font-bold">Chauffeur</span>
                          <span className="text-xs font-semibold text-zinc-700 truncate block max-w-[110px]">
                            {currentRoute?.defaultDriver?.name || currentRoute?.defaultDriver?.firstName || "Non assigné"}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[9px] uppercase tracking-wider text-zinc-400 font-bold">Véhicule</span>
                          <span className="text-xs font-semibold text-zinc-700 block">
                            {vehicle ? vehicle.plateNumber : "N/A"}
                          </span>
                        </div>
                      </div>

                      <div className="pt-1.5 border-t border-zinc-100">
                        <span className="block text-[9px] uppercase tracking-wider text-rose-500 font-bold mb-1">
                           Absents sur cette ligne ({routeAbsents.length})
                        </span>
                        {routeAbsents.length === 0 ? (
                          <span className="text-xs text-zinc-400 italic block mt-0.5">Aucun élève absent</span>
                        ) : (
                          <div className="max-h-24 overflow-y-auto space-y-0.5 text-xs text-zinc-600 font-semibold pt-0.5">
                            {routeAbsents.map(s => (
                              <div key={s._id} className="truncate">• {s.firstName} {s.lastName}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </motion.div>


      {/* ✨ MODALE — CENTRE DE DIFFUSION (BROADCAST) */}
      {isBroadcastModalOpen && createPortal(
        <AnimatePresence>
          <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center z-[99999] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] relative"
            >
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl animate-pulse pointer-events-none"></div>

              <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 shrink-0 relative">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Radio className="w-5 h-5 text-amber-500" />
                  Centre de Diffusion
                </h2>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-mono px-2 py-1 rounded border ${isSocketConnected ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}`}>
                    {isSocketConnected ? '🟢 Connecté' : '🔴 Déconnecté'}
                  </span>
                  <button onClick={() => setIsBroadcastModalOpen(false)} className="text-zinc-400 hover:text-white bg-zinc-800 p-1.5 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto bg-zinc-900">
                <p className="text-xs text-zinc-400">
                  Diffusez instantanément des messages ou des consignes d'urgence. Le message n'est confirmé comme "envoyé" qu'après accusé de réception du serveur.
                </p>

                <div className="space-y-4">
                  <div className="flex gap-2">
                    {[
                      { id: 'all', label: '📢 Tous' },
                      { id: 'drivers', label: '🚌 Chauffeurs' },
                      { id: 'parents', label: '👨‍👩‍👦 Parents' }
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => setBroadcastTarget(t.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                          broadcastTarget === t.id
                            ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-lg shadow-amber-500/20'
                            : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <textarea
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      placeholder={
                        broadcastTarget === 'drivers' ? "Ex: Attention, verglas sur la route de Sefrou, roulez prudemment..." :
                        broadcastTarget === 'parents' ? "Ex: Retard général de 15 minutes sur la Ligne 1 suite à un incident..." :
                        "Tapez un message global pour tout le réseau..."
                      }
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm text-slate-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 resize-none h-32 transition-colors"
                    />
                  </div>

                  {/* ALERTES DE DIFFUSION */}
                  <AnimatePresence>
                    {broadcastSuccess && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium rounded-xl flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" /> Message diffusé avec succès aux destinataires !
                      </motion.div>
                    )}
                    {broadcastError && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium rounded-xl flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> {broadcastError}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    onClick={handleSendBroadcast}
                    disabled={isBroadcasting || !broadcastMessage.trim()}
                    className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:hover:bg-amber-500 text-zinc-950 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-amber-500/20"
                  >
                    {isBroadcasting ? (
                      <><div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"></div> Diffusion en cours...</>
                    ) : (
                      <><Send className="w-4 h-4" /> Envoyer la diffusion</>
                    )}
                  </button>
                </div>

                {/* HISTORIQUE DE DIFFUSION */}
                {broadcastHistory.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Historique récent</h3>
                    <div className="space-y-3">
                      {broadcastHistory.map((msg, idx) => (
                        <div key={idx} className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-sm">
                          <div className="flex justify-between items-center text-zinc-500 mb-2 border-b border-zinc-800 pb-2">
                            <span className="font-bold text-amber-500/70 text-xs uppercase bg-amber-500/10 px-2 py-0.5 rounded">
                              Cible: {msg.target}
                            </span>
                            <span className="text-xs">{msg.time}</span>
                          </div>
                          <p className="text-zinc-300">{msg.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}

      {/* ✨ MODALE — RAPPORT DU JOUR */}
      {isReportModalOpen && createPortal(
        <AnimatePresence>
          <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center z-[99999] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative"
            >
              <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-500" />
                  Rapport Journalier
                </h2>
                <button onClick={() => setIsReportModalOpen(false)} className="text-zinc-400 hover:text-white bg-zinc-800 p-1.5 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                  <div>
                    <p className="text-xs text-zinc-400">Date du rapport</p>
                    <p className="text-sm font-bold text-slate-200 capitalize">{todayDate}</p>
                  </div>
                  <Clock className="w-5 h-5 text-zinc-600" />
                </div>

                <p className="text-xs text-zinc-400">
                  Ce rapport synthétise les présences, absences, les affectations des véhicules et le journal des incidents de la journée en cours.
                </p>

                <button
                  onClick={() => handleGenerateReport('PDF')}
                  disabled={isGenerating === 'PDF'}
                  className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:hover:bg-amber-500 text-zinc-950 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-amber-500/20"
                >
                  {isGenerating === 'PDF' ? (
                    <><div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"></div> Génération PDF...</>
                  ) : downloadSuccess ? (
                    <><CheckCircle2 className="w-4 h-4" /> Téléchargé avec succès !</>
                  ) : (
                    <><FileDown className="w-4 h-4" /> Télécharger en PDF</>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
};

export default VueGlobale;