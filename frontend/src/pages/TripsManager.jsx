// src/pages/TripsManager.jsx
import { useState, useEffect } from 'react';
import api from '../services/api'; 
import { motion } from 'framer-motion';
import { Settings, Bus, User, Map, CheckCircle2, AlertCircle, Save } from 'lucide-react';

const TripsManager = () => {
  const [routes, setRoutes] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [buses, setBuses] = useState([]);
  
  const [formData, setFormData] = useState({ routeId: '', driverId: '', busId: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // On lance les 3 requêtes en parallèle via l'instance API
      const [rRes, dRes, bRes] = await Promise.all([
        api.get('/routes'),
        api.get('/users'),
        api.get('/buses')
      ]);
      
      const routesData = Array.isArray(rRes.data) ? rRes.data : (rRes.data.routes || []);
      const usersData = Array.isArray(dRes.data) ? dRes.data : (dRes.data.users || dRes.data.data || []);
      const busesData = Array.isArray(bRes.data) ? bRes.data : (bRes.data.buses || bRes.data.data || []);

      setRoutes(routesData);
      setDrivers(usersData.filter(u => u.role && u.role.toUpperCase() === 'DRIVER'));
      setBuses(busesData.filter(b => b.status === 'AVAILABLE' || b.status === 'Disponible'));
    } catch (err) {
      console.error(err);
      setMessage("❌ Erreur lors du chargement des données.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');
    
    try {
      const route = routes.find(r => r._id === formData.routeId);
      
      // On met à jour la route via l'instance API
      await api.put(`/routes/${formData.routeId}`, {
        routeName: route.routeName,
        stops: route.stops,
        defaultDriver: formData.driverId,
        defaultBus: formData.busId
      });
      
      setMessage("✅ Configuration enregistrée ! Le trajet sera généré automatiquement chaque matin.");
      setFormData({ routeId: '', driverId: '', busId: '' }); // Reset du formulaire
    } catch (err) {
      console.error(err);
      setMessage("❌ Erreur lors de la sauvegarde.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-zinc-500">
      <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      Chargement de la configuration...
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 h-full text-slate-200">
      
      {/* EN-TÊTE */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <div className="w-2 h-8 bg-amber-500 rounded-full"></div>
          Automatisation des Trajets
        </h1>
        <p className="text-zinc-400 text-sm">Assignez les chauffeurs et les bus aux lignes pour la génération automatique via CRON.</p>
      </div>
      
      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-xl max-w-3xl">
        <h2 className="text-xl font-bold text-amber-500 mb-6 flex items-center gap-2">
          <Settings className="w-5 h-5" /> Configuration de Ligne
        </h2> 

        {message && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} 
            className={`p-4 mb-6 rounded-xl flex items-center gap-3 font-medium ${message.includes('✅') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}
          >
            {message.includes('✅') ? <CheckCircle2 className="w-5 h-5"/> : <AlertCircle className="w-5 h-5"/>} 
            {message}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Ligne */}
          <div>
            <label className="text-sm font-semibold text-zinc-400 mb-2 block">Ligne concernée</label>
            <div className="relative">
              <Map className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-500 w-5 h-5" />
              <select 
                className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl py-3.5 pl-12 pr-4 focus:border-amber-500 outline-none transition-colors" 
                value={formData.routeId}
                onChange={e => setFormData({...formData, routeId: e.target.value})} required
              >
                <option value="">-- Sélectionner une ligne --</option>
                {routes.map(r => <option key={r._id} value={r._id}>{r.routeName}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Chauffeur */}
            <div>
              <label className="text-sm font-semibold text-zinc-400 mb-2 block">Chauffeur par défaut</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-500 w-5 h-5" />
                <select 
                  className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl py-3.5 pl-12 pr-4 focus:border-amber-500 outline-none transition-colors"
                  value={formData.driverId}
                  onChange={e => setFormData({...formData, driverId: e.target.value})} required
                >
                  <option value="">-- Chauffeur --</option>
                  {drivers.map(d => <option key={d._id} value={d._id}>{d.name || d.firstName}</option>)}
                </select>
              </div>
            </div>

            {/* Bus */}
            <div>
              <label className="text-sm font-semibold text-zinc-400 mb-2 block">Bus par défaut</label>
              <div className="relative">
                <Bus className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-500 w-5 h-5" />
                <select 
                  className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl py-3.5 pl-12 pr-4 focus:border-amber-500 outline-none transition-colors"
                  value={formData.busId}
                  onChange={e => setFormData({...formData, busId: e.target.value})} required
                >
                  <option value="">-- Bus --</option>
                  {buses.map(b => <option key={b._id} value={b._id}>{b.matricule} ({b.capacity} places)</option>)}
                </select>
              </div>
            </div>
          </div>

          <motion.button 
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
            disabled={isSubmitting} 
            className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-900 font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 mt-4 shadow-lg shadow-amber-500/20"
          >
            {isSubmitting ? (
              <span className="w-5 h-5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <><Save className="w-5 h-5"/> Sauvegarder l'assignation</>
            )}
          </motion.button>
        </form>
      </div>
    </motion.div>
  );
};

export default TripsManager;