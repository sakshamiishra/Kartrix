# Kartrix 2.0 — Development Log

## Project Information

- Product: Kartrix 2.0
- Repository: Kartrix
- Django configuration package: easykart
- Architecture source: Kartrix_Architecture_Blueprint.md

## Project Currency Standard

1. **Sole Base Currency:** EasyKart's sole and base currency is **Indian Rupee (INR / ₹)**.
2. **Database Storage:** Product and ProductVariant prices are stored as plain numeric INR amounts (e.g., `47999.00`, `12495.00`) directly in the PostgreSQL database. Currency symbols are never stored in text fields.
3. **Presentation Layer Formatting:** Customer-facing prices are rendered with the `₹` symbol and Indian number formatting (`en-IN`, e.g., `₹47,999`, `₹1,24,900`).
4. **Admin Panel Standard:** Future Admin Panel product and variant management forms (Phase 10) must accept, validate, and label all price fields in INR (₹).
5. **Phase Integration Standard:** Cart (Phase 6), Wishlist (Phase 6), Orders (Phase 7), Checkout (Phase 7), and Payments (Phase 8) will process INR amounts directly.
6. **No Runtime Conversion:** No runtime USD→INR currency conversion or exchange-rate API calls are required or used.
7. **No Multi-Currency Scope:** Multi-currency support is out of scope unless explicitly introduced in a future phase.

## Current Status

- Current Phase: Phase 7.5 — Product Discovery & Navigation UX
- Phase Status: PLANNED / APPROVED (NOT YET IMPLEMENTED)
- Last Completed Task: Phase 7 — Orders + Checkout Implementation & Verification
- Next Planned Task: Phase 7.5 — Product Discovery & Navigation UX

## Phase Progress

| Phase | Description | Status |
|------|-------------|--------|
| 1 | Project Setup & Backend Configuration | COMPLETE |
| 2 | Database + Django Configuration | COMPLETE |
| 3 | Accounts + Authentication | COMPLETE |
| 4 | Products + Categories | COMPLETE |
| 5 | Customer Frontend | COMPLETE |
| 6 | Cart + Wishlist | COMPLETE |
| 7 | Orders + Checkout | COMPLETE |
| 7.5 | Product Discovery & Navigation UX | PLANNED |
| 8 | Razorpay + COD Payment Integration | NOT STARTED |
| 9 | Reviews System | NOT STARTED |
| 10 | Admin Panel | NOT STARTED |
| 11 | Basic Recommendation Engine | NOT STARTED |
| 12 | Advanced Features / AI/ML | NOT STARTED |

## Completed Work & Milestone Log

### 2026-08-18 — Phase 1: Project Setup & Backend Configuration

**Phase:**
Phase 1 — Project Setup & Backend Configuration

**Objective:**
Establish the core Django 6.1 backend framework, configure environment variables using `python-decouple`, set up PostgreSQL database connection settings, implement CORS handling, integrate DRF with OpenAPI/Swagger UI documentation via `drf-spectacular`, and add dependencies for JWT authentication (`djangorestframework-simplejwt`) and image handling (`Pillow`).

**Changes Made:**
- `backend/requirements.txt`:
  - Added dependencies for `Django==6.1`, `djangorestframework==3.18.0`, `django-cors-headers==4.9.0`, `drf-spectacular==0.30.0`, `djangorestframework-simplejwt==5.5.1`, `Pillow==12.3.0`, `psycopg==3.3.4`, `psycopg-binary==3.3.4`, `python-decouple==3.8`, `sqlparse==0.6.0`, `tzdata==2026.3`.
  - Why: Lock technology stack dependencies as defined in the architecture blueprint.
- `.env.example`:
  - Created reference template containing configurations for `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, PostgreSQL parameters (`DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`), and `CORS_ALLOWED_ORIGINS`.
  - Why: Standardize environment setup across development and production.
- `.env`:
  - Configured local environment variables for Django settings, PostgreSQL database connection, and local React frontend CORS origins.
  - Why: Keep credentials out of source code control.
- `backend/easykart/settings.py`:
  - Preserved existing Django configuration package name `easykart`.
  - Added `corsheaders`, `rest_framework`, and `drf_spectacular` to `INSTALLED_APPS`.
  - Added `corsheaders.middleware.CorsMiddleware` to `MIDDLEWARE`.
  - Decoupled `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, and `CORS_ALLOWED_ORIGINS` via `python-decouple`.
  - Configured `REST_FRAMEWORK` default schema class to `drf_spectacular.openapi.AutoSchema` and default authentication to `JWTAuthentication` & `SessionAuthentication`.
  - Added `SPECTACULAR_SETTINGS` metadata (`Kartrix 2.0 API`, version `2.0.0`).
  - Added static and media asset path settings (`STATIC_ROOT`, `STATIC_URL`, `MEDIA_ROOT`, `MEDIA_URL`).
  - Why: Establish robust base settings for DRF REST API, cross-origin communication, Swagger documentation, and file storage.
- `backend/easykart/urls.py`:
  - Added OpenAPI 3 schema endpoint (`/api/schema/`), Swagger UI (`/api/docs/`), and ReDoc (`/api/redoc/`).
  - Added development media file serving via `static()`.
  - Why: Expose API documentation endpoints and enable media file serving during local development.

**Dependencies Added:**
- `Django==6.1`: Core backend web framework.
- `djangorestframework==3.18.0`: REST API toolkit.
- `django-cors-headers==4.9.0`: Enables CORS support for decoupled React SPAs.
- `drf-spectacular==0.30.0`: OpenAPI 3 schema and Swagger UI documentation generator.
- `djangorestframework-simplejwt==5.5.1`: JWT access and refresh token handler.
- `Pillow==12.3.0`: Image processing library required for Django `ImageField`.
- Supporting dependencies: `psycopg==3.3.4`, `python-decouple==3.8`, `sqlparse==0.6.0`, `tzdata==2026.3`.

**Database Changes:**
- Configured PostgreSQL connection in `.env` and `settings.py`.

**API Changes:**
- `/api/schema/` (GET) — Serves OpenAPI 3 schema specification.
- `/api/docs/` (GET) — Serves interactive Swagger UI documentation.
- `/api/redoc/` (GET) — Serves ReDoc documentation.

**Frontend Changes:**
- None (Frontend decoupled SPAs planned for Phase 5).

**Verification:**
- `python backend/manage.py check` — Result: `System check identified no issues (0 silenced).`

---

### 2026-08-18 — Phase 2: Database + Django Domain Configuration

**Phase:**
Phase 2 — Database + Django Configuration

**Objective:**
Establish all 11 modular Django applications (`accounts`, `products`, `cart`, `wishlist`, `orders`, `payments`, `reviews`, `recommendations`, `analytics`, `search`, `notifications`), implement custom `User` model, construct complete domain models, relationships, field constraints, indexes, choices, and Django admin registrations as specified in `Kartrix_Architecture_Blueprint.md`.

**Changes Made:**
- `backend/easykart/settings.py`:
  - Set `AUTH_USER_MODEL = 'accounts.User'` to register the custom user model.
  - Added all 11 local domain apps (`accounts`, `products`, `cart`, `wishlist`, `orders`, `payments`, `reviews`, `recommendations`, `analytics`, `search`, `notifications`) to `INSTALLED_APPS`.
  - Why: Connect custom user authentication and domain apps to Django settings.
- Created 11 Django Domain Apps & Models:
  - `backend/accounts/`: `User` (custom `AbstractBaseUser` using email as `USERNAME_FIELD`), `Address` (shipping addresses with default selection).
  - `backend/products/`: `Category`, `Brand`, `Product`, `ProductImage`, `ProductAttribute`, `AttributeValue`, `ProductVariant`, `Inventory`, `InventoryTransaction`.
  - `backend/cart/`: `Cart`, `CartItem`.
  - `backend/wishlist/`: `WishlistItem` (with `unique_together=('user', 'product')`).
  - `backend/orders/`: `Order`, `OrderItem` (storing historical snapshot of `product_name` and `unit_price`), `OrderStatusHistory`, `Coupon`, `CouponUsage`.
  - `backend/payments/`: `Payment` (linked to `Order` with `RAZORPAY` and `COD` choices).
  - `backend/reviews/`: `Review` (rating 1-5 validator, verified purchase flag), `ReviewImage`.
  - `backend/notifications/`: `Notification` (with JSON `data` payload).
  - `backend/analytics/`: `UserActivity` (behavioral event tracking supporting both user and anonymous `session_id`).
  - `backend/recommendations/` & `backend/search/`: Baseline app structures.
  - Added Django admin registrations (`admin.py`) for all models across apps.

**Migration Diagnosis & Resolution:**
- **Problem:** Initial `migrate` in Phase 1 ran before setting `AUTH_USER_MODEL = 'accounts.User'`, recording `admin.0001_initial` under standard `auth.User`. In Phase 2, setting `AUTH_USER_MODEL` caused Django's dependency loader to require `accounts.0001_initial` before `admin.0001_initial`, resulting in an `InconsistentMigrationHistory` error when migrating.
- **Resolution:** Because the development database contained only default framework tables and zero application data, the PostgreSQL `public` schema was cleanly reset (`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`).
- **Migration Execution:** `python backend/manage.py migrate` was executed cleanly from scratch. All 27 migrations applied with `OK`, applying `accounts.0001_initial` prior to `admin.0001_initial`.

**Database Changes:**
- Generated initial migrations for all 9 model apps (`accounts`, `products`, `cart`, `wishlist`, `orders`, `payments`, `reviews`, `notifications`, `analytics`).
- Verified 34 physical tables created in PostgreSQL `easykart_db` public schema (25 Phase 2 domain tables + 9 Django framework tables).

**Verification & Read-Only Audit:**
- `python backend/manage.py check` — Result: `System check identified no issues (0 silenced).`
- `python backend/manage.py showmigrations` — Result: `All 27 migrations marked as applied [X].`
- `python backend/manage.py makemigrations --check --dry-run` — Result: `No changes detected.`
- **Phase 2 Read-Only Audit Result:** **PASS** (0 critical issues, 0 warnings).

---

### 2026-08-18 — Git Checkpoint: Phase 2 Local Commit & Remote Push

**Details:**
- **Branch:** `main`
- **Commit Hash:** `e71fad1c6daf0a1b4713ca07e02d0a441f13c3f4`
- **Commit Message:** `Complete Phase 2 database and Django domain configuration`
- **Remote Synchronization:** Pushed to private GitHub repository (`origin/main`).
- **Working Tree State:** Clean (`nothing to commit, working tree clean`).

---

### 2026-08-18 — Phase 3: Accounts + Authentication

**Phase:**
Phase 3 — Accounts + Authentication

**Objective:**
Implement the locked Email + Password authentication architecture, JWT access and refresh token system, user profile management, password change API, address CRUD operations with default selection logic, and object-level permission enforcement strictly as specified in `Kartrix_Architecture_Blueprint.md`.

**Changes Made:**
- `backend/accounts/permissions.py`:
  - Created `IsOwner` and `IsOwnerOrAdmin` custom permission classes to ensure strict user data isolation.
- `backend/accounts/serializers.py`:
  - `UserRegisterSerializer`: Validates email uniqueness and password match, creates user via `User.objects.create_user`.
  - `UserSerializer`: Serializes user profile attributes with read-only protections on sensitive/system fields (`id`, `email`, `is_staff`, `is_superuser`, etc.).
  - `ChangePasswordSerializer`: Validates `old_password` and new password confirmation.
  - `AddressSerializer`: Full CRUD serializer for shipping addresses, enforcing automatic default selection for the first address and single default address logic across user addresses.
  - `CustomTokenObtainPairSerializer`: Custom JWT payload returning access token, refresh token, and user metadata (`id`, `email`, `first_name`, `last_name`, `is_staff`).
- `backend/accounts/views.py`:
  - `RegisterView`: Public endpoint returning created user profile and JWT tokens upon successful registration.
  - `CustomTokenObtainPairView`: Public JWT login endpoint.
  - `UserProfileView`: Authenticated endpoint (`GET`, `PUT`, `PATCH`) for current user profile.
  - `ChangePasswordView`: Authenticated endpoint (`POST`) validating current password and setting new password.
  - `AddressViewSet`: Authenticated `ModelViewSet` scoped strictly to `request.user` (`Address.objects.filter(user=request.user)`), featuring a custom `set-default` action endpoint (`POST /api/accounts/addresses/{id}/set-default/`).
- `backend/accounts/urls.py`:
  - Mapped app endpoints: `register/`, `login/`, `token/refresh/`, `profile/`, `change-password/`, and `addresses/` router.
- `backend/easykart/urls.py`:
  - Included `accounts.urls` under `api/accounts/`.
- `backend/easykart/settings.py`:
  - Configured `SIMPLE_JWT` parameters (access token lifetime: 60 min, refresh token lifetime: 7 days, `ROTATE_REFRESH_TOKENS = True`, `Bearer` header type).
- `backend/accounts/tests.py`:
  - Implemented 13 comprehensive unit tests using DRF `APITestCase`.

**APIs Implemented:**
- `POST /api/accounts/register/` (Public) — Register account & return JWT access/refresh tokens.
- `POST /api/accounts/login/` (Public) — JWT login with email & password.
- `POST /api/accounts/token/refresh/` (Public) — Refresh JWT access token.
- `GET /api/accounts/profile/` (Authenticated) — Retrieve current user profile.
- `PUT/PATCH /api/accounts/profile/` (Authenticated) — Update current user profile.
- `POST /api/accounts/change-password/` (Authenticated) — Change password with old password verification.
- `GET /api/accounts/addresses/` (Authenticated) — List user's shipping addresses.
- `POST /api/accounts/addresses/` (Authenticated) — Create a new shipping address.
- `GET /api/accounts/addresses/{id}/` (Authenticated Owner) — Retrieve specific shipping address.
- `PUT/PATCH /api/accounts/addresses/{id}/` (Authenticated Owner) — Update shipping address.
- `DELETE /api/accounts/addresses/{id}/` (Authenticated Owner) — Delete shipping address.
- `POST /api/accounts/addresses/{id}/set-default/` (Authenticated Owner) — Set shipping address as default.

**Dependencies Added:**
- None (Reused `djangorestframework-simplejwt` installed in Phase 1).

**Database Changes:**
- None required (Utilized existing `accounts_user` and `accounts_address` schema from Phase 2).

**Migration Impact:**
- `python backend/manage.py makemigrations --check --dry-run` — Result: `No changes detected.`

**Verification & Test Results:**
- `python backend/manage.py check` — Result: `System check identified no issues (0 silenced).`
- `python backend/manage.py test accounts` — Result: `Ran 13 tests in 77.794s... OK (100% pass rate).`
- OpenAPI/Swagger Verification — Result: All endpoints automatically registered and displayed in Swagger UI at `/api/docs/`.

---

### 2026-08-18 — Phase 4: Products + Categories

**Phase:**
Phase 4 — Products + Categories

**Objective:**
Implement public catalog browsing, category/brand listing & filtering, product search, price range filtering, pagination, variant & attribute management, inventory audit transactions, and staff-only catalog management strictly as specified in `Kartrix_Architecture_Blueprint.md`.

**Changes Made:**
- `backend/requirements.txt`:
  - Added `django-filter==25.1` dependency as required for URL query parameter filtering.
- `backend/easykart/settings.py`:
  - Added `django_filters` to `INSTALLED_APPS`.
  - Configured `REST_FRAMEWORK['DEFAULT_FILTER_BACKENDS']` with `DjangoFilterBackend`, `SearchFilter`, and `OrderingFilter`.
  - Global pagination was NOT enabled in `settings.py`, preserving Phase 3 Accounts API response behavior and keeping `backend/accounts/` 100% clean and unmodified.
- `backend/products/permissions.py`:
  - Created `IsAdminOrReadOnly` (public read for active items, staff write) and `IsStaffUser` (staff-only inventory management) permissions.
- `backend/products/filters.py`:
  - Created `ProductFilter` supporting category (ID or slug), brand (ID or slug), price range (`min_price`, `max_price`), and `is_active` filtering.
- `backend/products/serializers.py`:
  - Created serializers for Category, Brand, ProductImage, ProductAttribute, AttributeValue, Inventory, InventoryTransaction, ProductVariant, ProductList, ProductDetail, and ProductCreateUpdate.
  - Implemented automatic stock level adjustment in `InventoryTransactionSerializer.create()`.
- `backend/products/views.py`:
  - Implemented ViewSets for Category, Brand, Product, ProductImage, ProductAttribute, AttributeValue, ProductVariant, Inventory, and InventoryTransaction.
  - Configured view-level `CatalogPagination` (`page_size = 12`, `page_size_query_param = 'page_size'`) specifically on `CategoryViewSet`, `BrandViewSet`, and `ProductViewSet`.
  - Enforced active-only visibility for public users while allowing staff users full catalog access.
- `backend/products/urls.py`:
  - Mapped app endpoints via DRF `DefaultRouter`.
- `backend/easykart/urls.py`:
  - Included `products.urls` under `/api/products/`.
- `backend/products/tests.py`:
  - Implemented 13 comprehensive unit/integration tests using isolated test database users.

**App Isolation & Database Integrity:**
- `backend/accounts/` app was not modified; `backend/accounts/` is 100% clean (`working tree clean`).
- `products/models.py` was not modified.
- `products/migrations/` was not modified.
- No migration files were created.
- No database migrations or destructive schema commands were executed.
- No unauthorized modifications or blueprint deviations were introduced.

**APIs Implemented:**
- `GET /api/products/categories/` (Public) — List active categories with view-level pagination.
- `GET /api/products/categories/{id_or_slug}/` (Public) — Retrieve category detail.
- `POST/PUT/DELETE /api/products/categories/` (Staff Admin) — Category CRUD.
- `GET /api/products/brands/` (Public) — List active brands with view-level pagination.
- `GET /api/products/brands/{id_or_slug}/` (Public) — Retrieve brand detail.
- `POST/PUT/DELETE /api/products/brands/` (Staff Admin) — Brand CRUD.
- `GET /api/products/products/` (Public) — Catalog list with search, category/brand filters, price range, ordering, and view-level pagination.
- `GET /api/products/products/{id_or_slug}/` (Public) — Full product detail with gallery images, variants, attributes, and stock status.
- `POST/PUT/DELETE /api/products/products/` (Staff Admin) — Product CRUD.
- `GET/POST/PUT/DELETE /api/variants/` (Public Read / Staff Write) — Variant CRUD.
- `GET/POST/PUT/DELETE /api/inventories/` (Staff Admin) — Inventory stock level management.
- `GET/POST /api/inventory-transactions/` (Staff Admin) — Inventory transaction audit log with automatic `created_by` attribution.

**Verification & Test Results:**
- `python backend/manage.py check` — Result: `System check identified no issues (0 silenced).`
- `python backend/manage.py test accounts` — Result: `Ran 13 tests in 90.474s... OK (100% pass rate).`
- `python backend/manage.py test products` — Result: `Ran 13 tests in 69.942s... OK (100% pass rate).`
- `python backend/manage.py makemigrations --check --dry-run` — Result: `No changes detected.`
- OpenAPI/Swagger Verification — Result: All 9 product router ViewSets registered in Swagger UI at `/api/docs/`.

---

### 2026-08-18 — Phase 5: Customer Frontend

**Phase:**
Phase 5 — Customer Frontend

**Objective:**
Build the complete EasyKart 2.0 Customer Frontend SPA using React 19, Vite, Tailwind CSS v3, React Router 8.3.0, Axios, and Lucide React icons. Strictly adhere to the visual design specifications and visual references (`ui ref ins.png` and `ui ref.png`), providing a minimal, modern, premium orange-accented UI/UX with full Light & Dark mode support, persistent theme selection (`easykart_theme`), JWT authentication lifecycle, catalog search/filter/sort/pagination, product detail image gallery and variant selection, user profile management, shipping address CRUD, and strict Phase 6+ boundaries.

**Changes Made:**
- `frontend/tailwind.config.js`:
  - Configured `darkMode: 'class'`, Inter font family, and EasyKart orange accent palette (`#F56A00`).
- `frontend/index.html`:
  - Imported Google Font Inter (`wght@300;400;500;600;700`) and set application shell attributes.
- `frontend/src/index.css`:
  - Configured Tailwind directives, global base styles, and custom scrollbar styles.
- `frontend/src/api/axios.js`:
  - Implemented centralized Axios instance with JWT request interceptor and queued automatic token refresh handling on 401 Unauthorized errors (`POST /api/accounts/token/refresh/`).
- `frontend/src/api/authApi.js`:
  - Implemented API services for login, registration, user profile, password change, address CRUD, and default address selection.
- `frontend/src/api/productApi.js`:
  - Implemented API services for categories, brands, products catalog list, and product details.
- `frontend/src/context/ThemeContext.jsx`:
  - Implemented light/dark theme provider with `localStorage` persistence (`easykart_theme`) and HTML `dark` class toggling.
- `frontend/src/context/ToastContext.jsx`:
  - Implemented global top-right toast notification system for success, error, and informational notifications.
- `frontend/src/context/AuthContext.jsx`:
  - Implemented user state management, JWT token storage, login, registration, logout, and profile update context.
- `frontend/src/components/layout/Navbar.jsx` & `Footer.jsx`:
  - Created responsive desktop and mobile navigation drawer with EasyKart orange branding, compact search bar, theme toggle (Sun/Moon), profile dropdown, and non-functional visual placeholders for Cart and Wishlist (triggering Phase 6 toast notification on click).
- `frontend/src/components/products/ProductCard.jsx`, `ProductGrid.jsx`, `ProductGallery.jsx`, `VariantSelector.jsx`:
  - Built product UI components matching the reference images, displaying real backend product data, primary images, variant options (size/color), and live stock availability badges.
- `frontend/src/components/common/SidebarFilter.jsx`, `Pagination.jsx`, `ProtectedRoute.jsx`, `LoadingSkeleton.jsx`:
  - Built left filter sidebar (Search, Category checkboxes, Brand checkboxes, Min/Max price inputs, Clear filters), pagination controls, route auth guard, and skeleton loaders.
- `frontend/src/pages/HomePage.jsx`:
  - Built homepage featuring API-backed Hero section with orange CTA buttons, Service guarantee cards (`Free Delivery`, `Secure Payment`, `24/7 Support`), Category showcase, and Featured Products grid.
- `frontend/src/pages/ProductListPage.jsx`:
  - Built full catalog browsing page with desktop filter sidebar, sorting dropdown (`Newest`, `Name`, `Price: Low to High`, `Price: High to Low`), mobile filter drawer, and page pagination.
- `frontend/src/pages/ProductDetailPage.jsx`:
  - Built product detail view with image gallery, thumbnails, pricing, description, variant selector, stock status badge, and non-functional Phase 6 placeholder buttons ("Add to Cart", "Add to Wishlist") displaying informative toast notifications.
- `frontend/src/pages/LoginPage.jsx`, `RegisterPage.jsx`, `ProfilePage.jsx`, `AddressPage.jsx`:
  - Built user authentication and account management pages for profile updates, password change, address CRUD, and setting default delivery address.
- `frontend/src/App.jsx`:
  - Configured SPA routes and context wrappers (`ThemeProvider`, `ToastProvider`, `AuthProvider`).

### Phase 5 Final Fix — Homepage Hero Data Integrity

**Problem Identified:**
The initial `HomePage.jsx` implementation contained hardcoded fake hero product data (`ASTRO WINTER ARMOR II`, `$560.00`, and fake product image URLs).

**Resolution:**
Updated `frontend/src/pages/HomePage.jsx` to fetch and display strictly authentic product data returned by the Django REST API (`productApi.getProducts({ page_size: 4 })`).

**Final Behavior:**
- When an authentic product is returned by the Django REST API, the hero section dynamically displays its real `name`, real formatted `starting_price`, real `description`, and real `primary_image`.
- When no product is returned by the API, the hero section gracefully displays a polished EasyKart-branded empty state (`FEATURED COLLECTION`, `Featured products coming soon`, `We don't have a featured product available right now. Explore our catalog to see all available products.`, `Browse Products` CTA, `View Categories` CTA) without displaying fake names, fake prices, or fake images.

---

### 2026-08-19 — Phase 6: Cart + Wishlist

**Phase:**
Phase 6 — Cart + Wishlist

**Objective:**
Implement complete customer-facing Shopping Cart and Wishlist functionality strictly as specified in `Kartrix_Architecture_Blueprint.md`. Build backend REST APIs for Cart and Wishlist operations with stock validation, user isolation, item subtotals, and duplicate handling. Build frontend Cart and Wishlist state contexts, API service modules, responsive Cart Page (`/cart`), Wishlist Page (`/wishlist`), item rows, summary card, and connect live Navbar count badges, Product Card heart toggles, and Product Detail page buttons.

**Changes Made:**
- `backend/cart/serializers.py`:
  - Created `CartItemSerializer` and `CartSerializer`. Implemented real-time item subtotal calculation, cart subtotal calculation, active product validation, and stock limit checks (`quantity <= variant.inventory.available_stock`).
- `backend/cart/views.py`:
  - Created `CartViewSet` (`GET /api/cart/`, `POST /api/cart/clear/`) and `CartItemViewSet` (`POST /api/cart/items/`, `PATCH /api/cart/items/{id}/`, `DELETE /api/cart/items/{id}/`) scoped strictly to `request.user`. Implemented duplicate item addition handling (`quantity += requested_quantity`).
- `backend/cart/urls.py`:
  - Mapped cart endpoints and item router URLs.
- `backend/wishlist/serializers.py`:
  - Created `WishlistItemSerializer` enforcing active product validation and unique product check.
- `backend/wishlist/views.py`:
  - Created `WishlistItemViewSet` (`GET /api/wishlist/items/`, `DELETE /api/wishlist/items/{id}/`) and a custom `toggle` endpoint (`POST /api/wishlist/toggle/`).
- `backend/wishlist/urls.py`:
  - Mapped wishlist endpoints and router URLs.
- `backend/easykart/urls.py`:
  - Included `api/cart/` and `api/wishlist/` routes in main URL configuration.
- `backend/cart/tests.py` & `backend/wishlist/tests.py`:
  - Implemented 12 comprehensive unit tests covering cart retrieval, item additions, quantity updates, stock limit enforcement, item deletions, clear cart, wishlist toggles, duplicate prevention, and user data isolation.
- `frontend/src/api/cartApi.js` & `wishlistApi.js`:
  - Implemented frontend API service modules wrapping Axios requests.
- `frontend/src/context/CartContext.jsx` & `WishlistContext.jsx`:
  - Implemented global Cart and Wishlist React state providers managing live item arrays, total count badges, subtotals, toast alerts, and automatic API sync.
- `frontend/src/components/cart/CartItemRow.jsx` & `CartSummary.jsx`:
  - Built Cart item row component with quantity stepper `[- 1 +]`, subtotal calculation, trash button, and Order Summary card with Phase 7 checkout placeholder button (*"Proceed to Checkout (Phase 7)"*).
- `frontend/src/pages/CartPage.jsx` & `WishlistPage.jsx`:
  - Built `/cart` and `/wishlist` customer pages with empty states, loading skeletons, Move to Cart actions, and responsive desktop/mobile layouts.
- `frontend/src/components/layout/Navbar.jsx`, `ProductCard.jsx`, `ProductDetailPage.jsx`, `App.jsx`:
  - Connected live Cart and Wishlist count badges to Navbar, live heart toggle with fill indicator to ProductCard, live Add to Cart / Wishlist buttons to ProductDetailPage, and declared protected `/cart` & `/wishlist` SPA routes in `App.jsx`.

**App Isolation & Phase Boundary Protections:**
- **Zero** database schema modifications or migrations created.
- Orders & Checkout remain Phase 7 and were NOT implemented (Checkout button displays informative Phase 7 toast).
- Payments (Phase 8), Reviews (Phase 9), Admin Panel (Phase 10), Recommendations (Phase 11), and AI/ML (Phase 12) remain un-implemented and locked to their respective future phases.
- Phase 1–5 backend and frontend functionality remains 100% preserved.

**Verification & Test Results:**
- `python backend/manage.py check` — Result: `System check identified no issues (0 silenced).`
- `python backend/manage.py test cart` — Result: `Ran 8 tests in 41.008s... OK (100% pass rate).`
- `python backend/manage.py test wishlist` — Result: `Ran 4 tests in 22.524s... OK (100% pass rate).`
- `python backend/manage.py test accounts` — Result: `Ran 13 tests... OK (100% pass rate).`
- `python backend/manage.py test products` — Result: `Ran 13 tests... OK (100% pass rate).`
- `python backend/manage.py makemigrations --check --dry-run` — Result: `No changes detected.`
- `npm run build` (in `frontend/`) — Result: `✓ built in 20.63s` (1950 modules transformed, 0 errors).

**Demo Catalog Currency Standardization Note:**
The development catalog seed command (`seed_demo_data`) and customer frontend presentation layer were standardized from USD-style demo pricing to realistic Indian e-commerce INR (₹) pricing (`1295.00` to `449900.00`). All numeric database values are stored as plain INR decimals without schema or model changes.

---

### 2026-08-19 — Phase 7: Orders + Checkout

**Phase:**
Phase 7 — Orders + Checkout

**Objective:**
Implement complete customer checkout and order management functionality strictly as specified in `Kartrix_Architecture_Blueprint.md` and approved Phase 7 implementation plan. Build atomic Cart-to-Order conversion API (`POST /api/orders/checkout/`), address snapshotting (`shipping_address_snapshot`), price snapshotting (`OrderItem.unit_price`), customer order listing (`GET /api/orders/`), and order detail viewing (`GET /api/orders/{order_number}/`). Build frontend Checkout Page (`/checkout`), Order History Page (`/orders`), Order Detail Page (`/orders/:orderNumber`), and connect CartSummary and Navbar dropdown links.

**Changes Made:**
- `backend/orders/models.py`:
  - Added `shipping_address_snapshot = models.JSONField(blank=True, null=True)` to `Order` model to capture immutable historical delivery addresses at order placement time.
- Created `orders/migrations/0002_order_shipping_address_snapshot.py`:
  - Single targeted schema migration adding `shipping_address_snapshot` field.
- `backend/orders/serializers.py`:
  - Created `OrderItemSerializer`, `OrderStatusHistorySerializer`, `OrderSerializer`, and `CheckoutSerializer`.
- `backend/orders/views.py`:
  - Implemented `CheckoutViewSet` (`POST /api/orders/checkout/`) using `db.transaction.atomic()` with stock checking, product/variant activity verification, human-readable order number generation (`EK-YYYYMMDD-HEX`), price/address snapshotting, and cart clearing.
  - Implemented `OrderViewSet` (`GET /api/orders/`, `GET /api/orders/{order_number}/`) scoped strictly to `request.user`.
- `backend/orders/urls.py` & `easykart/urls.py`:
  - Mapped order router endpoints under `/api/orders/`.
- `backend/orders/tests.py`:
  - Implemented 10 comprehensive unit tests covering checkout order creation, empty cart rejection, unauthenticated rejection, invalid address rejection, insufficient stock rejection, inactive product rejection, price snapshot integrity, address snapshot integrity, order list user isolation, and order detail user isolation.
- `frontend/src/api/orderApi.js`:
  - Created API wrapper module for checkout, order history listing, and order detail retrieval.
- `frontend/src/pages/CheckoutPage.jsx`, `OrderHistoryPage.jsx`, `OrderDetailPage.jsx`:
  - Built responsive Checkout, Order History, and Order Detail pages with INR formatting (`₹`), address selection, item breakdowns, payment status indicators, and status timeline tracking.
- `frontend/src/components/cart/CartSummary.jsx`, `Navbar.jsx`, `App.jsx`:
  - Connected "Proceed to Checkout" button to navigate to `/checkout`, added "My Orders" link to profile dropdown menu, and registered protected SPA routes.

**Phase Boundary Protections:**
- Payment gateway integration (Razorpay), webhook verification, and COD collection workflows remain 100% out of scope and locked to Phase 8.
- Reviews (Phase 9), Admin Panel (Phase 10), Recommendations (Phase 11), and AI/ML (Phase 12) remain un-implemented and locked.
- Coupons logic was not added to checkout, keeping checkout focused strictly on Cart → Order conversion.
- Currency is strictly INR (`₹`) without multi-currency or exchange rate APIs.

**Verification & Test Results:**
- `python backend/manage.py check` — Result: `System check identified no issues (0 silenced).`
- `python backend/manage.py makemigrations --check --dry-run` — Result: `No changes detected.`
- `python backend/manage.py test accounts products cart wishlist orders` — Result: `Ran 48 tests... OK (100% pass rate).`
- `npm run build` (in `frontend/`) — Result: `✓ built in 14.10s` (1954 modules transformed, 0 errors).

---

### 2026-08-19 — Cart & Wishlist Frontend Synchronization, CORS, Toast Error Handling, and Cart Stock Validation Fix

**Phase:**
Phase 6 — Cart + Wishlist (Frontend Synchronization & Error Handling Refinement)

**Objective:**
Perform deep diagnostic analysis and resolution of customer Cart and Wishlist frontend state synchronization, CORS preflight header errors, toast notification function exceptions, and DRF stock validation handling.

#### 1. Problem Reported
- Unauthenticated users interacting with "Add to Cart" or "Wishlist" buttons required proper authentication redirects to `/login`.
- Cart and Wishlist UI failed to synchronize correctly with backend state.
- Cart page rendered "Your Shopping Cart is Empty" (cart badge = 0) even though backend database contained existing cart items.
- "Add to Cart" for the visible Nike Tech Fleece Hoodie variant failed with an error.
- Wishlist interaction appeared inconsistent and stale.
- Browser console displayed: `Uncaught TypeError: addToast is not a function at CartContext.jsx:63`.
- Django server logs recorded: `POST /api/cart/items/ -> 400 Bad Request`.
- Django server logs recorded: `POST /api/wishlist/toggle/ -> 200 OK`.
- *Note:* An initial diagnostic hypothesis incorrectly suspected that the selected product variant had zero stock. This was disproved through direct browser, network, and database verification.

#### 2. Environment & Request Flow
- **Frontend:** React / Vite SPA (`http://localhost:5173`)
- **Backend:** Django REST Framework API (`http://localhost:8000`)
- **Cart Request Flow:**
  `ProductDetailPage` / `ProductCard` $\rightarrow$ `CartContext.addToCart()` $\rightarrow$ `cartApi.addToCart()` $\rightarrow$ `POST /api/cart/items/` $\rightarrow$ Django `CartItemViewSet` / `CartItemSerializer` $\rightarrow$ PostgreSQL database.
- **Wishlist Request Flow:**
  `ProductDetailPage` / `ProductCard` $\rightarrow$ `WishlistContext.toggleWishlist()` $\rightarrow$ `wishlistApi.toggleWishlist()` $\rightarrow$ `POST /api/wishlist/toggle/` $\rightarrow$ Django `WishlistItemViewSet` $\rightarrow$ PostgreSQL database $\rightarrow$ `GET /api/wishlist/items/` $\rightarrow$ `WishlistContext` state $\rightarrow$ Customer UI.

#### 3. Browser Network Diagnostic
Chrome DevTools Network inspection was performed to examine the exact request payload for the Nike Tech Fleece Full-Zip Hoodie variant:
- **Product ID:** 14
- **Variant ID:** 29
- **SKU:** `NTF-GY-M`
- **Frontend Stock Display:** `"In Stock (25 available)"`
- **Actual POST Payload:** `{"product": 14, "product_variant": 29, "quantity": 1}`
- **Backend Response:** HTTP 400 Bad Request
- **Exact Error Payload:**
  ```json
  {
    "quantity": [
      "Cannot add. Total quantity (26) exceeds available stock (25)."
    ]
  }
  ```
This empirical trace proved conclusively that the frontend was sending a valid product/variant selection and that the variant was not out of stock in isolation.

#### 4. Database Verification
A strict read-only Django database audit was conducted to check user and cart records:
- **Authenticated User:** User ID `2` (`nishanthihai2@gmail.com`)
- **Cart Record:** Cart ID `1` (belongs to User ID `2`)
- **Existing Cart Items:**
  - `CartItem` ID `2`: `product_id = 14`, `product_variant_id = 29`, `quantity = 25`
  - `CartItem` ID `3`: `product_id = 14`, `product_variant_id = 30`, `quantity = 1`
  - `CartItem` ID `4`: `product_id = 14`, `product_variant_id = 31`, `quantity = 1`
- **Variant Inventory:** `ProductVariant` ID `29` (`NTF-GY-M`), `available_stock = 25`
- **Calculation:** `Existing quantity (25) + New requested quantity (1) = 26`, which exceeds `available_stock (25)`.
- **Conclusion:** Django's `CartItemViewSet` correctly rejected the request with HTTP 400. Backend stock validation functioned perfectly, the database was not corrupted, no database records needed to be changed, and the user's cart was not empty.

#### 5. Root Cause #1 — CORS / Cache-Control Request Headers
`cartApi.getCart()` and `wishlistApi.getWishlist()` were passing custom headers: `headers: { 'Cache-Control': 'no-cache, no-store' }`. Because the frontend (`http://localhost:5173`) and backend (`http://localhost:8000`) occupy different origins, Chrome issued a CORS `OPTIONS` preflight request containing `Access-Control-Request-Headers: cache-control`. Django's `django-cors-headers` middleware uses a default allowed headers list that excludes `cache-control`. Consequently:
- Chrome blocked `GET /api/cart/` and `GET /api/wishlist/items/` due to CORS preflight failure.
- `fetchCart()` and `fetchWishlist()` failed to retrieve backend state.
- `CartContext` cart state remained `null`, causing the frontend to render "Your Shopping Cart is Empty" (cart badge = 0).

#### 6. Root Cause #2 — Cart Stock Limit Enforcement
The HTTP 400 response on `POST /api/cart/items/` was legitimate. The authenticated user already had the maximum available stock (25 units) of variant `NTF-GY-M` in their cart. Adding 1 more unit would result in a total quantity of 26. Django correctly enforced stock limits. The correct user-facing interpretation is: *"25 units of this variant are already in your cart, so another unit cannot be added because available stock is 25."*

#### 7. Root Cause #3 — Toast Function Name Mismatch
`ToastContext.jsx` exports `<ToastContext.Provider value={{ showToast }}>`, but `CartContext.jsx` and `WishlistContext.jsx` destructured `const { addToast } = useToast()`. This left `addToast === undefined`. When POST `/api/cart/items/` returned HTTP 400, line 63 attempted to execute `addToast(...)`, throwing `Uncaught TypeError: addToast is not a function` and masking the real backend validation error. Updating the hook to destructure `showToast` and extracting DRF error arrays (`err.response?.data?.quantity[0]`) allows stock validation messages to display clearly as error toasts.

#### 8. Wishlist Synchronization Issue
`POST /api/wishlist/toggle/` functioned correctly on the backend (returning HTTP 200 OK and toggling database records). The synchronization issue was frontend-bound: `WishlistContext` relied solely on asynchronous GET re-fetching (`fetchWishlist()`), which was failing due to the CORS `Cache-Control` preflight issue. The fix immediately updates local `wishlistItems` state using the returned `res.in_wishlist` boolean before triggering the server sync GET request.

#### 9. Unauthenticated User Authentication Redirects
Handling for unauthenticated users interacting with Cart and Wishlist was preserved and hardened:
- Clicking "Add to Cart" or "Wishlist" while unauthenticated displays an informative toast notification (*"Please sign in..."*) and redirects to `/login`.
- Product ID extraction in `CartContext` was hardened to handle both product objects and primitive product IDs cleanly.

#### 10. Final Files Modified
Only four frontend files were modified:
- [`frontend/src/api/cartApi.js`](file:///e:/checkit/Easykart/frontend/src/api/cartApi.js): Removed custom `Cache-Control` header from `getCart()` and appended cache-busting timestamp parameter `?_t=${Date.now()}`.
- [`frontend/src/api/wishlistApi.js`](file:///e:/checkit/Easykart/frontend/src/api/wishlistApi.js): Removed custom `Cache-Control` header from `getWishlist()` and appended cache-busting timestamp parameter `?_t=${Date.now()}`.
- [`frontend/src/context/CartContext.jsx`](file:///e:/checkit/Easykart/frontend/src/context/CartContext.jsx): Changed `addToast` to `showToast`, updated all toast calls, and improved DRF error payload extraction.
- [`frontend/src/context/WishlistContext.jsx`](file:///e:/checkit/Easykart/frontend/src/context/WishlistContext.jsx): Changed `addToast` to `showToast`, updated all toast calls, and added immediate local state update using `in_wishlist` response prior to server synchronization.

#### 11. Scope Boundaries Preserved (What Was NOT Modified)
- **Zero** Django backend source files modified.
- **Zero** Django models, serializers, views, permissions, or URLs modified.
- **Zero** database migrations created.
- **Zero** PostgreSQL database records modified or deleted (existing cart items and inventory stock remained 100% intact).
- **Zero** payment processing, Razorpay, COD, or Phase 8 files modified.

#### 12. Verification & Testing
- **Frontend Production Build:** `npm run build` (in `frontend/`)
  - Result: `SUCCESS (Exit Code 0)` — 1954 modules transformed, built in 19.53s.
- **Backend Tests:** `.\env\Scripts\python backend/manage.py test cart wishlist`
  - Result: `Ran 12 tests in 66.950s ... OK (Exit Code 0, 100% pass rate)`.

#### 13. Final Outcome
- Cart correctly fetches and renders existing backend cart items without false "empty cart" screens.
- Wishlist state synchronizes instantly across heart toggles and pages without browser refreshes.
- Cart stock limit validation errors surface cleanly to the user via toast notifications.
- CORS preflight errors caused by `Cache-Control` headers are completely eliminated.
- `addToast is not a function` console error is resolved.
- Backend stock validation and database integrity remain 100% intact.

#### 14. Future Debugging Guidelines
> [!IMPORTANT]
> **Troubleshooting Rule:** When frontend UI displays an empty cart/wishlist or appears out of sync, do NOT immediately modify database records or assume backend code is broken. First inspect Chrome DevTools Network for GET requests, check CORS/preflight `OPTIONS` responses, inspect custom headers, and compare API response data with database records. For cart stock errors, calculate `existing CartItem quantity + requested quantity` against `ProductVariant.inventory.available_stock`. Note that a product page displaying *"25 available"* does not mean the user can add another unit if they already have all 25 units in their cart. Always verify exported function names on React Context providers (e.g., `showToast` vs `addToast`) before diagnosing error handling.

#### 15. Incident Timeline
1. Authentication redirect requirement for unauthenticated Cart/Wishlist actions identified.
2. Initial targeted frontend authentication handling added.
3. Cart "Add to Cart" continued returning HTTP 400 for Nike Tech Fleece variant `NTF-GY-M`.
4. Chrome DevTools Network inspection performed; confirmed payload `product: 14, variant: 29, qty: 1` and backend error response `Total quantity (26) exceeds available stock (25)`.
5. Read-only database audit executed; confirmed User 2 already held 25 units of variant 29 in Cart 1.
6. Secondary CORS issue discovered on `GET /api/cart/` and `GET /api/wishlist/items/` caused by custom `Cache-Control` request headers.
7. `addToast is not a function` identified in `CartContext.jsx:63` error handler.
8. Targeted frontend-only fix applied across `cartApi.js`, `wishlistApi.js`, `CartContext.jsx`, and `WishlistContext.jsx`.
9. Frontend production build (`npm run build`) passed cleanly.
10. Backend test suite (`python backend/manage.py test cart wishlist`) passed 12/12 tests cleanly.
11. Full end-to-end browser verification completed successfully.

---

### 2026-08-19 — Phase 7.5 — Product Discovery & Navigation UX (Planned Milestone)

**Phase:**
Phase 7.5 — Product Discovery & Navigation UX

**Status:**
PLANNED / APPROVED (NOT YET IMPLEMENTED)

#### 1. Why Phase 7.5 Was Introduced
Phase 7 (Orders + Checkout) is fully complete and verified. Phase 8 is reserved for Razorpay + COD Payment Integration. Before beginning payment gateway integration, an intermediate milestone (Phase 7.5) was approved to establish dedicated customer-facing product discovery, category browsing, brand discovery, deals presentation, and navbar navigation UX.

#### 2. Products
- Complete catalog browsing experience.
- Real-time search.
- Category filtering.
- Brand filtering.
- Sorting options.
- Page pagination.
- Product cards and grid layout.
- Direct product detail navigation.
- Navbar active-state correction.
- Structural preparation for a future `"Recommended for You"` section.
- *Note:* DeepFM ML recommendation engine is **NOT** implemented in Phase 7.5 and remains assigned to the future recommendation/ML phase.

#### 3. Categories
- Dedicated `/categories` page for browsing available product categories.
- Flow: `/categories` $\rightarrow$ Browse Categories $\rightarrow$ Select Category $\rightarrow$ Category Product Listing $\rightarrow$ Product Detail.

#### 4. Brands
- Dedicated `/brands` page for browsing available brands.
- Flow: `/brands` $\rightarrow$ Browse Brands $\rightarrow$ Select Brand $\rightarrow$ Brand Product Listing $\rightarrow$ Product Detail.

#### 5. Deals
- Dedicated customer-facing `/deals` page displaying active offers, original prices, offer prices, discount percentages, and empty states.
- *Architectural Decision:* Deals will become Admin-controlled in the future Admin Panel (Phase 10), enabling admins to set deal products, discounts, start/end dates, and active status.
- Admin deal management is **NOT** part of Phase 7.5.

#### 6. Navigation
- Main customer navigation destinations: `Home`, `Products`, `Categories`, `Brands`, `Deals`.
- Expected active-state behavior:
  - `/products` $\rightarrow$ Products active ONLY
  - `/categories` $\rightarrow$ Categories active ONLY
  - `/brands` $\rightarrow$ Brands active ONLY
  - `/deals` $\rightarrow$ Deals active ONLY
- Product Detail pages retain appropriate Products-section context.

#### 7. Phase Boundaries
Phase 7.5 does **NOT** implement:
- Razorpay gateway or COD payment workflows.
- Payment processing, verification, or webhooks.
- Payment status transitions.
- DeepFM or personalized ML recommendations.
- Admin Panel or Admin-controlled deal management.
- Reviews system.

#### 8. Future Connections
- **Products:** `Phase 7.5 Products → Future Recommendation/ML Phase → DeepFM → Recommended for You`
- **Deals:** `Phase 7.5 Deals → Future Admin Panel (Phase 10) → Admin-controlled Offers → Active Deals → Customer-facing Deals Page`

#### 9. Acceptance Criteria
1. Products has a dedicated functional catalog experience.
2. Product search works.
3. Category filtering works.
4. Brand filtering works.
5. Catalog sorting works.
6. Page pagination works.
7. Product detail navigation works.
8. Categories has a dedicated browsing destination (`/categories`).
9. Category selection leads to correct filtered products.
10. Brands has a dedicated browsing destination (`/brands`).
11. Brand selection leads to correct filtered products.
12. Deals has a dedicated customer-facing destination (`/deals`).
13. Active deals can be displayed.
14. Deals empty state is handled correctly.
15. Navbar active states correctly identify current active section.
16. Cart functionality remains unaffected.
17. Wishlist functionality remains unaffected.
18. Authentication functionality remains unaffected.
19. Phase 7 Orders/Checkout functionality remains unaffected.
20. Phase 8 payment functionality remains untouched.
21. DeepFM recommendation engine remains untouched until its designated future phase.
22. Admin-controlled deal management remains untouched until the Admin Panel phase (Phase 10).

#### 10. Status
**Phase 7.5: PLANNED / APPROVED — NOT YET IMPLEMENTED**
*(Implementation, code changes, and verification testing will take place when execution begins.)*
