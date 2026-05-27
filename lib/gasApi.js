// Client-side GAS helpers (read-only, no secret needed)
const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL;

export async function fetchEvents() {
  if (!GAS_URL) return [];
  const res = await fetch(`${GAS_URL}?action=getEvents`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch events");
  const data = await res.json();
  return data.events || [];
}
