# Kartrix 2.0 — Architecture & Database Blueprint

**Status:** Architecture checkpoint / source of truth  
**Purpose:** Preserve the EasyKart 2.0 architecture so development can continue even if the chat is lost.

---

# 1. Project Vision

EasyKart 2.0 is a rebuild of the old college EasyKart project.

The goal is **not** to copy the old implementation. The goal is to keep the useful e-commerce ideas, replace weak architectural choices, and gradually turn the project into a serious GitHub portfolio project.

The old system used Flask + SQLite, a separate React/Vite/Tailwind admin frontend, JWT authentication, WhatsApp OTP, and a DeepFM recommendation engine.

The new system will be rebuilt from scratch using the stack below.

---

# 2. Locked Technology Stack

```text
                         EASYKART 2.0
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
       CUSTOMER FRONTEND                 ADMIN FRONTEND
        React + Vite                      React + Vite
        Tailwind CSS                      Tailwind CSS
              │                               │
              └───────────────┬───────────────┘
                              │
                         REST API
                              │
                              ▼
                   DJANGO + DRF BACKEND
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
          PostgreSQL      File Storage    External APIs
          18.2            Local media     Razorpay
```

## Locked decisions

| Area | Decision | Status |
|---|---|---|
| Backend | Django | LOCKED |
| API | Django REST Framework | LOCKED |
| Database | PostgreSQL 18.2 | LOCKED |
| Customer frontend | React + Vite | LOCKED |
| Admin frontend | React + Vite | LOCKED |
| Styling | Tailwind CSS | LOCKED |
| Authentication | Email + Password | LOCKED |
| Token system | JWT + Refresh Tokens | LOCKED |
| Payments | Razorpay + COD | LOCKED |
| Image storage | Django local media initially | LOCKED |
| API documentation | OpenAPI + Swagger UI | LOCKED |
| Background jobs | Deferred; Celery + Redis later if needed | LOCKED |
| Testing | Automated tests for important functionality | LOCKED |

---

# 3. High-Level Architecture

```text
                         EASYKART 2.0
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
       CUSTOMER FRONTEND                 ADMIN FRONTEND
        React + Vite                      React + Vite
        Tailwind CSS                      Tailwind CSS
              │                               │
              └───────────────┬───────────────┘
                              │
                         REST API
                              │
                              ▼
                   DJANGO + DRF BACKEND
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
          PostgreSQL      File Storage    External APIs
          18.2            Local media     ├── Razorpay
                                          └── Later services
```

The React applications are separate from Django. Django is the API/backend layer.

---

# 4. Django Backend App Structure

```text
backend/
│
├── config/
│
├── accounts/
├── products/
├── cart/
├── wishlist/
├── orders/
├── payments/
├── reviews/
├── recommendations/
├── analytics/
├── search/
└── notifications/
```

## Responsibilities

### accounts
- Custom Django User model
- Registration
- Email/password login
- JWT access token
- JWT refresh token
- Addresses
- Roles and permissions

### products
- Products
- Categories
- Brands
- Product images
- Product variants
- Attributes
- Inventory

### cart
- Cart
- Cart items
- Quantity changes
- Cart totals

### wishlist
- Wishlist items

### orders
- Orders
- Order items
- Checkout
- Order status
- Order history

### payments
- Razorpay
- COD
- Payment records
- Razorpay verification

### reviews
- Ratings
- Reviews
- Verified purchases
- Review images
- Moderation

### recommendations
- Basic recommendation engine first
- Advanced AI recommendations later

### analytics
- Admin metrics
- Sales analytics
- Customer analytics
- Forecasting later

### search
- Normal product search initially
- Semantic search later

### notifications
- Order notifications
- Payment notifications
- Promotions
- Cart reminders
- Background delivery later

---

# 5. Development Order

```text
1. Project setup
       ↓
2. Database + Django configuration
       ↓
3. Accounts + authentication
       ↓
4. Products + categories
       ↓
5. Customer frontend
       ↓
6. Cart + wishlist
       ↓
7. Orders + checkout
       ↓
7.5. Product discovery & navigation UX
       ↓
8. Razorpay + COD
       ↓
9. Reviews
       ↓
10. Admin panel
       ↓
11. Basic recommendation engine
       ↓
12. Advanced features
```

Important rule:

> Build the base e-commerce system first. Advanced AI/analytics decisions are made only when we reach those features.

---

# 6. Database Architecture

## Core relationship map

```text
                         User
                    /   / | \   \
                   /   /  |  \   \
                  ↓   ↓   ↓   ↓   ↓
             Address Cart Wishlist Orders Reviews
                       │            │
                       ↓            ↓
                    CartItem    OrderItem
                       │            │
                       └──────┬─────┘
                              ↓
                           Product
                              ↓
                          Category
```

---

# 7. Accounts

## User

Use a **custom Django User model**.

```text
User
├── id
├── email
├── password
├── first_name
├── last_name
├── phone
├── is_active
├── is_staff
├── is_superuser
├── date_joined
└── updated_at
```

### Roles

```text
Customer
   → is_staff = False

Admin
   → is_staff = True

Super Admin
   → is_superuser = True
```

Do not create separate `users` and `admins` tables.

---

# 8. Addresses

A user can have multiple addresses.

```text
Address
├── id
├── user_id
├── full_name
├── phone
├── address_line_1
├── address_line_2
├── city
├── state
├── postal_code
├── country
├── is_default
├── created_at
└── updated_at
```

Relationship:

```text
User 1 ───────── N Address
```

---

# 9. Catalog

## Category

```text
Category
├── id
├── name
├── slug
├── description
├── image
├── is_active
├── created_at
└── updated_at
```

## Brand

```text
Brand
├── id
├── name
├── slug
├── description
├── logo
├── is_active
├── created_at
└── updated_at
```

Relationship:

```text
Category ──────── Product ──────── Brand
```

---

# 10. Product

Initial core fields:

```text
Product
├── id
├── category_id
├── brand_id
├── name
├── slug
├── description
├── sku/base identifier as needed
├── is_active
├── created_at
└── updated_at
```

Pricing and stock should be handled with the product/variant/inventory design below rather than putting every possible value into one table.

---

# 11. Product Images

A product can have multiple images.

```text
ProductImage
├── id
├── product_id
├── image
├── alt_text
├── is_primary
├── display_order
└── created_at
```

Chart:

```text
Product
   │
   ├── Image 1 ⭐
   ├── Image 2
   ├── Image 3
   └── Image 4
```

Initial storage:

```text
Django
  ↓
media/products/
```

Cloud storage can be introduced later if deployment requires it.

---

# 12. Product Variants

Variants are needed for products such as clothing and shoes.

```text
Product
   ↓
ProductVariant
```

```text
ProductVariant
├── id
├── product_id
├── sku
├── price
├── discount_price
├── is_active
└── created_at
```

Examples:

```text
Nike T-Shirt
 ├── Size = S, Color = Black
 ├── Size = M, Color = Black
 ├── Size = L, Color = Black
 ├── Size = M, Color = White
 └── Size = L, Color = White
```

---

# 13. Product Attributes

For flexible categories:

```text
ProductAttribute
├── id
├── name
└── ...

AttributeValue
├── id
├── attribute_id
└── value
```

Examples:

```text
Attribute
 ├── Size
 └── Color

Size
 ├── S
 ├── M
 ├── L
 └── XL

Color
 ├── Black
 ├── White
 └── Blue
```

A variant can then be associated with the appropriate attribute values.

The system should remain flexible enough for:
- Clothing → size/color
- Shoes → size/color
- Electronics → storage/RAM/etc.
- Products without variants → no variant requirement

---

# 14. Inventory

```text
Inventory
├── id
├── product_variant_id
├── quantity
├── reserved_quantity
├── reorder_level
└── updated_at
```

Conceptually:

```text
available stock = quantity - reserved_quantity
```

Example:

```text
Total stock      = 100
Reserved         = 7
Available        = 93
```

---

# 15. Inventory Transactions

Keep an audit trail.

```text
InventoryTransaction
├── id
├── inventory_id
├── transaction_type
├── quantity
├── reference
├── created_at
└── created_by
```

Possible types:

```text
PURCHASE
SALE
RETURN
ADJUSTMENT
RESTOCK
RESERVATION
RELEASE
```

Chart:

```text
+50 RESTOCK
-10 SALE
-5 SALE
+2 RETURN
-1 ADJUSTMENT
      ↓
Current inventory
```

This will later support inventory analytics and AI demand forecasting.

---

# 16. Cart

```text
Cart
├── id
├── user_id
├── created_at
└── updated_at
```

```text
CartItem
├── id
├── cart_id
├── product_id / variant_id as appropriate
├── quantity
└── added_at
```

Relationship:

```text
User
 ↓
Cart
 ↓
CartItem
 ↓
Product / ProductVariant
```

This is also the foundation for Smart Cart Abandonment.

---

# 17. Wishlist

```text
WishlistItem
├── id
├── user_id
├── product_id
└── created_at
```

A user should not be able to add the same product to the wishlist repeatedly.

---

# 18. Orders

Do NOT recreate the old flat/denormalized order table.

Use:

```text
Order
├── id
├── user_id
├── address_id
├── order_number
├── subtotal
├── discount
├── shipping_cost
├── total_amount
├── status
├── payment_status
├── created_at
└── updated_at
```

And:

```text
OrderItem
├── id
├── order_id
├── product_id
├── product_name
├── unit_price
├── quantity
└── subtotal
```

Important:

`product_name` and `unit_price` are intentionally stored as historical snapshots.

Example:

```text
Today:
Nike Shoes = ₹4,999

Customer buys → ₹4,999

Later:
Nike Shoes = ₹5,999

---

# PHASE 7.5 — PRODUCT DISCOVERY & NAVIGATION UX

**Status:** PLANNED / APPROVED (NOT YET IMPLEMENTED)  
**Purpose:** Improve the customer-facing product discovery and navigation experience after Orders + Checkout (Phase 7) and before Razorpay + COD Payment Integration (Phase 8).

Phase 7.5 establishes the frontend product discovery structure while deliberately leaving payment processing (Phase 8), DeepFM recommendations (Phase 11/12), and Admin-controlled deal management (Phase 10) to their designated future phases.

---

## 7.5.1 Products

Establish and improve a dedicated Products catalog experience containing:
- Complete product catalog listing.
- Real-time product search.
- Category filtering.
- Brand filtering.
- Catalog sorting (Newest, Price: Low to High, Price: High to Low, Name).
- Page pagination controls.
- Responsive product card and grid presentation.
- Direct navigation to Product Detail pages.
- Correct navbar active-state behavior.

The Products page should also be structured so a future section can be added:
```text
Recommended for You
```

> [!IMPORTANT]
> Do **NOT** implement DeepFM or any recommendation engine in Phase 7.5.

The future recommendation/ML phase will later evolve this into:
```text
Products
    ↓
Recommended for You
    ↓
DeepFM Recommendation Engine
    ↓
Personalized Product Ranking
```

---

## 7.5.2 Categories

Create a dedicated category-discovery experience.

**Expected Flow:**
```text
/categories
    ↓
Browse Categories
    ↓
Select Category
    ↓
Category Product Listing
    ↓
Product Detail
```

**Requirements:**
- Dedicated `/categories` page displaying all available categories.
- Selectable category cards/links leading to filtered category product listings.
- Reuses existing product listing and filter infrastructure.
- Avoids duplicating product data.

---

## 7.5.3 Brands

Create a dedicated brand-discovery experience.

**Expected Flow:**
```text
/brands
    ↓
Browse Brands
    ↓
Select Brand
    ↓
Brand Product Listing
    ↓
Product Detail
```

**Requirements:**
- Dedicated `/brands` page displaying all available brands.
- Selectable brand cards/logos leading to filtered brand product listings.
- Reuses existing product infrastructure.
- Avoids duplicating product data.

---

## 7.5.4 Deals

Create a dedicated customer-facing Deals experience.

**Expected Flow:**
```text
/deals
    ↓
Active Deals / Offers
    ↓
Product Detail / Cart / Wishlist
```

**Expected Display:**
- Original price (INR / ₹).
- Offer price and/or discount percentage.
- Discount information and deal presentation cards.
- Clean empty state when no active deals exist.

> [!IMPORTANT]
> **Architectural Decision:** Deals are intended to become **ADMIN-CONTROLLED** in the future Admin Panel (Phase 10).

The future Admin Panel will allow administrators to manage:
- Product or product variant included in a deal.
- Discount/offer value.
- Deal start date and time.
- Deal end date and time.
- Active/inactive deal status.
- Optional deal title and deal badge.

Phase 7.5 must **NOT** implement the Admin Panel or full deal management. Do not hardcode a permanent deal list. The customer-facing Deals architecture is structured to cleanly consume future Admin-controlled active deals once Phase 10 is built.

---

## 7.5.5 Navigation

Main customer navigation will feature clearly separated destinations:
```text
Home  │  Products  │  Categories  │  Brands  │  Deals
```

**Expected Nav Destinations:**
- **Products:** Complete product catalog (`/products`)
- **Categories:** Category discovery (`/categories`)
- **Brands:** Brand discovery (`/brands`)
- **Deals:** Active deals/offers (`/deals`)

**Navbar Active-State Behavior:**
- `/products` $\rightarrow$ Products active ONLY
- `/categories` $\rightarrow$ Categories active ONLY
- `/brands` $\rightarrow$ Brands active ONLY
- `/deals` $\rightarrow$ Deals active ONLY

Product Detail pages (`/products/:slug`) maintain sensible Products-section context.

---

## 7.5.6 Design & UX Consistency

Phase 7.5 utilizes the existing EasyKart design and component system, reusing:
- Product cards (`ProductCard.jsx`)
- Product detail components (`ProductGallery.jsx`, `VariantSelector.jsx`)
- Search bar and filtering sidebar
- Pagination controls
- Responsive Navbar and Footer
- Global Toast notification system
- Cart and Wishlist contexts and badges
- Authentication and `<ProtectedRoute>` guards

---

## 7.5.7 Explicit Phase Boundaries

Phase 7.5 **MUST NOT** implement:
- Razorpay payment gateway integration (Phase 8).
- COD payment collection workflows (Phase 8).
- Payment processing, verification, signature validation, or webhooks (Phase 8).
- Payment status transitions (Phase 8).
- DeepFM ML recommendation models (Phase 11/12).
- Personalized ML recommendations (Phase 11/12).
- Admin Panel or Admin-controlled deal management (Phase 10).
- Product Reviews system (Phase 9).

These remain strictly assigned to their respective future phases.

---

## 7.5.8 Future Integration

**Products Integration Flow:**
```text
Phase 7.5 Products
    ↓
Future Recommendation/ML Phase
    ↓
DeepFM
    ↓
Recommended for You
```

**Deals Integration Flow:**
```text
Phase 7.5 Deals
    ↓
Future Admin Panel (Phase 10)
    ↓
Admin-controlled Offers
    ↓
Active Deals
    ↓
Customer-facing Deals Page (/deals)
```

---

## 7.5.9 Acceptance Criteria

Phase 7.5 will be considered complete when:
1. Products has a dedicated functional catalog experience.
2. Product search works cleanly.
3. Category filtering works.
4. Brand filtering works.
5. Catalog sorting works.
6. Page pagination works.
7. Product detail navigation works.
8. Categories has a dedicated browsing destination (`/categories`).
9. Category selection leads to the correct filtered products.
10. Brands has a dedicated browsing destination (`/brands`).
11. Brand selection leads to the correct filtered products.
12. Deals has a dedicated customer-facing destination (`/deals`).
13. Active deals can be displayed.
14. Deals empty state is handled correctly.
15. Navbar active states correctly identify the current active section.
16. Cart functionality remains unaffected.
17. Wishlist functionality remains unaffected.
18. Authentication functionality remains unaffected.
19. Phase 7 Orders/Checkout functionality remains unaffected.
20. Phase 8 payment functionality remains untouched.
21. DeepFM recommendation engine remains untouched until its designated future phase.
22. Admin-controlled deal management remains untouched until the Admin Panel phase (Phase 10).

---

## 7.5.10 Roadmap Position

```text
Phase 7
    Orders + Checkout
        ↓
Phase 7.5
    Product Discovery & Navigation UX (PLANNED)
        ↓
Phase 8
    Razorpay + COD Payment Integration
```

---

# 19. Payments

```text
Payment
├── id
├── order_id
├── payment_method
├── payment_gateway
├── transaction_id
├── amount
├── currency
├── status
├── gateway_order_id
├── gateway_payment_id
├── gateway_signature
├── paid_at
├── created_at
└── updated_at
```

Payment methods:

```text
RAZORPAY
COD
```

Payment statuses:

```text
PENDING
AUTHORIZED
PAID
FAILED
REFUNDED
```

---

# 20. Order Status vs Payment Status

These are deliberately separate.

```text
Order:
PLACED
CONFIRMED
PROCESSING
SHIPPED
OUT_FOR_DELIVERY
DELIVERED
CANCELLED
RETURNED
```

```text
Payment:
PENDING
PAID
FAILED
REFUNDED
```

Example:

```text
Payment → PAID
Order   → PROCESSING
```

This is valid.

---

# 21. Razorpay Flow

```text
Customer
   ↓
Checkout
   ↓
Django creates Order
   ↓
Django creates Razorpay Order
   ↓
React opens Razorpay Checkout
   ↓
Customer pays
   ↓
Razorpay returns payment details
   ↓
React sends details to Django
   ↓
Django verifies Razorpay signature
   ↓
Payment marked PAID
   ↓
Order confirmed
```

The frontend must never be the final authority for payment success.

---

# 22. COD Flow

```text
Checkout
   ↓
Select COD
   ↓
Django validates order
   ↓
Create Order
   ↓
Payment = PENDING
   ↓
Order = PLACED
   ↓
Delivery
   ↓
Payment collected
   ↓
Payment = PAID
```

---

# 23. Order Status History

```text
OrderStatusHistory
├── id
├── order_id
├── status
├── note
├── changed_by
└── created_at
```

Example:

```text
Order #EK10021

✓ Order placed
  Aug 18, 10:32 AM

✓ Confirmed
  Aug 18, 10:35 AM

✓ Shipped
  Aug 19, 08:10 AM

● Out for delivery

○ Delivered
```

---

# 24. Reviews

```text
Review
├── id
├── user_id
├── product_id
├── order_item_id
├── rating
├── title
├── comment
├── is_verified_purchase
├── is_approved
├── created_at
└── updated_at
```

Rules:

```text
User
 ↓
Must have purchased product
 ↓
Can review purchased item
```

A review should be tied to an `OrderItem` so verified purchase can be enforced server-side.

---

# 25. Review Images

```text
Review
   │
   ├── ReviewImage
   ├── ReviewImage
   └── ReviewImage
```

```text
ReviewImage
├── id
├── review_id
├── image
└── created_at
```

This also creates useful input for future AI review analysis.

---

# 26. Review AI — Later

The future flow can be:

```text
Review
  ↓
NLP Model
  ↓
Sentiment + confidence
  ↓
Positive / Neutral / Negative
  ↓
Aspect analysis
```

Example:

```text
"The laptop is fast but the battery life is terrible."

Overall → Mixed
Performance → Positive
Battery → Negative
```

The exact AI architecture is intentionally deferred.

---

# 27. User Activity / Event Tracking

This is one of the most important foundations for the advanced features.

Use a general event model:

```text
UserActivity
├── id
├── user_id (nullable)
├── event_type
├── product_id (nullable)
├── search_query (nullable)
├── metadata
├── session_id
└── created_at
```

Initial event types:

```text
PRODUCT_VIEW
PRODUCT_SEARCH
ADD_TO_CART
REMOVE_FROM_CART
ADD_TO_WISHLIST
REMOVE_FROM_WISHLIST
CHECKOUT_STARTED
PURCHASE
PRODUCT_REVIEWED
```

Later possible events:

```text
PRODUCT_SHARED
PRODUCT_COMPARED
RECOMMENDATION_CLICKED
AI_ASSISTANT_QUERY
```

---

# 28. User Activity Architecture

```text
                    User / Visitor
                          │
                          ▼
                       Session
                          │
                          ▼
                    UserActivity
                          │
       ┌──────────────────┼───────────────────┐
       ↓                  ↓                   ↓
    Search             Product             Cart
                      Behavior           Behavior
       │                  │                   │
       └──────────────────┼───────────────────┘
                          ↓
                   Behavioral Data
                          │
          ┌───────────────┼────────────────┐
          ↓               ↓                ↓
   Recommendations   Personalization   Analytics
          │               │                │
          └───────────────┼────────────────┘
                          ↓
                   Advanced AI later
```

Anonymous visitors can have a `session_id` even before login.

After login/registration, relevant anonymous activity can later be associated with the user.

---

# 29. Search History

We do not need a separate search-history table initially.

A search is represented as:

```text
UserActivity
event_type = PRODUCT_SEARCH
search_query = "running shoes"
```

If a specialized search table becomes useful for performance later, it can be added then.

---

# 30. Basic Recommendation Engine

The base website will have recommendations from day one.

This is NOT the advanced AI recommendation system.

### New user

```text
User
 ↓
No behavior data
 ↓
Trending + popular + highly rated products
```

### Existing user

```text
User
 ↓
Views
Wishlist
Purchases
Categories
Ratings
 ↓
Basic scoring
 ↓
Personalized recommendations
```

Conceptual scoring:

```text
recommendation_score =
    category_match
  + recently_viewed
  + wishlist_signal
  + purchase_signal
  + popularity
  + rating
```

The advanced model is deliberately deferred.

---

# 31. Progressive Recommendation Architecture — LOCKED

```text
                    EasyKart
                       │
                       ▼
              Basic Recommendation
                       │
              Does user have enough
                 behavioral data?
                  /          \
                NO            YES
                │              │
                ▼              ▼
          Popular/Trending   Personalized
                             recommendations
                                    │
                                    ▼
                         Complex user request?
                              /          \
                            NO            YES
                            │              │
                            ▼              ▼
                       Basic result    AI pipeline
```

The advanced pipeline will be decided later.

Possible future components may include:
- semantic understanding
- user preference modeling
- product catalog understanding
- advanced ranking
- ML recommendation models
- LLM/RAG where appropriate

No specific advanced model is locked yet.

---

# 32. Coupons

```text
Coupon
├── id
├── code
├── description
├── discount_type
├── discount_value
├── minimum_order_amount
├── maximum_discount
├── usage_limit
├── used_count
├── valid_from
├── valid_until
├── is_active
├── created_at
└── updated_at
```

Discount types initially:

```text
PERCENTAGE
FIXED_AMOUNT
```

---

# 33. Coupon Usage

```text
CouponUsage
├── id
├── coupon_id
├── user_id
├── order_id
├── discount_amount
└── used_at
```

This allows rules such as:

```text
WELCOME10
→ one use per customer
```

---

# 34. Notifications

```text
Notification
├── id
├── user_id
├── notification_type
├── title
├── message
├── is_read
├── data
└── created_at
```

Initial types:

```text
ORDER_UPDATE
PAYMENT_UPDATE
PRICE_DROP
CART_REMINDER
PROMOTION
SYSTEM
```

Later:

```text
CART_ABANDONED
```

Background delivery is deferred until actually needed.

---

# 35. Analytics Foundation

Existing data will support:

```text
Orders
OrderItems
UserActivity
Inventory
Products
Reviews
```

From this we can calculate:

```text
Total Revenue
Total Orders
Total Customers
Average Order Value
Top Products
Top Categories
Conversion Rate
Cart Abandonment Rate
Customer activity
```

Later this becomes the data foundation for AI Sales Forecasting.

---

# 36. Full Database Relationship Chart

```text
                                   ┌──────────────┐
                                   │     User     │
                                   └──────┬───────┘
                                          │
             ┌────────────────────────────┼────────────────────────────┐
             │              │             │             │              │
             ▼              ▼             ▼             ▼              ▼
         Address          Cart        Wishlist       Order        UserActivity
                            │             │             │
                            ▼             ▼             ▼
                        CartItem     WishlistItem   OrderItem
                                                        │
                                                        │
                                                        ▼
                                                   ┌─────────┐
                                                   │ Product │
                                                   └────┬────┘
                                                        │
                         ┌──────────────────────────────┼───────────────────────┐
                         │              │               │                       │
                         ▼              ▼               ▼                       ▼
                      Category        Brand        ProductImage          ProductVariant
                                                                                │
                                                                                ▼
                                                                            Inventory
                                                                                │
                                                                                ▼
                                                                    InventoryTransaction

Order
 │
 ├── OrderItem
 ├── Payment
 └── OrderStatusHistory

Product
 │
 └── Review
       │
       └── ReviewImage

Coupon
 │
 └── CouponUsage ── User / Order

User
 │
 └── Notification
```

---

# 37. Recommended Foreign-Key Relationships

```text
User
 ├── Address.user_id
 ├── Cart.user_id
 ├── WishlistItem.user_id
 ├── Order.user_id
 ├── Review.user_id
 ├── CouponUsage.user_id
 ├── Notification.user_id
 └── UserActivity.user_id

Category
 └── Product.category_id

Brand
 └── Product.brand_id

Product
 ├── ProductImage.product_id
 ├── ProductVariant.product_id
 ├── CartItem.product/variant reference
 ├── WishlistItem.product_id
 ├── OrderItem.product_id
 ├── Review.product_id
 └── UserActivity.product_id

ProductVariant
 └── Inventory.product_variant_id

Inventory
 └── InventoryTransaction.inventory_id

Cart
 └── CartItem.cart_id

Order
 ├── OrderItem.order_id
 ├── Payment.order_id
 ├── OrderStatusHistory.order_id
 └── CouponUsage.order_id

OrderItem
 └── Review.order_item_id

Review
 └── ReviewImage.review_id

Coupon
 └── CouponUsage.coupon_id
```

---

# 38. Important Constraints

These should be enforced at the database/model level, not only in React.

## Users
- Email should be unique.
- Phone uniqueness should be decided according to the final authentication rules.
- Password is never stored in plain text.

## Categories
- Slug should be unique.

## Brands
- Slug should be unique.

## Products
- Slug should be unique.
- SKU should be unique where SKU is used.

## Product Images
- `display_order` should be deterministic.
- A product should have a controlled primary-image rule.

## Variants
- SKU should be unique.
- Duplicate attribute combinations should not be allowed for the same product.

## Cart
- One active cart per user.
- Same product/variant should not appear twice; quantity should be updated instead.

## Wishlist
- `(user, product)` should be unique.

## Orders
- `order_number` should be unique.

## Order Items
- Quantity must be positive.
- Prices must be non-negative.

## Payments
- Payment amount must be non-negative.
- Gateway transaction identifiers should be unique when present.

## Reviews
- Rating must be between 1 and 5.
- A user should not review the same purchased item more than once.
- Verified-purchase status is determined by backend data.

## Coupons
- Coupon code should be unique.
- Validity dates must be logically ordered.
- Usage limits must not be negative.

---

# 39. Deletion Strategy

Do not blindly delete related business data.

General policy:

```text
User
 ↓
Prefer deactivation/anonymization where business history matters

Product
 ↓
Prefer is_active=False / archival rather than hard deletion

Order
 ↓
Never casually delete historical orders

Payment
 ↓
Never casually delete successful payment records

Review
 ↓
Moderation/soft removal preferred

Inventory transactions
 ↓
Keep audit history
```

Exact Django `on_delete` behavior will be selected model-by-model when we create the models.

---

# 40. Indexing Strategy

Indexes should be added where query patterns justify them.

Initial candidates:

```text
User.email
Product.slug
Product.category_id
Product.brand_id
ProductVariant.sku
Order.order_number
Order.user_id
Order.created_at
Order.status
Payment.transaction_id
Review.product_id
Review.user_id
UserActivity.user_id
UserActivity.event_type
UserActivity.created_at
UserActivity.session_id
Coupon.code
Notification.user_id
Notification.is_read
```

Composite indexes can later be added based on actual query patterns.

Do not add hundreds of indexes blindly.

---

# 41. Core Architecture vs Deferred Architecture

## Build now

```text
Accounts
Products
Categories
Brands
Images
Variants
Inventory
Cart
Wishlist
Orders
Payments
Reviews
Coupons
Notifications
User Activity
Basic Recommendations
Admin
API documentation
Testing
```

## Add later when needed

```text
Celery
Redis
Cloud image storage
Advanced recommendation model
Semantic search
AI Shopping Assistant
Sales Forecasting
Fraud Detection
Advanced sentiment analysis
Advanced notification delivery
Deployment infrastructure
```

---

# 42. EasyKart 2.0 Advanced Features — LOCKED

These are the eight standout features selected for the project.

## 1. AI Personalized Product Recommendations 🤖

Purpose:
- Go beyond the basic recommendation engine.
- Use richer user behavior and product information.
- Provide more deeply personalized results.

Base recommendation already exists first.

Advanced AI comes later.

---

## 2. AI Review Sentiment Analysis 🧠

Purpose:
- Analyze review sentiment.
- Detect positive/neutral/negative sentiment.
- Later identify product aspects such as battery, quality, comfort, delivery, etc.
- Provide aggregate customer sentiment insights.

Example:

```text
"The laptop is fast but the battery life is terrible."

Overall → Mixed
Performance → Positive
Battery → Negative
```

Exact NLP model is deferred.

---

## 3. AI Semantic Product Search 🔍

Purpose:
Understand user intent rather than relying only on exact keywords.

Example:

```text
User:
"comfortable shoes for running under ₹3000"

        ↓

Semantic understanding

        ↓

Relevant products
```

Exact search/embedding/LLM architecture is deferred.

---

## 4. AI Sales Forecasting 📈

Purpose:
- Forecast future sales/revenue.
- Identify demand trends.
- Help admins plan inventory.
- Use historical order/activity data.

Concept:

```text
Historical Orders
       ↓
Sales Data
       ↓
Forecasting Model
       ↓
Future Demand / Revenue
```

Exact model is deferred.

---

## 5. Smart Cart Abandonment System 🛒

Purpose:
Detect carts that contain products but never become purchases.

Concept:

```text
ADD_TO_CART
     ↓
No purchase
     ↓
Abandoned cart detected
     ↓
Reminder / notification
     ↓
Optional personalized offer
```

Exact notification/background-job architecture is deferred.

---

## 6. Personalized Homepage 🎯

Purpose:
Make the homepage adapt to the individual customer.

New user:

```text
Trending
Popular
Highly rated
```

Returning user:

```text
Based on your activity
Recently viewed
You may like
Continue shopping
Personalized recommendations
```

It will use the behavioral data foundation.

---

## 7. AI Shopping Assistant 💬

Purpose:
Allow customers to describe what they need naturally.

Example:

```text
"I need a laptop bag for college
under ₹1500 with good reviews."
```

The assistant should eventually understand the request and work with the actual EasyKart catalog.

Potential architecture may involve:

```text
User Query
   ↓
Intent / Semantic Understanding
   ↓
EasyKart Product Data
   ↓
Filtering + Ranking
   ↓
AI Response
```

Exact LLM/RAG architecture is deferred.

---

## 8. Fraud / Suspicious Order Detection 🛡️

Purpose:
Identify unusual or potentially risky ordering/payment behavior.

Possible signals later:

```text
Unusual order frequency
+
Repeated payment failures
+
Abnormal activity pattern
+
Rapid account behavior
+
Other transaction signals
        ↓
Risk score / admin flag
```

This is not a replacement for a payment provider's fraud controls; it is an EasyKart-level risk/anomaly detection feature.

Exact model/rules are deferred.

---

# 43. Eight Advanced Features — Relationship to the Data Foundation

```text
                         UserActivity
                              │
              ┌───────────────┼────────────────┐
              │               │                │
              ▼               ▼                ▼
       Recommendations   Personalization   Cart Abandonment
              │               │                │
              └───────────────┼────────────────┘
                              │
                              ▼
                         Behavioral Data
                              │
          ┌───────────────────┼────────────────────┐
          │                   │                    │
          ▼                   ▼                    ▼
     Semantic Search     Shopping Assistant   Fraud Detection

Orders + OrderItems + Inventory
              │
              ▼
       Sales Forecasting

Reviews + ReviewImages
              │
              ▼
      Sentiment Analysis
```

---

# 44. Final EasyKart 2.0 Vision

```text
                         EASYKART 2.0
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
       SHOPPING           PERSONALIZATION       AI
          │                   │                   │
          │                   │                   ├── Recommendations
          │                   │                   ├── Semantic Search
          │                   │                   ├── Shopping Assistant
          │                   │                   └── Review Sentiment
          │                   │
          ├── Products        └── Personalized Home
          ├── Cart
          ├── Wishlist
          ├── Checkout
          ├── Razorpay
          ├── COD
          ├── Orders
          └── Reviews

                              │
                              ▼
                         INTELLIGENCE
                              │
                    ┌─────────┼─────────┐
                    ▼         ▼         ▼
                Forecast   Fraud    Analytics

                              │
                              ▼
                       BEHAVIOR DATA
                              │
                       UserActivity
                              │
                              ▼
                    Continuous Learning
                    / Personalization
```

---

# 45. Current Architecture Status

## LOCKED

- Django
- Django REST Framework
- PostgreSQL 18.2
- React + Vite
- Tailwind CSS
- Email/password authentication
- JWT + refresh tokens
- Razorpay + COD
- Local Django media storage initially
- OpenAPI + Swagger UI
- Automated testing
- Basic recommendation engine
- Progressive recommendation architecture
- Eight advanced features listed above

## DEFERRED

- Exact advanced AI models
- DeepFM vs other recommendation model
- LLM/RAG architecture
- Semantic search implementation
- Sentiment model
- Sales forecasting model
- Fraud model
- Celery + Redis
- Cloud image storage
- Deployment infrastructure
- Advanced notification delivery

---

# 46. Next Development Step

The architecture is now sufficiently defined to begin implementation.

**Next step: create the empty EasyKart 2.0 project structure and configure Django + PostgreSQL.**

Do NOT implement the advanced AI features yet.

Build the base platform first, then add the eight advanced features one at a time.
