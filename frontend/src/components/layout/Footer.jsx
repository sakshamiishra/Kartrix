import React from 'react';
import { Link } from 'react-router';
import { ShoppingBag } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-white dark:bg-[#17191B] border-t border-gray-100 dark:border-[#2A2D32] transition-colors duration-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand */}
          <div className="space-y-4 md:col-span-1">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white font-bold">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                Kartrix
              </span>
            </Link>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Kartrix 2.0 is a premium e-commerce shopping experience built with React, Vite, Tailwind CSS, and Django REST Framework.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
              Quick Links
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/" className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-500">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/products" className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-500">
                  All Products
                </Link>
              </li>
              <li>
                <Link to="/products" className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-500">
                  Categories
                </Link>
              </li>
              <li>
                <Link to="/products" className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-500">
                  Brands
                </Link>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
              Customer Account
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/profile" className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-500">
                  My Profile
                </Link>
              </li>
              <li>
                <Link to="/addresses" className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-500">
                  Shipping Addresses
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-500">
                  Sign In
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-500">
                  Create Account
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Support */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
              Service Guarantees
            </h4>
            <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
              <li>⚡ Free Express Shipping</li>
              <li>🔒 100% Secure Checkout</li>
              <li>🛡️ Authentic Brand Warranty</li>
              <li>💬 24/7 Customer Care</li>
            </ul>
          </div>

        </div>

        <div className="border-t border-gray-100 dark:border-[#2A2D32] mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500 dark:text-gray-400">
          <p>© {new Date().getFullYear()} Kartrix 2.0. All rights reserved.</p>
          <p>Built with React + Vite + Tailwind CSS + Django REST Framework</p>
        </div>
      </div>
    </footer>
  );
};
