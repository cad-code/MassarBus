// src/pages/StudentManager.jsx
import { useState, useEffect } from 'react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Trash2, X, AlertCircle, Search, Phone, MapPin, UserPlus, PhoneCall, Bus } from 'lucide-react';

const StudentManager = () => {
  const [students, setStudents] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [parents, setParents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState(''); 
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    emergencyContact: '',
    routeId: '',
    pickupStopId: '',
    parentId: ''
  });

  const [availableStops, setAvailableStops] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [studentsRes, routesRes, usersRes] = await Promise.all([
        api.get('/students'),
        api.get('/routes'),
        api.get('/users')
      ]);
      
      const studentsData = Array.isArray(studentsRes.data) ? studentsRes.data : (studentsRes.data.students || []);
      const routesData = Array.isArray(routesRes.data) ? routesRes.data : (routesRes.data.routes || []);
      const usersData = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data.users || usersRes.data.data || []);
      
      const parentsList = usersData.filter(user => user.role === 'PARENT');
      
      setStudents(studentsData);
      setRoutes(routesData);
      setParents(parentsList);
    } catch (err) {
      setError('Erreur lors du chargement des données.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRouteChange = (selectedRouteId) => {
    const selectedRoute = routes.find(r => r._id === selectedRouteId);
    setAvailableStops(selectedRoute ? selectedRoute.stops : []);
    
    setFormData({
      ...formData,
      routeId: selectedRouteId,
      pickupStopId: '' 
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const dataToSend = { ...formData };
      if (!dataToSend.parentId) {
        delete dataToSend.parentId;
      }

      await api.post('/students', dataToSend);
      await fetchData(); 
      setIsModalOpen(false);
      
      setFormData({ firstName: '', lastName: '', emergencyContact: '', routeId: '', pickupStopId: '', parentId: '' });
      setAvailableStops([]);
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de l'inscription de l'élève.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir désinscrire cet élève du service de transport ?")) return;
    try {
      await api.delete(`/students/${id}`);
      await fetchData();
    } catch (err) {
      setError('Erreur lors de la suppression.');
    }
  };

  const filteredStudents = students.filter(student => {
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="p-8 h-full text-slate-200 relative">
      
      {/* EN-TÊTE ET BARRE D'OUTILS */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-wide mb-2 flex items-center gap-3 text-white">
            <div className="w-2 h-8 bg-amber-500 rounded-full"></div>
            Gestion des Élèves
          </h1>
          <p className="text-zinc-400 text-sm">Inscrivez les élèves, gérez les contacts d'urgence et les affectations de bus.</p>
        </div>

        {/* ✨ CORRECTION : items-center ajouté ici pour aligner la barre et le bouton */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Rechercher un élève..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all placeholder-zinc-500"
            />
          </div>
          <motion.button 
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-zinc-900 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 whitespace-nowrap"
          >
            <Plus className="w-5 h-5" /> Inscrire un Élève
          </motion.button>
        </div>
      </motion.div>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-rose-500/10 border-l-4 border-rose-500 text-rose-400 p-4 rounded-r-xl mb-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5" /> {error}
        </motion.div>
      )}

      {/* TABLEAU DES ÉLÈVES */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl"
      >
        <div className="overflow-x-auto">
          {/* ✨ CORRECTION : min-w-[900px] pour empêcher l'écrasement des colonnes */}
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-zinc-950/50 border-b border-zinc-800 text-zinc-400 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Identité de l'Élève</th>
                <th className="px-6 py-4 font-semibold">Contact (Parent/Urgence)</th>
                <th className="px-6 py-4 font-semibold">Affectation (Ligne & Arrêt)</th>
                <th className="px-6 py-4 font-semibold text-center">Statut du Jour</th> {/* ✨ Centré */}
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                      Chargement de la liste...
                    </div>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-zinc-500 font-medium">
                    Aucun élève trouvé.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, index) => (
                  <motion.tr 
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}
                    key={student._id} 
                    className="hover:bg-zinc-800/30 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-amber-500 group-hover:border-amber-500/50 transition-colors">
                          {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-200">{student.firstName} {student.lastName}</p>
                          <p className="text-xs text-zinc-500 font-mono">ID: {student._id.slice(-6)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-300 flex items-center gap-1.5 mb-1">
                        <UserPlus className="w-3.5 h-3.5 text-zinc-500" />
                        {student.parentId?.name ? student.parentId.name : <span className="text-zinc-500 italic">Compte non lié</span>}
                      </div>
                      <div className="text-xs text-zinc-400 flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-emerald-500" /> {student.emergencyContact}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-sm font-bold text-blue-400 flex items-center gap-1.5 whitespace-nowrap">
                          <Bus className="w-3.5 h-3.5" />
                          {student.routeId?.routeName || 'Non assignée'}
                        </span>
                        <span className="text-xs text-zinc-400 flex items-center gap-1.5 bg-zinc-950/50 px-2 py-1 rounded-md w-max border border-zinc-800">
                          <MapPin className="w-3 h-3 text-amber-500" />
                          {student.routeId?.stops?.find(stop => stop._id === student.pickupStopId)?.name || 'Arrêt non défini'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {/* ✨ CORRECTION : Ajout de inline-block et whitespace-nowrap pour protéger le badge */}
                      {student.isAbsentToday ? (
                        <span className="inline-block px-3 py-1.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 whitespace-nowrap">Absent aujourd'hui</span>
                      ) : (
                        <span className="inline-block px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">Présent (Prévu)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right w-1 whitespace-nowrap">
                      <button onClick={() => handleDelete(student._id)} className="p-2 text-zinc-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors" title="Désinscrire">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* MODALE D'INSCRIPTION */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 shrink-0">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-500" />
                  Inscrire un Élève
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white transition-colors bg-zinc-800 p-1.5 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto p-6 custom-scrollbar">
                <form id="student-form" onSubmit={handleSubmit} className="space-y-6">
                  
                  {/* Section Identité */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-zinc-300 mb-2">Prénom</label>
                      <input
                        type="text" required value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-zinc-300 mb-2">Nom de famille</label>
                      <input
                        type="text" required value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Section Parent & Contact */}
                  <div className="p-5 bg-zinc-950/50 border border-zinc-800 rounded-2xl space-y-4">
                    <h3 className="text-sm font-bold text-blue-400 flex items-center gap-2 border-b border-zinc-800/50 pb-2">
                      <UserPlus className="w-4 h-4" /> Liaison Parentale & Contact
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Lier à un Compte Parent (Opt.)</label>
                        <select
                          value={formData.parentId}
                          onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                          className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
                        >
                          <option value="">-- Aucun parent (Non lié) --</option>
                          {parents.map(parent => (
                            <option key={parent._id} value={parent._id}>{parent.name} ({parent.email})</option>
                          ))}
                        </select>
                        <p className="text-[10px] text-zinc-500 mt-1 ml-1">Permet au parent de suivre le bus sur son tel.</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Téléphone (Urgence)</label>
                        <div className="relative">
                          <PhoneCall className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500" />
                          <input
                            type="text" required value={formData.emergencyContact}
                            onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                            className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                            placeholder="Ex: 06 00 00 00 00"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section Affectation Transport */}
                  <div className="p-5 bg-zinc-950/50 border border-zinc-800 rounded-2xl space-y-4">
                    <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2 border-b border-zinc-800/50 pb-2">
                      <MapPin className="w-4 h-4" /> Affectation Transport
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Choisir la Ligne (Trajet)</label>
                        <select
                          required value={formData.routeId} onChange={(e) => handleRouteChange(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500"
                        >
                          <option value="">-- Sélectionner une ligne --</option>
                          {routes.map(route => (
                            <option key={route._id} value={route._id}>{route.routeName}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Arrêt de Montée/Descente</label>
                        <select
                          required disabled={!formData.routeId} value={formData.pickupStopId}
                          onChange={(e) => setFormData({ ...formData, pickupStopId: e.target.value })}
                          className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">-- Sélectionner l'arrêt --</option>
                          {availableStops.map(stop => (
                            <option key={stop._id} value={stop._id}>Arrêt {stop.order} : {stop.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                </form>
              </div>

              {/* Pied de la modale */}
              <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 flex gap-4 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-1/2 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors">
                  Annuler
                </button>
                <button form="student-form" type="submit" disabled={isSubmitting} className="w-1/2 px-4 py-3 bg-amber-500 hover:bg-amber-400 text-zinc-900 rounded-xl font-bold transition-colors shadow-lg shadow-amber-500/20 flex justify-center items-center gap-2">
                  {isSubmitting ? <span className="w-5 h-5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin"></span> : 'Inscrire cet élève'}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentManager;