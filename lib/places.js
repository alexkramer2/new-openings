// City search for the quiz's location question, using Photon – a free
// OpenStreetMap search with no key (https://photon.komoot.io).
// A place is { name: "Lawrence, KS", city: "Lawrence", state: "KS", lat, lon }.

const PHOTON = "https://photon.komoot.io";
const US_BOX = "-170,18,-65,72"; // keeps suggestions to the United States
const PLACE_TYPES = new Set(["city", "town", "village", "hamlet", "suburb"]);

export const STATES = { alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA", colorado: "CO", connecticut: "CT", delaware: "DE", "district of columbia": "DC", florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA", kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD", massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT", virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI", wyoming: "WY" };

const stateCode = (state) => STATES[(state ?? "").toLowerCase()] ?? state ?? "";

function toPlace(feature) {
  const p = feature.properties;
  const city = p.osm_value === "city" || p.osm_value === "town" || p.osm_value === "village" ? p.name : p.city ?? p.name;
  const state = stateCode(p.state);
  const [lon, lat] = feature.geometry.coordinates;
  return { name: state ? `${city}, ${state}` : city, city, state, lat, lon };
}

// Suggestions while typing. Returns up to `limit` US places, no duplicates.
export async function searchPlaces(text, { limit = 6, signal } = {}) {
  const q = text.trim();
  if (q.length < 2) return [];
  const params = new URLSearchParams({ q, limit: "12", lang: "en", layer: "city", bbox: US_BOX });
  const response = await fetch(`${PHOTON}/api/?${params}`, { signal });
  if (!response.ok) throw new Error("City search isn't responding");
  const data = await response.json();
  const seen = new Set();
  return data.features
    .filter((f) => f.properties.countrycode === "US" && PLACE_TYPES.has(f.properties.osm_value))
    .map(toPlace)
    .filter((place) => !seen.has(place.name) && seen.add(place.name))
    .slice(0, limit);
}

// "Use my current location": the browser's position -> the city it's in.
export function currentPlace() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("This browser can't share your location"));
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const params = new URLSearchParams({ lat: coords.latitude, lon: coords.longitude, lang: "en", layer: "city" });
          const data = await (await fetch(`${PHOTON}/reverse?${params}`)).json();
          const feature = data.features[0];
          if (!feature) return reject(new Error("Couldn't tell which city you're in"));
          resolve({ ...toPlace(feature), lat: coords.latitude, lon: coords.longitude });
        } catch {
          reject(new Error("Couldn't look up your city"));
        }
      },
      (error) =>
        reject(new Error(error.code === error.PERMISSION_DENIED ? "Location access was blocked" : "Couldn't get your location")),
      { timeout: 10000, maximumAge: 600000 }
    );
  });
}

// Straight-line distance in miles.
export function distanceMiles(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 3959 * 2 * Math.asin(Math.sqrt(h));
}

// The user's locations as places. Older quiz answers stored one typed-in
// string ("Lawrence, KS"), so turn that into a place without coordinates.
export function userPlaces(answers) {
  if (Array.isArray(answers.locations) && answers.locations.length) return answers.locations;
  const text = (answers.location ?? "").trim();
  const match = text.match(/^(.+?)[,\s]+([a-z .]+)$/i);
  if (!match) return text ? [{ name: text, city: text, state: "" }] : [];
  const city = match[1].replace(/\b\w/g, (c) => c.toUpperCase());
  const raw = match[2].trim();
  const state = raw.length === 2 ? raw.toUpperCase() : stateCode(raw);
  return [{ name: `${city}, ${state}`, city, state }];
}

// Searches that take one location at a time (Adzuna, JSearch) take turns
// through the user's locations, one per check.
export function placeForCheck(answers, rotation = 0) {
  const places = userPlaces(answers);
  return places.length ? places[rotation % places.length] : null;
}
