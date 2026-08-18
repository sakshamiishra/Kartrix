import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { wishlistApi } from '../api/wishlistApi';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      setWishlistItems([]);
      return;
    }
    setLoading(true);
    try {
      const data = await wishlistApi.getWishlist();
      setWishlistItems(data.results || data || []);
    } catch (err) {
      console.error('Error fetching wishlist:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const wishlistProductIds = wishlistItems.map(item => item.product?.id || item.product);

  const isInWishlist = (productId) => {
    return wishlistProductIds.includes(productId);
  };

  const toggleWishlist = async (product) => {
    if (!isAuthenticated) {
      addToast('Please sign in to save items to your wishlist.', 'info');
      return false;
    }
    const productId = typeof product === 'object' ? product.id : product;
    const productName = typeof product === 'object' ? product.name : 'Product';

    try {
      const res = await wishlistApi.toggleWishlist(productId);
      if (res.in_wishlist) {
        addToast(`Saved "${productName}" to wishlist.`, 'success');
      } else {
        addToast(`Removed "${productName}" from wishlist.`, 'info');
      }
      await fetchWishlist();
      return res.in_wishlist;
    } catch (err) {
      addToast('Failed to update wishlist.', 'error');
      return false;
    }
  };

  const removeFromWishlist = async (itemId) => {
    try {
      await wishlistApi.removeWishlistItem(itemId);
      addToast('Removed item from wishlist.', 'info');
      await fetchWishlist();
      return true;
    } catch (err) {
      addToast('Failed to remove item.', 'error');
      return false;
    }
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems,
        wishlistProductIds,
        loading,
        isInWishlist,
        toggleWishlist,
        removeFromWishlist,
        fetchWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
