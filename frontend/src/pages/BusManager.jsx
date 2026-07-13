// src/pages/BusManager.jsx
import { useState, useEffect } from 'react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Bus, Plus, Search, Edit2, Trash2, X, AlertCircle } from 'lucide-react';

const BusManager = () => {
  const [buses, setBuses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState(''); 
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingBusId, setEditingBusId] = useState(null); 
  
  const [busFormData, setBusFormData] = useState({
    plateNumber: '',
    capacity: 30,
  });

  useEffect(() => {
    fetchBuses();
  }, []);

  const fetchBuses = async () => {
    try {
      const response = await api.get('/buses');
      const data = response.data;
      const busArray = Array.isArray(data) ? data : (data.buses || []);
      setBuses(busArray);
    } catch (err) {
      setError('Erreur lors du chargement des bus.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingBusId(null);
    setBusFormData({ plateNumber: '', capacity: 30 });
    setIsModalOpen(true);
  };

  const openEditModal = (bus) => {
    setEditingBusId(bus._id);
    setBusFormData({ plateNumber: bus.plateNumber, capacity: bus.capacity });
    setIsModalOpen(true);
  };

  const handleSubmitBus = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      if (editingBusId) {
        await api.put(`/buses/${editingBusId}`, busFormData);
      } else {
        await api.post('/buses', busFormData);
      }
      
      await fetchBuses();
      setIsModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde du bus.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBus = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce bus de la flotte ?")) {
      return;
    }
    try {
      await api.delete(`/buses/${id}`);
      await fetchBuses(); 
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la suppression.');
    }
  };

  const filteredBuses = buses.filter(bus => 
    bus.plateNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Disponible</span>;
      case 'ON_ROUTE':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1 w-max"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>En Route</span>;
      case 'MAINTENANCE':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">Maintenance</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">{status}</span>;
    }
  };

  return (
    <div className="p-8 h-full">
      
      <motion.div 
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-wide mb-2 flex items-center gap-3">
            <div className="w-2 h-8 bg-amber-500 rounded-full"></div>
            Gestion de la Flotte
          </h1>
          <p className="text-zinc-400 text-sm">Gérez vos véhicules, leur capacité et leur état de maintenance.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Rechercher un matricule..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all placeholder-zinc-500"
            />
          </div>

          <motion.button 
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={openCreateModal}
            className="bg-amber-500 hover:bg-amber-400 text-zinc-900 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 whitespace-nowrap"
          >
            <Plus className="w-5 h-5" /> Ajouter un Bus
          </motion.button>
        </div>
      </motion.div>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-rose-500/10 border-l-4 border-rose-500 text-rose-400 p-4 rounded-r-xl mb-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5" /> {error}
        </motion.div>
      )}

      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-950/50 border-b border-zinc-800 text-zinc-400 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Véhicule</th>
                <th className="px-6 py-4 font-semibold">Capacité</th>
                <th className="px-6 py-4 font-semibold">Statut Actuel</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {isLoading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                      Chargement de la flotte...
                    </div>
                  </td>
                </tr>
              ) : filteredBuses.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-zinc-500 font-medium">
                    Aucun bus trouvé.
                  </td>
                </tr>
              ) : (
                filteredBuses.map((bus, index) => (
                  <motion.tr 
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}
                    key={bus._id} 
                    className="hover:bg-zinc-800/30 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 group-hover:text-amber-500 group-hover:border-amber-500/30 transition-colors">
                          <Bus className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold">{bus.plateNumber}</p>
                          <p className="text-xs text-zinc-500 font-mono">ID: {bus._id.slice(-6)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-300 font-medium">{bus.capacity} places</td>
                    <td className="px-6 py-4">{getStatusBadge(bus.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEditModal(bus)} className="p-2 text-zinc-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors" title="Modifier">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteBus(bus._id)} className="p-2 text-zinc-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors" title="Supprimer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  {editingBusId ? <Edit2 className="w-5 h-5 text-amber-500" /> : <Bus className="w-5 h-5 text-amber-500" />}
                  {editingBusId ? 'Modifier le Bus' : 'Nouveau Bus'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white transition-colors bg-zinc-800 p-1.5 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitBus} className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-zinc-300 mb-2">Plaque d'immatriculation</label>
                  <input
                    type="text" required value={busFormData.plateNumber}
                    onChange={(e) => setBusFormData({ ...busFormData, plateNumber: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors uppercase font-mono"
                    placeholder="EX: 12345-A-6"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-300 mb-2">Capacité (Places assises)</label>
                  <input
                    type="number" required min="1" max="100" value={busFormData.capacity}
                    onChange={(e) => setBusFormData({ ...busFormData, capacity: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                    placeholder="30"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="w-1/2 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold transition-colors">
                    Annuler
                  </button>
                  <button type="submit" disabled={isSubmitting} className="w-1/2 px-4 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-900 rounded-xl font-bold transition-colors flex justify-center items-center gap-2">
                    {isSubmitting ? <span className="w-5 h-5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin"></span> : 'Enregistrer'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default BusManager;