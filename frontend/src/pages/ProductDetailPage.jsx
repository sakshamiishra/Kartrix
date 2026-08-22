import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { Heart, ShoppingBag, ChevronRight, ShieldCheck, Truck, Headphones, ArrowLeft, Plus, Minus, MessageSquarePlus } from 'lucide-react';
import { productApi } from '../api/productApi';
import { reviewApi } from '../api/reviewApi';
import { ProductGallery } from '../components/products/ProductGallery';
import { VariantSelector } from '../components/products/VariantSelector';
import { ProductDetailSkeleton } from '../components/common/LoadingSkeleton';
import { StarRating } from '../components/products/StarRating';
import { ReviewSummary } from '../components/products/ReviewSummary';
import { ReviewList } from '../components/products/ReviewList';
import { ReviewFormModal } from '../components/products/ReviewFormModal';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { RecommendedProductsSection } from '../components/products/RecommendedProductsSection';

export const ProductDetailPage = () => {
  const { slug } = useParams();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { user, isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const [product, setProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Review states
  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState(null);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [userExistingReview, setUserExistingReview] = useState(null);

  const fetchProductAndReviews = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await productApi.getProductDetail(slug);
      setProduct(data);

      if (data && data.id) {
        await loadReviews(data.id);
      }
    } catch (err) {
      console.error('Error loading product detail:', err);
      setError('Product not found or failed to load.');
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async (productId) => {
    setReviewsLoading(true);
    try {
      const [reviewsData, summaryData] = await Promise.all([
        reviewApi.getReviews(productId),
        reviewApi.getReviewSummary(productId),
      ]);

      const reviewList = reviewsData.results || reviewsData || [];
      setReviews(reviewList);
      setReviewSummary(summaryData);

      // Check if current user has an existing review
      if (isAuthenticated && user) {
        const found = reviewList.find((r) => r.user === user.id || r.user_email === user.email);
        setUserExistingReview(found || null);

        // Check reviewable items if no review exists yet
        if (!found) {
          try {
            const reviewable = await reviewApi.getReviewableItems();
            const isEligible = reviewable.some((item) => item.product_id === productId);
            setCanReview(isEligible);
          } catch (rErr) {
            setCanReview(false);
          }
        } else {
          setCanReview(false);
        }
      }
    } catch (err) {
      console.error('Error loading reviews:', err);
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    fetchProductAndReviews();
  }, [slug, isAuthenticated]);

  if (loading) return <ProductDetailSkeleton />;

  if (error || !product) {
    return (
      <div className="text-center py-20 px-4 space-y-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Product Not Found</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Products</span>
        </Link>
      </div>
    );
  }

  const currentPrice = selectedVariant?.discount_price || selectedVariant?.price || product.starting_price || '0.00';
  const categoryName = typeof product.category === 'object' ? product.category?.name : 'Category';
  const brandName = typeof product.brand === 'object' ? product.brand?.name : null;
  const savedInWishlist = isInWishlist(product.id);

  const handleAddToCart = () => {
    addToCart(product, selectedVariant?.id || null, quantity);
  };

  const handleToggleWishlist = () => {
    toggleWishlist(product);
  };

  const handleOpenReviewModal = (reviewToEdit = null) => {
    if (!isAuthenticated) {
      addToast('Please sign in to write a review.', 'info');
      return;
    }
    setEditingReview(reviewToEdit);
    setReviewModalOpen(true);
  };

  const handleSubmitReview = async (formData) => {
    setSubmittingReview(true);
    try {
      const payload = new FormData();
      payload.append('rating', formData.rating);
      payload.append('title', formData.title || '');
      payload.append('comment', formData.comment || '');

      if (editingReview) {
        if (formData.images && formData.images.length > 0) {
          formData.images.forEach((img) => payload.append('uploaded_images', img));
        }
        await reviewApi.updateReview(editingReview.id, payload);
        addToast('Your review has been updated successfully!', 'success');
      } else {
        payload.append('product', product.id);
        if (formData.images && formData.images.length > 0) {
          formData.images.forEach((img) => payload.append('uploaded_images', img));
        }
        await reviewApi.createReview(payload);
        addToast('Thank you! Your review has been published.', 'success');
      }

      setReviewModalOpen(false);
      setEditingReview(null);
      await loadReviews(product.id);
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || 'Failed to submit review.';
      addToast(msg, 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      await reviewApi.deleteReview(reviewId);
      addToast('Review deleted successfully.', 'success');
      await loadReviews(product.id);
    } catch (err) {
      addToast('Failed to delete review.', 'error');
    }
  };

  return (
    <div className="space-y-12 pb-16">
      
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <Link to="/" className="hover:text-orange-600 dark:hover:text-orange-400">Home</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to="/products" className="hover:text-orange-600 dark:hover:text-orange-400">Products</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-900 dark:text-white font-semibold truncate max-w-xs">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        
        {/* Left: Product Gallery */}
        <ProductGallery images={product.images || []} productName={product.name} />

        {/* Right: Product Details & Controls */}
        <div className="space-y-6 bg-white dark:bg-[#17191B] rounded-3xl border border-gray-100 dark:border-[#2A2D32] p-6 lg:p-8 shadow-sm">
          
          <div className="space-y-2">
            {brandName && (
              <span className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                {brandName}
              </span>
            )}
            <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-snug">
              {product.name}
            </h1>

            {/* Rating Star Badge Header */}
            <div className="flex items-center gap-2 pt-1">
              <StarRating
                rating={product.average_rating || 0}
                showCount={true}
                count={product.review_count || 0}
              />
              <span className="text-xs text-gray-400">•</span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Category: <span className="font-semibold text-gray-700 dark:text-gray-300">{categoryName}</span>
              </p>
            </div>
          </div>

          {/* Pricing */}
          <div className="flex items-baseline gap-3 border-y border-gray-100 dark:border-[#2A2D32] py-4">
            <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
              ₹{parseFloat(currentPrice).toLocaleString('en-IN')}
            </span>
            {selectedVariant?.discount_price && selectedVariant?.price && (
              <span className="text-base text-gray-400 line-through">
                ₹{parseFloat(selectedVariant.price).toLocaleString('en-IN')}
              </span>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Product Overview
            </h4>
            <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {product.description || 'No detailed description provided for this catalog item.'}
            </p>
          </div>

          {/* Variants Selector */}
          <VariantSelector
            variants={product.variants || []}
            onVariantChange={(v) => setSelectedVariant(v)}
          />

          {/* Quantity Selector */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Quantity
            </label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#0F1011] p-1 rounded-xl border border-gray-200 dark:border-[#2A2D32]">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-[#17191B] rounded-lg transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center font-bold text-sm text-gray-900 dark:text-white">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-[#17191B] rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            <button
              onClick={handleAddToCart}
              className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
            >
              <ShoppingBag className="w-5 h-5" />
              <span>Add to Cart</span>
            </button>

            <button
              onClick={handleToggleWishlist}
              className={`w-full py-3 font-semibold text-xs rounded-xl border flex items-center justify-center gap-2 transition-colors ${
                savedInWishlist
                  ? 'bg-rose-500 text-white border-rose-500 hover:bg-rose-600'
                  : 'bg-gray-100 dark:bg-[#0F1011] hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-[#2A2D32]'
              }`}
            >
              <Heart className={`w-4 h-4 ${savedInWishlist ? 'fill-current text-white' : 'text-orange-600 dark:text-orange-500'}`} />
              <span>{savedInWishlist ? 'Saved in Wishlist' : 'Add to Wishlist'}</span>
            </button>
          </div>

          {/* Service Perks */}
          <div className="grid grid-cols-3 gap-2 pt-6 border-t border-gray-100 dark:border-[#2A2D32] text-[11px] text-gray-500 dark:text-gray-400">
            <div className="flex flex-col items-center text-center gap-1">
              <Truck className="w-4 h-4 text-orange-600" />
              <span>Fast Shipping</span>
            </div>
            <div className="flex flex-col items-center text-center gap-1">
              <ShieldCheck className="w-4 h-4 text-orange-600" />
              <span>Authentic Product</span>
            </div>
            <div className="flex flex-col items-center text-center gap-1">
              <Headphones className="w-4 h-4 text-orange-600" />
              <span>24/7 Support</span>
            </div>
          </div>

        </div>

      </div>

      {/* Customer Reviews & Rating Section */}
      <div className="space-y-8 pt-6 border-t border-gray-200 dark:border-[#2A2D32]">
        
        {/* Section Header & Write Review Action */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">Customer Reviews</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Verified buyer ratings and experiences</p>
          </div>

          {userExistingReview ? (
            <button
              onClick={() => handleOpenReviewModal(userExistingReview)}
              className="px-5 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-bold rounded-xl transition-all flex items-center gap-2 border border-gray-200 dark:border-gray-700"
            >
              <MessageSquarePlus className="w-4 h-4 text-orange-600" />
              <span>Edit Your Review</span>
            </button>
          ) : canReview ? (
            <button
              onClick={() => handleOpenReviewModal(null)}
              className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-orange-600/20 flex items-center gap-2"
            >
              <MessageSquarePlus className="w-4 h-4" />
              <span>Write a Review</span>
            </button>
          ) : null}
        </div>

        {/* Rating Distribution Breakdown Summary */}
        <ReviewSummary summary={reviewSummary} />

        {/* Reviews List */}
        <ReviewList
          reviews={reviews}
          currentUser={user}
          onEditReview={(rev) => handleOpenReviewModal(rev)}
          onDeleteReview={(id) => handleDeleteReview(id)}
          loading={reviewsLoading}
        />

      </div>

      {/* Category-Aware Recommendations Section */}
      <RecommendedProductsSection categoryId={product?.category?.id} limit={6} />

      {/* Review Write/Edit Form Modal */}
      <ReviewFormModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        onSubmit={handleSubmitReview}
        initialData={editingReview}
        productName={product.name}
        loading={submittingReview}
      />

    </div>
  );
};

export default ProductDetailPage;
