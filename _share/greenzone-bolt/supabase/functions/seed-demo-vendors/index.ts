import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DEMO_VENDORS = [
  {
    business_name: "Green Zone Delivery",
    description: "Premium cannabis delivery service with curated selection of top-shelf flower, concentrates, and edibles. Fast delivery across Los Angeles.",
    phone: "(323) 555-0100",
    email: "contact@greenzonedelivery.com",
    address: "123 Main St, Los Angeles, CA 90001",
    city: "Los Angeles",
    state: "CA",
    zip_code: "90001",
    delivery_radius: 15,
    minimum_order: 30,
    is_open: true,
    rating: 4.8,
    review_count: 55,
    months_operating: 3,
    total_orders: 125,
    active_deals: 10,
    plan_name: "Premium Plan",
    plan_price: 599
  },
  {
    business_name: "West Coast Exotics Delivery",
    description: "Specializing in exotic strains and premium concentrates. Your go-to source for rare cultivars and limited drops.",
    phone: "(310) 555-0200",
    email: "info@westcoastexotics.com",
    address: "456 Ocean Ave, Santa Monica, CA 90401",
    city: "Santa Monica",
    state: "CA",
    zip_code: "90401",
    delivery_radius: 10,
    minimum_order: 40,
    is_open: true,
    rating: 4.9,
    review_count: 33,
    months_operating: 2,
    total_orders: 75,
    active_deals: 6,
    plan_name: "Growth Plan",
    plan_price: 299
  },
  {
    business_name: "Valley High Delivery",
    description: "Serving the San Fernando Valley with quality products at affordable prices. Same-day delivery available.",
    phone: "(818) 555-0300",
    email: "support@valleyhighdelivery.com",
    address: "789 Ventura Blvd, Sherman Oaks, CA 91403",
    city: "Sherman Oaks",
    state: "CA",
    zip_code: "91403",
    delivery_radius: 12,
    minimum_order: 25,
    is_open: false,
    rating: 4.6,
    review_count: 24,
    months_operating: 2,
    total_orders: 60,
    active_deals: 5,
    plan_name: "Growth Plan",
    plan_price: 299
  },
  {
    business_name: "Cali Gold Express",
    description: "Fast, reliable delivery service bringing you California's finest cannabis products. New to the platform and growing fast!",
    phone: "(213) 555-0400",
    email: "hello@caligoldexpress.com",
    address: "321 Sunset Blvd, Hollywood, CA 90028",
    city: "Hollywood",
    state: "CA",
    zip_code: "90028",
    delivery_radius: 8,
    minimum_order: 35,
    is_open: true,
    rating: 4.7,
    review_count: 10,
    months_operating: 1,
    total_orders: 25,
    active_deals: 3,
    plan_name: "Starter Plan",
    plan_price: 99
  },
  {
    business_name: "Sunset Cannabis Delivery",
    description: "Your trusted neighborhood delivery service. Quality products, friendly service, and competitive prices.",
    phone: "(424) 555-0500",
    email: "orders@sunsetcannabis.com",
    address: "555 Pacific Coast Hwy, Malibu, CA 90265",
    city: "Malibu",
    state: "CA",
    zip_code: "90265",
    delivery_radius: 7,
    minimum_order: 30,
    is_open: true,
    rating: 4.5,
    review_count: 8,
    months_operating: 1,
    total_orders: 18,
    active_deals: 2,
    plan_name: "Starter Plan",
    plan_price: 99
  }
];

const DEMO_ORDERS = [
  { product: "Gelato 41 Flower 3.5g", value: 35, status: "completed", rating: 5 },
  { product: "Live Resin Vape Cartridge", value: 45, status: "completed", rating: 5 },
  { product: "THCA Flower", value: 40, status: "completed", rating: 4 },
  { product: "Blue Dream 1/8oz", value: 30, status: "completed", rating: 5 },
  { product: "Wedding Cake Pre-Rolls", value: 25, status: "completed", rating: 4 },
  { product: "Hybrid Gummies 100mg", value: 20, status: "completed", rating: 5 },
  { product: "Zkittlez Flower 7g", value: 60, status: "completed", rating: 5 },
  { product: "Sour Diesel Vape", value: 40, status: "completed", rating: 4 },
  { product: "Purple Punch 3.5g", value: 35, status: "completed", rating: 5 },
  { product: "OG Kush Live Rosin", value: 55, status: "completed", rating: 5 }
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting demo vendor seeding...');

    // Create demo vendors
    for (const vendor of DEMO_VENDORS) {
      // Check if vendor already exists
      const { data: existing } = await supabase
        .from('vendor_profiles')
        .select('id')
        .eq('business_name', vendor.business_name)
        .maybeSingle();

      if (existing) {
        console.log(`Vendor ${vendor.business_name} already exists, skipping...`);
        continue;
      }

      // Insert vendor profile
      const { data: profile, error: profileError } = await supabase
        .from('vendor_profiles')
        .insert({
          business_name: vendor.business_name,
          description: vendor.description,
          phone: vendor.phone,
          email: vendor.email,
          address: vendor.address,
          city: vendor.city,
          state: vendor.state,
          zip_code: vendor.zip_code,
          delivery_radius: vendor.delivery_radius,
          minimum_order: vendor.minimum_order,
          is_open: vendor.is_open,
          rating: vendor.rating,
          review_count: vendor.review_count,
          is_demo: true
        })
        .select()
        .single();

      if (profileError) {
        console.error(`Error creating vendor ${vendor.business_name}:`, profileError);
        continue;
      }

      console.log(`Created vendor: ${vendor.business_name}`);

      // Create demo orders for this vendor
      const orderCount = vendor.total_orders;
      const ordersToCreate = Math.min(orderCount, 10);

      for (let i = 0; i < ordersToCreate; i++) {
        const order = DEMO_ORDERS[i % DEMO_ORDERS.length];
        const daysAgo = Math.floor(Math.random() * (vendor.months_operating * 30));
        const orderDate = new Date();
        orderDate.setDate(orderDate.getDate() - daysAgo);

        await supabase
          .from('orders')
          .insert({
            vendor_id: profile.id,
            total_amount: order.value,
            status: order.status,
            created_at: orderDate.toISOString()
          });
      }

      // Create demo reviews
      const reviewsToCreate = Math.min(vendor.review_count, 5);
      const reviewTexts = [
        "Great service and quality products!",
        "Fast delivery, highly recommend.",
        "Always my go-to delivery service.",
        "Excellent selection and fair prices.",
        "Professional and reliable every time."
      ];

      for (let i = 0; i < reviewsToCreate; i++) {
        const daysAgo = Math.floor(Math.random() * (vendor.months_operating * 30));
        const reviewDate = new Date();
        reviewDate.setDate(reviewDate.getDate() - daysAgo);

        await supabase
          .from('reviews')
          .insert({
            vendor_id: profile.id,
            rating: 4 + Math.floor(Math.random() * 2), // 4 or 5 stars
            comment: reviewTexts[i % reviewTexts.length],
            created_at: reviewDate.toISOString()
          });
      }

      // Create demo products
      const productNames = [
        { name: "Gelato 41", category: "flower", price: 35, thc: 24 },
        { name: "Blue Dream", category: "flower", price: 30, thc: 20 },
        { name: "Wedding Cake", category: "flower", price: 40, thc: 26 },
        { name: "Live Resin Cart", category: "vapes", price: 45, thc: 85 },
        { name: "Hybrid Gummies", category: "edibles", price: 20, thc: 10 }
      ];

      for (const product of productNames) {
        await supabase
          .from('products')
          .insert({
            vendor_id: profile.id,
            name: product.name,
            category: product.category,
            price: product.price,
            thc_percentage: product.thc,
            in_stock: true,
            is_demo: true
          });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully seeded ${DEMO_VENDORS.length} demo vendors with orders, reviews, and products`
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('Error seeding demo vendors:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});
