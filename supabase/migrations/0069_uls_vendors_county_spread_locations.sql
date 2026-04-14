/*
  Spread ULS directory delivery pins inside approximate CA county bounds (by seed ZIP).
  Deterministic per vendor id so markers stay stable. Does not use exact parcel locations.
*/

with county_zip_bounds (zip, min_lat, max_lat, min_lng, max_lng) as (
  values
  ('90012', 32.75::double precision, 34.823::double precision, -118.952::double precision, -117.646::double precision),
  ('92101', 32.534::double precision, 33.505::double precision, -117.282::double precision, -116.081::double precision),
  ('92243', 32.618::double precision, 33.434::double precision, -116.107::double precision, -114.735::double precision),
  ('92401', 33.871::double precision, 35.809::double precision, -117.895::double precision, -114.131::double precision),
  ('92501', 33.426::double precision, 34.079::double precision, -117.627::double precision, -114.435::double precision),
  ('92701', 33.333::double precision, 33.947::double precision, -118.151::double precision, -117.357::double precision),
  ('93001', 34.075::double precision, 34.9::double precision, -119.293::double precision, -118.873::double precision),
  ('93101', 33.843::double precision, 35.098::double precision, -120.734::double precision, -119.188::double precision),
  ('93291', 35.789::double precision, 36.751::double precision, -119.354::double precision, -118.176::double precision),
  ('93301', 34.875::double precision, 35.993::double precision, -120.194::double precision, -117.616::double precision),
  ('93401', 34.893::double precision, 35.81::double precision, -121.438::double precision, -119.126::double precision),
  ('93514', 35.914::double precision, 37.502::double precision, -118.417::double precision, -115.648::double precision),
  ('93517', 37.538::double precision, 38.149::double precision, -119.314::double precision, -118.777::double precision),
  ('93637', 36.741::double precision, 37.646::double precision, -120.509::double precision, -119.066::double precision),
  ('93721', 36.582::double precision, 37.036::double precision, -120.734::double precision, -118.36::double precision),
  ('93940', 35.788::double precision, 36.918::double precision, -121.97::double precision, -120.217::double precision),
  ('94063', 37.269::double precision, 37.708::double precision, -122.527::double precision, -122.084::double precision),
  ('94102', 37.708::double precision, 37.832::double precision, -122.515::double precision, -122.357::double precision),
  ('94553', 37.719::double precision, 38.086::double precision, -122.379::double precision, -121.534::double precision),
  ('94559', 38.155::double precision, 38.864::double precision, -122.779::double precision, -122.328::double precision),
  ('94612', 37.454::double precision, 37.906::double precision, -122.373::double precision, -121.469::double precision),
  ('94901', 37.815::double precision, 38.16::double precision, -122.882::double precision, -122.409::double precision),
  ('95023', 36.741::double precision, 37.073::double precision, -121.517::double precision, -120.356::double precision),
  ('95113', 36.892::double precision, 37.484::double precision, -122.207::double precision, -121.084::double precision),
  ('95202', 37.481::double precision, 38.3::double precision, -121.585::double precision, -120.919::double precision),
  ('95249', 37.827::double precision, 38.495::double precision, -120.995::double precision, -120.035::double precision),
  ('95338', 37.46::double precision, 38.087::double precision, -120.395::double precision, -119.383::double precision),
  ('95340', 36.743::double precision, 37.633::double precision, -121.249::double precision, -120.053::double precision),
  ('95354', 37.132::double precision, 37.984::double precision, -121.628::double precision, -120.387::double precision),
  ('95370', 37.831::double precision, 38.238::double precision, -120.653::double precision, -119.541::double precision),
  ('95404', 38.215::double precision, 38.852::double precision, -123.236::double precision, -122.347::double precision),
  ('95453', 38.666::double precision, 39.529::double precision, -123.094::double precision, -122.352::double precision),
  ('95482', 38.753::double precision, 40.003::double precision, -124.091::double precision, -122.714::double precision),
  ('95501', 40.004::double precision, 41.753::double precision, -124.489::double precision, -123.409::double precision),
  ('95531', 41.185::double precision, 42::double precision, -124.487::double precision, -123.804::double precision),
  ('95603', 38.567::double precision, 39.639::double precision, -121.168::double precision, -120.004::double precision),
  ('95642', 38.29::double precision, 38.717::double precision, -121.085::double precision, -120.068::double precision),
  ('95667', 38.415::double precision, 39.313::double precision, -121.091::double precision, -119.882::double precision),
  ('95695', 38.42::double precision, 38.942::double precision, -122.133::double precision, -121.073::double precision),
  ('95814', 38.037::double precision, 38.776::double precision, -121.686::double precision, -121.027::double precision),
  ('95901', 39.003::double precision, 39.245::double precision, -121.695::double precision, -121.062::double precision),
  ('95928', 39.254::double precision, 40.153::double precision, -122.069::double precision, -121.077::double precision),
  ('95932', 39.075::double precision, 39.598::double precision, -122.785::double precision, -121.772::double precision),
  ('95959', 39.052::double precision, 39.525::double precision, -121.28::double precision, -120.004::double precision),
  ('95971', 39.504::double precision, 40.449::double precision, -121.289::double precision, -120.003::double precision),
  ('95988', 39.497::double precision, 39.925::double precision, -122.937::double precision, -121.855::double precision),
  ('95991', 38.898::double precision, 39.303::double precision, -122.141::double precision, -121.621::double precision),
  ('96001', 40.293::double precision, 41.2::double precision, -123.068::double precision, -121.32::double precision),
  ('96080', 39.871::double precision, 40.456::double precision, -123.314::double precision, -121.408::double precision),
  ('96093', 40.122::double precision, 41.094::double precision, -123.44::double precision, -122.775::double precision),
  ('96097', 41.184::double precision, 42.007::double precision, -123.07::double precision, -121.439::double precision),
  ('96101', 41.169::double precision, 42::double precision, -121.404::double precision, -119.998::double precision),
  ('96118', 39.432::double precision, 39.639::double precision, -120.657::double precision, -120.002::double precision),
  ('96120', 38.433::double precision, 38.749::double precision, -119.905::double precision, -119.535::double precision),
  ('96130', 39.897::double precision, 41.198::double precision, -121.065::double precision, -119.992::double precision)
)
update public.vendors v
set location = st_setsrid(
  st_makepoint(
    cb.min_lng
      + (cb.max_lng - cb.min_lng)
      * (0.05 + 0.90 * ((abs(hashtext(v.id::text || ':uls-spread-lng'))::bigint % 999983)::numeric / 999983.0)),
    cb.min_lat
      + (cb.max_lat - cb.min_lat)
      * (0.05 + 0.90 * ((abs(hashtext(v.id::text || ':uls-spread-lat'))::bigint % 999983)::numeric / 999983.0))
  ),
  4326
)::geography
from county_zip_bounds cb
where v.slug like 'ca-uls-c9-%'
  and v.zip = cb.zip;
