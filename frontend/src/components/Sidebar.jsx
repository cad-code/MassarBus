// src/components/Sidebar.jsx
import { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Bus,
  Map,
  Users,
  UserCircle,
  Route,
  LogOut,
  PieChart
} from 'lucide-react';

const Sidebar = () => {
  const { logout, user } = useContext(AuthContext);

  const menuItems = [
    { name: 'Vue Globale', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Gestion des Bus', path: '/dashboard/buses', icon: Bus },
    { name: 'Itinéraires', path: '/dashboard/routes', icon: Map },
    { name: 'Élèves', path: '/dashboard/students', icon: Users },
    { name: 'Utilisateurs', path: '/dashboard/users', icon: UserCircle },
    { name: 'Lignes', path: '/dashboard/lines', icon: Route },
    { name: 'Statistiques', path: '/dashboard/stats', icon: PieChart },
  ];

  return (
    <div
      className="w-72 bg-slate-950 border-r border-slate-800 h-screen flex flex-col justify-between font-sans shadow-2xl z-20"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <div>
        <div className="p-6 border-b border-slate-800/60 flex flex-col items-center justify-center">
          <div className="flex justify-center h-20 w-full items-center overflow-visible mb-3 -mt-2">
            <img
              src="/logo.png"
              alt="MassarBus Logo"
              className="w-full h-full object-contain transform drop-shadow-md"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://via.placeholder.com/120x40/1e293b/f59e0b?text=MASSARBUS";
              }}
            />
          </div>

          <span className="bg-amber-500/10 text-amber-500 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border border-amber-500/20">
            Admin Panel
          </span>
        </div>

        <nav className="mt-6 flex flex-col gap-1 px-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                end={item.path === '/dashboard'}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 overflow-hidden ${
                    isActive
                      ? 'bg-amber-500/10 text-amber-500'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`
                }
              >
                {({ isActive }) => (
                  <motion.div
                    className="flex items-center gap-3 w-full"
                    whileHover={{ x: isActive ? 0 : 4 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 rounded-r-full"
                      />
                    )}
                    <Icon strokeWidth={isActive ? 2.5 : 2} className="w-5 h-5" />
                    {item.name}
                  </motion.div>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="p-2 border-t border-slate-800/60 bg-slate-900/30">
        <div className="mb-4 px-2 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-amber-500 font-bold">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm text-slate-200 font-semibold truncate">{user?.name || 'Administrateur'}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-sm font-semibold py-2.5 px-4 rounded-xl transition-colors border border-red-500/10"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </motion.button>
      </div>
    </div>
  );
};

export default Sidebar;