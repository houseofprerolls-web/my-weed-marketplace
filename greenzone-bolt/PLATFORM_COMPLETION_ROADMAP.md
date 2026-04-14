# GreenZone Platform Completion Roadmap

## Executive Summary

The GreenZone marketplace has a solid foundation with authentication, RBAC, and database infrastructure. This roadmap outlines the critical features needed to make the platform fully functional, user-friendly, and production-ready.

---

## Current Status: 40% Complete

### ✅ What's Working
- User authentication (email/password)
- Role-based access control (Customer, Vendor, Admin)
- Database schema (vendors, orders, products, reviews, etc.)
- Basic navigation and routing
- Demo system with role switching
- Vendor profile management
- Admin approval workflows (UI only)
- Cart context and basic structure

### ❌ What's Missing
- Actual product listings and menu display
- Working checkout and payment flow
- Real-time order tracking
- Search and filtering
- Image uploads
- Live notifications
- Messaging between customers and vendors
- Analytics dashboards with real data
- Inventory management
- Reviews and ratings functionality

---

## Priority 1: Core Commerce Features (Essential)

### 1.1 Product Catalog & Menu Display ⭐⭐⭐⭐⭐

**Why Critical**: Customers can't browse or buy without products.

**What's Needed**:
- Display vendor menus with products from database
- Product cards with images, prices, descriptions
- Category filtering (Flower, Edibles, Concentrates, etc.)
- Stock availability indicators
- Product detail pages
- Quick add to cart functionality

**Files to Create/Update**:
- `app/directory/page.tsx` - Display all vendor listings
- `app/listing/[id]/page.tsx` - Individual vendor menu
- `components/products/ProductCard.tsx` - Product display
- `components/products/ProductGrid.tsx` - Grid layout
- `app/api/products/route.ts` - Product API endpoints

**Estimated Effort**: 6-8 hours

---

### 1.2 Working Checkout Flow ⭐⭐⭐⭐⭐

**Why Critical**: No revenue without checkout.

**What's Needed**:
- Complete cart management (add, remove, update quantities)
- Checkout form with delivery address
- Order summary and validation
- Order creation in database
- Order confirmation page
- Email confirmation (optional for MVP)

**Current Issues**:
- Cart context exists but not fully integrated
- Checkout page has form but doesn't process orders
- No order creation logic

**Files to Update**:
- `contexts/CartContext.tsx` - Add persistence, validation
- `app/cart/page.tsx` - Complete cart UI
- `app/checkout/page.tsx` - Process orders
- `app/checkout/confirmation/page.tsx` - Show success
- Migration: Already exists for orders table

**Estimated Effort**: 4-6 hours

---

### 1.3 Order Management System ⭐⭐⭐⭐⭐

**Why Critical**: Vendors need to fulfill orders, customers need tracking.

**What's Needed**:
- **Customer Side**:
  - View order history with status
  - Track order in real-time
  - Order details page
  - Cancel orders (if not started)

- **Vendor Side**:
  - Incoming order notifications
  - Accept/reject orders
  - Update order status (preparing, out for delivery, delivered)
  - Order history and filtering
  - Print order receipts

**Files to Update**:
- `app/account/orders/page.tsx` - Customer orders list
- `app/account/orders/[id]/page.tsx` - Order details
- `app/vendor/orders/page.tsx` - Vendor order management
- `app/vendor/orders/[id]/page.tsx` - Vendor order details
- `components/orders/OrderCard.tsx` - Order display
- `components/orders/StatusTimeline.tsx` - Visual tracking

**Estimated Effort**: 8-10 hours

---

### 1.4 Search & Filtering ⭐⭐⭐⭐

**Why Critical**: Users need to find products quickly.

**What's Needed**:
- Global search across vendors and products
- Filter by:
  - Product type (Flower, Edibles, etc.)
  - Price range
  - Distance/location
  - Rating
  - Delivery vs pickup
  - Open now
- Sort options (price, rating, distance, popularity)
- Search results page
- Autocomplete suggestions

**Files to Create**:
- `components/search/SearchBar.tsx` - Search input
- `components/search/FilterPanel.tsx` - Filters
- `app/search/page.tsx` - Search results
- `lib/search.ts` - Search logic
- Database: Add full-text search indexes

**Estimated Effort**: 6-8 hours

---

### 1.5 Image Upload & Storage ⭐⭐⭐⭐

**Why Critical**: Products need images, vendors need profile photos.

**What's Needed**:
- Supabase Storage buckets setup
- Image upload component
- Image optimization and resizing
- Vendor logo upload
- Product image uploads (multiple per product)
- Image gallery for product pages

**Files to Create**:
- `components/upload/ImageUpload.tsx` - Upload component
- `lib/storage.ts` - Storage helpers
- Update vendor profile page with logo upload
- Update menu manager with product images
- Migration: Add image_url fields

**Supabase Setup**:
- Create storage buckets: `vendor-logos`, `product-images`
- Set up RLS policies for storage
- Configure image transformations

**Estimated Effort**: 4-5 hours

---

## Priority 2: User Experience Enhancements

### 2.1 Real-Time Notifications ⭐⭐⭐⭐

**What's Needed**:
- Bell icon in header with unread count
- Notification dropdown/page
- Real-time updates using Supabase Realtime
- Notification types:
  - Order status changes
  - New messages
  - Deals from favorite vendors
  - Admin announcements

**Files to Create**:
- `components/notifications/NotificationBell.tsx`
- `components/notifications/NotificationList.tsx`
- `app/notifications/page.tsx`
- `lib/notifications.ts` - Notification helpers
- Migration: notifications table already exists

**Estimated Effort**: 5-6 hours

---

### 2.2 Reviews & Ratings System ⭐⭐⭐⭐

**What's Needed**:
- Customer product reviews
- Vendor reviews
- Star ratings (1-5)
- Review moderation (admin)
- Review responses (vendors)
- Helpful/unhelpful votes
- Display average ratings

**Files to Create/Update**:
- `components/reviews/ReviewCard.tsx`
- `components/reviews/ReviewForm.tsx`
- `components/reviews/RatingStars.tsx`
- Update product pages with reviews
- Update vendor pages with reviews
- `app/vendor/reviews/page.tsx` - Vendor review management

**Estimated Effort**: 6-7 hours

---

### 2.3 Favorites/Wishlist ⭐⭐⭐

**What's Needed**:
- Heart icon on products
- Add/remove favorites
- Favorites page
- Favorite vendors
- Favorite products
- Notifications for favorite vendor deals

**Files to Create**:
- `app/account/favorites/page.tsx`
- `components/favorites/FavoriteButton.tsx`
- Update product cards with favorite button
- Migration: favorites table already exists

**Estimated Effort**: 3-4 hours

---

### 2.4 Geolocation & Distance Filtering ⭐⭐⭐⭐

**What's Needed**:
- Request user location permission
- Calculate distances to vendors
- Filter by radius (1mi, 5mi, 10mi, etc.)
- Sort by distance
- Map view with vendor pins
- Delivery zone validation

**Files to Update**:
- `components/Map.tsx` - Interactive map
- `app/map/page.tsx` - Full map view
- `lib/geolocation.ts` - Distance calculations
- Update directory page with distance sorting

**Estimated Effort**: 5-6 hours

---

### 2.5 Messaging System ⭐⭐⭐

**What's Needed**:
- Customer-to-vendor messaging
- Message inbox
- Real-time chat
- Message notifications
- Order-related messages
- Message history

**Files to Create**:
- `app/messages/page.tsx`
- `components/messages/MessageThread.tsx`
- `components/messages/MessageInput.tsx`
- Real-time subscriptions
- Migration: messages table already exists

**Estimated Effort**: 8-10 hours

---

## Priority 3: Vendor Tools

### 3.1 Complete Menu Manager ⭐⭐⭐⭐⭐

**Current State**: Menu manager exists but needs completion.

**What's Needed**:
- Add products with full details
- Edit/delete products
- Category management
- Bulk operations
- Product variants (sizes, strains)
- Pricing tiers
- Product status (active/inactive)

**Files to Update**:
- `app/vendor/menu/page.tsx` - Main menu page
- `app/vendor/menu/categories/page.tsx` - Category management
- `components/vendor/ProductForm.tsx` - Add/edit products

**Estimated Effort**: 6-8 hours

---

### 3.2 Inventory Management ⭐⭐⭐⭐

**What's Needed**:
- Stock tracking
- Low stock alerts
- Automatic stock deduction on orders
- Stock history
- Restock notifications
- Out of stock handling

**Files to Create**:
- `app/vendor/inventory/page.tsx`
- `components/vendor/InventoryTable.tsx`
- `components/vendor/StockAlerts.tsx`
- Migration: Add inventory fields to products

**Estimated Effort**: 5-6 hours

---

### 3.3 Analytics Dashboard ⭐⭐⭐⭐

**Current State**: Analytics page exists but has no data.

**What's Needed**:
- Sales metrics (daily, weekly, monthly)
- Top products
- Customer analytics
- Revenue charts
- Order volume trends
- Customer retention metrics
- Export reports

**Files to Update**:
- `app/vendor/analytics/page.tsx`
- Use recharts for visualizations
- Create analytics API endpoints
- Real data from orders table

**Estimated Effort**: 6-8 hours

---

### 3.4 Deals & Promotions ⭐⭐⭐⭐

**Current State**: Deals page exists but not functional.

**What's Needed**:
- Create time-limited deals
- Percentage or fixed discounts
- Minimum order requirements
- Deal scheduling
- Display deals on product pages
- Featured deals on homepage

**Files to Update**:
- `app/vendor/deals/page.tsx`
- `components/deals/DealCard.tsx`
- `app/deals/page.tsx` - Public deals page
- Migration: deals/promotions table

**Estimated Effort**: 5-6 hours

---

## Priority 4: Admin Tools

### 4.1 Vendor Approval Workflow ⭐⭐⭐⭐

**Current State**: Admin dashboard shows pending vendors but can't approve.

**What's Needed**:
- Review vendor applications
- Approve/reject with notes
- Request additional documentation
- Verification status tracking
- Email notifications to vendors

**Files to Update**:
- `app/admin/dashboard/page.tsx`
- Create approval modal/page
- Email integration
- Update vendor status in database

**Estimated Effort**: 4-5 hours

---

### 4.2 Content Moderation ⭐⭐⭐

**What's Needed**:
- Review flagged products
- Review reported reviews
- User moderation
- Ban/suspend users
- Content removal

**Files to Create**:
- `app/admin/moderation/page.tsx`
- `components/admin/ModerationQueue.tsx`
- Flagging system for users

**Estimated Effort**: 5-6 hours

---

### 4.3 Platform Analytics ⭐⭐⭐

**What's Needed**:
- Total users, vendors, orders
- Revenue metrics (take rate)
- Growth charts
- Active users tracking
- Geographic distribution
- Platform health metrics

**Files to Update**:
- `app/admin/sales-dashboard/page.tsx`
- Create comprehensive analytics
- Real-time metrics

**Estimated Effort**: 6-7 hours

---

### 4.4 Advertising Placement Management ⭐⭐⭐⭐

**Current State**: Placement system database exists but no UI.

**What's Needed**:
- Create/edit placement positions
- Set pricing per position
- Approve vendor ad requests
- Schedule placements
- Performance tracking

**Files to Update**:
- `app/admin/placements/page.tsx`
- Create placement management UI
- Calendar view for scheduling

**Estimated Effort**: 6-8 hours

---

## Priority 5: Performance & Polish

### 5.1 Performance Optimization ⭐⭐⭐⭐

**What's Needed**:
- Image lazy loading
- Implement Next.js Image component everywhere
- Database query optimization
- Add indexes for common queries
- Implement caching (React Query or SWR)
- Code splitting
- Bundle size optimization

**Estimated Effort**: 4-5 hours

---

### 5.2 Mobile Responsiveness ⭐⭐⭐⭐⭐

**What's Needed**:
- Test all pages on mobile
- Fix layout issues
- Mobile-optimized navigation
- Touch-friendly interactions
- Mobile menu improvements

**Estimated Effort**: 6-8 hours

---

### 5.3 Error Handling & Loading States ⭐⭐⭐⭐

**What's Needed**:
- Consistent error boundaries
- Loading skeletons everywhere
- Retry logic for failed requests
- User-friendly error messages
- Offline handling

**Files to Create**:
- `components/ui/skeleton.tsx` (already exists, use it)
- `components/errors/ErrorBoundary.tsx`
- `components/errors/ErrorMessage.tsx`

**Estimated Effort**: 3-4 hours

---

### 5.4 SEO Optimization ⭐⭐⭐

**What's Needed**:
- Dynamic meta tags for all pages
- Structured data (JSON-LD)
- Sitemap generation (already exists)
- Open Graph images
- Canonical URLs
- Page speed optimization

**Files to Update**:
- Update all page.tsx files with metadata
- `app/sitemap.ts` - Make dynamic
- `lib/seo.ts` - Already exists, use it

**Estimated Effort**: 3-4 hours

---

### 5.5 Accessibility (A11y) ⭐⭐⭐

**What's Needed**:
- ARIA labels
- Keyboard navigation
- Screen reader support
- Color contrast fixes
- Focus indicators
- Alt text for all images

**Estimated Effort**: 4-5 hours

---

## Priority 6: Production Readiness

### 6.1 Email System ⭐⭐⭐⭐

**What's Needed**:
- Order confirmations
- Order status updates
- Vendor approval emails
- Welcome emails
- Password reset emails
- Marketing emails (optional)

**Integration Options**:
- Resend (recommended - modern, good DX)
- SendGrid
- AWS SES

**Estimated Effort**: 4-5 hours

---

### 6.2 Payment Processing ⭐⭐⭐⭐⭐

**Why Critical**: Needed for real transactions.

**Integration Options**:
1. **Stripe** (Recommended)
   - Industry standard
   - Easy integration
   - Good documentation
   - Handles compliance

2. **Square**
   - Good for cannabis if allowed in your region
   - POS integration

**What's Needed**:
- Payment intent creation
- Card payment UI
- Payment status tracking
- Refund handling
- Payment history
- Vendor payouts (marketplace model)

**Files to Create**:
- `app/api/payments/route.ts`
- `components/payments/PaymentForm.tsx`
- Stripe integration in checkout
- Webhook handling for payment events

**Estimated Effort**: 8-10 hours

---

### 6.3 Security Hardening ⭐⭐⭐⭐⭐

**What's Needed**:
- Rate limiting on API routes
- CSRF protection
- SQL injection prevention (RLS handles this)
- XSS protection
- Content Security Policy headers
- Environment variable validation
- API key rotation
- Audit logging for admin actions

**Files to Create**:
- Middleware for rate limiting
- Security headers in next.config.js
- `lib/security.ts` - Security utilities

**Estimated Effort**: 3-4 hours

---

### 6.4 Testing ⭐⭐⭐

**What's Needed**:
- Unit tests for utilities
- Integration tests for API routes
- E2E tests for critical flows
- Test coverage for auth flows
- Database migration testing

**Tools**:
- Vitest for unit tests
- Playwright for E2E
- React Testing Library

**Estimated Effort**: 10-15 hours

---

### 6.5 Documentation ⭐⭐⭐

**What's Needed**:
- API documentation
- Vendor onboarding guide
- Admin manual
- Deployment guide
- Environment setup guide
- Troubleshooting guide

**Estimated Effort**: 4-6 hours

---

## Implementation Timeline

### Phase 1: Core Commerce (2-3 weeks)
1. Product catalog display
2. Working checkout
3. Order management
4. Image uploads
5. Search & filtering

### Phase 2: Enhanced UX (2-3 weeks)
1. Notifications
2. Reviews & ratings
3. Favorites
4. Geolocation
5. Messaging

### Phase 3: Vendor & Admin Tools (2-3 weeks)
1. Complete menu manager
2. Inventory management
3. Analytics dashboards
4. Deals system
5. Vendor approvals
6. Ad placements

### Phase 4: Production Polish (1-2 weeks)
1. Performance optimization
2. Mobile responsiveness
3. Error handling
4. SEO
5. Accessibility

### Phase 5: Launch Prep (1-2 weeks)
1. Email integration
2. Payment processing
3. Security hardening
4. Testing
5. Documentation

**Total Estimated Timeline: 8-13 weeks**

---

## Quick Wins (Can Do Today)

### 1. Make Directory Page Functional (2-3 hours)
- Fetch vendors from database
- Display vendor cards with real data
- Add basic filtering
- Link to vendor pages

### 2. Complete Cart Functionality (2-3 hours)
- Make add to cart work
- Show cart items
- Update quantities
- Calculate totals

### 3. Display Vendor Menus (3-4 hours)
- Show products on listing pages
- Product cards with details
- Add to cart buttons

### 4. Basic Search (2-3 hours)
- Search vendors by name
- Search products
- Display results

### 5. Image Upload for Vendors (2-3 hours)
- Logo upload on profile page
- Supabase storage setup
- Display uploaded images

---

## Technical Debt to Address

1. **Type Safety**: Export AuthUser type from AuthContext
2. **Error Handling**: Add try-catch blocks throughout
3. **Loading States**: Add loading skeletons to all data-fetching components
4. **Code Organization**: Split large components into smaller ones
5. **API Routes**: Create Next.js API routes instead of direct Supabase calls from client
6. **Validation**: Add Zod schemas for all forms
7. **Caching**: Implement React Query or SWR for data fetching
8. **Environment**: Add .env.example file

---

## Metrics to Track

### User Metrics
- Daily/Monthly Active Users
- Customer retention rate
- Average order value
- Cart abandonment rate

### Vendor Metrics
- New vendor signups
- Active vendors
- Average products per vendor
- Vendor satisfaction score

### Platform Metrics
- Total orders
- Total revenue
- Platform take rate
- Search usage
- Most popular products

---

## Next Immediate Steps (Prioritized)

1. **Product Display** - Make the directory and vendor listing pages show real products
2. **Working Cart** - Complete the cart and checkout flow
3. **Order Creation** - Allow customers to place orders
4. **Order Management** - Let vendors process orders
5. **Image Uploads** - Enable vendors to upload product photos

These 5 features will make the platform functionally viable for testing with real users.

---

## Conclusion

The platform has a strong foundation. Focusing on the Priority 1 items (Core Commerce Features) will make it usable. The remaining priorities add polish and scalability.

**Recommended approach**: Start with the "Quick Wins" to see immediate progress, then systematically work through Priority 1 features.
