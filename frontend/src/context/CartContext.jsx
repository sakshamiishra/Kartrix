import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { cartApi } from '../api/cartApi';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCart(null);
      return;
    }
    setLoading(true);
    try {
      const data = await cartApi.getCart();
      setCart(data);
    } catch (err) {
      console.error('Error fetching cart:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = async (product, variantId = null, quantity = 1) => {
    if (!isAuthenticated) {
      showToast('Please sign in to add items to your cart.', 'info');
      window.location.href = '/login';
      return false;
    }
    try {
      const productId = typeof product === 'object' ? product?.id : product;
      const productName = typeof product === 'object' ? product?.name : 'Product';

      if (!productId) {
        showToast('Invalid product selected.', 'error');
        return false;
      }

      const payload = {
        product: productId,
        quantity,
      };
      if (variantId) {
        payload.product_variant = variantId;
      }
      await cartApi.addToCart(payload);
      showToast(`Added "${productName}" to your cart.`, 'success');
      await fetchCart();
      return true;
    } catch (err) {
      const msg = err.response?.data?.quantity || err.response?.data?.product || err.response?.data?.detail || 'Failed to add item to cart.';
      showToast(Array.isArray(msg) ? msg[0] : msg, 'error');
      return false;
    }
  };

  const updateQuantity = async (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      return removeFromCart(itemId);
    }
    try {
      await cartApi.updateCartItem(itemId, newQuantity);
      await fetchCart();
      return true;
    } catch (err) {
      const msg = err.response?.data?.quantity || 'Failed to update quantity.';
      showToast(Array.isArray(msg) ? msg[0] : msg, 'error');
      return false;
    }
  };

  const removeFromCart = async (itemId) => {
    try {
      await cartApi.removeCartItem(itemId);
      showToast('Item removed from cart.', 'info');
      await fetchCart();
      return true;
    } catch (err) {
      showToast('Failed to remove item.', 'error');
      return false;
    }
  };

  const clearCart = async () => {
    try {
      await cartApi.clearCart();
      showToast('Cart cleared.', 'info');
      await fetchCart();
      return true;
    } catch (err) {
      showToast('Failed to clear cart.', 'error');
      return false;
    }
  };

  const totalItems = cart?.total_items || 0;
  const cartSubtotal = cart?.cart_subtotal || '0.00';
  const cartItems = cart?.items || [];

  return (
    <CartContext.Provider
      value={{
        cart,
        cartItems,
        totalItems,
        cartSubtotal,
        loading,
        fetchCart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
