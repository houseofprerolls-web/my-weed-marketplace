# Internal Admin Placement Management System

## Overview

GreenZone now includes a complete **internal advertising placement management system** that allows employees to control promotional campaigns while giving vendors performance insights without direct purchase access.

**Key Principle:** Placements are sales-driven and managed internally by the GreenZone team, not self-service for vendors.

---

## System Architecture

### Database Tables Created ✅

**1. `admin_placement_campaigns`**
- Employee-managed advertising placements
- Campaign tracking with impressions/clicks/CTR
- Status management (active, paused, scheduled, completed, canceled)
- Location targeting support
- Auto-calculated CTR using generated columns

**2. `placement_performance_daily`**
- Daily performance metrics per campaign
- Aggregated data for vendor analytics
- Historical performance tracking
- Unique constraint per campaign per day

**3. `vendor_engagement_scores`**
- Automated engagement scoring (0-100)
- Four score components:
  - Listing traffic score
  - Engagement growth score (week-over-week)
  - Deal performance score
  - Menu completeness score
- Overall score calculated automatically
- Recommended for campaign flag
- Has active campaign tracking

### Functions Created ✅

**`update_campaign_status()`**
- Automatically activates scheduled campaigns on start date
- Automatically completes campaigns on end date
- Updates vendor engagement has_active_campaign flags
- Run daily via cron

**`calculate_vendor_engagement_score(vendor_id)`**
- Calculates listing traffic score (based on views)
- Calculates growth score (week-over-week comparison)
- Calculates deal performance score (deal clicks / total deals)
- Calculates menu completeness score (products, categories, logo)
- Updates overall score and recommendation flag
- Used for sales targeting

---

## Placement Types

### 1. Homepage Featured
**Type:** `homepage_featured`
**Description:** Top placement on GreenZone homepage
**Best For:** High-traffic vendors, new vendor launches
**Icon:** Star (yellow)

### 2. City Featured
**Type:** `city_featured`
**Description:** Featured in city-specific search results
**Best For:** Vendors targeting specific markets
**Icon:** MapPin (blue)

### 3. Map Featured Pin
**Type:** `map_featured`
**Description:** Priority pin on map view
**Best For:** Vendors in dense market areas
**Icon:** MapPin (green)

### 4. Sponsored Deal
**Type:** `sponsored_deal`
**Description:** Highlight specific deals across platform
**Best For:** Vendors with strong promotional offers
**Icon:** Tag (orange)

### 5. Banner Advertisement
**Type:** `banner_ad`
**Description:** Banner ad placement on high-traffic pages
**Best For:** Brand awareness campaigns
**Icon:** LayoutGrid (purple)

---

## Admin Interface

### Admin Placement Manager
**URL:** `/admin/placements`

**Features:**
- View all active campaigns
- View scheduled campaigns
- View completed campaigns
- Create new campaigns
- Edit existing campaigns
- Pause/resume campaigns
- Performance metrics dashboard

**Quick Stats:**
- Active campaigns count
- Total impressions
- Total clicks
- Average CTR

**Campaign Card Display:**
- Campaign name
- Vendor business name
- Placement type with icon
- Status badge
- Date range
- Target location (if applicable)
- Performance metrics (impressions, clicks, CTR)
- Assigned by (employee name)

**Create Campaign Dialog:**
- Select vendor from dropdown
- Select placement type
- Enter campaign name
- Set start and end dates
- Optional target location
- Campaign notes (internal)
- Assigned to current admin user

### Admin Sales Dashboard
**URL:** `/admin/sales-dashboard`

**Purpose:** Identify high-potential vendors for campaign sales

**Four Lead Categories:**

**1. High Traffic Vendors**
- Sorted by listing views
- Shows weekly growth percentage
- Engagement score bar
- Product/deal counts
- Perfect for homepage or city placements

**2. Fast Growing Vendors**
- Sorted by week-over-week growth
- Shows engagement trajectory
- Ideal for early campaign adoption
- Great for long-term partnerships

**3. Top Deal Performers**
- Sorted by deal click rate
- Shows deal conversion percentage
- Perfect for sponsored deal placements
- Strong promotional focus

**4. No Active Campaign**
- Established vendors without current campaigns
- Shows months on platform
- Upsell opportunities
- Prime for re-engagement

**Vendor Cards Show:**
- Business name and location
- Engagement score (0-100)
- Traffic metrics
- Growth percentage
- Product/deal counts
- Star rating
- "Create Campaign" button

**Color-Coded Insights:**
- Blue: High traffic
- Green: Fast growing
- Orange: Deal performers
- Purple: No campaign

---

## Vendor Interface

### Vendor Advertising Page
**URL:** `/vendor/advertising`

**Features:**
- **Read-only** view of campaigns
- NO purchase or self-serve options
- Performance metrics only
- Contact prompt for campaign interest

**Info Banner:**
- Explains campaigns are managed by GreenZone team
- Prompts to contact account manager
- Lists available placement types
- Visual placement type indicators

**Active Campaigns Tab:**
- Campaign name
- Placement type badge
- Active status
- Days remaining badge
- Performance metrics:
  - Impressions (with Eye icon)
  - Clicks (with MousePointerClick icon)
  - CTR (with TrendingUp icon, green)
- Campaign duration progress bar
- Date range display

**Past Campaigns Tab:**
- Historical campaign performance
- Completed badge
- Final metrics
- Date ranges

**Empty State:**
- "No Active Campaigns" message
- Encourages contacting account manager
- No purchase buttons or self-serve options

**Metrics Explained:**
- Info card explaining impressions, clicks, CTR
- Educational content
- Transparent performance data

---

## Engagement Scoring System

### Score Components (0-100 each)

**1. Listing Traffic Score**
- Based on total listing views
- Formula: `min(100, listing_views / 100)`
- High views = high score

**2. Engagement Growth Score**
- Week-over-week view comparison
- Formula: `min(100, ((current_week - previous_week) / previous_week) * 100 + 50)`
- Default: 50 if no previous data
- Shows momentum

**3. Deal Performance Score**
- Deal clicks divided by total deals
- Formula: `min(100, (deal_clicks / total_deals) * 2)`
- Measures promotional effectiveness

**4. Menu Completeness Score**
- 40 points: ≥20 products
- 30 points: ≥4 categories
- 30 points: Has logo
- Maximum: 100 points
- Measures listing quality

**Overall Score:**
- Average of four component scores
- Range: 0-100
- Used for campaign recommendations

**Recommended for Campaign:**
- Overall score ≥ 60
- Does NOT have active campaign
- Automatically flagged for sales team

---

## Sales Workflow

### 1. Identify Leads
**Admin visits:** `/admin/sales-dashboard`

**Actions:**
- Review high traffic vendors
- Check growing vendors
- Identify deal performers
- Find vendors without campaigns

### 2. Assess Vendor Fit
**Review engagement score:**
- 80+ = Excellent candidate
- 60-79 = Good candidate
- 40-59 = Moderate candidate
- <40 = Needs improvement first

**Check metrics:**
- Listing views (demand indicator)
- Weekly growth (momentum)
- Product count (inventory)
- Deal count (promotional mindset)
- Rating (quality signal)

### 3. Create Campaign
**Admin visits:** `/admin/placements`

**Process:**
1. Click "Create Campaign"
2. Select vendor from dropdown
3. Choose placement type
4. Enter campaign name
5. Set date range
6. Add target location (if applicable)
7. Add internal notes
8. Submit campaign

**System actions:**
- Campaign status set to "scheduled"
- Auto-activates on start_date
- Auto-completes on end_date
- Vendor sees campaign in their dashboard

### 4. Monitor Performance
**Admin tracks:**
- Impressions (ad displays)
- Clicks (user engagement)
- CTR (effectiveness)
- Campaign ROI

**Vendor sees:**
- Same metrics (read-only)
- Performance transparency
- Value demonstration

### 5. Renewal & Upsell
**After campaign ends:**
- Review performance with vendor
- Discuss results and impact
- Propose renewal or upgrade
- Create new campaign if interested

---

## Security & Permissions

### Admin Access (RLS Policies)

**`admin_placement_campaigns`:**
- Admins can manage all campaigns (SELECT, INSERT, UPDATE, DELETE)
- Vendors can view their own campaigns (SELECT only)
- Public can view active campaigns (for display on site)

**`placement_performance_daily`:**
- Admins can view all performance data
- Vendors can view their own performance
- System can insert new data

**`vendor_engagement_scores`:**
- Admins can manage all scores
- Vendors can view their own score
- No public access

### Vendor Access (Read-Only)

Vendors can:
- View their active campaigns
- View their past campaigns
- See performance metrics
- Understand campaign value

Vendors CANNOT:
- Create campaigns
- Edit campaigns
- Pause campaigns
- Purchase placements
- Set pricing
- Target locations

---

## Revenue Model

### Internal Sales Process

**Pricing:**
- Managed internally by GreenZone team
- Custom pricing per vendor
- Volume discounts available
- Flexible terms

**Sales Team:**
- Account managers handle campaigns
- Custom proposals
- Relationship-driven
- Performance-based renewals

**Revenue Tracking:**
- Tracked in existing `revenue_events` table
- Type: "placement"
- Amount: Campaign fee
- Vendor attribution

---

## Performance Tracking

### Campaign Metrics

**Impressions:**
- Count every time placement is displayed
- Tracked in `admin_placement_campaigns.impressions`
- Daily aggregation in `placement_performance_daily`

**Clicks:**
- Count every click on placement
- Tracked in `admin_placement_campaigns.clicks`
- Daily aggregation in `placement_performance_daily`

**CTR (Click-Through Rate):**
- Auto-calculated: `(clicks / impressions) * 100`
- Generated column in both tables
- Displayed as percentage

### Analytics Integration

**Event Tracking:**
```sql
-- Ad impression
INSERT INTO analytics_events (event_type, vendor_id, metadata)
VALUES ('ad_impression', vendor_id, '{"campaign_id": "xxx", "placement_type": "homepage_featured"}');

-- Ad click
INSERT INTO analytics_events (event_type, vendor_id, metadata)
VALUES ('ad_click', vendor_id, '{"campaign_id": "xxx", "placement_type": "homepage_featured"}');
```

**Daily Aggregation:**
```sql
-- Update campaign totals
UPDATE admin_placement_campaigns
SET impressions = impressions + daily_impressions,
    clicks = clicks + daily_clicks
WHERE id = campaign_id;

-- Insert daily performance
INSERT INTO placement_performance_daily (campaign_id, vendor_id, metric_date, impressions, clicks)
VALUES (campaign_id, vendor_id, CURRENT_DATE, daily_impressions, daily_clicks);
```

---

## Automation

### Daily Cron Jobs

**Update Campaign Status:**
```sql
SELECT update_campaign_status();
```
- Activates scheduled campaigns
- Completes expired campaigns
- Updates vendor flags

**Calculate Engagement Scores:**
```sql
SELECT calculate_vendor_engagement_score(vendor_id)
FROM vendor_profiles;
```
- Updates all vendor scores
- Refreshes recommendations
- Weekly frequency suggested

### Automatic Transitions

**Scheduled → Active:**
- When `CURRENT_DATE >= start_date`
- Status changes to "active"
- Vendor sees campaign

**Active → Completed:**
- When `CURRENT_DATE > end_date`
- Status changes to "completed"
- Moves to past campaigns

**Pause/Resume:**
- Manual admin action
- Temporarily stops impressions/clicks
- Maintains date range

---

## UI Components

### Admin Pages Created ✅

1. **`/admin/placements`** - Placement manager
2. **`/admin/sales-dashboard`** - Sales leads

### Vendor Pages Created ✅

1. **`/vendor/advertising`** - Performance analytics (read-only)

### Navigation Updated ✅

**Vendor Nav:**
- "Placements & Ads" renamed to "Advertising"
- Updated href to `/vendor/advertising`
- Megaphone icon retained

---

## Example Workflow

### Creating a Homepage Feature Campaign

**1. Admin identifies high-potential vendor:**
- Visits `/admin/sales-dashboard`
- Sees "Premium Cannabis Co." with 87 engagement score
- 8,240 listing views, +28% weekly growth
- No active campaign

**2. Admin creates campaign:**
- Clicks "Create Campaign" from sales dashboard
- Vendor: Premium Cannabis Co.
- Type: Homepage Featured
- Name: "Q2 Homepage Feature"
- Start: April 1, 2026
- End: April 30, 2026
- Notes: "Strong performer, first campaign"
- Submits

**3. Campaign auto-activates:**
- April 1: Status changes to "active"
- Vendor sees campaign in `/vendor/advertising`
- Impressions/clicks begin tracking

**4. Vendor monitors performance:**
- Views campaign dashboard
- Sees impressions climbing: 52,000
- Sees clicks: 2,340
- CTR: 4.5%

**5. Campaign auto-completes:**
- April 30: Status changes to "completed"
- Final metrics locked
- Moved to "Past Campaigns"

**6. Admin reviews & renews:**
- Discusses 52K impressions with vendor
- Proposes May campaign
- Creates new campaign

---

## Value Proposition for Vendors

### What Vendors See

**Transparency:**
- Real-time performance metrics
- Clear campaign duration
- Days remaining indicator
- Historical performance

**Professional Presentation:**
- Clean, modern dashboard
- Icon-based placement types
- Color-coded status badges
- Performance charts (future)

**No Pressure:**
- No self-serve purchase
- No pricing displayed
- No upsell popups
- Contact-based approach

**Educational:**
- Explains metrics (impressions, clicks, CTR)
- Shows campaign value
- Builds trust through data

---

## Admin Dashboard Features

### Placement Manager Features

**Filtering:**
- By status (active, scheduled, completed)
- By placement type
- By vendor
- By date range

**Sorting:**
- By performance (CTR, impressions, clicks)
- By date (start, end)
- By vendor name

**Bulk Actions:**
- Pause multiple campaigns
- Export campaign data
- Generate reports

**Quick Stats:**
- Total active campaigns
- Total impressions across all campaigns
- Total clicks across all campaigns
- Average CTR

---

## Sales Dashboard Features

### Lead Scoring Insights

**High Traffic Vendors:**
- Top listings by views
- Growth trending up
- Strong baseline demand

**Fast Growing Vendors:**
- Momentum indicators
- Emerging opportunities
- Early adopter potential

**Deal Performers:**
- Promotional mindset
- Strong deal engagement
- Perfect for sponsored deals

**No Campaign Vendors:**
- Established presence
- No current spend
- Upsell opportunity
- Re-engagement target

---

## Future Enhancements

### Phase 2 Features

**Campaign Builder:**
- Template campaigns
- Seasonal templates
- Multi-placement bundles
- Package deals

**Advanced Analytics:**
- Campaign performance charts
- CTR trends over time
- A/B testing support
- Attribution tracking

**Automated Recommendations:**
- AI-suggested placement types
- Optimal campaign duration
- Budget recommendations
- Performance predictions

**Vendor Portal Enhancements:**
- Campaign request form
- Performance comparisons
- Industry benchmarks
- Campaign history export

**Sales Team Tools:**
- Lead assignment
- Follow-up reminders
- Proposal templates
- Performance reports

---

## Summary

### What Was Built ✅

**Database:**
- 3 new tables
- 2 custom functions
- Complete RLS policies
- Auto-calculated CTR

**Admin Tools:**
- Placement manager UI
- Sales dashboard UI
- Lead identification system
- Engagement scoring

**Vendor Experience:**
- Read-only campaign analytics
- Performance transparency
- No self-serve pressure
- Contact-driven sales

**Security:**
- Admin-only campaign management
- Vendor read-only access
- Public display for active campaigns
- Complete audit trail

### Key Benefits

**For GreenZone:**
- Sales-driven revenue model
- Relationship-based selling
- Custom pricing flexibility
- High-touch customer service

**For Vendors:**
- No confusing self-serve
- Clear performance data
- Professional presentation
- Account manager support

**For Sales Team:**
- Lead identification tools
- Engagement scoring
- Performance tracking
- Renewal pipeline

---

**System Status: Production-Ready ✅**

The internal admin placement management system is fully functional and ready for GreenZone employees to manage advertising campaigns while vendors enjoy transparent performance insights.
