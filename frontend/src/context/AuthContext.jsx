import { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Vérifie si une session utilisateur est déjà enregistrée
  useEffect(() => {
    const storedUser = localStorage.getItem('massarbus_user');
    const storedToken = localStorage.getItem('massarbus_token');

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    localStorage.setItem('massarbus_token', response.data.token);
    localStorage.setItem('massarbus_user', JSON.stringify(response.data.user));
    setUser(response.data.user);
  };

  const logout = () => {
    localStorage.removeItem('massarbus_token');
    localStorage.removeItem('massarbus_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};