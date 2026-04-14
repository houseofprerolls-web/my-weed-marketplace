# GreenZone Complete Implementation Strategy

## Overview

This document outlines the systematic approach to completing the GreenZone cannabis marketplace platform. Based on the comprehensive audit, we have a 65% complete platform that needs critical frontend-backend connectivity and workflow completion.

---

## Current Status Summary

### ✅ What's Complete (65%)
- Database schema (53 tables)
- Authentication system
- RBAC infrastructure
- Basic page structure
- Demo account system
- Analytics tracking tables
- Permission utilities
- Route guards

### ❌ What's Missing (35%)
- Frontend-backend connectivity
- Working product display
- Functional cart and checkout
- Order management workflows
- Admin approval systems
- Legal pages
- Comprehensive seed data

---

## Implementation Phases

### PHASE 1: Core Commerce (CRITICAL - Week 1)
**Goal**: Make the marketplace transactional

#### 1.1 Product Display System
**Files to Create/Update**:
- ✅ `/components/products/ProductCard.tsx` - CREATED
- ✅ `/components/products/ProductGrid.tsx` - CREATED
- `/app/listing/[id]/page.tsx` - UPDATE to show real products
- `/lib/products.ts` - Product fetching utilities

**Database Queries**:
```sql
-- Fetch vendor products
SELECT * FROM vendor_products
WHERE vendor_id = $1 AND stock_status != 'out_of_stock'
ORDER BY is_featured DESC, created_at DESC;

-- Fetch products by category
SELECT * FROM vendor_products
WHERE vendor_id = $1 AND category_id = $2
ORDER BY sort_order, name;
```

**Tasks**:
1. Update listing page to fetch products from vendor_products table
2. Display products in grid layout
3. Show product images, prices, THC/CBD content
4. Add category filtering
5. Show stock status

---

#### 1.2 Shopping Cart System
**Files to Create**:
- `/lib/cart.ts` - Cart utilities
- `/components/cart/CartItem.tsx` - Cart item display
- `/components/cart/CartSummary.tsx` - Order summary

**Files to Update**:
- `/contexts/CartContext.tsx` - Add database persistence
- `/app/cart/page.tsx` - Connect to real data

**Database Operations**:
```typescript
// Add to cart
INSERT INTO cart_items (user_id, vendor_id, product_id, quantity, price_at_add)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (user_id, product_id)
DO UPDATE SET quantity = cart_items.quantity + $4;

// Get cart items
SELECT ci.*, vp.name, vp.images, vp.stock_status, v.business_name
FROM cart_items ci
JOIN vendor_products vp ON ci.product_id = vp.id
JOIN vendor_profiles v ON ci.vendor_id = v.id
WHERE ci.user_id = $1;

// Update quantity
UPDATE cart_items SET quantity = $1, updated_at = now()
WHERE id = $2 AND user_id = $3;

// Remove item
DELETE FROM cart_items WHERE id = $1 AND user_id = $2;

// Clear cart
DELETE FROM cart_items WHERE user_id = $1;
```

**Tasks**:
1. Implement add to cart functionality
2. Save cart to database
3. Load cart on page refresh
4. Update quantities
5. Remove items
6. Calculate totals
7. Handle out of stock items

---

#### 1.3 ID Upload Component
**Files to Create**:
- `/components/checkout/IDUpload.tsx` - ID upload component
- `/lib/storage.ts` - Supabase storage utilities

**Supabase Storage Setup**:
```typescript
// Create storage buckets
await supabase.storage.createBucket('id-documents', {
  public: false,
  fileSizeLimit: 5242880, // 5MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
});

// RLS Policies
CREATE POLICY "Users can upload own ID documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'id-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own ID documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'id-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
```

**Component Features**:
- Drag and drop upload
- Preview uploaded image
- Validation (file type, size)
- Upload progress indicator
- Delete uploaded file

---

#### 1.4 Complete Checkout Flow
**Files to Update**:
- `/app/checkout/page.tsx` - Add ID requirement
- `/app/checkout/confirmation/page.tsx` - Show order details

**Checkout Process**:
```typescript
// 1. Validate cart has items
// 2. Require ID upload
// 3. Collect delivery info
// 4. Calculate totals
// 5. Create order
// 6. Save order items
// 7. Save ID document reference
// 8. Clear cart
// 9. Show confirmation
```

**Database Operations**:
```sql
-- Create order
INSERT INTO orders (
  user_id, vendor_id, customer_name, phone, address,
  apartment_unit, city, state, zip_code, delivery_notes,
  preferred_delivery_time, subtotal, tax, delivery_fee, total, status
) VALUES (...) RETURNING id;

-- Create order items
INSERT INTO order_items (order_id, product_id, quantity, price, product_name)
SELECT $1, product_id, quantity, price_at_add, vp.name
FROM cart_items ci
JOIN vendor_products vp ON ci.product_id = vp.id
WHERE ci.user_id = $2;

-- Save ID document
INSERT INTO order_documents (order_id, uploaded_by, document_type, file_url)
VALUES ($1, $2, $3, $4);

-- Clear cart
DELETE FROM cart_items WHERE user_id = $1;
```

---

#### 1.5 Order Management (Customer Side)
**Files to Update**:
- `/app/account/orders/page.tsx` - List all orders
- `/app/account/orders/[id]/page.tsx` - Order details

**Features**:
- Order history list
- Status tracking
- Order timeline
- View items ordered
- Delivery tracking
- Cancel order (if allowed)
- Reorder functionality

**Database Queries**:
```sql
-- Get customer orders
SELECT o.*, v.business_name, v.logo_url
FROM orders o
JOIN vendor_profiles v ON o.vendor_id = v.id
WHERE o.user_id = $1
ORDER BY o.created_at DESC;

-- Get order details
SELECT o.*,
  json_agg(
    json_build_object(
      'id', oi.id,
      'product_name', oi.product_name,
      'quantity', oi.quantity,
      'price', oi.price
    )
  ) as items
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.id = $1 AND o.user_id = $2
GROUP BY o.id;

-- Get order status history
SELECT * FROM order_status_history
WHERE order_id = $1
ORDER BY created_at ASC;
```

---

### PHASE 2: Vendor Operations (Week 2)

#### 2.1 Vendor Menu Manager
**Files to Update**:
- `/app/vendor/menu/page.tsx` - Product management
- `/app/vendor/menu/categories/page.tsx` - Category management

**Features**:
- Add new products
- Edit existing products
- Upload product images
- Set pricing
- Manage inventory
- Toggle product visibility
- Bulk operations

**Forms Needed**:
- Product form (name, brand, description, price, THC%, CBD%, weight)
- Image upload (multiple)
- Category selection
- Stock status

---

#### 2.2 Vendor Order Management
**Files to Update**:
- `/app/vendor/orders/page.tsx` - Orders inbox
- `/app/vendor/orders/[id]/page.tsx` - Order details

**Features**:
- Incoming orders (real-time)
- Order notifications
- View customer details
- View uploaded ID document
- Update order status
- Order history
- Filter by status
- Search orders

**Status Flow**:
```
pending → received → preparing → out_for_delivery → completed
                                              ↓
                                          canceled
```

---

#### 2.3 Vendor Onboarding
**Files to Update**:
- `/app/vendor/onboarding/page.tsx` - Multi-step form

**Steps**:
1. Business Information
2. Location & Contact
3. Business Hours
4. License Upload
5. Logo & Photos
6. Plan Selection
7. Submit for Review

**Database Updates**:
- Create vendor_profile
- Upload business_license
- Upload logo to storage
- Set approval_status = 'pending'
- Create employee_task for admin review

---

### PHASE 3: Admin Operations (Week 3)

#### 3.1 Vendor Approval Workflow
**Files to Create**:
- `/app/admin/vendors/page.tsx` - Vendor list
- `/app/admin/vendors/[id]/page.tsx` - Vendor review
- `/components/admin/VendorApprovalModal.tsx` - Approval UI

**Features**:
- List pending vendors
- View vendor application
- Review license documents
- Approve or reject
- Add internal notes
- Send email notification
- Create task for follow-up

---

#### 3.2 Content Moderation
**Files to Create**:
- `/app/admin/content/page.tsx` - Moderation queue
- `/components/admin/ModerationCard.tsx` - Content review

**Features**:
- Review reported content
- Flag inappropriate content
- Delete content
- Suspend users
- Add warnings

---

#### 3.3 Internal Task System
**Files to Create**:
- `/app/admin/tasks/page.tsx` - Task management
- `/components/admin/TaskCard.tsx` - Task display

**Features**:
- Create tasks
- Assign to admins
- Set priority and due date
- Track status
- Link to related entities
- Filter and search

---

### PHASE 4: Legal & Launch Prep (Week 4)

#### 4.1 Legal Pages
**Files to Create**:
- `/app/privacy/page.tsx` - Privacy Policy
- `/app/terms/page.tsx` - Terms of Service
- `/app/vendor-terms/page.tsx` - Vendor Agreement
- `/app/advertising-policy/page.tsx` - Advertising Policy
- `/app/order-policy/page.tsx` - Order & Refund Policy
- `/app/community-guidelines/page.tsx` - Community Guidelines
- `/app/help/page.tsx` - Help Center
- `/app/contact/page.tsx` - Contact Page

**Content Required**:
- Legal text for each policy
- Last updated dates
- Contact information
- FAQ section for help center

---

#### 4.2 Professional Footer
**Files to Create**:
- `/components/Footer.tsx` - Site footer

**Sections**:
- Company info
- Quick links
- Legal links
- Social media
- Newsletter signup
- Copyright notice

---

#### 4.3 Seed Data
**Files to Create**:
- `/supabase/functions/seed-marketplace-data/index.ts` - Data seeding

**Data to Seed**:
```typescript
// Vendors (10-15)
const vendors = [
  {
    business_name: "GreenLeaf Dispensary",
    business_type: "dispensary",
    city: "San Francisco",
    state: "CA",
    is_approved: true,
    approval_status: "approved"
  },
  {
    business_name: "Sunset Cannabis Delivery",
    business_type: "delivery",
    city: "Los Angeles",
    state: "CA",
    is_approved: true,
    approval_status: "approved"
  },
  {
    business_name: "Highway 420 Collective",
    business_type: "dispensary",
    city: "San Diego",
    state: "CA",
    is_approved: true,
    approval_status: "approved"
  }
];

// Products (50-100)
const productCategories = [
  "Flower",
  "Edibles",
  "Concentrates",
  "Vapes",
  "Tinctures",
  "Topicals"
];

const sampleProducts = [
  {
    name: "Blue Dream",
    category: "Flower",
    price: 45,
    thc_percentage: 22,
    weight: "3.5g"
  },
  {
    name: "Chocolate Bar 100mg",
    category: "Edibles",
    price: 25,
    thc_percentage: null
  }
];

// Reviews (50-100)
// Deals (10-20)
// Orders (20-30)
```

---

## Quick Implementation Checklist

### Day 1: Product Display
- [ ] Update listing page to fetch products
- [ ] Display products in grid
- [ ] Add category filtering
- [ ] Test with sample data

### Day 2-3: Cart System
- [ ] Implement add to cart
- [ ] Save cart to database
- [ ] Build cart page UI
- [ ] Add quantity controls
- [ ] Calculate totals

### Day 4: ID Upload & Checkout
- [ ] Create ID upload component
- [ ] Setup Supabase storage
- [ ] Update checkout form
- [ ] Implement order creation
- [ ] Test full checkout flow

### Day 5: Customer Orders
- [ ] Build order history page
- [ ] Create order detail page
- [ ] Add status tracking
- [ ] Test order display

### Day 6-7: Vendor Menu Manager
- [ ] Build product add form
- [ ] Implement image upload
- [ ] Create product list
- [ ] Add edit/delete

### Day 8-9: Vendor Orders
- [ ] Build orders inbox
- [ ] Add status update UI
- [ ] Show customer ID
- [ ] Test order workflow

### Day 10: Vendor Onboarding
- [ ] Build multi-step form
- [ ] Add license upload
- [ ] Implement submission

### Day 11-12: Admin Approval
- [ ] Build vendor review page
- [ ] Create approval modal
- [ ] Add email notifications
- [ ] Test approval flow

### Day 13: Legal Pages
- [ ] Create all policy pages
- [ ] Build footer component
- [ ] Add to all pages

### Day 14: Seed & Test
- [ ] Create seed data script
- [ ] Run complete flow tests
- [ ] Fix any bugs
- [ ] Final build

---

## Database Queries Reference

### Essential Queries to Implement

#### Products
```typescript
// Get vendor products
export async function getVendorProducts(vendorId: string) {
  return await supabase
    .from('vendor_products')
    .select(`
      *,
      vendor_menu_categories(name)
    `)
    .eq('vendor_id', vendorId)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false });
}

// Get products by category
export async function getProductsByCategory(vendorId: string, categoryId: string) {
  return await supabase
    .from('vendor_products')
    .select('*')
    .eq('vendor_id', vendorId)
    .eq('category_id', categoryId)
    .order('name');
}
```

#### Cart
```typescript
// Add to cart
export async function addToCart(userId: string, productId: string, quantity: number) {
  const { data: product } = await supabase
    .from('vendor_products')
    .select('*')
    .eq('id', productId)
    .single();

  return await supabase
    .from('cart_items')
    .upsert({
      user_id: userId,
      vendor_id: product.vendor_id,
      product_id: productId,
      quantity,
      price_at_add: product.sale_price || product.price
    });
}

// Get cart
export async function getCart(userId: string) {
  return await supabase
    .from('cart_items')
    .select(`
      *,
      vendor_products(*),
      vendor_profiles(business_name, logo_url)
    `)
    .eq('user_id', userId);
}
```

#### Orders
```typescript
// Create order
export async function createOrder(orderData: OrderInput) {
  // 1. Create order
  const { data: order } = await supabase
    .from('orders')
    .insert(orderData)
    .select()
    .single();

  // 2. Get cart items
  const { data: cartItems } = await supabase
    .from('cart_items')
    .select('*, vendor_products(name)')
    .eq('user_id', orderData.user_id);

  // 3. Create order items
  const orderItems = cartItems.map(item => ({
    order_id: order.id,
    product_id: item.product_id,
    quantity: item.quantity,
    price: item.price_at_add,
    product_name: item.vendor_products.name
  }));

  await supabase.from('order_items').insert(orderItems);

  // 4. Clear cart
  await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', orderData.user_id);

  return order;
}
```

---

## Success Criteria

### Customer Flow Complete ✓
- [ ] Can browse vendors
- [ ] Can view products
- [ ] Can add to cart
- [ ] Can upload ID
- [ ] Can complete checkout
- [ ] Can track order
- [ ] Can leave review

### Vendor Flow Complete ✓
- [ ] Can complete onboarding
- [ ] Can add products
- [ ] Can manage menu
- [ ] Can receive orders
- [ ] Can update order status
- [ ] Can view analytics

### Admin Flow Complete ✓
- [ ] Can approve vendors
- [ ] Can review licenses
- [ ] Can moderate content
- [ ] Can assign placements
- [ ] Can view analytics
- [ ] Can manage tasks

---

## Next Immediate Action

**START HERE**:
1. Create seed data for testing
2. Update listing page with product display
3. Implement add to cart
4. Build checkout with ID upload
5. Create vendor menu manager
6. Build order management
7. Add admin approval workflow
8. Create legal pages
9. Test everything
10. Deploy

---

## Notes

- Use TypeScript for type safety
- Add proper error handling
- Implement loading states
- Add success/error toasts
- Mobile responsive design
- Test on real devices
- Performance optimization
- Security audit before launch

This is a production-ready roadmap. Follow systematically for best results.
