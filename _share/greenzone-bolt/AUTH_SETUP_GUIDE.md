# Authentication & Role-Based Access Setup Guide

Your GreenFinder platform now has a complete authentication system with role-based access control.

## Overview

The authentication system supports three user roles:
- **Customer**: Browse products, place orders, write reviews
- **Vendor**: Manage products, view orders, access vendor dashboard
- **Admin**: Full platform access, manage placements, view all data

## Database Setup

### Profile Schema

The `profiles` table has been enhanced with:
- `role`: User role (customer, vendor, or admin) - defaults to 'customer'
- `username`: Optional unique username
- `avatar_url`: Profile picture URL
- Automatic profile creation via database trigger when users sign up

### Row Level Security (RLS)

All profiles are protected with RLS policies:
- Users can view and update their own profile
- Users cannot change their own role (only admins can)
- Admins can view all profiles
- Public can view vendor profiles
- Profiles are automatically created on user signup

## Using Authentication in Your App

### 1. Auth Context

The `AuthContext` provides authentication state and methods:

```tsx
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, profile, loading, signIn, signOut, refreshProfile } = useAuth();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {profile && (
        <p>Welcome {profile.full_name} ({profile.role})</p>
      )}
    </div>
  );
}
```

### 2. Role-Based Access

Use the `useRole` hook for role checks:

```tsx
import { useRole } from '@/hooks/useRole';

function MyComponent() {
  const { role, isVendor, isAdmin, canAccessVendorDashboard } = useRole();

  if (canAccessVendorDashboard) {
    return <VendorDashboard />;
  }

  return <CustomerView />;
}
```

### 3. Permission Checks

Use the permissions library for fine-grained access control:

```tsx
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { profile } = useAuth();

  const canManageMenu = hasPermission(profile?.role, PERMISSIONS.MANAGE_MENU);

  return (
    <div>
      {canManageMenu && <MenuEditor />}
    </div>
  );
}
```

## Protected Routes

Routes are automatically protected based on role:

### Customer Routes
- `/account`
- `/account/orders`
- `/checkout`

### Vendor Routes
- `/vendor/dashboard`
- `/vendor/menu`
- `/vendor/orders`
- `/vendor/deals`
- `/vendor/profile`
- `/vendor/advertising`
- `/vendor/billing`

### Admin Routes
- `/admin`
- `/admin/dashboard`
- `/admin/placements`
- `/admin/sales-dashboard`

## Sign Up Flow

Users can select their account type during signup:
1. Customer (default) - For browsing and ordering
2. Vendor - For selling products

Admin accounts must be created manually in the database.

## Creating Admin Users

To create an admin user, update the role in the database:

```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'admin@example.com';
```

## Helper Functions

The database includes helper functions:

- `get_user_role(user_id)`: Get a user's role
- `has_role(required_role)`: Check if current user has a specific role
- `is_admin()`: Check if current user is an admin

## Testing

Demo accounts are available in the sign-in modal:
- **Vendor**: greenleaf@greenzone.demo / GreenZone123!
- **Customer**: customer@greenzone.demo / GreenZone123!

## Security Notes

1. User roles are stored in the database and cannot be changed by users themselves
2. Only admins can modify user roles
3. All routes are protected by the RouteGuard component
4. RLS policies ensure data access is restricted appropriately
5. Profile creation is automatic via database trigger

## Next Steps

1. Test authentication by creating a new account
2. Verify role-based access by testing different user types
3. Customize permissions in `/lib/permissions.ts`
4. Add custom profile fields as needed
5. Implement email verification if required
