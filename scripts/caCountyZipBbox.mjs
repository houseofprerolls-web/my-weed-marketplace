/**
 * Approximate WGS84 bounding boxes for CA counties, keyed by the ZIP used in ULS seed
 * (one representative ZIP per county). Inset applied in SQL/JS (5%–95%) so points stay
 * inside typical county polygons (not guaranteed for every concave edge).
 */
export const ZIP_COUNTY_BBOX = {
  '95814': { minLat: 38.037, maxLat: 38.776, minLng: -121.686, maxLng: -121.027 }, // Sacramento
  '93401': { minLat: 34.893, maxLat: 35.81, minLng: -121.438, maxLng: -119.126 }, // San Luis Obispo
  '94901': { minLat: 37.815, maxLat: 38.16, minLng: -122.882, maxLng: -122.409 }, // Marin
  '94612': { minLat: 37.454, maxLat: 37.906, minLng: -122.373, maxLng: -121.469 }, // Alameda
  '90012': { minLat: 32.75, maxLat: 34.823, minLng: -118.952, maxLng: -117.646 }, // Los Angeles
  '94102': { minLat: 37.708, maxLat: 37.832, minLng: -122.515, maxLng: -122.357 }, // San Francisco
  '93940': { minLat: 35.788, maxLat: 36.918, minLng: -121.97, maxLng: -120.217 }, // Monterey
  '95959': { minLat: 39.052, maxLat: 39.525, minLng: -121.28, maxLng: -120.004 }, // Nevada (CA)
  '94063': { minLat: 37.269, maxLat: 37.708, minLng: -122.527, maxLng: -122.084 }, // San Mateo
  '93101': { minLat: 33.843, maxLat: 35.098, minLng: -120.734, maxLng: -119.188 }, // Santa Barbara
  '95695': { minLat: 38.42, maxLat: 38.942, minLng: -122.133, maxLng: -121.073 }, // Yolo
  '92243': { minLat: 32.618, maxLat: 33.434, minLng: -116.107, maxLng: -114.735 }, // Imperial
  '95404': { minLat: 38.215, maxLat: 38.852, minLng: -123.236, maxLng: -122.347 }, // Sonoma
  '95501': { minLat: 40.004, maxLat: 41.753, minLng: -124.489, maxLng: -123.409 }, // Humboldt
  '93301': { minLat: 34.875, maxLat: 35.993, minLng: -120.194, maxLng: -117.616 }, // Kern
  '95202': { minLat: 37.481, maxLat: 38.3, minLng: -121.585, maxLng: -120.919 }, // San Joaquin
  '93001': { minLat: 34.075, maxLat: 34.9, minLng: -119.293, maxLng: -118.873 }, // Ventura
  '92501': { minLat: 33.426, maxLat: 34.079, minLng: -117.627, maxLng: -114.435 }, // Riverside
  '92401': { minLat: 33.871, maxLat: 35.809, minLng: -117.895, maxLng: -114.131 }, // San Bernardino
  '92701': { minLat: 33.333, maxLat: 33.947, minLng: -118.151, maxLng: -117.357 }, // Orange
  '93291': { minLat: 35.789, maxLat: 36.751, minLng: -119.354, maxLng: -118.176 }, // Tulare
  '94553': { minLat: 37.719, maxLat: 38.086, minLng: -122.379, maxLng: -121.534 }, // Contra Costa
  '95113': { minLat: 36.892, maxLat: 37.484, minLng: -122.207, maxLng: -121.084 }, // Santa Clara
  '95354': { minLat: 37.132, maxLat: 37.984, minLng: -121.628, maxLng: -120.387 }, // Stanislaus
  '95667': { minLat: 38.415, maxLat: 39.313, minLng: -121.091, maxLng: -119.882 }, // El Dorado
  '92101': { minLat: 32.534, maxLat: 33.505, minLng: -117.282, maxLng: -116.081 }, // San Diego
  '93721': { minLat: 36.582, maxLat: 37.036, minLng: -120.734, maxLng: -118.36 }, // Fresno
  '93637': { minLat: 36.741, maxLat: 37.646, minLng: -120.509, maxLng: -119.066 }, // Madera
  '95340': { minLat: 36.743, maxLat: 37.633, minLng: -121.249, maxLng: -120.053 }, // Merced
  '95928': { minLat: 39.254, maxLat: 40.153, minLng: -122.069, maxLng: -121.077 }, // Butte
  '96001': { minLat: 40.293, maxLat: 41.2, minLng: -123.068, maxLng: -121.32 }, // Shasta
  '95482': { minLat: 38.753, maxLat: 40.003, minLng: -124.091, maxLng: -122.714 }, // Mendocino
  '95453': { minLat: 38.666, maxLat: 39.529, minLng: -123.094, maxLng: -122.352 }, // Lake
  '96080': { minLat: 39.871, maxLat: 40.456, minLng: -123.314, maxLng: -121.408 }, // Tehama
  '95988': { minLat: 39.497, maxLat: 39.925, minLng: -122.937, maxLng: -121.855 }, // Glenn
  '95932': { minLat: 39.075, maxLat: 39.598, minLng: -122.785, maxLng: -121.772 }, // Colusa
  '95991': { minLat: 38.898, maxLat: 39.303, minLng: -122.141, maxLng: -121.621 }, // Sutter
  '95901': { minLat: 39.003, maxLat: 39.245, minLng: -121.695, maxLng: -121.062 }, // Yuba
  '95603': { minLat: 38.567, maxLat: 39.639, minLng: -121.168, maxLng: -120.004 }, // Placer
  '95642': { minLat: 38.29, maxLat: 38.717, minLng: -121.085, maxLng: -120.068 }, // Amador
  '95249': { minLat: 37.827, maxLat: 38.495, minLng: -120.995, maxLng: -120.035 }, // Calaveras
  '95370': { minLat: 37.831, maxLat: 38.238, minLng: -120.653, maxLng: -119.541 }, // Tuolumne
  '95338': { minLat: 37.46, maxLat: 38.087, minLng: -120.395, maxLng: -119.383 }, // Mariposa
  '93517': { minLat: 37.538, maxLat: 38.149, minLng: -119.314, maxLng: -118.777 }, // Mono
  '93514': { minLat: 35.914, maxLat: 37.502, minLng: -118.417, maxLng: -115.648 }, // Inyo
  '96120': { minLat: 38.433, maxLat: 38.749, minLng: -119.905, maxLng: -119.535 }, // Alpine
  '95023': { minLat: 36.741, maxLat: 37.073, minLng: -121.517, maxLng: -120.356 }, // San Benito
  '94559': { minLat: 38.155, maxLat: 38.864, minLng: -122.779, maxLng: -122.328 }, // Napa
  '95531': { minLat: 41.185, maxLat: 42.0, minLng: -124.487, maxLng: -123.804 }, // Del Norte
  '96093': { minLat: 40.122, maxLat: 41.094, minLng: -123.44, maxLng: -122.775 }, // Trinity
  '96097': { minLat: 41.184, maxLat: 42.007, minLng: -123.07, maxLng: -121.439 }, // Siskiyou
  '96101': { minLat: 41.169, maxLat: 42.0, minLng: -121.404, maxLng: -119.998 }, // Modoc
  '96130': { minLat: 39.897, maxLat: 41.198, minLng: -121.065, maxLng: -119.992 }, // Lassen
  '95971': { minLat: 39.504, maxLat: 40.449, minLng: -121.289, maxLng: -120.003 }, // Plumas
  '96118': { minLat: 39.432, maxLat: 39.639, minLng: -120.657, maxLng: -120.002 }, // Sierra
};
