-- Launch prep: clear public review surfaces, then seed curated 5★ vendor reviews with
-- display handles (Xbox-style gamertags) for four spotlight shops. Listing UI prefers
-- `reviewer_display_handle` when present so rows do not require auth.users.

-- ---------------------------------------------------------------------------
-- 1) Optional column: public display handle for reviews without a linked profile
-- ---------------------------------------------------------------------------
do $c$
begin
  if to_regclass('public.reviews') is not null then
    alter table public.reviews add column if not exists reviewer_display_handle text;
    comment on column public.reviews.reviewer_display_handle is
      'Optional shopper-facing handle when reviewer_id is null or profile has no username.';
  end if;
end
$c$;

-- ---------------------------------------------------------------------------
-- 2) Remove all rows in public.reviews (vendor / product / strain)
-- ---------------------------------------------------------------------------
delete from public.reviews;

-- ---------------------------------------------------------------------------
-- 3) Zero out catalog import review stats (when table exists)
-- ---------------------------------------------------------------------------
do $cat$
begin
  if to_regclass('public.catalog_products') is not null then
    update public.catalog_products
    set
      avg_rating = null,
      review_count = 0
    where true;
  end if;
end
$cat$;

-- ---------------------------------------------------------------------------
-- 4) Zero vendor aggregate columns when present (directory / RPC consumers)
-- ---------------------------------------------------------------------------
do $v$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vendors'
      and column_name = 'total_reviews'
  ) then
    execute 'update public.vendors set total_reviews = 0';
  end if;
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vendors'
      and column_name = 'average_rating'
  ) then
    execute 'update public.vendors set average_rating = 0';
  end if;
end
$v$;

-- ---------------------------------------------------------------------------
-- 5) Seed 5★ reviews for spotlight vendors (50-70 each, null reviewer_id)
-- ---------------------------------------------------------------------------
do $seed$
declare
  gamertags text[] := array[
    'xQSourPatchElitex', 'BluntWizard3000', 'VaporVixen99', 'DankKnightRises', 'ZootedZebra42',
    'MidnightMangoOG', 'CloudyWithAChance', 'TerpyToucan', 'GelatoGladiator', 'SativaSteve2007',
    'IndicaInquisitor', 'xXNoScopeNugsXx', 'CouchLockLegend', 'PuffPuffPassat', 'TrichomeTactician',
    'BiscottiBandit', 'RosinRangerTX', 'PreRollPresident', 'VapeApeEscape', 'HashTagHero808',
    'LimoneneLancer', 'MyrceneMage', 'PinenePilot', 'CaryophylleneCaptain', 'LinaloolLurker',
    'THCTuesday', 'CBDCadet', 'FreshPressFred', 'ColdCureCassidy', 'SquishSquadLeader',
    'JarGeometryJones', 'NugNavigator', 'DispoDetective', 'QueueSkipperPro', 'BagAppealBandit',
    'TerpsNotTerpitude', 'FlavorSyndicate', 'SmokeSignalSigma', 'RollingThunderRVA', 'PaperPlanePilot',
    'GrinderGryphon', 'BovedaBeliever', 'HumidityHawk', 'TrimBinThinker', 'CannaComposer',
    'JointVentureJay', 'BlazeItBasil', 'PotteryBarnacle', 'WeedWhispererWes', 'ChronicCriticChloe',
    'SatelliteDishOfDank', 'MunchieMinister', 'SnackAttackJack', 'CottonMouthMoses', 'RedEyeRedeemer',
    'FiveStarFarmerFan', 'PurpleHazeHayes', 'OGOriginalGwen', 'SkunkworksSam', 'KushKourier',
    'DabDadDeluxe', 'CartCuratorCarl', 'EdibleEinstein', 'TinctureTina', 'TopicalTony',
    'HempHeroHarper', 'GreenGoblinGamer', 'LeafLoreLiam', 'BudBardBianca', 'TerpTaleTeller',
    'StickyNoteNate', 'ResinRhapsody', 'FlowerPowerFinn', 'PrerollProphet', 'VaporVanguard'
  ];
  titles text[] := array[
    'W', 'ngl fire', 'no cap solid', 'Aight bet', 'Facts only', 'Sheesh valid', 'Ran it up',
    'Yessir', 'Yup good', 'Busssin fr', 'Lowkey fire', 'Certified', 'Top tier', 'Gas pack',
    'Real recognize real', 'Shout out fr', 'Maine respect', 'Issa vibe', 'Cop again soon',
    'Staff A1', 'Quick in out', 'Professional', 'Exceeded what I thought', 'Would pull up again',
    'Clean store', 'Tight operation', 'On point', 'Official', 'Muy bueno', 'No complaints',
    'Solid fr', 'Bet', 'Cooked', 'Okay okay', 'Fire', 'Valid spot', 'Yerr', 'Proper',
    'Great service', 'Five stars fr', 'Not mid', 'They showed love', 'Legit', 'W shop',
    'Respectfully fire', 'Ran thru', 'Cool peoples'
  ];
  templates text[] := array[
    'Walked in hot walked out chill they did that',
    'ngl i thought it was gonna be mid they proved me wrong fr',
    'Third pull up this month they still consistent',
    'Budtender broke it down simple even my cousin understood',
    'Me gusto todo honestamente vuelvo si o si',
    'I usually do not leave reviews but this one earned straight up',
    'They was patient while I stared at the menu like a lost puppy big respect',
    'Parking annoying worth it tho',
    'Short visit long impression',
    'My pops picky old dude even he co signed',
    'Line moved faster than I thought',
    'Jar smelled loud in a good way',
    'Receipt matched what they said on the counter',
    'I asked dumb questions nobody laughed',
    'Ran thru on lunch break in and out',
    'They remembered me from last time small thing but it mattered',
    'Price felt fair for what I got',
    'No weird attitude when I said my budget low',
    'Place clean bathroom clean that matters',
    'Security professional not trying to be the main character',
    'I do not cap on reviews this place solid',
    'Took my sister first timer she felt safe',
    'Music not blasting my ears off',
    'They did not rush me out the door',
    'I compared two strains dude was honest which one hits harder',
    'El servicio fue atento y rapido volvere seguro sin duda',
    'Been to spots that act too cool for school not like that here',
    'My homie put me on he was right',
    'I expected attitude got hospitality',
    'They ID everybody cool I like that',
    'Bag sealed right not sloppy',
    'I am older I like when folks speak clear staff did',
    'Kid behind counter knew the farm names not just hype words',
    'I do not smoke heavy still found something light they helped',
    'They pointed me to a deal without me begging',
    'Phone busy still answered polite',
    'I got lost they stayed on the line till I pulled up',
    'It smelled good soon as I opened the car door',
    'I tipped because service was actually service',
    'They did not act weird about cash',
    'I brought my picky friend she approved rare',
    'Aint nobody got time for fake terps tasted real here',
    'I said I need sleep not rocket ship they listened',
    'Wheelchair homie said entrance smooth',
    'I only had twenty minutes they still hooked me',
    'They spelled the strain name right on the label small detail',
    'I asked for something fruity not perfume fruity they nailed it',
    'I do not trust reviews online half the time this one real',
    'They apologized for a short wait without me complaining',
    'I came after work looking rough still treated regular',
    'I like when they explain dosage slow for edibles they did',
    'I wanted smalls not big nugs they showed both',
    'They did not act like I was stealing when I read labels',
    'I am from out of town they still treated me like regular',
    'I asked for old school they knew what I meant',
    'I got the wrong thing once they fixed it calm',
    'I like when the jar numbers make sense',
    'They did not talk down because I am young',
    'Older clientele here they still patient with me',
    'Smell proof bags up front small thing big W',
    'Got kids in the car they respected my time',
    'Pain day rough they pointed me mild not reckless',
    'Tryna smoke less they didnt side eye me',
    'Broke week they showed real deals not dust',
    'Store dont smell like a dumpster 10 outta 10',
    'Nobody followed me like im stealing',
    'CBD vs THC they actually know the split',
    'Anxiety gang they didnt push the rocket pack',
    'Took my mom she didnt feel judged',
    'Lazy preroll days these actually smoke even',
    'Rotation looks fresh not dusty jars',
    'Asked whats new got a straight answer',
    'Harvest date on label love that',
    'Need sleep not spaceship they heard me',
    'Sativa for chores they laughed but hooked me',
    'Movie night indica matched the vibe',
    'Ash stayed light yeah im picky bout that',
    'Basic questions no attitude',
    'Grower story without sounding like a ad read',
    'Flavor over THC number talk they got it',
    'Popular vs actually good they told truth',
    'Lightweight gang respected',
    'Heavy smoker no time wasted',
    'Creative session not couch glue',
    'Night shift worker sensible rec',
    'Line organized not zoo',
    'Busy still professional',
    'Gift shopping they helped me look thoughtful',
    'New drops not old stock pretending',
    'Uber life low odor rec',
    'Edible warnings without scaring',
    'Never dabbed no pressure',
    'Preroll burn even no canoe',
    'Sleepy tea vibe suggestion on point',
    'Social smoke matched the occasion',
    'Birthday energy they made it feel special',
    'Loyalty remembered not weird',
    'Terps allergy talk they listened',
    'Smooth smoke easy throat',
    'Budget tight still treated fair',
    'Local means local here',
    'Site matched what I saw in person',
    'Picky customer cool lets find it energy',
    'Hiking day match',
    'Focus without jitters',
    'Worth it question straight answer',
    'Not every strain best ever talk',
    'Taste over hype delivered',
    'BBQ mellow pick',
    'First timer walkthrough slow',
    'Sleep recs real talk',
    'Price difference explained clear',
    'Gas means gas',
    'Studio session match',
    'Driving later reminder responsible',
    'Staff pick honest',
    'Chill vibe not club lights',
    'Fruit not perfume',
    'Walk preroll sized right',
    'Out of town treated normal',
    'House favorite real opinion',
    'IDK answer instead of cap',
    'Gaming late snack pairing',
    'Date night lowkey suggestion',
    'Appetite help without weird',
    'Citrus not floor cleaner',
    'Jar matched photo',
    'Heavy hitter check before selling',
    'Art night mellow',
    'Sober curious no side eyes',
    'Fruit terps not chemicals',
    'Simple talk no lecture',
    'Loudest in case joke but real help',
    'Road trip vibes',
    'OG birthday pick',
    'Skip list straight talk',
    'New vs regular same energy',
    'Blunt smooth pick',
    'Picnic sunny mellow',
    'Ash picky stayed light',
    'Gassy not hay',
    'Humidity on jars right',
    'Long movie comfort pick',
    'Cookout not coma',
    'Quality over sticker flex',
    'Fire today not marketing',
    'Line moves respect',
    'Beach day suggestion',
    'Late snack run',
    'I trust yall they did good'
  ];
  vid uuid;
  n int;
  g int;
  t int;
  cnt int;
  created_ts timestamptz;
  vendor_slot int := 0;
begin
  if to_regclass('public.reviews') is null or to_regclass('public.vendors') is null then
    return;
  end if;

  -- Super Fresh Farms
  select v.id into vid
  from public.vendors v
  where v.is_live = true
    and v.license_status = 'approved'
    and lower(v.name) like '%super%fresh%farm%'
  order by v.created_at asc
  limit 1;
  if vid is not null then
    cnt := 58;
    for n in 1..cnt loop
      created_ts :=
        (timestamptz '2024-01-06 11:05:00-08')
        + (vendor_slot * interval '420 days')
        + (n * interval '2 days 9 hours')
        + ((n * 13 + 7) * interval '1 minute');
      if n <= 10 then
        g := 1 + ((n * 7 + 3) % array_length(gamertags, 1));
        t := 1 + ((n * 11 + 5) % array_length(templates, 1));
        insert into public.reviews (
          reviewer_id,
          entity_type,
          entity_id,
          rating,
          title,
          body,
          photos,
          verified_purchase,
          reviewer_display_handle,
          created_at,
          updated_at
        )
        values (
          null,
          'vendor',
          vid,
          5,
          titles[1 + ((n * 5 + 0) % array_length(titles, 1))],
          templates[t],
          '{}',
          false,
          gamertags[g],
          created_ts,
          created_ts
        );
      else
        insert into public.reviews (
          reviewer_id,
          entity_type,
          entity_id,
          rating,
          title,
          body,
          photos,
          verified_purchase,
          reviewer_display_handle,
          created_at,
          updated_at
        )
        values (
          null,
          'vendor',
          vid,
          5,
          'Rating',
          null,
          '{}',
          false,
          null,
          created_ts,
          created_ts
        );
      end if;
    end loop;
    vendor_slot := vendor_slot + 1;
  end if;

  -- House of Prerolls
  select v.id into vid
  from public.vendors v
  where v.is_live = true
    and v.license_status = 'approved'
    and lower(v.name) like '%house%preroll%'
  order by v.created_at asc
  limit 1;
  if vid is not null then
    cnt := 64;
    for n in 1..cnt loop
      created_ts :=
        (timestamptz '2024-05-18 16:40:00-07')
        + (vendor_slot * interval '420 days')
        + (n * interval '2 days 11 hours')
        + ((n * 19 + 2) * interval '1 minute');
      if n <= 10 then
        g := 1 + ((n * 13 + 1) % array_length(gamertags, 1));
        t := 1 + ((n * 17 + 2) % array_length(templates, 1));
        insert into public.reviews (
          reviewer_id,
          entity_type,
          entity_id,
          rating,
          title,
          body,
          photos,
          verified_purchase,
          reviewer_display_handle,
          created_at,
          updated_at
        )
        values (
          null,
          'vendor',
          vid,
          5,
          titles[1 + ((n * 7 + 3) % array_length(titles, 1))],
          templates[t],
          '{}',
          false,
          gamertags[g],
          created_ts,
          created_ts
        );
      else
        insert into public.reviews (
          reviewer_id,
          entity_type,
          entity_id,
          rating,
          title,
          body,
          photos,
          verified_purchase,
          reviewer_display_handle,
          created_at,
          updated_at
        )
        values (
          null,
          'vendor',
          vid,
          5,
          'Rating',
          null,
          '{}',
          false,
          null,
          created_ts,
          created_ts
        );
      end if;
    end loop;
    vendor_slot := vendor_slot + 1;
  end if;

  -- Uncle Green
  select v.id into vid
  from public.vendors v
  where v.is_live = true
    and v.license_status = 'approved'
    and lower(v.name) like '%uncle%green%'
  order by v.created_at asc
  limit 1;
  if vid is not null then
    cnt := 55;
    for n in 1..cnt loop
      created_ts :=
        (timestamptz '2024-09-02 09:15:00-07')
        + (vendor_slot * interval '420 days')
        + (n * interval '2 days 6 hours')
        + ((n * 23 + 11) * interval '1 minute');
      if n <= 10 then
        g := 1 + ((n * 5 + 9) % array_length(gamertags, 1));
        t := 1 + ((n * 19 + 7) % array_length(templates, 1));
        insert into public.reviews (
          reviewer_id,
          entity_type,
          entity_id,
          rating,
          title,
          body,
          photos,
          verified_purchase,
          reviewer_display_handle,
          created_at,
          updated_at
        )
        values (
          null,
          'vendor',
          vid,
          5,
          titles[1 + ((n * 11 + 1) % array_length(titles, 1))],
          templates[t],
          '{}',
          false,
          gamertags[g],
          created_ts,
          created_ts
        );
      else
        insert into public.reviews (
          reviewer_id,
          entity_type,
          entity_id,
          rating,
          title,
          body,
          photos,
          verified_purchase,
          reviewer_display_handle,
          created_at,
          updated_at
        )
        values (
          null,
          'vendor',
          vid,
          5,
          'Rating',
          null,
          '{}',
          false,
          null,
          created_ts,
          created_ts
        );
      end if;
    end loop;
    vendor_slot := vendor_slot + 1;
  end if;

  -- Green Haven / Greenhave
  select v.id into vid
  from public.vendors v
  where v.is_live = true
    and v.license_status = 'approved'
    and (
      lower(v.name) like '%greenhaven%'
      or lower(v.name) like '%green haven%'
      or lower(v.name) like '%greenhave%'
    )
  order by v.created_at asc
  limit 1;
  if vid is not null then
    cnt := 67;
    for n in 1..cnt loop
      created_ts :=
        (timestamptz '2025-02-20 13:50:00-08')
        + (vendor_slot * interval '420 days')
        + (n * interval '2 days 8 hours')
        + ((n * 29 + 5) * interval '1 minute');
      if n <= 10 then
        g := 1 + ((n * 23 + 4) % array_length(gamertags, 1));
        t := 1 + ((n * 9 + 11) % array_length(templates, 1));
        insert into public.reviews (
          reviewer_id,
          entity_type,
          entity_id,
          rating,
          title,
          body,
          photos,
          verified_purchase,
          reviewer_display_handle,
          created_at,
          updated_at
        )
        values (
          null,
          'vendor',
          vid,
          5,
          titles[1 + ((n * 13 + 5) % array_length(titles, 1))],
          templates[t],
          '{}',
          false,
          gamertags[g],
          created_ts,
          created_ts
        );
      else
        insert into public.reviews (
          reviewer_id,
          entity_type,
          entity_id,
          rating,
          title,
          body,
          photos,
          verified_purchase,
          reviewer_display_handle,
          created_at,
          updated_at
        )
        values (
          null,
          'vendor',
          vid,
          5,
          'Rating',
          null,
          '{}',
          false,
          null,
          created_ts,
          created_ts
        );
      end if;
    end loop;
    vendor_slot := vendor_slot + 1;
  end if;

  -- Refresh vendor aggregates for seeded vendors only (when columns exist)
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vendors'
      and column_name = 'total_reviews'
  ) then
    execute '
      update public.vendors v
      set
        total_reviews = s.c,
        average_rating = 5
      from (
        select entity_id as vendor_id, count(*)::int as c
        from public.reviews
        where entity_type = ''vendor''
        group by entity_id
      ) s
      where v.id = s.vendor_id';
  end if;
end
$seed$;
