import { NextRequest, NextResponse } from "next/server";

function normalizeZip(param: string | null): string | null {
  if (!param) return null;
  const digits = param.replace(/\D/g, "");
  if (digits.length < 5) return null;
  return digits.slice(0, 5);
}

/**
 * Forward geocode US ZIP → lat/lng + display label (Nominatim).
 */
export async function GET(req: NextRequest) {
  const zip = normalizeZip(req.nextUrl.searchParams.get("zip"));
  if (!zip) {
    return NextResponse.json({ error: "Enter a valid US ZIP code." }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("postalcode", zip);
  url.searchParams.set("countrycodes", "us");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "DaTreehouse/1.0 (https://example.com/datreehouse; marketplace)",
    },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Geocoder unavailable." }, { status: 502 });
  }

  const rows = (await res.json()) as {
    lat: string;
    lon: string;
    display_name: string;
  }[];

  const hit = rows[0];
  if (!hit) {
    return NextResponse.json(
      { error: "ZIP not found. Try another code." },
      { status: 404 }
    );
  }

  const lat = Number(hit.lat);
  const lng = Number(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Invalid geocoder response." }, { status: 502 });
  }

  const label =
    hit.display_name.length > 80
      ? `${zip} area`
      : hit.display_name.split(",").slice(0, 3).join(",").trim();

  return NextResponse.json({
    zip,
    lat,
    lng,
    label,
  });
}
