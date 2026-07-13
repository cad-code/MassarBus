// src/pages/UserManager.jsx
import { useState, useEffect } from 'react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Plus, Search, Trash2, X, AlertCircle, Mail, Phone, ShieldCheck } from 'lucide-react';

const UserManager = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', role: 'PARENT', phone: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      const data = response.data;
      setUsers(Array.isArray(data) ? data : (data.users || []));
    } catch (err) {
      setError('Erreur lors du chargement des utilisateurs.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await api.post('/users', formData);
      await fetchUsers();
      setIsModalOpen(false);
      setFormData({ name: '', email: '', password: '', role: 'PARENT', phone: '' });
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de la création.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cet utilisateur ? Cette action est irréversible.")) return;
    try {
      await api.delete(`/users/${id}`);
      await fetchUsers();
    } catch (err) {
      setError('Erreur lors de la suppression.');
    }
  };

  const getRoleBadge = (role) => {
    const styles = {
      ADMIN: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      DRIVER: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      PARENT: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[role] || "bg-zinc-500/10 text-zinc-400"}`}>
        {role}
      </span>
    );
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 h-full text-slate-200">
      
      {/* HEADER & TOOLBAR */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-wide mb-2 flex items-center gap-3 text-white">
            <div className="w-2 h-8 bg-amber-500 rounded-full"></div> Gestion des Accès
          </h1>
          <p className="text-zinc-400 text-sm">Gérez les administrateurs, chauffeurs et comptes parents.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 w-4 h-4" />
            <input 
              type="text" placeholder="Rechercher..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
            />
          </div>
          <motion.button 
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-zinc-900 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-5 h-5" /> Nouvel Accès
          </motion.button>
        </div>
      </motion.div>

      {/* TABLEAU */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-zinc-950/50 border-b border-zinc-800 text-zinc-400 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Utilisateur</th>
                <th className="px-6 py-4 font-semibold">Contact</th>
                <th className="px-6 py-4 font-semibold">Rôle</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {isLoading ? (
                <tr><td colSpan="4" className="py-12 text-center text-zinc-500">Chargement...</td></tr>
              ) : (
                filteredUsers.map((user, i) => (
                  <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} key={user._id} className="hover:bg-zinc-800/30">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-amber-500 border border-zinc-700">
                          <User className="w-5 h-5" />
                        </div>
                        <span className="font-bold">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-zinc-400 flex items-center gap-1.5"><Mail className="w-3 h-3" /> {user.email}</div>
                      <div className="text-xs text-zinc-500 flex items-center gap-1.5 mt-1"><Phone className="w-3 h-3" /> {user.phone || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleDelete(user._id)} className="p-2 text-zinc-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* MODALE */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl">
              <div className="p-6 border-b border-zinc-800 flex justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2"><ShieldCheck className="text-amber-500"/> Nouvel Accès</h2>
                <button onClick={() => setIsModalOpen(false)}><X/></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <input type="text" placeholder="Nom complet" required value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full bg-zinc-950 p-3 rounded-xl border border-zinc-800"/>
                <input type="email" placeholder="Email" required value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} className="w-full bg-zinc-950 p-3 rounded-xl border border-zinc-800"/>
                <input type="password" placeholder="Mot de passe" required value={formData.password} onChange={e=>setFormData({...formData, password: e.target.value})} className="w-full bg-zinc-950 p-3 rounded-xl border border-zinc-800"/>
                <select value={formData.role} onChange={e=>setFormData({...formData, role: e.target.value})} className="w-full bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                  <option value="PARENT">Parent</option>
                  <option value="DRIVER">Chauffeur</option>
                  <option value="ADMIN">Administrateur</option>
                </select>
                <button type="submit" className="w-full bg-amber-500 py-3 rounded-xl font-bold text-zinc-900">{isSubmitting ? '...' : 'Créer'}</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserManager;