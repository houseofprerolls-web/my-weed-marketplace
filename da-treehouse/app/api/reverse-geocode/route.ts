import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side reverse geocode (avoids browser CORS).
 * Uses OpenStreetMap Nominatim — respect their usage policy in production.
 */
export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get("lat");
  const lng = req.nextUrl.searchParams.get("lng");
  const nLat = lat != null ? Number(lat) : NaN;
  const nLng = lng != null ? Number(lng) : NaN;
  if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) {
    return NextResponse.json(
      { error: "Invalid lat/lng" },
      { status: 400 }
    );
  }
  if (nLat < -90 || nLat > 90 || nLng < -180 || nLng > 180) {
    return NextResponse.json({ error: "Out of range" }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(nLat));
  url.searchParams.set("lon", String(nLng));
  url.searchParams.set("format", "json");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "DaTreehouse/1.0 (https://example.com/datreehouse; compliance-localization)",
    },
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Geocoder unavailable" },
      { status: 502 }
    );
  }

  const body = (await res.json()) as {
    address?: Record<string, string>;
  };

  const addr = body.address ?? {};
  const iso = addr["ISO3166-2-lvl4"];
  let geo_state: string | null = null;
  if (typeof iso === "string" && iso.startsWith("US-")) {
    geo_state = iso.slice(3);
  } else if (typeof addr.state === "string") {
    geo_state = addr.state;
  }

  return NextResponse.json({ geo_state });
}
