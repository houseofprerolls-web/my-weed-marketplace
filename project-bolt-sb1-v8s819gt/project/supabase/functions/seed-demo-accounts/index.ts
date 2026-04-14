import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DemoAccount {
  email: string;
  password: string;
  full_name: string;
  role: string;
  vendor_data?: {
    business_name: string;
    business_type: string;
    plan_type: string;
    description: string;
    city: string;
    state: string;
    address: string;
    phone: string;
  };
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: "customer@greenzone.demo",
    password: "GreenZone123!",
    full_name: "Demo Customer",
    role: "customer",
  },
  {
    email: "greenleaf.vendor@greenzone.demo",
    password: "GreenZone123!",
    full_name: "GreenLeaf Owner",
    role: "vendor",
    vendor_data: {
      business_name: "GreenLeaf Dispensary",
      business_type: "dispensary",
      plan_type: "premium",
      description: "Premium cannabis products with expert guidance. Family-owned and operated since 2018.",
      city: "Los Angeles",
      state: "CA",
      address: "123 Green Street",
      phone: "(310) 555-0001",
    },
  },
  {
    email: "sunset.vendor@greenzone.demo",
    password: "GreenZone123!",
    full_name: "Sunset Owner",
    role: "vendor",
    vendor_data: {
      business_name: "Sunset Cannabis Delivery",
      business_type: "delivery",
      plan_type: "featured",
      description: "Fast, discreet delivery service. Order online and get premium products delivered to your door.",
      city: "San Francisco",
      state: "CA",
      address: "456 Sunset Blvd",
      phone: "(415) 555-0002",
    },
  },
  {
    email: "highway420.vendor@greenzone.demo",
    password: "GreenZone123!",
    full_name: "Highway 420 Owner",
    role: "vendor",
    vendor_data: {
      business_name: "Highway 420 Collective",
      business_type: "dispensary",
      plan_type: "basic",
      description: "Community-focused collective offering quality products and education.",
      city: "San Diego",
      state: "CA",
      address: "789 Highway 420",
      phone: "(619) 555-0003",
    },
  },
  {
    email: "admin@greenzone.demo",
    password: "GreenZone123!",
    full_name: "Platform Administrator",
    role: "admin",
  },
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const results = [];

    for (const account of DEMO_ACCOUNTS) {
      try {
        const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
        const userExists = existingUser?.users?.some(u => u.email === account.email);

        let userId: string;

        if (userExists) {
          const existing = existingUser?.users?.find(u => u.email === account.email);
          userId = existing!.id;
          results.push({ email: account.email, status: "already_exists", user_id: userId });
        } else {
          const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: account.email,
            password: account.password,
            email_confirm: true,
            user_metadata: {
              full_name: account.full_name,
            },
          });

          if (authError) {
            results.push({ email: account.email, status: "error", error: authError.message });
            continue;
          }

          userId = authData.user!.id;

          const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .insert({
              id: userId,
              email: account.email,
              full_name: account.full_name,
              id_verified: true,
            });

          if (profileError && profileError.code !== "23505") {
            results.push({ email: account.email, status: "error", error: profileError.message });
            continue;
          }

          if (account.role !== "customer") {
            const { error: roleError } = await supabaseAdmin
              .from("user_roles")
              .insert({
                user_id: userId,
                role: account.role,
              });

            if (roleError && roleError.code !== "23505") {
              console.error(`Role assignment error for ${account.email}:`, roleError);
            }
          }

          if (account.role === "admin") {
            const { error: customerRoleError } = await supabaseAdmin
              .from("user_roles")
              .insert({
                user_id: userId,
                role: "customer",
              });

            if (customerRoleError && customerRoleError.code !== "23505") {
              console.error(`Customer role error for admin:`, customerRoleError);
            }
          }

          if (account.vendor_data) {
            const { error: vendorError } = await supabaseAdmin
              .from("vendor_profiles")
              .insert({
                user_id: userId,
                business_name: account.vendor_data.business_name,
                business_type: account.vendor_data.business_type,
                plan_type: account.vendor_data.plan_type,
                description: account.vendor_data.description,
                city: account.vendor_data.city,
                state: account.vendor_data.state,
                address: account.vendor_data.address,
                phone: account.vendor_data.phone,
                email: account.email,
                is_verified: true,
                is_approved: true,
                approval_status: "approved",
                approved_at: new Date().toISOString(),
              });

            if (vendorError && vendorError.code !== "23505") {
              results.push({ email: account.email, status: "vendor_profile_error", error: vendorError.message });
              continue;
            }
          }

          results.push({ email: account.email, status: "created", user_id: userId });
        }
      } catch (error) {
        results.push({ email: account.email, status: "error", error: error.message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Demo accounts seeding completed",
        results,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
