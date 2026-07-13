// src/pages/RouteManager.jsx
import { useState, useEffect } from 'react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, Plus, Edit2, Trash2, X, AlertCircle, MapPin, MapPinOff, ArrowRight, User, Bus } from 'lucide-react';

const RouteManager = () => {
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState(null);

  const [formData, setFormData] = useState({ 
    routeName: '', 
    stops: [], 
    defaultBus: '', 
    defaultDriver: '' 
  });
  const [newStop, setNewStop] = useState({ name: '', order: 1, lat: '', lng: '' });

  useEffect(() => {
    fetchRoutes();
    fetchBusesAndDrivers();
  }, []);

  const fetchRoutes = async () => {
    try {
      const response = await api.get('/routes');
      const data = response.data;
      setRoutes(Array.isArray(data) ? data : (data.routes || []));
    } catch (err) {
      setError('Erreur lors du chargement des itinéraires.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBusesAndDrivers = async () => {
    try {
      const [busesRes, usersRes] = await Promise.all([
        api.get('/buses'),
        api.get('/users') 
      ]);
      
      const busesList = busesRes.data.buses || busesRes.data || [];
      const usersList = usersRes.data.users || usersRes.data || [];
      
      setBuses(busesList);
      setDrivers(usersList.filter(user => user.role === 'DRIVER'));
    } catch (err) {
      console.error('Erreur options de bus/chauffeurs:', err);
    }
  };

  const handleAddStopToArray = (e) => {
    e.preventDefault();
    if (!newStop.name) {
      alert("Le nom de l'arrêt est obligatoire.");
      return;
    }
    setFormData({
      ...formData,
      stops: [...formData.stops, { ...newStop, order: formData.stops.length + 1 }]
    });
    setNewStop({ name: '', order: formData.stops.length + 2, lat: '', lng: '' });
  };

  const handleRemoveStopFromArray = (indexToRemove) => {
    const updatedStops = formData.stops
      .filter((_, index) => index !== indexToRemove)
      .map((stop, index) => ({ ...stop, order: index + 1 })); 
    
    setFormData({ ...formData, stops: updatedStops });
    setNewStop({ ...newStop, order: updatedStops.length + 1 });
  };

  const handleEditClick = (route) => {
    setEditingRouteId(route._id);
    const flatStops = route.stops.map(stop => ({
      name: stop.name,
      order: stop.order,
      lat: stop.location?.coordinates?.[1] || '', 
      lng: stop.location?.coordinates?.[0] || ''  
    }));

    setFormData({ 
      routeName: route.routeName, 
      stops: flatStops,
      defaultBus: route.defaultBus?._id || route.defaultBus || '',
      defaultDriver: route.defaultDriver?._id || route.defaultDriver || ''
    });
    setNewStop({ name: '', order: flatStops.length + 1, lat: '', lng: '' });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRouteId(null);
    setFormData({ routeName: '', stops: [], defaultBus: '', defaultDriver: '' });
    setNewStop({ name: '', order: 1, lat: '', lng: '' });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.stops.length === 0) {
      setError("Une ligne doit comporter au moins un arrêt.");
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const formattedStops = formData.stops.map(stop => {
        const stopData = { name: stop.name, order: Number(stop.order) };
        if (stop.lat && stop.lng) {
          stopData.location = {
            type: 'Point',
            coordinates: [Number(stop.lng), Number(stop.lat)]
          };
        }
        return stopData;
      });

      const payload = { 
        routeName: formData.routeName, 
        stops: formattedStops 
      };

      if (formData.defaultBus) payload.defaultBus = formData.defaultBus;
      if (formData.defaultDriver) payload.defaultDriver = formData.defaultDriver;

      if (editingRouteId) {
        await api.put(`/routes/${editingRouteId}`, payload);
      } else {
        await api.post('/routes', payload);
      }
      
      await fetchRoutes();
      handleCloseModal();
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer définitivement cette ligne ?")) return;
    try {
      await api.delete(`/routes/${id}`);
      await fetchRoutes();
    } catch (err) {
      setError('Erreur lors de la suppression.');
    }
  };

  return (
    <div className="p-8 h-full text-slate-200 relative">
      
      <motion.div 
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-wide mb-2 flex items-center gap-3 text-white">
            <div className="w-2 h-8 bg-amber-500 rounded-full"></div>
            Gestion des Itinéraires
          </h1>
          <p className="text-zinc-400 text-sm">Créez et modifiez les lignes de transport et assignez les véhicules.</p>
        </div>
        
        <motion.button 
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={() => {
            setEditingRouteId(null);
            setFormData({ routeName: '', stops: [], defaultBus: '', defaultDriver: '' });
            setIsModalOpen(true);
          }}
          className="bg-amber-500 hover:bg-amber-400 text-zinc-900 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 shadow-lg shadow-amber-500/20 whitespace-nowrap"
        >
          <Plus className="w-5 h-5" /> Nouvelle Ligne
        </motion.button>
      </motion.div>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-rose-500/10 border-l-4 border-rose-500 text-rose-400 p-4 rounded-r-xl mb-6 flex items-center gap-3 shadow-lg">
          <AlertCircle className="w-5 h-5" /> {error}
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-zinc-500">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            Chargement du réseau...
          </div>
        ) : routes.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 bg-zinc-900 rounded-2xl border border-zinc-800 border-dashed">
            Aucun itinéraire configuré pour le moment.
          </div>
        ) : (
          routes.map((route, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
              key={route._id} 
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-amber-500/30 transition-all shadow-xl group"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-zinc-800/50 pb-4">
                <div className="flex flex-col gap-1">
                  <h3 className="text-xl font-bold text-white flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                      <Map className="w-5 h-5" />
                    </div>
                    {route.routeName}
                  </h3>
                  
                  <div className="flex items-center gap-4 text-xs text-zinc-400 ml-12">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-zinc-500" />
                      {route.defaultDriver ? `${route.defaultDriver.name || 'Chauffeur assigné'}` : 'Aucun chauffeur'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Bus className="w-3.5 h-3.5 text-zinc-500" />
                      {route.defaultBus ? `${route.defaultBus.plateNumber || 'Bus assigné'}` : 'Aucun bus'}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-2 w-full md:w-auto justify-end">
                  <button 
                    onClick={() => handleEditClick(route)}
                    className="p-2.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-xl transition-colors flex items-center gap-2 text-sm font-semibold"
                  >
                    <Edit2 className="w-4 h-4" /> Modifier
                  </button>
                  <button 
                    onClick={() => handleDelete(route._id)}
                    className="p-2.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl transition-colors flex items-center gap-2 text-sm font-semibold"
                  >
                    <Trash2 className="w-4 h-4" /> Supprimer
                  </button>
                </div>
              </div>

              {/* Séquence des arrêts - Style Metro */}
              <div className="flex flex-wrap gap-2 items-center mt-2 pl-2">
                {route.stops?.sort((a,b) => a.order - b.order).map((stop, idx) => {
                  const hasGps = stop.location && stop.location.coordinates && stop.location.coordinates.length === 2;
                  return (
                    <div key={stop._id || idx} className="flex items-center gap-2">
                      <div className="bg-zinc-950 px-3 py-2 rounded-xl border border-zinc-800 flex items-center gap-3 group-hover:border-zinc-700 transition-colors">
                        <span className="bg-zinc-800 text-zinc-300 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">
                          {stop.order}
                        </span>
                        <span className="font-medium text-sm text-zinc-200">{stop.name}</span>
                        {hasGps ? (
                          <MapPin className="w-3.5 h-3.5 text-emerald-400 ml-1" title="Coordonnées GPS actives" />
                        ) : (
                          <MapPinOff className="w-3.5 h-3.5 text-zinc-600 ml-1" title="Aucune donnée GPS" />
                        )}
                      </div>
                      {idx < route.stops.length - 1 && (
                        <ArrowRight className="w-4 h-4 text-zinc-600 mx-1" />
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* MODALE D'ÉDITION / CRÉATION */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Map className="w-5 h-5 text-amber-500" />
                  {editingRouteId ? 'Modifier la Ligne' : 'Créer une Ligne'}
                </h2>
                <button onClick={handleCloseModal} className="text-zinc-400 hover:text-white transition-colors bg-zinc-800 p-1.5 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                
                <div>
                  <label className="block text-sm font-semibold text-zinc-300 mb-2">Nom de la ligne</label>
                  <input
                    type="text" required value={formData.routeName}
                    onChange={(e) => setFormData({ ...formData, routeName: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                    placeholder="Ex: Ligne 1 - Centre Ville vers ENSA"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300 mb-2 flex items-center gap-2"><User className="w-4 h-4 text-zinc-500"/> Chauffeur par défaut</label>
                    <select
                      value={formData.defaultDriver} onChange={(e) => setFormData({ ...formData, defaultDriver: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500"
                    >
                      <option value="">-- Aucun chauffeur --</option>
                      {drivers.map(driver => (
                        <option key={driver._id} value={driver._id}>
                          {driver.firstName || driver.name} {driver.lastName || ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300 mb-2 flex items-center gap-2"><Bus className="w-4 h-4 text-zinc-500"/> Bus par défaut</label>
                    <select
                      value={formData.defaultBus} onChange={(e) => setFormData({ ...formData, defaultBus: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500"
                    >
                      <option value="">-- Aucun bus --</option>
                      {buses.map(bus => (
                        <option key={bus._id} value={bus._id}>
                          {bus.plateNumber} ({bus.capacity} places)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Stop Builder */}
                <div className="bg-zinc-950/50 border border-zinc-800 p-5 rounded-2xl space-y-4">
                  <h3 className="text-sm font-bold text-amber-500 border-b border-zinc-800/50 pb-2 flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Ajouter un arrêt
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Nom de l'arrêt</label>
                      <input
                        type="text" value={newStop.name} onChange={(e) => setNewStop({ ...newStop, name: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500"
                        placeholder="Ex: Place Atlas"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1">Latitude (Opt.)</label>
                        <input
                          type="number" step="any" value={newStop.lat} onChange={(e) => setNewStop({ ...newStop, lat: e.target.value })}
                          className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500"
                          placeholder="34.037"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1">Longitude (Opt.)</label>
                        <input
                          type="number" step="any" value={newStop.lng} onChange={(e) => setNewStop({ ...newStop, lng: e.target.value })}
                          className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500"
                          placeholder="-4.999"
                        />
                      </div>
                    </div>
                  </div>
                  <button 
                    type="button" onClick={handleAddStopToArray}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-2.5 rounded-xl text-sm font-bold transition-colors border border-zinc-700"
                  >
                    Ajouter cet arrêt à la séquence
                  </button>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-zinc-300 mb-3">Séquence actuelle de la ligne :</h3>
                  {formData.stops.length === 0 ? (
                    <div className="text-center p-6 border-2 border-dashed border-zinc-800 rounded-xl text-zinc-500 text-sm font-medium">
                      La ligne est vide. Ajoutez des arrêts ci-dessus.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {formData.stops.map((stop, index) => (
                        <div key={index} className="bg-zinc-800/40 border border-zinc-700 px-4 py-3 rounded-xl flex justify-between items-center text-sm">
                          <div className="flex items-center gap-3">
                            <span className="bg-zinc-700 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">{stop.order}</span>
                            <span className="font-bold text-slate-200">{stop.name}</span>
                            {(stop.lat && stop.lng) ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20"><MapPin className="w-3 h-3"/> GPS</span>
                            ) : (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700"><MapPinOff className="w-3 h-3"/> Sans GPS</span>
                            )}
                          </div>
                          <button 
                            type="button" onClick={() => handleRemoveStopFromArray(index)}
                            className="text-rose-400 hover:text-rose-300 hover:bg-rose-400/10 px-2.5 py-1.5 rounded-lg transition-colors text-xs font-bold flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5"/> Retirer
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 flex gap-4 mt-auto">
                <button type="button" onClick={handleCloseModal} className="w-1/2 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors">
                  Annuler
                </button>
                <button 
                  type="button" onClick={handleSubmit} disabled={isSubmitting} 
                  className="w-1/2 px-4 py-3 bg-amber-500 hover:bg-amber-400 text-zinc-900 rounded-xl font-bold transition-colors shadow-lg shadow-amber-500/20 flex justify-center items-center gap-2"
                >
                  {isSubmitting ? <span className="w-5 h-5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin"></span> : (editingRouteId ? 'Mettre à jour la Ligne' : 'Créer la Ligne')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RouteManager;