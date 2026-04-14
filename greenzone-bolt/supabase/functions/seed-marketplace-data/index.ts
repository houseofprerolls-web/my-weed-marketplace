import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Strain {
  name: string;
  slug: string;
  type: "indica" | "sativa" | "hybrid";
  thc_min: number;
  thc_max: number;
  cbd_min: number;
  cbd_max: number;
  effects: string[];
  flavors: string[];
  description: string;
  best_time: string;
  popularity_score: number;
  is_trending: boolean;
}

const STRAINS: Strain[] = [
  {
    name: "Blue Dream",
    slug: "blue-dream",
    type: "hybrid",
    thc_min: 17,
    thc_max: 24,
    cbd_min: 0.1,
    cbd_max: 2,
    effects: ["happy", "relaxed", "euphoric", "creative", "uplifted"],
    flavors: ["blueberry", "sweet", "berry"],
    description: "Blue Dream is a smooth hybrid that helps people relax while staying focused. Many users report feeling happy, calm, and uplifted. Great for daytime use.",
    best_time: "daytime",
    popularity_score: 95,
    is_trending: true,
  },
  {
    name: "OG Kush",
    slug: "og-kush",
    type: "hybrid",
    thc_min: 19,
    thc_max: 26,
    cbd_min: 0.1,
    cbd_max: 0.3,
    effects: ["relaxed", "happy", "euphoric", "sleepy"],
    flavors: ["earthy", "pine", "woody"],
    description: "OG Kush is a classic strain known for its strong effects and distinctive earthy-pine aroma. Perfect for relaxation after a long day.",
    best_time: "evening",
    popularity_score: 92,
    is_trending: true,
  },
  {
    name: "Gelato",
    slug: "gelato",
    type: "hybrid",
    thc_min: 20,
    thc_max: 25,
    cbd_min: 0.1,
    cbd_max: 1,
    effects: ["happy", "relaxed", "creative", "euphoric"],
    flavors: ["sweet", "citrus", "fruity"],
    description: "Gelato offers a balanced high with sweet, dessert-like flavors. Users love its ability to ease stress while keeping the mind clear and creative.",
    best_time: "anytime",
    popularity_score: 90,
    is_trending: true,
  },
  {
    name: "Wedding Cake",
    slug: "wedding-cake",
    type: "hybrid",
    thc_min: 21,
    thc_max: 27,
    cbd_min: 0.1,
    cbd_max: 1,
    effects: ["relaxed", "happy", "euphoric", "sleepy"],
    flavors: ["sweet", "vanilla", "earthy"],
    description: "Wedding Cake delivers powerful relaxation with a sweet, vanilla taste. Great for unwinding in the evening or before bed.",
    best_time: "evening",
    popularity_score: 88,
    is_trending: false,
  },
  {
    name: "Zkittlez",
    slug: "zkittlez",
    type: "indica",
    thc_min: 15,
    thc_max: 23,
    cbd_min: 0.1,
    cbd_max: 1,
    effects: ["relaxed", "happy", "euphoric", "focused"],
    flavors: ["fruity", "sweet", "tropical"],
    description: "Zkittlez brings tropical fruit flavors and mellow relaxation. Perfect for easing stress without being too sedating.",
    best_time: "evening",
    popularity_score: 85,
    is_trending: false,
  },
  {
    name: "Pineapple Express",
    slug: "pineapple-express",
    type: "hybrid",
    thc_min: 16,
    thc_max: 26,
    cbd_min: 0.1,
    cbd_max: 1,
    effects: ["energetic", "happy", "creative", "uplifted"],
    flavors: ["tropical", "pineapple", "citrus"],
    description: "Pineapple Express offers an energizing high with bright tropical flavors. Great for staying active and creative during the day.",
    best_time: "daytime",
    popularity_score: 89,
    is_trending: true,
  },
  {
    name: "Girl Scout Cookies",
    slug: "girl-scout-cookies",
    type: "hybrid",
    thc_min: 18,
    thc_max: 28,
    cbd_min: 0.1,
    cbd_max: 1,
    effects: ["happy", "relaxed", "euphoric", "creative"],
    flavors: ["sweet", "earthy", "minty"],
    description: "Girl Scout Cookies (GSC) is loved for its powerful effects and sweet, minty flavor. Provides full-body relaxation with a cerebral boost.",
    best_time: "evening",
    popularity_score: 93,
    is_trending: true,
  },
  {
    name: "Sour Diesel",
    slug: "sour-diesel",
    type: "sativa",
    thc_min: 20,
    thc_max: 26,
    cbd_min: 0.1,
    cbd_max: 0.5,
    effects: ["energetic", "creative", "uplifted", "focused"],
    flavors: ["diesel", "pungent", "citrus"],
    description: "Sour Diesel is a powerful sativa known for its energizing effects and distinctive fuel-like aroma. Perfect for daytime productivity.",
    best_time: "daytime",
    popularity_score: 91,
    is_trending: false,
  },
  {
    name: "Granddaddy Purple",
    slug: "granddaddy-purple",
    type: "indica",
    thc_min: 17,
    thc_max: 27,
    cbd_min: 0.1,
    cbd_max: 1,
    effects: ["relaxed", "sleepy", "happy", "euphoric"],
    flavors: ["grape", "berry", "sweet"],
    description: "Granddaddy Purple (GDP) is a classic indica with sweet grape flavors. Known for deep relaxation and help with sleep.",
    best_time: "night",
    popularity_score: 87,
    is_trending: false,
  },
  {
    name: "White Widow",
    slug: "white-widow",
    type: "hybrid",
    thc_min: 18,
    thc_max: 25,
    cbd_min: 0.1,
    cbd_max: 1,
    effects: ["energetic", "creative", "happy", "uplifted"],
    flavors: ["earthy", "woody", "spicy"],
    description: "White Widow is a legendary strain that balances energy and relaxation. Great for social situations and creative projects.",
    best_time: "daytime",
    popularity_score: 86,
    is_trending: false,
  },
  {
    name: "Northern Lights",
    slug: "northern-lights",
    type: "indica",
    thc_min: 16,
    thc_max: 21,
    cbd_min: 0.1,
    cbd_max: 1,
    effects: ["relaxed", "sleepy", "happy", "euphoric"],
    flavors: ["sweet", "earthy", "pine"],
    description: "Northern Lights is one of the most famous indicas. Known for fast-acting relaxation and help with sleep and stress.",
    best_time: "night",
    popularity_score: 88,
    is_trending: false,
  },
  {
    name: "Jack Herer",
    slug: "jack-herer",
    type: "sativa",
    thc_min: 18,
    thc_max: 24,
    cbd_min: 0.1,
    cbd_max: 0.5,
    effects: ["energetic", "creative", "happy", "uplifted"],
    flavors: ["pine", "spicy", "woody"],
    description: "Jack Herer is a legendary sativa offering clear-headed creativity and energy. Named after the cannabis activist, perfect for daytime use.",
    best_time: "daytime",
    popularity_score: 90,
    is_trending: false,
  },
  {
    name: "Durban Poison",
    slug: "durban-poison",
    type: "sativa",
    thc_min: 15,
    thc_max: 25,
    cbd_min: 0.1,
    cbd_max: 1,
    effects: ["energetic", "uplifted", "creative", "focused"],
    flavors: ["sweet", "earthy", "pine"],
    description: "Durban Poison is a pure sativa from South Africa. Provides a clear, energetic high perfect for outdoor activities and creative work.",
    best_time: "daytime",
    popularity_score: 84,
    is_trending: false,
  },
  {
    name: "Green Crack",
    slug: "green-crack",
    type: "sativa",
    thc_min: 15,
    thc_max: 25,
    cbd_min: 0.1,
    cbd_max: 0.5,
    effects: ["energetic", "focused", "creative", "uplifted"],
    flavors: ["citrus", "fruity", "sweet"],
    description: "Green Crack provides intense energy and focus with a fruity flavor. Great for daytime productivity and staying active.",
    best_time: "daytime",
    popularity_score: 86,
    is_trending: false,
  },
  {
    name: "Bubba Kush",
    slug: "bubba-kush",
    type: "indica",
    thc_min: 14,
    thc_max: 22,
    cbd_min: 0.1,
    cbd_max: 1,
    effects: ["relaxed", "sleepy", "happy", "hungry"],
    flavors: ["earthy", "sweet", "chocolate"],
    description: "Bubba Kush is a heavy indica known for deep relaxation and sedation. Perfect for evening use and help with sleep.",
    best_time: "night",
    popularity_score: 85,
    is_trending: false,
  },
  {
    name: "AK-47",
    slug: "ak-47",
    type: "hybrid",
    thc_min: 13,
    thc_max: 20,
    cbd_min: 0.1,
    cbd_max: 1.5,
    effects: ["relaxed", "happy", "creative", "uplifted"],
    flavors: ["earthy", "sweet", "sour"],
    description: "AK-47 is a balanced hybrid delivering steady relaxation and mental clarity. Despite the name, it provides a mellow, long-lasting high.",
    best_time: "anytime",
    popularity_score: 83,
    is_trending: false,
  },
  {
    name: "Purple Haze",
    slug: "purple-haze",
    type: "sativa",
    thc_min: 15,
    thc_max: 20,
    cbd_min: 0.1,
    cbd_max: 1,
    effects: ["energetic", "creative", "euphoric", "uplifted"],
    flavors: ["berry", "earthy", "sweet"],
    description: "Purple Haze is a classic sativa made famous by Jimi Hendrix. Provides creative energy with sweet berry flavors.",
    best_time: "daytime",
    popularity_score: 82,
    is_trending: false,
  },
  {
    name: "Strawberry Cough",
    slug: "strawberry-cough",
    type: "sativa",
    thc_min: 15,
    thc_max: 20,
    cbd_min: 0.1,
    cbd_max: 1,
    effects: ["energetic", "uplifted", "happy", "creative"],
    flavors: ["strawberry", "sweet", "berry"],
    description: "Strawberry Cough offers uplifting effects with sweet strawberry flavor. Great for social situations and daytime activities.",
    best_time: "daytime",
    popularity_score: 81,
    is_trending: false,
  },
  {
    name: "Gorilla Glue #4",
    slug: "gorilla-glue-4",
    type: "hybrid",
    thc_min: 25,
    thc_max: 30,
    cbd_min: 0.1,
    cbd_max: 0.5,
    effects: ["relaxed", "sleepy", "euphoric", "happy"],
    flavors: ["earthy", "pungent", "sour"],
    description: "Gorilla Glue #4 (GG4) is extremely potent with heavy full-body effects. The name comes from how its resin can glue scissors shut when trimming.",
    best_time: "evening",
    popularity_score: 91,
    is_trending: true,
  },
  {
    name: "Trainwreck",
    slug: "trainwreck",
    type: "hybrid",
    thc_min: 16,
    thc_max: 25,
    cbd_min: 0.1,
    cbd_max: 1,
    effects: ["energetic", "happy", "creative", "euphoric"],
    flavors: ["earthy", "pine", "lemon"],
    description: "Trainwreck hits fast with a cerebral rush followed by mellow relaxation. Despite the name, it provides a balanced, manageable high.",
    best_time: "daytime",
    popularity_score: 84,
    is_trending: false,
  },
  {
    name: "Skywalker OG",
    slug: "skywalker-og",
    type: "indica",
    thc_min: 20,
    thc_max: 26,
    cbd_min: 0.1,
    cbd_max: 1,
    effects: ["relaxed", "sleepy", "happy", "euphoric"],
    flavors: ["earthy", "spicy", "diesel"],
    description: "Skywalker OG combines two legendary strains for powerful relaxation. Great for evening use and help with sleep.",
    best_time: "evening",
    popularity_score: 87,
    is_trending: false,
  },
  {
    name: "Super Lemon Haze",
    slug: "super-lemon-haze",
    type: "sativa",
    thc_min: 16,
    thc_max: 25,
    cbd_min: 0.1,
    cbd_max: 1,
    effects: ["energetic", "happy", "uplifted", "creative"],
    flavors: ["lemon", "citrus", "sweet"],
    description: "Super Lemon Haze is award-winning sativa with bright citrus flavors. Provides energizing effects perfect for daytime activities.",
    best_time: "daytime",
    popularity_score: 88,
    is_trending: false,
  },
  {
    name: "Cherry Pie",
    slug: "cherry-pie",
    type: "hybrid",
    thc_min: 16,
    thc_max: 24,
    cbd_min: 0.1,
    cbd_max: 1,
    effects: ["relaxed", "happy", "euphoric", "uplifted"],
    flavors: ["cherry", "sweet", "earthy"],
    description: "Cherry Pie offers balanced effects with sweet cherry flavors. Great for relaxation while staying mentally engaged.",
    best_time: "evening",
    popularity_score: 83,
    is_trending: false,
  },
  {
    name: "Cookies and Cream",
    slug: "cookies-and-cream",
    type: "hybrid",
    thc_min: 18,
    thc_max: 26,
    cbd_min: 0.1,
    cbd_max: 1,
    effects: ["relaxed", "happy", "creative", "euphoric"],
    flavors: ["sweet", "vanilla", "earthy"],
    description: "Cookies and Cream delivers dessert-like flavors with balanced hybrid effects. Perfect for creative activities and relaxation.",
    best_time: "anytime",
    popularity_score: 82,
    is_trending: false,
  },
  {
    name: "Sunset Sherbet",
    slug: "sunset-sherbet",
    type: "hybrid",
    thc_min: 15,
    thc_max: 24,
    cbd_min: 0.1,
    cbd_max: 1,
    effects: ["relaxed", "happy", "euphoric", "creative"],
    flavors: ["sweet", "fruity", "citrus"],
    description: "Sunset Sherbet provides full-body relaxation with sweet fruit flavors. Great for unwinding while staying mentally clear.",
    best_time: "evening",
    popularity_score: 86,
    is_trending: false,
  },
  {
    name: "Do-Si-Dos",
    slug: "do-si-dos",
    type: "indica",
    thc_min: 19,
    thc_max: 30,
    cbd_min: 0.1,
    cbd_max: 1,
    effects: ["relaxed", "sleepy", "euphoric", "happy"],
    flavors: ["earthy", "sweet", "floral"],
    description: "Do-Si-Dos is a potent indica with sweet, earthy flavors. Provides deep relaxation perfect for evening use.",
    best_time: "evening",
    popularity_score: 85,
    is_trending: false,
  },
  {
    name: "Tangie",
    slug: "tangie",
    type: "sativa",
    thc_min: 19,
    thc_max: 22,
    cbd_min: 0.1,
    cbd_max: 1,
    effects: ["energetic", "uplifted", "happy", "creative"],
    flavors: ["citrus", "orange", "sweet"],
    description: "Tangie is award-winning sativa with intense tangerine flavors. Provides uplifting energy and creativity for daytime use.",
    best_time: "daytime",
    popularity_score: 84,
    is_trending: false,
  },
  {
    name: "Forbidden Fruit",
    slug: "forbidden-fruit",
    type: "indica",
    thc_min: 18,
    thc_max: 26,
    cbd_min: 0.1,
    cbd_max: 1,
    effects: ["relaxed", "sleepy", "happy", "euphoric"],
    flavors: ["cherry", "tropical", "sweet"],
    description: "Forbidden Fruit offers deep relaxation with tropical fruit flavors. Perfect for evening relaxation and help with sleep.",
    best_time: "evening",
    popularity_score: 83,
    is_trending: false,
  },
  {
    name: "Maui Wowie",
    slug: "maui-wowie",
    type: "sativa",
    thc_min: 13,
    thc_max: 19,
    cbd_min: 0.1,
    cbd_max: 1,
    effects: ["energetic", "uplifted", "happy", "creative"],
    flavors: ["tropical", "sweet", "pineapple"],
    description: "Maui Wowie is a classic Hawaiian sativa with tropical flavors. Provides energizing effects perfect for outdoor activities.",
    best_time: "daytime",
    popularity_score: 80,
    is_trending: false,
  },
  {
    name: "Blueberry",
    slug: "blueberry",
    type: "indica",
    thc_min: 16,
    thc_max: 24,
    cbd_min: 0.1,
    cbd_max: 1,
    effects: ["relaxed", "happy", "euphoric", "sleepy"],
    flavors: ["blueberry", "sweet", "berry"],
    description: "Blueberry is a legendary indica with sweet berry flavors. Known for relaxation and help with sleep.",
    best_time: "evening",
    popularity_score: 82,
    is_trending: false,
  },
  {
    name: "Amnesia Haze",
    slug: "amnesia-haze",
    type: "sativa",
    thc_min: 20,
    thc_max: 25,
    cbd_min: 0.1,
    cbd_max: 1,
    effects: ["energetic", "creative", "uplifted", "happy"],
    flavors: ["citrus", "earthy", "lemon"],
    description: "Amnesia Haze is award-winning sativa with strong cerebral effects. Provides energizing creativity and euphoria.",
    best_time: "daytime",
    popularity_score: 87,
    is_trending: false,
  },
  {
    name: "Zkittlez",
    slug: "zkittlez",
    type: "indica",
    thc_min: 15,
    thc_max: 23,
    cbd_min: 0.1,
    cbd_max: 1,
    effects: ["relaxed", "happy", "euphoric", "focused"],
    flavors: ["fruity", "sweet", "tropical"],
    description: "Zkittlez brings tropical fruit flavors and mellow relaxation. Perfect for easing stress without being too sedating.",
    best_time: "evening",
    popularity_score: 85,
    is_trending: false,
  },
  {
    name: "Chemdawg",
    slug: "chemdawg",
    type: "hybrid",
    thc_min: 15,
    thc_max: 20,
    cbd_min: 0.1,
    cbd_max: 1,
    effects: ["relaxed", "creative", "euphoric", "uplifted"],
    flavors: ["diesel", "pungent", "earthy"],
    description: "Chemdawg is legendary for its distinct fuel-like aroma and potent effects. Parent strain to Sour Diesel and OG Kush.",
    best_time: "evening",
    popularity_score: 84,
    is_trending: false,
  },
  {
    name: "Bruce Banner",
    slug: "bruce-banner",
    type: "hybrid",
    thc_min: 20,
    thc_max: 29,
    cbd_min: 0.1,
    cbd_max: 1,
    effects: ["relaxed", "happy", "euphoric", "creative"],
    flavors: ["diesel", "earthy", "sweet"],
    description: "Bruce Banner is incredibly potent, named after the Hulk's alter ego. Provides powerful euphoria and relaxation.",
    best_time: "evening",
    popularity_score: 88,
    is_trending: true,
  },
  {
    name: "Lemon Haze",
    slug: "lemon-haze",
    type: "sativa",
    thc_min: 15,
    thc_max: 22,
    cbd_min: 0.1,
    cbd_max: 1,
    effects: ["energetic", "uplifted", "creative", "happy"],
    flavors: ["lemon", "citrus", "sweet"],
    description: "Lemon Haze is energizing sativa with bright lemon flavors. Perfect for daytime productivity and creative work.",
    best_time: "daytime",
    popularity_score: 83,
    is_trending: false,
  },
  {
    name: "Runtz",
    slug: "runtz",
    type: "hybrid",
    thc_min: 19,
    thc_max: 29,
    cbd_min: 0.1,
    cbd_max: 1,
    effects: ["relaxed", "happy", "euphoric", "uplifted"],
    flavors: ["fruity", "sweet", "candy"],
    description: "Runtz is a popular new strain with candy-like flavors. Provides balanced effects perfect for any time of day.",
    best_time: "anytime",
    popularity_score: 90,
    is_trending: true,
  },
  {
    name: "MAC (Miracle Alien Cookies)",
    slug: "mac",
    type: "hybrid",
    thc_min: 20,
    thc_max: 25,
    cbd_min: 0.1,
    cbd_max: 1,
    effects: ["relaxed", "happy", "euphoric", "creative"],
    flavors: ["sweet", "earthy", "citrus"],
    description: "MAC delivers potent effects with complex flavors. Great for relaxation while maintaining mental clarity and creativity.",
    best_time: "evening",
    popularity_score: 86,
    is_trending: false,
  },
  {
    name: "Mimosa",
    slug: "mimosa",
    type: "hybrid",
    thc_min: 17,
    thc_max: 25,
    cbd_min: 0.1,
    cbd_max: 1,
    effects: ["happy", "uplifted", "creative", "energetic"],
    flavors: ["citrus", "earthy", "fruity"],
    description: "Mimosa offers bright citrus flavors with energizing yet balanced effects. Perfect for starting the day right.",
    best_time: "daytime",
    popularity_score: 85,
    is_trending: false,
  },
  {
    name: "Platinum Cookies",
    slug: "platinum-cookies",
    type: "hybrid",
    thc_min: 16,
    thc_max: 24,
    cbd_min: 0.1,
    cbd_max: 1,
    effects: ["relaxed", "happy", "euphoric", "sleepy"],
    flavors: ["sweet", "earthy", "berry"],
    description: "Platinum Cookies is a potent GSC phenotype with sweet berry flavors. Provides strong relaxation perfect for evening use.",
    best_time: "evening",
    popularity_score: 84,
    is_trending: false,
  },
  {
    name: "Blackberry Kush",
    slug: "blackberry-kush",
    type: "indica",
    thc_min: 14,
    thc_max: 20,
    cbd_min: 0.1,
    cbd_max: 1,
    effects: ["relaxed", "sleepy", "happy", "hungry"],
    flavors: ["berry", "earthy", "sweet"],
    description: "Blackberry Kush is a potent indica with sweet berry flavors. Known for deep relaxation and help with sleep.",
    best_time: "night",
    popularity_score: 81,
    is_trending: false,
  },
  {
    name: "Death Star",
    slug: "death-star",
    type: "indica",
    thc_min: 18,
    thc_max: 25,
    cbd_min: 0.1,
    cbd_max: 1,
    effects: ["relaxed", "sleepy", "euphoric", "happy"],
    flavors: ["diesel", "earthy", "sweet"],
    description: "Death Star is a powerful indica that delivers strong sedation. Perfect for evening use and those seeking deep relaxation.",
    best_time: "night",
    popularity_score: 82,
    is_trending: false,
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

    const results = {
      strains: [] as any[],
      vendors_updated: 0,
      vendor_hours_created: 0,
      vendor_areas_created: 0,
      errors: [] as any[],
    };

    for (const strain of STRAINS) {
      try {
        const { error } = await supabaseAdmin
          .from("strains")
          .upsert(strain, { onConflict: "slug" });

        if (error) {
          results.errors.push({ strain: strain.name, error: error.message });
        } else {
          results.strains.push(strain.name);
        }
      } catch (error) {
        results.errors.push({ strain: strain.name, error: error.message });
      }
    }

    const { data: vendors, error: vendorsError } = await supabaseAdmin
      .from("vendor_profiles")
      .select("id, business_name, city")
      .eq("is_approved", true);

    if (!vendorsError && vendors) {
      for (const vendor of vendors) {
        try {
          const rating = 4.2 + Math.random() * 0.8;
          const reviews = Math.floor(Math.random() * 500) + 50;
          const products = Math.floor(Math.random() * 150) + 20;
          const deals = Math.floor(Math.random() * 5) + 1;
          const isFeatured = Math.random() > 0.7;

          const { error: updateError } = await supabaseAdmin
            .from("vendor_profiles")
            .update({
              average_rating: parseFloat(rating.toFixed(1)),
              total_reviews: reviews,
              total_products: products,
              active_deals_count: deals,
              minimum_order: [0, 0, 0, 20, 25, 30][Math.floor(Math.random() * 6)],
              delivery_fee: [0, 0, 5, 5, 7.99, 9.99][Math.floor(Math.random() * 6)],
              average_delivery_time: [30, 35, 40, 45, 50, 60][Math.floor(Math.random() * 6)],
              featured_until: isFeatured ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
              offers_delivery: true,
              offers_pickup: Math.random() > 0.3,
            })
            .eq("id", vendor.id);

          if (!updateError) {
            results.vendors_updated++;
          }

          for (let day = 0; day <= 6; day++) {
            const { error: hoursError } = await supabaseAdmin
              .from("vendor_hours")
              .upsert({
                vendor_id: vendor.id,
                day_of_week: day,
                open_time: day === 0 ? "10:00" : "09:00",
                close_time: day === 5 || day === 6 ? "00:00" : "22:00",
                is_closed: false,
              }, { onConflict: "vendor_id, day_of_week" });

            if (!hoursError) {
              results.vendor_hours_created++;
            }
          }

          const { error: areaError } = await supabaseAdmin
            .from("vendor_service_areas")
            .upsert({
              vendor_id: vendor.id,
              city: vendor.city || "Los Angeles",
              delivery_fee: [0, 5, 7.99][Math.floor(Math.random() * 3)],
              delivery_time_min: 30,
              delivery_time_max: 60,
              minimum_order: [0, 20, 25][Math.floor(Math.random() * 3)],
            }, { onConflict: "vendor_id, city" });

          if (!areaError) {
            results.vendor_areas_created++;
          }

        } catch (error) {
          results.errors.push({ vendor: vendor.business_name, error: error.message });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Marketplace data seeding completed",
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
