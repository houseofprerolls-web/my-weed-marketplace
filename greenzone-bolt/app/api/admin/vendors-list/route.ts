import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requestUserIsAdmin } from '@/lib/requestAdminAuth';
import { createServiceRoleClient, hasServiceRoleKey } from '@/lib/supabaseServiceRole';
import { resolveUseVendorsTableForDiscovery } from '@/lib/vendorSchema';
import { parseAdminWorkspaceRegion } from '@/lib/adminRegionWorkspace';
import {
  ADMIN_VENDOR_ID_IN_CHUNK,
  chunkIds,
  fetchAdminVendorIdsForRegion,
  hintForMissingAdminRegionRpc,
  supabaseThrownMessage,
} from '@/lib/adminVendorsByRegion';
import { fetchVendorIdsWithLicenseExpiringSoon } from '@/lib/adminLicenseExpiry';

type VendorRow = Record<string, unknown>;

const VENDOR_LIST_SELECT =
  'id, user_id, name, slug, logo_url, banner_url, is_live, license_status, verified, smokers_club_eligible, map_visible_override, online_menu_enabled, offers_delivery, offers_storefront, allow_both_storefront_and_delivery, admin_service_mode, service_mode_locked, address, city, state, zip, smokers_club_tab_background_url, deal_datetime_scheduling_enabled, extra_map_pins_allowed';

const VENDOR_PROFILE_LIST_SELECT =
  'id, business_name, user_id, logo_url, cover_photo_url, is_approved, approval_status, is_live, profile_views, listing_views, deal_clicks, phone_clicks, direction_clicks, website_clicks, average_rating, total_reviews, total_products';

/** Postgres uuid string (avoids comparing uuid columns to '' which throws). */
const FULL_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuidString(s: string): boolean {
  return FULL_UUID_RE.test(s.trim());
}

/**
 * Paginated vendor directory for admin UI; uses service role after admin JWT check.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
    const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
    if (!url || !anon) {
      return NextResponse.json({ error: 'Server missing Supabase URL or anon key' }, { status: 500 });
    }

    const supabaseAuthed = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
    } = await supabaseAuthed.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await requestUserIsAdmin(supabaseAuthed, user))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!hasServiceRoleKey()) {
      return NextResponse.json(
        {
          error:
            'Server missing SUPABASE_SERVICE_ROLE_KEY — add it to .env.local so vendor admin can load shops.',
        },
        { status: 503 }
      );
    }

    const db = createServiceRoleClient();
    const vendorsSchema = resolveUseVendorsTableForDiscovery();

    const sp = request.nextUrl.searchParams;
    const q = (sp.get('q') ?? '').trim();
    const owner = (sp.get('owner') ?? 'all').trim(); // all|linked|unclaimed
    const club = (sp.get('club') ?? 'all').trim(); // all|smokers_only
    const page = Math.max(0, parseInt(sp.get('page') ?? '0', 10) || 0);
    const pageSize = Math.min(100, Math.max(10, parseInt(sp.get('pageSize') ?? '60', 10) || 60));
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const workspaceRegion = parseAdminWorkspaceRegion(sp.get('region'));
    const licenseExpiringSoon = sp.get('licenseExpiringSoon') === '1';
    let expiringVendorIds: Set<string> | null = null;
    if (vendorsSchema && licenseExpiringSoon) {
      expiringVendorIds = await fetchVendorIdsWithLicenseExpiringSoon(db);
    }

    if (vendorsSchema) {
      if (workspaceRegion === 'ca' || workspaceRegion === 'ny') {
        let allowedIds: string[];
        try {
          const got = await fetchAdminVendorIdsForRegion(db, workspaceRegion);
          allowedIds = got ?? [];
        } catch (err) {
          const msg = hintForMissingAdminRegionRpc(supabaseThrownMessage(err));
          return NextResponse.json({ error: msg, vendors: [], vendorsSchema }, { status: 400 });
        }

        if (allowedIds.length === 0) {
          return NextResponse.json({
            ok: true,
            vendorsSchema,
            workspaceRegion,
            vendors: [],
            ownerEmailByUserId: {},
            page,
            pageSize,
            totalCount: 0,
          });
        }

        const chunks = chunkIds(allowedIds, ADMIN_VENDOR_ID_IN_CHUNK);
        const loaded: VendorRow[] = [];
        for (const part of chunks) {
          const { data, error } = await db.from('vendors').select(VENDOR_LIST_SELECT).in('id', part);
          if (error) {
            return NextResponse.json({ error: error.message, vendors: [], vendorsSchema }, { status: 400 });
          }
          loaded.push(...((data || []) as VendorRow[]));
        }

        const byId = new Map<string, VendorRow>();
        for (const row of loaded) {
          const id = String(row.id ?? '');
          if (id) byId.set(id, row);
        }
        let rows = Array.from(byId.values());

        if (owner === 'linked') {
          rows = rows.filter((v) => v.user_id != null && String(v.user_id).trim() !== '');
        }
        if (owner === 'unclaimed') {
          rows = rows.filter((v) => v.user_id == null || String(v.user_id).trim() === '');
        }
        if (club === 'smokers_only') {
          rows = rows.filter((v) => v.smokers_club_eligible === true);
        }

        if (licenseExpiringSoon) {
          const ids = expiringVendorIds;
          if (ids == null || ids.size === 0) {
            rows = [];
          } else {
            rows = rows.filter((v) => ids.has(String(v.id ?? '')));
          }
        }

        if (q) {
          const safe = q.replace(/%/g, '').replace(/,/g, '').slice(0, 120);
          const safeLower = safe.toLowerCase();
          const zipDigits = safe.replace(/\D/g, '');
          const emailUserIds = new Set<string>();
          if (safe.includes('@')) {
            const { data: profs } = await db.from('profiles').select('id').ilike('email', `%${safe}%`).limit(80);
            for (const p of profs || []) {
              const pid = String((p as { id: string }).id || '').trim();
              if (isUuidString(pid)) emailUserIds.add(pid);
            }
          }
          rows = rows.filter((v) => {
            const name = String(v.name ?? '').toLowerCase();
            const slug = String(v.slug ?? '').toLowerCase();
            const zip = String(v.zip ?? '').replace(/\D/g, '');
            const id = String(v.id ?? '');
            const uid = String(v.user_id ?? '');
            if (name.includes(safeLower) || slug.includes(safeLower)) return true;
            if (zipDigits.length >= 3 && zip.includes(zipDigits)) return true;
            if (isUuidString(safe) && (id === safe || uid === safe)) return true;
            if (emailUserIds.has(uid)) return true;
            return false;
          });
        }

        rows.sort((a, b) =>
          String(a.name ?? '').localeCompare(String(b.name ?? ''), undefined, { sensitivity: 'base' })
        );
        const totalCount = rows.length;
        const pageRows = rows.slice(from, to + 1);

        const userIds = Array.from(
          new Set(pageRows.map((v) => String(v.user_id ?? '').trim()).filter((id) => id.length > 0))
        );
        const emailByUserId: Record<string, string> = {};
        if (userIds.length) {
          const { data: profs, error: pe } = await db.from('profiles').select('id, email').in('id', userIds);
          if (!pe) {
            for (const p of profs || []) {
              const row = p as { id: string; email: string | null };
              if (row.id && row.email) emailByUserId[row.id] = row.email;
            }
          }
        }

        return NextResponse.json({
          ok: true,
          vendorsSchema,
          workspaceRegion,
          vendors: pageRows,
          ownerEmailByUserId: emailByUserId,
          page,
          pageSize,
          totalCount,
        });
      }

      if (expiringVendorIds && expiringVendorIds.size === 0) {
        return NextResponse.json({
          ok: true,
          vendorsSchema,
          workspaceRegion,
          vendors: [],
          ownerEmailByUserId: {},
          page,
          pageSize,
          totalCount: 0,
        });
      }

      let query = db.from('vendors').select(VENDOR_LIST_SELECT, { count: 'exact' }).order('name').range(from, to);

      if (expiringVendorIds && expiringVendorIds.size > 0) {
        query = query.in('id', Array.from(expiringVendorIds));
      }

      if (club === 'smokers_only') query = query.eq('smokers_club_eligible', true);
      // user_id is uuid — never .neq('user_id','') (invalid input syntax for type uuid).
      if (owner === 'linked') query = query.not('user_id', 'is', null);
      if (owner === 'unclaimed') query = query.is('user_id', null);

      if (q) {
        const safe = q.replace(/%/g, '').replace(/,/g, '').slice(0, 120);
        const zipDigits = safe.replace(/\D/g, '');
        const orParts = [`name.ilike.%${safe}%`, `slug.ilike.%${safe}%`];
        if (zipDigits.length >= 3) orParts.push(`zip.ilike.%${zipDigits}%`);
        if (isUuidString(safe)) {
          orParts.push(`id.eq.${safe}`);
          orParts.push(`user_id.eq.${safe}`);
        }
        if (safe.includes('@')) {
          const { data: profs } = await db.from('profiles').select('id').ilike('email', `%${safe}%`).limit(80);
          const pids = (profs || [])
            .map((p) => String((p as { id: string }).id || '').trim())
            .filter((id) => isUuidString(id));
          if (pids.length) orParts.push(`user_id.in.(${pids.join(',')})`);
        }
        query = query.or(orParts.join(','));
      }

      const { data, error, count } = await query;
      if (error) {
        return NextResponse.json({ error: error.message, vendors: [], vendorsSchema }, { status: 400 });
      }
      const rows = (data || []) as VendorRow[];
      const totalCount = typeof count === 'number' ? count : rows.length;

      const userIds = Array.from(
        new Set(rows.map((v) => String(v.user_id ?? '').trim()).filter((id) => id.length > 0))
      );
      const emailByUserId: Record<string, string> = {};
      if (userIds.length) {
        const { data: profs, error: pe } = await db.from('profiles').select('id, email').in('id', userIds);
        if (!pe) {
          for (const p of profs || []) {
            const row = p as { id: string; email: string | null };
            if (row.id && row.email) emailByUserId[row.id] = row.email;
          }
        }
      }

      return NextResponse.json({
        ok: true,
        vendorsSchema,
        workspaceRegion,
        vendors: rows,
        ownerEmailByUserId: emailByUserId,
        page,
        pageSize,
        totalCount,
      });
    } else {
      if (workspaceRegion === 'ca' || workspaceRegion === 'ny') {
        let allowedIds: string[];
        try {
          const got = await fetchAdminVendorIdsForRegion(db, workspaceRegion);
          allowedIds = got ?? [];
        } catch (err) {
          const msg = hintForMissingAdminRegionRpc(supabaseThrownMessage(err));
          return NextResponse.json({ error: msg, vendors: [], vendorsSchema }, { status: 400 });
        }

        if (allowedIds.length === 0) {
          return NextResponse.json({
            ok: true,
            vendorsSchema,
            workspaceRegion,
            vendors: [],
            ownerEmailByUserId: {},
            page,
            pageSize,
            totalCount: 0,
          });
        }

        const chunks = chunkIds(allowedIds, ADMIN_VENDOR_ID_IN_CHUNK);
        const loaded: VendorRow[] = [];
        for (const part of chunks) {
          const { data, error } = await db.from('vendor_profiles').select(VENDOR_PROFILE_LIST_SELECT).in('id', part);
          if (error) {
            return NextResponse.json({ error: error.message, vendors: [], vendorsSchema }, { status: 400 });
          }
          loaded.push(...((data || []) as VendorRow[]));
        }

        const byId = new Map<string, VendorRow>();
        for (const row of loaded) {
          const id = String(row.id ?? '');
          if (id) byId.set(id, row);
        }
        let rows = Array.from(byId.values());

        if (owner === 'linked') {
          rows = rows.filter((v) => v.user_id != null && String(v.user_id).trim() !== '');
        }
        if (owner === 'unclaimed') {
          rows = rows.filter((v) => v.user_id == null || String(v.user_id).trim() === '');
        }

        if (q) {
          const safe = q.replace(/%/g, '').replace(/,/g, '').slice(0, 120);
          const safeLower = safe.toLowerCase();
          const emailUserIds = new Set<string>();
          if (safe.includes('@')) {
            const { data: profs } = await db.from('profiles').select('id').ilike('email', `%${safe}%`).limit(80);
            for (const p of profs || []) {
              const pid = String((p as { id: string }).id || '').trim();
              if (isUuidString(pid)) emailUserIds.add(pid);
            }
          }
          rows = rows.filter((v) => {
            const bn = String(v.business_name ?? '').toLowerCase();
            const id = String(v.id ?? '');
            const uid = String(v.user_id ?? '');
            if (bn.includes(safeLower)) return true;
            if (isUuidString(safe) && (id === safe || uid === safe)) return true;
            if (emailUserIds.has(uid)) return true;
            return false;
          });
        }

        rows.sort((a, b) =>
          String(a.business_name ?? '').localeCompare(String(b.business_name ?? ''), undefined, {
            sensitivity: 'base',
          })
        );
        const totalCount = rows.length;
        const pageRows = rows.slice(from, to + 1);

        const userIds = Array.from(
          new Set(pageRows.map((v) => String(v.user_id ?? '').trim()).filter((id) => id.length > 0))
        );
        const emailByUserId: Record<string, string> = {};
        if (userIds.length) {
          const { data: profs, error: pe } = await db.from('profiles').select('id, email').in('id', userIds);
          if (!pe) {
            for (const p of profs || []) {
              const row = p as { id: string; email: string | null };
              if (row.id && row.email) emailByUserId[row.id] = row.email;
            }
          }
        }

        return NextResponse.json({
          ok: true,
          vendorsSchema,
          workspaceRegion,
          vendors: pageRows,
          ownerEmailByUserId: emailByUserId,
          page,
          pageSize,
          totalCount,
        });
      }

      let query = db
        .from('vendor_profiles')
        .select(VENDOR_PROFILE_LIST_SELECT, { count: 'exact' })
        .order('business_name')
        .range(from, to);

      if (owner === 'linked') query = query.not('user_id', 'is', null);
      if (owner === 'unclaimed') query = query.is('user_id', null);

      if (q) {
        const safe = q.replace(/%/g, '').replace(/,/g, '').slice(0, 120);
        const zipDigits = safe.replace(/\D/g, '');
        const orParts = [`business_name.ilike.%${safe}%`];
        if (zipDigits.length >= 3) orParts.push(`zip.ilike.%${zipDigits}%`);
        if (isUuidString(safe)) {
          orParts.push(`id.eq.${safe}`);
          orParts.push(`user_id.eq.${safe}`);
        }
        if (safe.includes('@')) {
          const { data: profs } = await db.from('profiles').select('id').ilike('email', `%${safe}%`).limit(80);
          const pids = (profs || [])
            .map((p) => String((p as { id: string }).id || '').trim())
            .filter((id) => isUuidString(id));
          if (pids.length) orParts.push(`user_id.in.(${pids.join(',')})`);
        }
        query = query.or(orParts.join(','));
      }

      const { data, error, count } = await query;
      if (error) {
        return NextResponse.json({ error: error.message, vendors: [], vendorsSchema }, { status: 400 });
      }
      const rows = (data || []) as VendorRow[];
      const totalCount = typeof count === 'number' ? count : rows.length;

      const userIds = Array.from(
        new Set(rows.map((v) => String(v.user_id ?? '').trim()).filter((id) => id.length > 0))
      );
      const emailByUserId: Record<string, string> = {};
      if (userIds.length) {
        const { data: profs, error: pe } = await db.from('profiles').select('id, email').in('id', userIds);
        if (!pe) {
          for (const p of profs || []) {
            const row = p as { id: string; email: string | null };
            if (row.id && row.email) emailByUserId[row.id] = row.email;
          }
        }
      }

      return NextResponse.json({
        ok: true,
        vendorsSchema,
        workspaceRegion,
        vendors: rows,
        ownerEmailByUserId: emailByUserId,
        page,
        pageSize,
        totalCount,
      });
    }
  } catch (e) {
    console.error('GET /api/admin/vendors-list', e);
    const msg = e instanceof Error ? e.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
