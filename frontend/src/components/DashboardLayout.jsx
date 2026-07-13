// src/components/DashboardLayout.jsx
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const DashboardLayout = () => {
  return (
    <div
      className="flex h-screen bg-zinc-950 text-slate-200 overflow-hidden selection:bg-amber-500 selection:text-zinc-900"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <Sidebar />

      <div className="flex-1 overflow-y-auto relative z-0">
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-600/5 to-transparent pointer-events-none -z-10"></div>

        <div className="w-full h-full">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;