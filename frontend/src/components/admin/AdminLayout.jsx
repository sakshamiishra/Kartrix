import React, { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tag,
  Warehouse,
  ShoppingBag,
  Star,
  Ticket,
  Users,
  Sun,
  Moon,
  ExternalLink,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react';

export function AdminLayout() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Products', path: '/admin/products', icon: Package },
    { label: 'Categories', path: '/admin/categories', icon: FolderTree },
    { label: 'Brands', path: '/admin/brands', icon: Tag },
    { label: 'Inventory', path: '/admin/inventory', icon: Warehouse },
    { label: 'Orders', path: '/admin/orders', icon: ShoppingBag },
    { label: 'Reviews', path: '/admin/reviews', icon: Star },
    { label: 'Coupons', path: '/admin/coupons', icon: Ticket },
    { label: 'Users', path: '/admin/users', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#0A0B0C] text-gray-900 dark:text-gray-100 flex flex-col md:flex-row transition-colors duration-200">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-[#121315] border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Link to="/" className="font-extrabold text-xl tracking-tight text-gray-900 dark:text-white">
            Kart<span className="text-orange-600">rix</span>
          </Link>
          <span className="text-xs bg-orange-100 dark:bg-orange-950/50 text-orange-600 font-semibold px-2 py-0.5 rounded">
            Admin
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 text-gray-600 dark:text-gray-300"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
        />
      )}

      {/* Sidebar Component */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-[#121315] border-r border-gray-200 dark:border-gray-800 flex flex-col transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Sidebar Brand Header */}
        <div className="hidden md:flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Link to="/" className="font-extrabold text-2xl tracking-tight text-gray-900 dark:text-white">
              Kartrix
            </Link>
            <span className="text-xs bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 font-semibold px-2 py-0.5 rounded-full border border-orange-200 dark:border-orange-900">
              Admin
            </span>
          </div>
        </div>

        {/* User Info Card */}
        <div className="p-4 mx-3 my-3 bg-gray-50 dark:bg-[#1A1C1E] rounded-xl border border-gray-200 dark:border-gray-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-orange-600 text-white font-bold flex items-center justify-center text-sm shadow">
              {user?.first_name ? user.first_name[0].toUpperCase() : user?.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            {user?.is_superuser ? 'Superuser Admin' : 'Staff Admin'}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1D1F22]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
          <div className="hidden md:flex items-center justify-between px-2 text-xs text-gray-500 dark:text-gray-400">
            <span>Theme</span>
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-gray-600" />}
            </button>
          </div>

          <Link
            to="/"
            className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#1A1C1E] hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Storefront
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;
