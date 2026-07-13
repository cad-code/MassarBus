import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { motion } from 'framer-motion';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, logout, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await login(email, password);
      const loggedInRole = response?.user?.role || user?.role;

      if (loggedInRole && loggedInRole !== 'ADMIN') {
        if (logout) await logout(); 
        setError("Accès refusé 🛑 : Interface strictement réservée aux administrateurs.");
        setIsLoading(false);
        return; 
      }
      
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur d\'authentification. Veuillez vérifier vos identifiants.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 selection:bg-amber-500 selection:text-slate-900 relative bg-cover bg-center bg-no-repeat"
      style={{ 
        fontFamily: "'Poppins', sans-serif",
        backgroundImage: "url('/admin_bg.png')" // ✨ L'image de fond est chargée ici
      }}
    >
      
      {/* ✨ OVERLAY : Un léger voile sombre et flou pour faire ressortir le formulaire */}
      <div className="absolute inset-0 bg-slate-950/40 pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        // ✨ GLASSMORPHISM : On ajoute relative, z-10, bg-slate-900/90 et backdrop-blur-md
        className="relative z-10 w-full max-w-md bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/50 border-t-4 border-t-amber-500 p-8 sm:p-10"
      >
        
        {/* EN-TÊTE : LOGO ET TITRE */}
        <div className="text-center mb-8">
          
          <div className="flex justify-center -mt-6 mb-4 h-24 items-center overflow-visible">
            <img 
              src="/logo.png" 
              alt="MassarBus Logo" 
              className="w-full h-full object-contain transform drop-shadow-lg"
              onError={(e) => {
                e.target.onerror = null; 
                e.target.src = "https://via.placeholder.com/200x80/1e293b/f59e0b?text=MASSARBUS"; 
              }}
            />
          </div>
          
          <h1 className="text-2xl font-bold text-slate-100 tracking-wide mt-2">
            Espace Administrateur
          </h1>
          <p className="text-slate-400 text-sm mt-2 font-medium">
            Veuillez vous identifier pour accéder au système.
          </p>
        </div>

        {/* MESSAGE D'ERREUR */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-950/50 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm flex items-start gap-3 mb-6"
          >
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <span>{error}</span>
          </motion.div>
        )}

        {/* FORMULAIRE CENTRAL */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Adresse Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-slate-950/80 border border-slate-700/50 text-slate-100 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors placeholder-slate-600 font-medium"
              placeholder="admin@massarbus.com"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-semibold text-slate-300">
                Mot de passe
              </label>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-slate-950/80 border border-slate-700/50 text-slate-100 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors placeholder-slate-600 font-medium"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-lg px-4 py-3.5 mt-2 transition-all duration-200 flex justify-center items-center shadow-lg shadow-amber-500/20 disabled:opacity-70"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-slate-900" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Connexion en cours...
              </span>
            ) : (
              'Se connecter'
            )}
          </button>
        </form>

      </motion.div>
      
    </div>
  );
};

export default Login;