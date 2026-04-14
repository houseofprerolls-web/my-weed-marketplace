import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ADDITIONAL_STRAINS = [
  // More Popular Hybrids
  { name: "Apple Fritter", type: "hybrid", thc_min: 22, thc_max: 28, effects: ["relaxed", "happy", "euphoric", "hungry"], flavors: ["apple", "sweet", "vanilla"], description: "Apple Fritter is a potent hybrid with delicious apple and vanilla flavors. Known for providing strong relaxation while keeping you happy and uplifted.", best_time: "evening" },
  { name: "Biscotti", type: "hybrid", thc_min: 21, thc_max: 26, effects: ["relaxed", "happy", "sleepy", "creative"], flavors: ["sweet", "earthy", "cookies"], description: "Biscotti offers sweet cookie flavors with powerful relaxing effects. Perfect for winding down while staying mentally engaged.", best_time: "evening" },
  { name: "RS11", type: "hybrid", thc_min: 25, thc_max: 30, effects: ["relaxed", "euphoric", "happy", "uplifted"], flavors: ["fruity", "sweet", "tropical"], description: "RS11 is a potent hybrid with tropical fruit flavors. Delivers strong euphoria and full-body relaxation.", best_time: "evening" },
  { name: "Cereal Milk", type: "hybrid", thc_min: 20, thc_max: 25, effects: ["happy", "relaxed", "creative", "uplifted"], flavors: ["sweet", "creamy", "fruity"], description: "Cereal Milk tastes like your favorite breakfast cereal with creamy sweetness. Provides balanced effects perfect for any time.", best_time: "anytime" },
  { name: "Permanent Marker", type: "hybrid", thc_min: 24, thc_max: 30, effects: ["relaxed", "euphoric", "sleepy", "happy"], flavors: ["floral", "earthy", "chemical"], description: "Permanent Marker is extremely potent with unique floral and chemical notes. Known for strong relaxation and sedation.", best_time: "night" },
  { name: "Gary Payton", type: "hybrid", thc_min: 20, thc_max: 25, effects: ["relaxed", "happy", "euphoric", "focused"], flavors: ["diesel", "earthy", "spicy"], description: "Gary Payton combines powerful effects with diesel and spice flavors. Great for relaxation while staying mentally sharp.", best_time: "evening" },
  { name: "Kush Mints", type: "hybrid", thc_min: 22, thc_max: 28, effects: ["relaxed", "happy", "euphoric", "sleepy"], flavors: ["minty", "sweet", "earthy"], description: "Kush Mints offers refreshing mint flavors with strong relaxing effects. Perfect for evening use and help with sleep.", best_time: "evening" },
  { name: "Banana Kush", type: "hybrid", thc_min: 18, thc_max: 25, effects: ["happy", "relaxed", "euphoric", "uplifted"], flavors: ["banana", "sweet", "tropical"], description: "Banana Kush brings tropical banana flavors with balanced hybrid effects. Great for mood boost and relaxation.", best_time: "anytime" },
  { name: "Animal Mints", type: "hybrid", thc_min: 20, thc_max: 28, effects: ["relaxed", "happy", "sleepy", "euphoric"], flavors: ["minty", "sweet", "earthy"], description: "Animal Mints combines cool mint with sweet earthy notes. Provides powerful relaxation perfect for evening.", best_time: "evening" },
  { name: "Slurricane", type: "indica", thc_min: 20, thc_max: 28, effects: ["relaxed", "sleepy", "happy", "euphoric"], flavors: ["sweet", "berry", "tropical"], description: "Slurricane is a heavy indica with sweet berry flavors. Known for strong sedation and help with sleep.", best_time: "night" },

  // More Indicas
  { name: "Purple Punch", type: "indica", thc_min: 18, thc_max: 25, effects: ["relaxed", "sleepy", "happy", "euphoric"], flavors: ["grape", "berry", "sweet"], description: "Purple Punch delivers sweet grape flavors with powerful sedation. Perfect for evening relaxation and sleep.", best_time: "night" },
  { name: "Ice Cream Cake", type: "indica", thc_min: 20, thc_max: 25, effects: ["relaxed", "happy", "sleepy", "euphoric"], flavors: ["sweet", "vanilla", "creamy"], description: "Ice Cream Cake tastes like dessert with vanilla and cream flavors. Provides strong relaxation and sedation.", best_time: "night" },
  { name: "Cherry Pie", type: "hybrid", thc_min: 16, thc_max: 24, effects: ["relaxed", "happy", "euphoric", "uplifted"], flavors: ["cherry", "sweet", "earthy"], description: "Cherry Pie offers sweet cherry flavors with balanced hybrid effects. Great for relaxation while staying engaged.", best_time: "evening" },
  { name: "Forbidden Fruit", type: "indica", thc_min: 18, thc_max: 26, effects: ["relaxed", "sleepy", "happy", "euphoric"], flavors: ["cherry", "tropical", "sweet"], description: "Forbidden Fruit brings tropical fruit and cherry flavors. Known for deep relaxation and help with sleep.", best_time: "evening" },
  { name: "LA Confidential", type: "indica", thc_min: 18, thc_max: 25, effects: ["relaxed", "sleepy", "happy", "hungry"], flavors: ["pine", "earthy", "sweet"], description: "LA Confidential is a classic indica with earthy pine flavors. Provides strong sedation perfect for nighttime.", best_time: "night" },
  { name: "Hindu Kush", type: "indica", thc_min: 15, thc_max: 20, effects: ["relaxed", "sleepy", "happy", "euphoric"], flavors: ["earthy", "sweet", "woody"], description: "Hindu Kush is a pure indica from the mountains. Known for powerful relaxation and help with sleep.", best_time: "night" },
  { name: "Critical Kush", type: "indica", thc_min: 20, thc_max: 25, effects: ["relaxed", "sleepy", "happy", "euphoric"], flavors: ["earthy", "spicy", "sweet"], description: "Critical Kush is extremely potent with earthy spice flavors. Provides heavy sedation for nighttime use.", best_time: "night" },

  // More Sativas
  { name: "Harlequin", type: "sativa", thc_min: 7, thc_max: 15, cbd_min: 8, cbd_max: 16, effects: ["relaxed", "focused", "uplifted", "creative"], flavors: ["earthy", "sweet", "mango"], description: "Harlequin is high in CBD with balanced THC. Great for focus and relaxation without heavy intoxication.", best_time: "daytime" },
  { name: "Candyland", type: "sativa", thc_min: 16, thc_max: 24, effects: ["energetic", "uplifted", "creative", "happy"], flavors: ["sweet", "earthy", "spicy"], description: "Candyland is an energizing sativa with sweet candy flavors. Perfect for daytime creativity and productivity.", best_time: "daytime" },
  { name: "Acapulco Gold", type: "sativa", thc_min: 15, thc_max: 24, effects: ["energetic", "uplifted", "euphoric", "creative"], flavors: ["earthy", "sweet", "tropical"], description: "Acapulco Gold is a legendary sativa from Mexico. Provides energizing euphoria with tropical flavors.", best_time: "daytime" },
  { name: "Alaskan Thunder", type: "sativa", thc_min: 17, thc_max: 25, effects: ["energetic", "uplifted", "euphoric", "focused"], flavors: ["pine", "earthy", "spicy"], description: "Alaskan Thunder delivers powerful energy with pine and earth flavors. Great for daytime productivity.", best_time: "daytime" },

  // More Balanced Hybrids
  { name: "Blue Cookies", type: "hybrid", thc_min: 17, thc_max: 28, effects: ["relaxed", "happy", "euphoric", "creative"], flavors: ["blueberry", "sweet", "earthy"], description: "Blue Cookies combines sweet blueberry with cookie flavors. Offers balanced relaxation and creativity.", best_time: "anytime" },
  { name: "Thin Mint", type: "hybrid", thc_min: 19, thc_max: 24, effects: ["relaxed", "happy", "euphoric", "focused"], flavors: ["minty", "sweet", "chocolate"], description: "Thin Mint tastes like your favorite cookie with mint and chocolate. Provides balanced effects for any time.", best_time: "anytime" },
  { name: "Cookies and Cream", type: "hybrid", thc_min: 18, thc_max: 26, effects: ["relaxed", "happy", "creative", "euphoric"], flavors: ["sweet", "vanilla", "earthy"], description: "Cookies and Cream delivers dessert-like flavors with balanced effects. Perfect for creative activities.", best_time: "anytime" },
  { name: "Sherbert", type: "hybrid", thc_min: 15, thc_max: 24, effects: ["relaxed", "happy", "euphoric", "creative"], flavors: ["sweet", "fruity", "citrus"], description: "Sherbert (Sunset Sherbet) provides sweet fruit flavors with mellow relaxation and creativity.", best_time: "evening" },
  { name: "MAC 1", type: "hybrid", thc_min: 20, thc_max: 25, effects: ["relaxed", "happy", "euphoric", "creative"], flavors: ["sweet", "citrus", "diesel"], description: "MAC 1 (Miracle Alien Cookies) offers complex flavors and potent balanced effects for any occasion.", best_time: "anytime" },

  // Additional Popular Strains (continuing to 200+)
  { name: "Lava Cake", type: "indica", thc_min: 18, thc_max: 25, effects: ["relaxed", "sleepy", "happy", "hungry"], flavors: ["chocolate", "vanilla", "sweet"], description: "Lava Cake brings chocolate cake flavors with heavy relaxation perfect for evening.", best_time: "evening" },
  { name: "Triangle Kush", type: "indica", thc_min: 20, thc_max: 26, effects: ["relaxed", "happy", "sleepy", "euphoric"], flavors: ["earthy", "diesel", "lemon"], description: "Triangle Kush is a Florida classic with diesel and lemon notes. Provides strong relaxation.", best_time: "evening" },
  { name: "Wifi OG", type: "hybrid", thc_min: 16, thc_max: 25, effects: ["relaxed", "happy", "uplifted", "creative"], flavors: ["earthy", "diesel", "pine"], description: "Wifi OG combines two legendary strains for balanced cerebral and physical effects.", best_time: "evening" },
  { name: "Sour Tsunami", type: "hybrid", thc_min: 6, thc_max: 10, cbd_min: 10, cbd_max: 15, effects: ["relaxed", "focused", "happy", "calm"], flavors: ["diesel", "earthy", "sour"], description: "Sour Tsunami is high CBD with low THC. Great for relaxation without heavy intoxication.", best_time: "daytime" },
  { name: "ACDC", type: "sativa", thc_min: 1, thc_max: 6, cbd_min: 16, cbd_max: 24, effects: ["relaxed", "focused", "calm", "happy"], flavors: ["earthy", "pine", "sweet"], description: "ACDC is extremely high in CBD with minimal THC. Perfect for therapeutic use without psychoactive effects.", best_time: "anytime" },
  { name: "Grape Ape", type: "indica", thc_min: 15, thc_max: 25, effects: ["relaxed", "sleepy", "happy", "euphoric"], flavors: ["grape", "berry", "sweet"], description: "Grape Ape delivers powerful grape flavors with heavy indica effects perfect for sleep.", best_time: "night" },
  { name: "Obama Kush", type: "indica", thc_min: 14, thc_max: 21, effects: ["relaxed", "sleepy", "happy", "hungry"], flavors: ["earthy", "pine", "sweet"], description: "Obama Kush is a relaxing indica with earthy pine flavors. Great for evening relaxation.", best_time: "evening" },
  { name: "Blue Cheese", type: "hybrid", thc_min: 16, thc_max: 20, effects: ["relaxed", "happy", "euphoric", "hungry"], flavors: ["blueberry", "cheese", "sweet"], description: "Blue Cheese combines sweet blueberry with savory cheese notes for unique flavor and balanced effects.", best_time: "evening" },
  { name: "Headband", type: "hybrid", thc_min: 17, thc_max: 27, effects: ["relaxed", "creative", "euphoric", "happy"], flavors: ["lemon", "diesel", "earthy"], description: "Headband creates a pressure-like sensation around the head. Known for creative cerebral effects.", best_time: "daytime" },
  { name: "Mendo Breath", type: "indica", thc_min: 19, thc_max: 25, effects: ["relaxed", "sleepy", "euphoric", "happy"], flavors: ["vanilla", "caramel", "sweet"], description: "Mendo Breath offers sweet vanilla and caramel flavors with powerful sedation.", best_time: "night" },
  { name: "Legend OG", type: "indica", thc_min: 19, thc_max: 26, effects: ["relaxed", "sleepy", "happy", "euphoric"], flavors: ["pine", "citrus", "earthy"], description: "Legend OG is a potent indica with classic OG flavors. Perfect for deep relaxation.", best_time: "evening" },
  { name: "Purple Urkle", type: "indica", thc_min: 14, thc_max: 21, effects: ["relaxed", "sleepy", "happy", "hungry"], flavors: ["grape", "berry", "earthy"], description: "Purple Urkle is a classic indica with grape flavors. Known for strong sedation.", best_time: "night" },
  { name: "Headband OG", type: "hybrid", thc_min: 18, thc_max: 24, effects: ["relaxed", "euphoric", "creative", "happy"], flavors: ["diesel", "lemon", "earthy"], description: "Headband OG creates unique head pressure with uplifting cerebral effects.", best_time: "daytime" },
  { name: "Pink Kush", type: "indica", thc_min: 20, thc_max: 25, effects: ["relaxed", "sleepy", "happy", "euphoric"], flavors: ["vanilla", "sweet", "floral"], description: "Pink Kush offers sweet vanilla and floral notes with powerful indica effects.", best_time: "night" },
  { name: "Chem Dawg", type: "hybrid", thc_min: 15, thc_max: 20, effects: ["relaxed", "creative", "euphoric", "uplifted"], flavors: ["diesel", "pungent", "earthy"], description: "Chem Dawg (Chemdawg) is legendary for distinct diesel aroma and potent effects.", best_time: "evening" },
  { name: "Tahoe OG", type: "hybrid", thc_min: 18, thc_max: 25, effects: ["relaxed", "happy", "euphoric", "sleepy"], flavors: ["lemon", "pine", "earthy"], description: "Tahoe OG is a potent OG phenotype with lemon pine flavors and strong effects.", best_time: "evening" },
  { name: "XXX OG", type: "indica", thc_min: 21, thc_max: 28, effects: ["relaxed", "sleepy", "euphoric", "happy"], flavors: ["pine", "lemon", "earthy"], description: "XXX OG is extremely potent with classic OG flavors. Known for heavy sedation.", best_time: "night" },
  { name: "Louis XIII", type: "indica", thc_min: 20, thc_max: 28, effects: ["relaxed", "sleepy", "euphoric", "happy"], flavors: ["earthy", "pine", "sweet"], description: "Louis XIII is a premium OG phenotype with powerful indica effects.", best_time: "night" },
  { name: "SFV OG", type: "hybrid", thc_min: 19, thc_max: 27, effects: ["relaxed", "happy", "euphoric", "uplifted"], flavors: ["lemon", "pine", "earthy"], description: "SFV OG (San Fernando Valley OG) is a classic with lemon pine flavors and balanced effects.", best_time: "evening" },
  { name: "Fire OG", type: "hybrid", thc_min: 20, thc_max: 27, effects: ["relaxed", "euphoric", "happy", "sleepy"], flavors: ["lemon", "earthy", "pine"], description: "Fire OG is known for powerful effects and classic OG flavor profile.", best_time: "evening" },
  { name: "Ghost OG", type: "hybrid", thc_min: 18, thc_max: 25, effects: ["relaxed", "happy", "euphoric", "uplifted"], flavors: ["citrus", "sweet", "pine"], description: "Ghost OG balances cerebral and physical effects with sweet citrus notes.", best_time: "evening" },
  { name: "Blackberry Kush", type: "indica", thc_min: 14, thc_max: 20, effects: ["relaxed", "sleepy", "happy", "hungry"], flavors: ["berry", "earthy", "sweet"], description: "Blackberry Kush delivers sweet berry flavors with strong indica sedation.", best_time: "night" },
  { name: "Larry OG", type: "hybrid", thc_min: 19, thc_max: 26, effects: ["relaxed", "happy", "euphoric", "sleepy"], flavors: ["citrus", "pine", "earthy"], description: "Larry OG is a potent hybrid combining Orange and OG genetics for balanced effects.", best_time: "evening" },
  { name: "Diablo OG", type: "indica", thc_min: 18, thc_max: 24, effects: ["relaxed", "sleepy", "euphoric", "happy"], flavors: ["pine", "earthy", "sweet"], description: "Diablo OG is a powerful indica with classic OG characteristics.", best_time: "night" },
  { name: "Alien OG", type: "hybrid", thc_min: 20, thc_max: 28, effects: ["happy", "relaxed", "euphoric", "uplifted"], flavors: ["lemon", "pine", "earthy"], description: "Alien OG combines Alien genetics with OG for potent uplifting effects.", best_time: "evening" },
  { name: "Platinum OG", type: "indica", thc_min: 17, thc_max: 24, effects: ["relaxed", "sleepy", "happy", "euphoric"], flavors: ["pine", "diesel", "earthy"], description: "Platinum OG is a premium indica with powerful sedating effects.", best_time: "night" },
  { name: "Master Kush", type: "indica", thc_min: 16, thc_max: 20, effects: ["relaxed", "sleepy", "happy", "euphoric"], flavors: ["earthy", "citrus", "pine"], description: "Master Kush is a classic indica with earthy flavors and strong relaxation.", best_time: "evening" },
  { name: "King Louis XIII", type: "indica", thc_min: 20, thc_max: 28, effects: ["relaxed", "sleepy", "euphoric", "happy"], flavors: ["pine", "earthy", "diesel"], description: "King Louis XIII is extremely potent with powerful sedating effects.", best_time: "night" },
  { name: "Pre-98 Bubba Kush", type: "indica", thc_min: 15, thc_max: 22, effects: ["relaxed", "sleepy", "happy", "hungry"], flavors: ["chocolate", "coffee", "earthy"], description: "Pre-98 Bubba Kush is the original Bubba cut with chocolate coffee notes.", best_time: "night" },
  { name: "Blue Diesel", type: "hybrid", thc_min: 17, thc_max: 22, effects: ["energetic", "creative", "uplifted", "happy"], flavors: ["blueberry", "diesel", "sweet"], description: "Blue Diesel combines sweet blueberry with energizing diesel effects.", best_time: "daytime" },
  { name: "NYC Diesel", type: "sativa", thc_min: 16, thc_max: 22, effects: ["energetic", "uplifted", "creative", "euphoric"], flavors: ["diesel", "citrus", "grapefruit"], description: "NYC Diesel is a New York classic with grapefruit diesel flavors and energizing effects.", best_time: "daytime" },
  { name: "East Coast Sour Diesel", type: "sativa", thc_min: 20, thc_max: 26, effects: ["energetic", "creative", "uplifted", "focused"], flavors: ["diesel", "citrus", "sour"], description: "East Coast Sour Diesel is the original cut with powerful sativa effects.", best_time: "daytime" },
  { name: "Sour Tangie", type: "sativa", thc_min: 18, thc_max: 26, effects: ["energetic", "uplifted", "creative", "happy"], flavors: ["tangerine", "citrus", "diesel"], description: "Sour Tangie combines bright tangerine with energizing effects.", best_time: "daytime" },
  { name: "Orange Cookies", type: "hybrid", thc_min: 18, thc_max: 25, effects: ["happy", "relaxed", "creative", "euphoric"], flavors: ["orange", "sweet", "earthy"], description: "Orange Cookies blends citrus with cookie flavors for balanced effects.", best_time: "anytime" },
  { name: "Blueberry Muffin", type: "indica", thc_min: 16, thc_max: 22, effects: ["relaxed", "happy", "sleepy", "hungry"], flavors: ["blueberry", "vanilla", "sweet"], description: "Blueberry Muffin tastes like fresh baked goods with relaxing indica effects.", best_time: "evening" },
  { name: "Strawberry Banana", type: "hybrid", thc_min: 18, thc_max: 26, effects: ["happy", "relaxed", "euphoric", "uplifted"], flavors: ["strawberry", "banana", "sweet"], description: "Strawberry Banana offers tropical fruit flavors with balanced hybrid effects.", best_time: "anytime" },
  { name: "Pineapple Chunk", type: "hybrid", thc_min: 16, thc_max: 25, effects: ["relaxed", "happy", "sleepy", "euphoric"], flavors: ["pineapple", "tropical", "sweet"], description: "Pineapple Chunk delivers tropical pineapple flavors with relaxing effects.", best_time: "evening" },
  { name: "Mango Kush", type: "indica", thc_min: 11, thc_max: 16, effects: ["relaxed", "happy", "euphoric", "sleepy"], flavors: ["mango", "tropical", "sweet"], description: "Mango Kush offers sweet mango flavors with gentle relaxation.", best_time: "evening" },
  { name: "Lemon Skunk", type: "hybrid", thc_min: 15, thc_max: 22, effects: ["energetic", "uplifted", "creative", "happy"], flavors: ["lemon", "citrus", "skunky"], description: "Lemon Skunk combines bright lemon with classic skunk for energizing effects.", best_time: "daytime" },
  { name: "Orange Creamsicle", type: "hybrid", thc_min: 15, thc_max: 22, effects: ["happy", "relaxed", "uplifted", "euphoric"], flavors: ["orange", "creamy", "sweet"], description: "Orange Creamsicle tastes like the frozen treat with balanced hybrid effects.", best_time: "anytime" },
  { name: "Grape Pie", type: "indica", thc_min: 18, thc_max: 24, effects: ["relaxed", "sleepy", "happy", "hungry"], flavors: ["grape", "berry", "sweet"], description: "Grape Pie offers sweet grape dessert flavors with strong relaxation.", best_time: "evening" },
  { name: "Key Lime Pie", type: "hybrid", thc_min: 18, thc_max: 24, effects: ["relaxed", "happy", "euphoric", "creative"], flavors: ["lime", "citrus", "sweet"], description: "Key Lime Pie delivers tart citrus flavors with balanced hybrid effects.", best_time: "anytime" },
  { name: "London Pound Cake", type: "indica", thc_min: 20, thc_max: 29, effects: ["relaxed", "sleepy", "happy", "euphoric"], flavors: ["berry", "lemon", "sweet"], description: "London Pound Cake is potent with sweet berry lemon flavors and heavy effects.", best_time: "evening" },
  { name: "Wedding Crasher", type: "hybrid", thc_min: 16, thc_max: 24, effects: ["happy", "relaxed", "euphoric", "uplifted"], flavors: ["sweet", "vanilla", "fruity"], description: "Wedding Crasher combines sweet vanilla with balanced uplifting effects.", best_time: "anytime" },
  { name: "Purple Gelato", type: "hybrid", thc_min: 20, thc_max: 25, effects: ["relaxed", "happy", "euphoric", "creative"], flavors: ["sweet", "berry", "citrus"], description: "Purple Gelato adds berry notes to classic Gelato for enhanced flavor.", best_time: "anytime" },
  { name: "Rainbow Sherbet", type: "hybrid", thc_min: 18, thc_max: 22, effects: ["relaxed", "happy", "creative", "uplifted"], flavors: ["fruity", "sweet", "citrus"], description: "Rainbow Sherbet delivers mixed fruit flavors with mellow balanced effects.", best_time: "anytime" },
  { name: "Zkittlez Cake", type: "indica", thc_min: 20, thc_max: 25, effects: ["relaxed", "sleepy", "happy", "euphoric"], flavors: ["fruity", "sweet", "tropical"], description: "Zkittlez Cake combines tropical fruit candy with relaxing indica effects.", best_time: "evening" },
  { name: "Fruity Pebbles", type: "hybrid", thc_min: 18, thc_max: 25, effects: ["happy", "uplifted", "relaxed", "creative"], flavors: ["berry", "tropical", "sweet"], description: "Fruity Pebbles tastes like the cereal with balanced uplifting effects.", best_time: "daytime" },
  { name: "Tropicana Cookies", type: "hybrid", thc_min: 20, thc_max: 28, effects: ["energetic", "uplifted", "creative", "happy"], flavors: ["citrus", "tropical", "sweet"], description: "Tropicana Cookies brings bright citrus with energizing effects.", best_time: "daytime" },
  { name: "Sundae Driver", type: "hybrid", thc_min: 14, thc_max: 22, effects: ["relaxed", "happy", "euphoric", "sleepy"], flavors: ["chocolate", "sweet", "fruity"], description: "Sundae Driver offers chocolate and fruit dessert flavors with relaxation.", best_time: "evening" },
  { name: "Georgia Pie", type: "indica", thc_min: 20, thc_max: 27, effects: ["relaxed", "sleepy", "happy", "hungry"], flavors: ["peach", "sweet", "earthy"], description: "Georgia Pie delivers sweet peach pie flavors with strong indica effects.", best_time: "evening" },
  { name: "Watermelon Zkittlez", type: "indica", thc_min: 17, thc_max: 25, effects: ["relaxed", "sleepy", "happy", "euphoric"], flavors: ["watermelon", "fruity", "sweet"], description: "Watermelon Zkittlez combines sweet watermelon with relaxing effects.", best_time: "evening" },
  { name: "Lemon Cherry Gelato", type: "hybrid", thc_min: 18, thc_max: 25, effects: ["relaxed", "happy", "euphoric", "uplifted"], flavors: ["lemon", "cherry", "sweet"], description: "Lemon Cherry Gelato blends tart citrus with sweet cherry for complex flavor.", best_time: "anytime" },
  { name: "Pink Rozay", type: "hybrid", thc_min: 16, thc_max: 24, effects: ["relaxed", "happy", "euphoric", "sleepy"], flavors: ["sweet", "floral", "berry"], description: "Pink Rozay offers sweet floral notes with relaxing balanced effects.", best_time: "evening" },
  { name: "Jealousy", type: "hybrid", thc_min: 20, thc_max: 29, effects: ["relaxed", "euphoric", "happy", "uplifted"], flavors: ["fruity", "earthy", "sweet"], description: "Jealousy is a potent hybrid with fruity flavors and strong balanced effects.", best_time: "evening" },
  { name: "Gushers", type: "hybrid", thc_min: 15, thc_max: 22, effects: ["relaxed", "happy", "euphoric", "uplifted"], flavors: ["tropical", "fruity", "sweet"], description: "Gushers tastes like the candy with mellow uplifting effects.", best_time: "anytime" },
  { name: "Candy Rain", type: "hybrid", thc_min: 18, thc_max: 24, effects: ["relaxed", "happy", "euphoric", "creative"], flavors: ["sweet", "fruity", "candy"], description: "Candy Rain delivers sweet candy flavors with balanced hybrid effects.", best_time: "anytime" },
  { name: "Sunset Octane", type: "hybrid", thc_min: 22, thc_max: 28, effects: ["relaxed", "euphoric", "sleepy", "happy"], flavors: ["diesel", "earthy", "sweet"], description: "Sunset Octane combines diesel fuel with sweet notes for potent effects.", best_time: "evening" },
  { name: "Kush Cake", type: "indica", thc_min: 18, thc_max: 26, effects: ["relaxed", "sleepy", "happy", "euphoric"], flavors: ["vanilla", "mint", "earthy"], description: "Kush Cake blends vanilla and mint with heavy indica effects.", best_time: "night" },
  { name: "Garlic Breath", type: "indica", thc_min: 18, thc_max: 25, effects: ["relaxed", "sleepy", "euphoric", "happy"], flavors: ["garlic", "earthy", "diesel"], description: "Garlic Breath has unique savory garlic notes with powerful relaxation.", best_time: "evening" },
  { name: "GMO Cookies", type: "indica", thc_min: 20, thc_max: 28, effects: ["relaxed", "sleepy", "euphoric", "happy"], flavors: ["garlic", "diesel", "earthy"], description: "GMO Cookies (Garlic Cookies) offers pungent garlic diesel with heavy effects.", best_time: "evening" },
  { name: "Papaya", type: "indica", thc_min: 20, thc_max: 25, effects: ["relaxed", "sleepy", "happy", "euphoric"], flavors: ["tropical", "sweet", "mango"], description: "Papaya delivers tropical fruit flavors with strong sedating effects.", best_time: "evening" },
  { name: "Lemon Cookies", type: "hybrid", thc_min: 18, thc_max: 26, effects: ["happy", "relaxed", "creative", "uplifted"], flavors: ["lemon", "sweet", "earthy"], description: "Lemon Cookies combines tart lemon with sweet cookie flavors.", best_time: "anytime" },
  { name: "Orange Zkittlez", type: "hybrid", thc_min: 15, thc_max: 23, effects: ["happy", "uplifted", "relaxed", "creative"], flavors: ["orange", "citrus", "sweet"], description: "Orange Zkittlez brings bright orange citrus with balanced effects.", best_time: "daytime" },
  { name: "Purple Kush", type: "indica", thc_min: 17, thc_max: 27, effects: ["relaxed", "sleepy", "happy", "euphoric"], flavors: ["earthy", "sweet", "grape"], description: "Purple Kush is a pure indica with sweet grape earth flavors and heavy sedation.", best_time: "night" },
  { name: "God's Gift", type: "indica", thc_min: 18, thc_max: 25, effects: ["relaxed", "sleepy", "happy", "euphoric"], flavors: ["grape", "citrus", "earthy"], description: "God's Gift combines grape and citrus with powerful indica relaxation.", best_time: "night" },
  { name: "9 Pound Hammer", type: "indica", thc_min: 18, thc_max: 23, effects: ["relaxed", "sleepy", "happy", "hungry"], flavors: ["grape", "lime", "sweet"], description: "9 Pound Hammer delivers sweet grape lime with knockout sedation.", best_time: "night" },
  { name: "Purple Diesel", type: "hybrid", thc_min: 15, thc_max: 20, effects: ["energetic", "creative", "uplifted", "happy"], flavors: ["berry", "diesel", "earthy"], description: "Purple Diesel combines berry sweetness with energizing diesel effects.", best_time: "daytime" },
  { name: "Sour Grape", type: "hybrid", thc_min: 16, thc_max: 22, effects: ["relaxed", "happy", "uplifted", "creative"], flavors: ["grape", "sour", "sweet"], description: "Sour Grape offers tart grape flavors with balanced hybrid effects.", best_time: "anytime" },
  { name: "Grape God", type: "indica", thc_min: 18, thc_max: 25, effects: ["relaxed", "sleepy", "happy", "euphoric"], flavors: ["grape", "berry", "sweet"], description: "Grape God delivers intense grape flavors with heavy indica sedation.", best_time: "night" },
  { name: "Blueberry Headband", type: "hybrid", thc_min: 17, thc_max: 24, effects: ["relaxed", "creative", "happy", "uplifted"], flavors: ["blueberry", "diesel", "sweet"], description: "Blueberry Headband combines sweet berry with cerebral pressure effects.", best_time: "daytime" },
  { name: "Purple Trainwreck", type: "hybrid", thc_min: 16, thc_max: 25, effects: ["energetic", "creative", "happy", "uplifted"], flavors: ["grape", "earthy", "spicy"], description: "Purple Trainwreck adds grape notes to the classic energizing effects.", best_time: "daytime" },
  { name: "Blue Frost", type: "hybrid", thc_min: 18, thc_max: 24, effects: ["relaxed", "happy", "creative", "uplifted"], flavors: ["blueberry", "sweet", "earthy"], description: "Blue Frost combines sweet blueberry with balanced hybrid effects.", best_time: "anytime" },
  { name: "Blueberry Diesel", type: "hybrid", thc_min: 16, thc_max: 22, effects: ["energetic", "creative", "uplifted", "happy"], flavors: ["blueberry", "diesel", "sweet"], description: "Blueberry Diesel blends sweet berry with energizing diesel.", best_time: "daytime" },
  { name: "Blue Knight", type: "indica", thc_min: 18, thc_max: 24, effects: ["relaxed", "sleepy", "happy", "euphoric"], flavors: ["blueberry", "earthy", "sweet"], description: "Blue Knight offers blueberry flavors with powerful indica relaxation.", best_time: "evening" },
  { name: "Blueberry Yum Yum", type: "indica", thc_min: 16, thc_max: 20, effects: ["relaxed", "sleepy", "happy", "euphoric"], flavors: ["blueberry", "vanilla", "sweet"], description: "Blueberry Yum Yum delivers sweet berry vanilla with mellow sedation.", best_time: "evening" },
  { name: "Purple Haze", type: "sativa", thc_min: 15, thc_max: 20, effects: ["energetic", "creative", "euphoric", "uplifted"], flavors: ["berry", "earthy", "sweet"], description: "Purple Haze is the Hendrix classic with berry flavors and creative energy.", best_time: "daytime" },
  { name: "Tropicana Banana", type: "hybrid", thc_min: 18, thc_max: 24, effects: ["happy", "relaxed", "uplifted", "creative"], flavors: ["tropical", "banana", "citrus"], description: "Tropicana Banana combines tropical fruit with balanced uplifting effects.", best_time: "anytime" },
  { name: "Tropical Zkittlez", type: "indica", thc_min: 16, thc_max: 23, effects: ["relaxed", "happy", "sleepy", "euphoric"], flavors: ["tropical", "fruity", "sweet"], description: "Tropical Zkittlez offers candy fruit flavors with relaxing effects.", best_time: "evening" },
  { name: "Lemon OG", type: "hybrid", thc_min: 17, thc_max: 22, effects: ["relaxed", "happy", "euphoric", "uplifted"], flavors: ["lemon", "citrus", "earthy"], description: "Lemon OG combines bright lemon with classic OG relaxation.", best_time: "evening" },
  { name: "Lemon Kush", type: "hybrid", thc_min: 15, thc_max: 26, effects: ["relaxed", "happy", "euphoric", "uplifted"], flavors: ["lemon", "citrus", "earthy"], description: "Lemon Kush blends lemon citrus with balanced Kush effects.", best_time: "anytime" },
  { name: "Lemon Meringue", type: "sativa", thc_min: 17, thc_max: 23, effects: ["energetic", "uplifted", "creative", "happy"], flavors: ["lemon", "sweet", "citrus"], description: "Lemon Meringue tastes like the pie with energizing sativa effects.", best_time: "daytime" },
  { name: "Lemon Diesel", type: "hybrid", thc_min: 16, thc_max: 24, effects: ["energetic", "creative", "uplifted", "focused"], flavors: ["lemon", "diesel", "citrus"], description: "Lemon Diesel combines tart lemon with energizing diesel effects.", best_time: "daytime" },
  { name: "Lemon Cake", type: "hybrid", thc_min: 15, thc_max: 24, effects: ["relaxed", "happy", "euphoric", "uplifted"], flavors: ["lemon", "sweet", "vanilla"], description: "Lemon Cake offers sweet lemon dessert flavors with balanced effects.", best_time: "anytime" },
  { name: "Lime Skunk", type: "hybrid", thc_min: 14, thc_max: 19, effects: ["energetic", "uplifted", "happy", "creative"], flavors: ["lime", "citrus", "skunky"], description: "Lime Skunk delivers tart lime with energizing skunk effects.", best_time: "daytime" },
  { name: "Strawberry Diesel", type: "hybrid", thc_min: 15, thc_max: 22, effects: ["energetic", "uplifted", "creative", "happy"], flavors: ["strawberry", "diesel", "sweet"], description: "Strawberry Diesel combines sweet berry with energizing diesel.", best_time: "daytime" },
  { name: "Strawberry Haze", type: "sativa", thc_min: 16, thc_max: 22, effects: ["energetic", "creative", "uplifted", "happy"], flavors: ["strawberry", "sweet", "earthy"], description: "Strawberry Haze offers sweet strawberry with energizing haze effects.", best_time: "daytime" },
  { name: "Strawberry Cake", type: "hybrid", thc_min: 18, thc_max: 24, effects: ["relaxed", "happy", "euphoric", "uplifted"], flavors: ["strawberry", "sweet", "vanilla"], description: "Strawberry Cake delivers dessert flavors with balanced hybrid effects.", best_time: "anytime" },
  { name: "Orange Bud", type: "hybrid", thc_min: 16, thc_max: 25, effects: ["happy", "uplifted", "relaxed", "creative"], flavors: ["orange", "citrus", "sweet"], description: "Orange Bud is a Dutch classic with bright orange citrus flavors.", best_time: "daytime" },
  { name: "Clementine", type: "sativa", thc_min: 17, thc_max: 27, effects: ["energetic", "creative", "uplifted", "happy"], flavors: ["citrus", "sweet", "tangy"], description: "Clementine delivers sweet tangy citrus with powerful sativa energy.", best_time: "daytime" },
  { name: "Mandarin Cookies", type: "hybrid", thc_min: 18, thc_max: 26, effects: ["relaxed", "happy", "euphoric", "creative"], flavors: ["citrus", "sweet", "earthy"], description: "Mandarin Cookies combines mandarin orange with cookie sweetness.", best_time: "anytime" },
  { name: "Grapefruit", type: "sativa", thc_min: 15, thc_max: 20, effects: ["energetic", "uplifted", "focused", "creative"], flavors: ["grapefruit", "citrus", "sour"], description: "Grapefruit offers tart citrus with clean energizing effects.", best_time: "daytime" },
  { name: "Orange Creamsicle", type: "hybrid", thc_min: 15, thc_max: 22, effects: ["happy", "relaxed", "uplifted", "euphoric"], flavors: ["orange", "creamy", "sweet"], description: "Orange Creamsicle tastes like the frozen treat with balanced effects.", best_time: "anytime" },
  { name: "Peach Crescendo", type: "hybrid", thc_min: 19, thc_max: 26, effects: ["relaxed", "happy", "euphoric", "creative"], flavors: ["peach", "fruity", "sweet"], description: "Peach Crescendo delivers sweet peach flavors with potent hybrid effects.", best_time: "anytime" },
  { name: "Peaches and Cream", type: "hybrid", thc_min: 17, thc_max: 24, effects: ["relaxed", "happy", "uplifted", "creative"], flavors: ["peach", "creamy", "sweet"], description: "Peaches and Cream offers dessert-like flavors with balanced effects.", best_time: "anytime" },
  { name: "Melon Kush", type: "hybrid", thc_min: 15, thc_max: 20, effects: ["relaxed", "happy", "sleepy", "euphoric"], flavors: ["melon", "sweet", "earthy"], description: "Melon Kush combines sweet melon with relaxing Kush effects.", best_time: "evening" },
  { name: "Mango Tango", type: "sativa", thc_min: 16, thc_max: 22, effects: ["energetic", "uplifted", "creative", "happy"], flavors: ["mango", "tropical", "sweet"], description: "Mango Tango delivers tropical mango with energizing sativa effects.", best_time: "daytime" },
  { name: "Pineapple Upside Down Cake", type: "hybrid", thc_min: 18, thc_max: 25, effects: ["relaxed", "happy", "euphoric", "creative"], flavors: ["pineapple", "sweet", "tropical"], description: "Pineapple Upside Down Cake tastes like the dessert with balanced effects.", best_time: "anytime" },
  { name: "Grape Stomper", type: "hybrid", thc_min: 18, thc_max: 25, effects: ["energetic", "uplifted", "creative", "happy"], flavors: ["grape", "sour", "sweet"], description: "Grape Stomper combines sour grape with energizing effects.", best_time: "daytime" },
  { name: "Purple Candy", type: "indica", thc_min: 16, thc_max: 22, effects: ["relaxed", "sleepy", "happy", "euphoric"], flavors: ["grape", "sweet", "berry"], description: "Purple Candy offers sweet grape candy flavors with relaxing effects.", best_time: "evening" },
  { name: "Cherry Lime Sherbet", type: "hybrid", thc_min: 16, thc_max: 24, effects: ["relaxed", "happy", "creative", "uplifted"], flavors: ["cherry", "lime", "sweet"], description: "Cherry Lime Sherbet delivers tart fruit flavors with balanced effects.", best_time: "anytime" },
  { name: "Apple Jacks", type: "hybrid", thc_min: 18, thc_max: 24, effects: ["happy", "uplifted", "relaxed", "creative"], flavors: ["apple", "cinnamon", "sweet"], description: "Apple Jacks tastes like the cereal with balanced hybrid effects.", best_time: "anytime" },
  { name: "Banana Cream", type: "hybrid", thc_min: 15, thc_max: 22, effects: ["relaxed", "happy", "euphoric", "sleepy"], flavors: ["banana", "creamy", "sweet"], description: "Banana Cream offers smooth dessert flavors with mellow relaxation.", best_time: "evening" },
  { name: "Banana Punch", type: "hybrid", thc_min: 17, thc_max: 25, effects: ["relaxed", "happy", "euphoric", "uplifted"], flavors: ["banana", "tropical", "sweet"], description: "Banana Punch delivers tropical banana with balanced hybrid effects.", best_time: "anytime" },
  { name: "Peanut Butter Breath", type: "hybrid", thc_min: 18, thc_max: 28, effects: ["relaxed", "sleepy", "euphoric", "happy"], flavors: ["nutty", "earthy", "herbal"], description: "Peanut Butter Breath offers unique nutty flavors with powerful sedation.", best_time: "evening" },
  { name: "Peanut Butter Cookies", type: "hybrid", thc_min: 16, thc_max: 25, effects: ["relaxed", "happy", "euphoric", "sleepy"], flavors: ["nutty", "sweet", "earthy"], description: "Peanut Butter Cookies combines nutty sweetness with relaxing effects.", best_time: "evening" },
  { name: "Chocolate Thai", type: "sativa", thc_min: 14, thc_max: 20, effects: ["energetic", "creative", "uplifted", "focused"], flavors: ["chocolate", "coffee", "earthy"], description: "Chocolate Thai is a classic landrace with chocolate coffee notes and energy.", best_time: "daytime" },
  { name: "Chocolate Diesel", type: "sativa", thc_min: 16, thc_max: 23, effects: ["energetic", "creative", "uplifted", "happy"], flavors: ["chocolate", "diesel", "earthy"], description: "Chocolate Diesel combines chocolate with energizing diesel effects.", best_time: "daytime" },
  { name: "Mint Chocolate Chip", type: "hybrid", thc_min: 15, thc_max: 24, effects: ["relaxed", "happy", "euphoric", "creative"], flavors: ["mint", "chocolate", "sweet"], description: "Mint Chocolate Chip tastes like ice cream with balanced effects.", best_time: "anytime" },
  { name: "White Chocolate", type: "indica", thc_min: 17, thc_max: 24, effects: ["relaxed", "sleepy", "happy", "euphoric"], flavors: ["sweet", "vanilla", "earthy"], description: "White Chocolate offers smooth sweet flavors with indica relaxation.", best_time: "evening" },
  { name: "Cookies and Cream", type: "hybrid", thc_min: 18, thc_max: 26, effects: ["relaxed", "happy", "creative", "euphoric"], flavors: ["sweet", "vanilla", "earthy"], description: "Cookies and Cream delivers dessert flavors with balanced hybrid effects.", best_time: "anytime" },
  { name: "Birthday Cake", type: "hybrid", thc_min: 17, thc_max: 25, effects: ["relaxed", "happy", "euphoric", "sleepy"], flavors: ["sweet", "vanilla", "earthy"], description: "Birthday Cake offers sweet cake flavors with relaxing effects.", best_time: "evening" },
  { name: "Cake Mints", type: "hybrid", thc_min: 20, thc_max: 26, effects: ["relaxed", "happy", "euphoric", "creative"], flavors: ["mint", "sweet", "vanilla"], description: "Cake Mints combines cool mint with sweet cake flavors.", best_time: "anytime" },
  { name: "Lemon Drip", type: "hybrid", thc_min: 18, thc_max: 24, effects: ["energetic", "uplifted", "creative", "focused"], flavors: ["lemon", "citrus", "sweet"], description: "Lemon Drip delivers intense lemon with energizing effects.", best_time: "daytime" },
  { name: "Lava Breath", type: "indica", thc_min: 19, thc_max: 27, effects: ["relaxed", "sleepy", "euphoric", "happy"], flavors: ["earthy", "spicy", "diesel"], description: "Lava Breath offers earthy spice with powerful indica sedation.", best_time: "evening" },
  { name: "Jet Fuel", type: "hybrid", thc_min: 16, thc_max: 23, effects: ["energetic", "creative", "uplifted", "focused"], flavors: ["diesel", "earthy", "pungent"], description: "Jet Fuel (G6) delivers powerful diesel with energizing effects.", best_time: "daytime" },
  { name: "Face Off OG", type: "indica", thc_min: 19, thc_max: 25, effects: ["relaxed", "sleepy", "euphoric", "happy"], flavors: ["lemon", "pine", "earthy"], description: "Face Off OG is a potent indica with classic OG characteristics.", best_time: "night" },
  { name: "Blackwater", type: "indica", thc_min: 17, thc_max: 25, effects: ["relaxed", "sleepy", "happy", "euphoric"], flavors: ["grape", "lemon", "earthy"], description: "Blackwater combines grape lemon with heavy indica effects.", best_time: "night" },
  { name: "Holy Grail Kush", type: "hybrid", thc_min: 18, thc_max: 24, effects: ["relaxed", "euphoric", "happy", "uplifted"], flavors: ["earthy", "citrus", "spicy"], description: "Holy Grail Kush blends two legendary strains for balanced potent effects.", best_time: "evening" },
  { name: "Golden Goat", type: "sativa", thc_min: 16, thc_max: 23, effects: ["energetic", "creative", "uplifted", "happy"], flavors: ["tropical", "sweet", "spicy"], description: "Golden Goat delivers tropical sweetness with powerful sativa energy.", best_time: "daytime" },
  { name: "Jillybean", type: "hybrid", thc_min: 15, thc_max: 18, effects: ["happy", "uplifted", "euphoric", "creative"], flavors: ["orange", "mango", "sweet"], description: "Jillybean offers bright citrus mango with uplifting balanced effects.", best_time: "daytime" },
  { name: "Chernobyl", type: "sativa", thc_min: 16, thc_max: 22, effects: ["energetic", "creative", "uplifted", "happy"], flavors: ["lime", "citrus", "sweet"], description: "Chernobyl delivers tart lime citrus with powerful energizing effects.", best_time: "daytime" },
  { name: "Agent Orange", type: "hybrid", thc_min: 15, thc_max: 25, effects: ["energetic", "uplifted", "happy", "creative"], flavors: ["orange", "citrus", "sweet"], description: "Agent Orange combines bright orange flavors with balanced uplifting effects.", best_time: "daytime" },
  { name: "Space Queen", type: "hybrid", thc_min: 16, thc_max: 22, effects: ["energetic", "creative", "uplifted", "euphoric"], flavors: ["cherry", "apple", "sweet"], description: "Space Queen offers mixed fruit flavors with cerebral energizing effects.", best_time: "daytime" },
  { name: "Vortex", type: "sativa", thc_min: 17, thc_max: 23, effects: ["energetic", "creative", "uplifted", "focused"], flavors: ["tropical", "citrus", "sweet"], description: "Vortex delivers tropical citrus with powerful focused sativa effects.", best_time: "daytime" },
  { name: "Apollo 13", type: "hybrid", thc_min: 15, thc_max: 20, effects: ["energetic", "creative", "uplifted", "happy"], flavors: ["fruity", "earthy", "sweet"], description: "Apollo 13 offers mixed fruit with balanced cerebral effects.", best_time: "daytime" },
  { name: "Jack the Ripper", type: "sativa", thc_min: 15, thc_max: 21, effects: ["energetic", "creative", "uplifted", "focused"], flavors: ["lemon", "lime", "sweet"], description: "Jack the Ripper delivers intense citrus with powerful sativa energy.", best_time: "daytime" },
  { name: "Dairy Queen", type: "hybrid", thc_min: 14, thc_max: 21, effects: ["relaxed", "happy", "uplifted", "creative"], flavors: ["cheese", "sweet", "earthy"], description: "Dairy Queen combines unique cheese notes with balanced effects.", best_time: "anytime" },
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const results = { strains_added: 0, errors: [] as any[] };

    for (const strain of ADDITIONAL_STRAINS) {
      try {
        const slug = strain.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const popularity = Math.floor(Math.random() * 30) + 70;
        const isTrending = Math.random() > 0.85;

        const { error } = await supabaseAdmin.from("strains").upsert({
          name: strain.name,
          slug,
          type: strain.type,
          thc_min: strain.thc_min,
          thc_max: strain.thc_max,
          cbd_min: strain.cbd_min || 0.1,
          cbd_max: strain.cbd_max || 1,
          effects: strain.effects,
          flavors: strain.flavors,
          description: strain.description,
          best_time: strain.best_time,
          popularity_score: popularity,
          is_trending: isTrending,
        }, { onConflict: "slug" });

        if (error) {
          results.errors.push({ strain: strain.name, error: error.message });
        } else {
          results.strains_added++;
        }
      } catch (error) {
        results.errors.push({ strain: strain.name, error: error.message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Added ${results.strains_added} strains to directory`,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
