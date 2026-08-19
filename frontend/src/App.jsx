import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';

import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { ProtectedRoute } from './components/common/ProtectedRoute';

import { HomePage } from './pages/HomePage';
import { ProductListPage } from './pages/ProductListPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { CategoryProductsPage } from './pages/CategoryProductsPage';
import { BrandsPage } from './pages/BrandsPage';
import { BrandProductsPage } from './pages/BrandProductsPage';
import { DealsPage } from './pages/DealsPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProfilePage } from './pages/ProfilePage';
import { AddressPage } from './pages/AddressPage';
import { CartPage } from './pages/CartPage';
import { WishlistPage } from './pages/WishlistPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderHistoryPage } from './pages/OrderHistoryPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { OrderSuccessPage } from './pages/OrderSuccessPage';

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <BrowserRouter>
                <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-[#0F1011] text-gray-900 dark:text-gray-100 transition-colors duration-200">
                  <Navbar />

                  <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                    <Routes>
                      {/* Public Customer Routes */}
                      <Route path="/" element={<HomePage />} />
                      <Route path="/products" element={<ProductListPage />} />
                      <Route path="/products/:slug" element={<ProductDetailPage />} />
                      <Route path="/categories" element={<CategoriesPage />} />
                      <Route path="/categories/:slug" element={<CategoryProductsPage />} />
                      <Route path="/brands" element={<BrandsPage />} />
                      <Route path="/brands/:slug" element={<BrandProductsPage />} />
                      <Route path="/deals" element={<DealsPage />} />
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/register" element={<RegisterPage />} />

                      {/* Protected Customer Routes */}
                      <Route
                        path="/cart"
                        element={
                          <ProtectedRoute>
                            <CartPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/checkout"
                        element={
                          <ProtectedRoute>
                            <CheckoutPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/order-success/:orderNumber"
                        element={
                          <ProtectedRoute>
                            <OrderSuccessPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/orders"
                        element={
                          <ProtectedRoute>
                            <OrderHistoryPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/orders/:orderNumber"
                        element={
                          <ProtectedRoute>
                            <OrderDetailPage />
                          </ProtectedRoute>
                        }
                      />

                      <Route
                        path="/wishlist"
                        element={
                          <ProtectedRoute>
                            <WishlistPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/profile"
                        element={
                          <ProtectedRoute>
                            <ProfilePage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/addresses"
                        element={
                          <ProtectedRoute>
                            <AddressPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Fallback redirect */}
                      <Route path="*" element={<HomePage />} />
                    </Routes>
                  </main>

                  <Footer />
                </div>
              </BrowserRouter>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
