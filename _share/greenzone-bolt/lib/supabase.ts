import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

/** False on hosts that never received env vars (common cause of a blank deployed page). */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// createClient('','') throws immediately — avoid crashing the whole app on Vercel etc.
const resolvedUrl = supabaseUrl || 'https://placeholder.supabase.co';
const resolvedKey =
  supabaseAnonKey ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.missing-env-placeholder';

export const supabase: SupabaseClient = createClient(resolvedUrl, resolvedKey);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          username: string | null;
          avatar_url: string | null;
          role: 'customer' | 'vendor' | 'admin';
          phone: string | null;
          city: string | null;
          zip_code: string | null;
          id_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          username?: string | null;
          avatar_url?: string | null;
          role?: 'customer' | 'vendor' | 'admin';
          phone?: string | null;
          city?: string | null;
          zip_code?: string | null;
          id_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          username?: string | null;
          avatar_url?: string | null;
          role?: 'customer' | 'vendor' | 'admin';
          phone?: string | null;
          city?: string | null;
          zip_code?: string | null;
          id_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      delivery_services: {
        Row: {
          id: string;
          owner_id: string | null;
          name: string;
          slug: string;
          logo_url: string | null;
          banner_url: string | null;
          description: string | null;
          phone: string | null;
          email: string | null;
          license_number: string | null;
          min_order: number;
          delivery_fee: number;
          average_delivery_time: number;
          rating: number;
          total_reviews: number;
          is_active: boolean;
          is_featured: boolean;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      products: {
        Row: {
          id: string;
          service_id: string;
          category_id: string;
          name: string;
          slug: string;
          description: string | null;
          image_url: string | null;
          price: number;
          sale_price: number | null;
          thc_percentage: number | null;
          cbd_percentage: number | null;
          weight: string | null;
          strain_type: string | null;
          in_stock: boolean;
          is_featured: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      product_categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          icon: string | null;
          sort_order: number;
          created_at: string;
        };
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          user_id: string;
          service_id: string;
          status: string;
          subtotal: number;
          delivery_fee: number;
          tax: number;
          total: number;
          delivery_address: string;
          delivery_city: string;
          delivery_zip: string;
          phone: string;
          notes: string | null;
          stripe_payment_id: string | null;
          estimated_delivery: string | null;
          delivered_at: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          user_id: string;
          service_id: string;
          order_id: string | null;
          rating: number;
          comment: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      cities: {
        Row: {
          id: string;
          name: string;
          slug: string;
          state: string;
          service_count: number;
          meta_title: string | null;
          meta_description: string | null;
          created_at: string;
        };
      };
      vendor_lead_applications: {
        Row: {
          id: string;
          created_at: string;
          business_name: string;
          contact_email: string;
          contact_phone: string;
          zip: string;
          license_number: string | null;
          status: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          created_vendor_id: string | null;
          admin_notes: string | null;
        };
        Insert: {
          business_name: string;
          contact_email: string;
          contact_phone: string;
          zip: string;
          license_number?: string | null;
        };
        Update: {
          status?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          created_vendor_id?: string | null;
          admin_notes?: string | null;
        };
      };
    };
  };
};
