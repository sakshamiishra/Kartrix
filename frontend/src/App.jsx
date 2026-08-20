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

import { AdminProtectedRoute } from './components/admin/AdminProtectedRoute';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminProductListPage } from './pages/admin/AdminProductListPage';
import { AdminProductFormPage } from './pages/admin/AdminProductFormPage';
import { AdminCategoryListPage } from './pages/admin/AdminCategoryListPage';
import { AdminBrandListPage } from './pages/admin/AdminBrandListPage';
import { AdminInventoryPage } from './pages/admin/AdminInventoryPage';
import { AdminOrderListPage } from './pages/admin/AdminOrderListPage';
import { AdminOrderDetailPage } from './pages/admin/AdminOrderDetailPage';
import { AdminReviewListPage } from './pages/admin/AdminReviewListPage';
import { AdminCouponPage } from './pages/admin/AdminCouponPage';
import { AdminUserListPage } from './pages/admin/AdminUserListPage';

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <BrowserRouter>
                <Routes>
                  {/* Admin Routes with Dedicated Layout */}
                  <Route
                    path="/admin/*"
                    element={
                      <AdminProtectedRoute>
                        <AdminLayout />
                      </AdminProtectedRoute>
                    }
                  >
                    <Route index element={<AdminDashboardPage />} />
                    <Route path="dashboard" element={<AdminDashboardPage />} />
                    <Route path="products" element={<AdminProductListPage />} />
                    <Route path="products/new" element={<AdminProductFormPage />} />
                    <Route path="products/:id/edit" element={<AdminProductFormPage />} />
                    <Route path="categories" element={<AdminCategoryListPage />} />
                    <Route path="brands" element={<AdminBrandListPage />} />
                    <Route path="inventory" element={<AdminInventoryPage />} />
                    <Route path="orders" element={<AdminOrderListPage />} />
                    <Route path="orders/:orderNumber" element={<AdminOrderDetailPage />} />
                    <Route path="reviews" element={<AdminReviewListPage />} />
                    <Route path="coupons" element={<AdminCouponPage />} />
                    <Route path="users" element={<AdminUserListPage />} />
                  </Route>

                  {/* Customer Storefront Routes */}
                  <Route
                    path="/*"
                    element={
                      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-[#0F1011] text-gray-900 dark:text-gray-100 transition-colors duration-200">
                        <Navbar />
                        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                          <Routes>
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
                            <Route path="*" element={<HomePage />} />
                          </Routes>
                        </main>
                        <Footer />
                      </div>
                    }
                  />
                </Routes>
              </BrowserRouter>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}


export default App;
