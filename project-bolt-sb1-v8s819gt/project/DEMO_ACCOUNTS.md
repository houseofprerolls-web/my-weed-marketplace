# GreenZone Demo Accounts Setup

## Required Demo Accounts

To test the branded vendor experience, create these accounts in Supabase:

### 1. GreenLeaf Dispensary (Vendor Account)
**Email:** greenleaf@greenzone.demo
**Password:** GreenZone123!
**Role:** vendor
**Business:** GreenLeaf Dispensary
**Plan:** Premium
**City:** Los Angeles, CA

### 2. Customer Account
**Email:** customer@greenzone.demo
**Password:** GreenZone123!
**Role:** customer
**Name:** Jamie Carter

### 3. Sunset Cannabis (Vendor Account) - Optional
**Email:** sunset@greenzone.demo
**Password:** GreenZone123!
**Role:** vendor
**Business:** Sunset Cannabis Delivery
**Plan:** Growth
**City:** San Diego, CA

### 4. Highway 420 (Vendor Account) - Optional
**Email:** highway420@greenzone.demo
**Password:** GreenZone123!
**Role:** vendor
**Business:** Highway 420 Collective
**Plan:** Starter
**City:** Las Vegas, NV

---

## Setup Instructions

### Step 1: Create Auth Users in Supabase

Go to your Supabase dashboard:
1. Navigate to **Authentication** > **Users**
2. Click **Add user** > **Create new user**
3. Create each account with email and password above
4. Confirm each email automatically in the dashboard

### Step 2: Assign Roles

After creating auth users, run this SQL in Supabase SQL Editor:

```sql
-- Get the user IDs
SELECT id, email FROM auth.users WHERE email LIKE '%greenzone.demo';

-- Then insert roles (replace the UUIDs with actual user IDs)
INSERT INTO user_roles (user_id, role)
VALUES
  ('USER_ID_FOR_GREENLEAF', 'vendor'),
  ('USER_ID_FOR_CUSTOMER', 'customer'),
  ('USER_ID_FOR_SUNSET', 'vendor'),
  ('USER_ID_FOR_HIGHWAY420', 'vendor');
```

### Step 3: Create Vendor Profiles

```sql
-- Create GreenLeaf Dispensary vendor profile
INSERT INTO vendor_profiles (
  user_id,
  business_name,
  business_type,
  description,
  address,
  city,
  state,
  zip_code,
  phone,
  website,
  email,
  is_verified,
  is_approved,
  approval_status,
  plan_type,
  profile_views,
  listing_views,
  website_clicks,
  phone_clicks,
  direction_clicks,
  favorites_count
)
VALUES (
  'USER_ID_FOR_GREENLEAF',
  'GreenLeaf Dispensary',
  'dispensary',
  'Premium cannabis dispensary offering top-shelf flower, edibles, and concentrates.',
  '1234 Main Street',
  'Los Angeles',
  'CA',
  '90001',
  '(555) 123-4567',
  'https://greenleaf-dispensary.com',
  'contact@greenleaf-dispensary.com',
  true,
  true,
  'approved',
  'premium',
  12847,
  8653,
  1247,
  892,
  2341,
  437
);
```

### Step 4: Test Login

1. Go to GreenZone homepage
2. Click **Sign In** button
3. Click **Demo Vendor: GreenLeaf Dispensary** button
4. Click **Sign In**
5. Navigate to `/vendor/dashboard` to see branded dashboard

---

## What You'll See After Login

### As GreenLeaf Dispensary Vendor:
- Dashboard header shows "GreenLeaf Dispensary" with logo initial "G"
- Sidebar shows business name and "Premium Plan"
- "Active & Verified" badge
- All metrics displayed with business branding
- Professional, non-generic interface

### As Customer:
- Normal customer account experience
- Can browse, save favorites, leave reviews
- No access to vendor dashboard

---

## Quick Demo Login (Already Built In)

The login modal now includes quick demo buttons:
- "Demo Vendor: GreenLeaf Dispensary" - auto-fills vendor credentials
- "Demo Customer: Jamie Carter" - auto-fills customer credentials

Just click the button and then click "Sign In"!
