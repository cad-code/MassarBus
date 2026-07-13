// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthProvider, AuthContext } from './context/AuthContext';

import Login from './pages/Login';
import DashboardLayout from './components/DashboardLayout';
import BusManager from './pages/BusManager';
import RouteManager from './pages/RouteManager';
import StudentManager from './pages/StudentManager';
import UserManager from './pages/UserManager';
import VueGlobale from './pages/VueGlobale';
import TripsManager from './pages/TripsManager';
import Statistiques from './pages/Statistiques';

// --- SÉCURITÉ RENFORCÉE (RBAC) ---
const AdminRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  
  // 1. Si aucun utilisateur n'est connecté, retour au login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 2. Si l'utilisateur est connecté mais N'EST PAS un Admin (ex: un Driver)
  if (user.role !== 'ADMIN') {
    // On le rejette vers la page de login 
    return <Navigate to="/login" replace />;
  }

  // 3. S'il est Admin, on affiche le composant demandé
  return children;
};

// --- GESTION DES ROUTES ---
const AppRoutes = () => {
  return (
    <Routes>
      {/* Routes Publiques */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      
      {/* Routes Protégées de l'Administration */}
      <Route path="/dashboard" element={<AdminRoute><DashboardLayout /></AdminRoute>}>
        
        <Route index element={<VueGlobale />} />
        
        {/* Sous-pages de gestion */}
        <Route path="buses" element={<BusManager />} />
        <Route path="routes" element={<RouteManager />} />
        <Route path="students" element={<StudentManager />} />
        <Route path="users" element={<UserManager />} />
        <Route path="lines" element = {<TripsManager/>}/>
        <Route path="stats" element={<Statistiques />} />
        
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;