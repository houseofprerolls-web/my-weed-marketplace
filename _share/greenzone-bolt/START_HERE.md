# 🚀 Start Here - GreenZone Development Guide

**Last Updated**: March 8, 2026
**Build Status**: ✅ Passing
**Completion**: 70%

---

## Quick Overview

GreenZone is a cannabis marketplace platform with customers, vendors, and admins. The database and authentication are complete. The main work needed is connecting the frontend to backend for core commerce features.

---

## Current Status

### ✅ What Works
- User authentication and registration
- Role-based access control (customer, vendor, admin)
- All pages exist and render
- Database schema (65 tables) complete
- Legal pages and footer
- Demo system with role switching

### ❌ What Needs Work
- Product display on vendor pages
- Shopping cart functionality
- Checkout and order creation
- Vendor menu management
- Admin approval workflows
- Image upload system

---

## 📚 Essential Documents

**Read these in order:**

1. **GREENZONE_COMPLETION_STATUS.md** ← Comprehensive status report
2. **IMPLEMENTATION_STRATEGY.md** ← 4-week implementation roadmap
3. **COMPLETE_PLATFORM_AUDIT.md** ← Detailed system analysis
4. **PLATFORM_COMPLETION_ROADMAP.md** ← Feature breakdown

---

## 🎯 Next 3 Tasks (In Order)

### 1. Display Products on Vendor Pages (4 hours)

**File**: `app/listing/[id]/page.tsx`

**What to do**:
```typescript
// Add this after loadBusiness()
async function loadProducts() {
  const { data, error } = await supabase
    .from('vendor_products')
    .select(`
      *,
      vendor_menu_categories(name)
    `)
    .eq('vendor_id', businessId)
    .order('is_featured', { ascending: false });

  if (!error) setProducts(data || []);
}

// In the JSX, add:
<ProductGrid
  products={products}
  onAddToCart={handleAddToCart}
/>
```

**Components already created**:
- `components/products/ProductCard.tsx`
- `components/products/ProductGrid.tsx`

---

### 2. Make Cart Functional (6 hours)

**Files**:
- `contexts/CartContext.tsx`
- `app/cart/page.tsx`

**Database table**: `cart_items`

**What to do**:

Add to cart function:
```typescript
async function addToCart(product: Product) {
  if (!user) {
    router.push('/?login=true');
    return;
  }

  await supabase.from('cart_items').upsert({
    user_id: user.id,
    vendor_id: product.vendor_id,
    product_id: product.id,
    quantity: 1,
    price_at_add: product.sale_price || product.price
  });

  toast.success('Added to cart');
}
```

Load cart:
```typescript
async function loadCart() {
  const { data } = await supabase
    .from('cart_items')
    .select(`
      *,
      vendor_products(*),
      vendor_profiles(business_name)
    `)
    .eq('user_id', user.id);

  setCartItems(data || []);
}
```

---

### 3. Build ID Upload Component (4 hours)

**Create**: `components/checkout/IDUpload.tsx`

**First, setup Supabase Storage**:
```sql
-- In Supabase dashboard: Storage > Create bucket "id-documents"
-- Set to private
-- Add RLS policy
```

**Component**:
```typescript
export function IDUpload({ onUpload }: { onUpload: (url: string) => void }) {
  async function handleUpload(file: File) {
    const fileName = `${user.id}/${Date.now()}-${file.name}`;

    const { data, error } = await supabase.storage
      .from('id-documents')
      .upload(fileName, file);

    if (!error) {
      const { data: { publicUrl } } = supabase.storage
        .from('id-documents')
        .getPublicUrl(fileName);

      onUpload(publicUrl);
    }
  }

  return (
    <div>
      <input type="file" accept="image/*,application/pdf" onChange={handleUpload} />
    </div>
  );
}
```

---

## 🗄️ Database Quick Reference

### Key Tables

**Users & Auth**
- `profiles` - User profiles
- `user_roles` - Role assignments (customer, vendor, admin)

**Vendors**
- `vendor_profiles` - Vendor business info
- `vendor_products` - Products in menus
- `vendor_menu_categories` - Product categories

**Orders**
- `orders` - Customer orders
- `order_items` - Products in each order
- `order_documents` - Uploaded ID documents
- `cart_items` - Shopping cart items

**Analytics**
- `analytics_events` - Track all events
- `search_logs` - Search queries
- `click_events` - Click tracking

---

## 🔑 Common Queries

### Get Vendor Products
```typescript
const { data } = await supabase
  .from('vendor_products')
  .select('*')
  .eq('vendor_id', vendorId)
  .order('is_featured', { ascending: false });
```

### Get Cart Items
```typescript
const { data } = await supabase
  .from('cart_items')
  .select('*, vendor_products(*), vendor_profiles(business_name)')
  .eq('user_id', userId);
```

### Create Order
```typescript
const { data: order } = await supabase
  .from('orders')
  .insert({
    user_id: userId,
    vendor_id: vendorId,
    customer_name: name,
    phone: phone,
    address: address,
    city: city,
    state: state,
    zip_code: zipCode,
    subtotal: subtotal,
    tax: tax,
    delivery_fee: deliveryFee,
    total: total,
    status: 'pending'
  })
  .select()
  .single();
```

---

## 🛠️ Development Commands

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Type check
npm run typecheck

# Lint
npm run lint
```

---

## 🎨 Component Library

We use **shadcn/ui** components. They're already installed.

Common components:
- `Button` from `@/components/ui/button`
- `Card` from `@/components/ui/card`
- `Input` from `@/components/ui/input`
- `Badge` from `@/components/ui/badge`
- `Dialog` from `@/components/ui/dialog`

---

## 🔐 Authentication

**Current user**:
```typescript
const { user, loading, isVendor, isAdmin } = useAuth();
```

**User object includes**:
```typescript
{
  id: string;
  email: string;
  roles: UserRole[]; // ['customer', 'vendor', 'admin']
  vendorId?: string; // If user is a vendor
}
```

---

## 🧪 Demo Accounts

**Customer**:
- email: `customer@greenzone.demo`
- password: Check `DEMO_ACCOUNTS.md`

**Vendor**:
- email: `greenleaf.vendor@greenzone.demo`
- password: Check `DEMO_ACCOUNTS.md`

**Admin**:
- email: `admin@greenzone.demo`
- password: Check `DEMO_ACCOUNTS.md`

**Role Switcher**: Available in demo mode to test different roles

---

## 📁 File Structure

```
/app
  /account         → Customer account pages
  /vendor          → Vendor dashboard
  /admin           → Admin dashboard
  /listing/[id]    → Vendor storefront
  /checkout        → Checkout flow
  (privacy, terms, help, contact) → Legal pages

/components
  /products        → Product display components
  /ui              → shadcn/ui components
  /auth            → Auth components
  /cart            → Cart components (to be created)
  /checkout        → Checkout components (to be created)

/contexts
  /AuthContext     → User authentication
  /CartContext     → Shopping cart state

/lib
  /supabase        → Supabase client
  /permissions     → RBAC utilities
  /analytics       → Event tracking

/supabase/migrations → Database migrations
```

---

## 🚨 Common Issues

### Build Fails
- Make sure `supabase/functions` is excluded in `tsconfig.json`
- Run `npm install` if dependencies are missing

### Auth Not Working
- Check `.env` file has Supabase keys
- Verify Supabase project is running
- Check RLS policies in Supabase dashboard

### Products Not Showing
- Verify vendor has products in `vendor_products` table
- Check RLS policies allow public read
- Ensure product `stock_status` is not 'out_of_stock'

---

## 📞 Need Help?

1. Check the implementation docs listed above
2. Review similar working pages in the codebase
3. Check Supabase dashboard for data issues
4. Verify RLS policies aren't blocking queries

---

## ✅ Daily Checklist

Before starting work:
- [ ] Pull latest code
- [ ] Run `npm install`
- [ ] Run `npm run build` to verify build works
- [ ] Check Supabase connection

Before committing:
- [ ] Run `npm run build`
- [ ] Test your changes in browser
- [ ] Check for TypeScript errors
- [ ] Verify RLS policies if touching database

---

## 🎯 Critical Path

**This Week**:
1. Display products on vendor pages ← START HERE
2. Make cart functional
3. Create ID upload component
4. Enable checkout and order creation

**Next Week**:
1. Vendor menu manager (add/edit products)
2. Vendor order management
3. Admin vendor approval

**Week 3**:
1. Search and filtering
2. Image upload system
3. Notifications

---

## 📊 Progress Tracking

Track your progress against:
- Week 1 goals in `IMPLEMENTATION_STRATEGY.md`
- Success criteria in `GREENZONE_COMPLETION_STATUS.md`
- Task checklist in implementation docs

---

## 🎉 When You're Done

The platform is ready when:
- ✅ Customer can browse products
- ✅ Customer can add to cart
- ✅ Customer can upload ID
- ✅ Customer can checkout
- ✅ Vendor can add products
- ✅ Vendor can receive orders
- ✅ Admin can approve vendors

**Good luck building! 🚀**
