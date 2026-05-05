import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { useAuth } from '../../contexts/AuthContext';

const Layout = () => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 lg:ml-64">
      <Header />
      <div className="flex pt-16">
        <Sidebar role={user?.role} />
        <main className="flex-1 min-w-0 overflow-x-auto">
          <div className="p-6 lg:p-8">
            <div className="mx-auto">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;