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

- Current Phase: Phase 6 — Cart + Wishlist
- Phase Status: COMPLETE
- Last Completed Task: Phase 6 — Cart + Wishlist Implementation & Verification
- Next Planned Task: Phase 7 — Orders + Checkout

## Phase Progress

| Phase | Description | Status |
|------|-------------|--------|
| 1 | Project Setup & Backend Configuration | COMPLETE |
| 2 | Database + Django Configuration | COMPLETE |
| 3 | Accounts + Authentication | COMPLETE |
| 4 | Products + Categories | COMPLETE |
| 5 | Customer Frontend | COMPLETE |
| 6 | Cart + Wishlist | COMPLETE |
| 7 | Orders + Checkout | NOT STARTED |
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
