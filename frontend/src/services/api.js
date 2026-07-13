// src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api', 
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour injecter automatiquement le Token JWT dans chaque requête future
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('massarbus_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;