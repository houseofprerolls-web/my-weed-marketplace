# Strain data

## `leafly_strain_data.csv`

Structured reference file (names, types, THC strings, terpene labels, effect percentages, image URLs, etc.).

**We do not copy the long `description` column from this file into the database.** That text is third-party editorial and should not be republished. The seed script (`npm run seed:strains`) writes **short, original summaries** built only from factual columns (type, THC number, terpene name, effect tags).

If you replace image URLs with your own hosted assets, update rows after import or adjust the CSV before seeding.

After seeding, open **Admin → Strain directory** (`/admin/strains`) and use **Rebuild all summaries** if you want every row to use the latest template text from `lib/strainSummaries.ts`.
