import React from 'react';
import { Link } from 'react-router';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export function AdminAccessDeniedPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center space-y-6 bg-white dark:bg-[#16181A] p-8 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 transition-colors">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Access Restricted
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            You do not have staff permissions to access the Kartrix Admin Panel. If you believe this is an error, please contact your store administrator.
          </p>
        </div>

        <div className="pt-2">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-orange-600/20"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Storefront
          </Link>
        </div>
      </div>
    </div>
  );
}

export default AdminAccessDeniedPage;
