// pages/api/events.js — server-side proxy, keeps GAS_SECRET out of browser
// Supports ?program=<id> to route to different GAS deployments.

import { PROGRAMS } from "../../lib/constants";

const GAS_SECRET = process.env.GAS_SECRET;

// Map program id → env var name. Add more as needed.
const GAS_URL_MAP = {
  purokalusugan: process.env.NEXT_PUBLIC_GAS_URL,
  nip:           process.env.NEXT_PUBLIC_GAS_URL_NIP           || process.env.NEXT_PUBLIC_GAS_URL,
  ncd:           process.env.NEXT_PUBLIC_GAS_URL_NCD            || process.env.NEXT_PUBLIC_GAS_URL,
  transportation:process.env.NEXT_PUBLIC_GAS_URL_TRANSPORTATION || process.env.NEXT_PUBLIC_GAS_URL,
  rhuactivities:  process.env.NEXT_PUBLIC_GAS_URL_RHUACTIVITIES   || process.env.NEXT_PUBLIC_GAS_URL,
  medic:          process.env.NEXT_PUBLIC_GAS_URL, // Medic Support shares the main sheet
  personnel:      process.env.NEXT_PUBLIC_GAS_URL, // PERSONNEL-TRACKER shares the main sheet
};

export default async function handler(req, res) {
  const program = req.query.program || "purokalusugan";

  // GET ?program=all — load every board in ONE request. Each distinct Google
  // Script URL is fetched once (boards sharing a sheet don't hit it again).
  if (req.method === "GET" && program === "all") {
    const entries = PROGRAMS.map((p) => [p.id, GAS_URL_MAP[p.id]]).filter(([, u]) => u);
    const urls = [...new Set(entries.map(([, u]) => u))];
    const raw = {};
    await Promise.all(urls.map(async (u) => {
      try {
        const r = await fetch(`${u}?action=getEvents`, { cache: "no-store" });
        const j = await r.json();
        raw[u] = j.error && !j.events ? null : j.events || [];
      } catch (e) { raw[u] = null; }
    }));
    const programs = {}, failed = [];
    entries.forEach(([pid, u]) => {
      const def = PROGRAMS.find((p) => p.id === pid);
      if (raw[u]) programs[pid] = raw[u].filter((e) => !def || e.title === def.title);
      else failed.push(pid);
    });
    return res.status(200).json({ programs, failed });
  }
  const GAS_URL = GAS_URL_MAP[program] || GAS_URL_MAP.purokalusugan;

  if (!GAS_URL) {
    return res.status(500).json({ error: "GAS_URL not configured" });
  }

  // GET — fetch all events from GAS
  if (req.method === "GET") {
    try {
      const r = await fetch(`${GAS_URL}?action=getEvents`, { cache: "no-store" });
      const data = await r.json();
      return res.status(200).json(data);
    } catch (e) {
      return res.status(502).json({ error: "Failed to reach GAS", detail: e.message });
    }
  }

  // POST — create / update / delete via GAS
  if (req.method === "POST") {
    try {
      const body = { ...req.body, secret: GAS_SECRET };
      const r = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      return res.status(200).json(data);
    } catch (e) {
      return res.status(502).json({ error: "Failed to reach GAS", detail: e.message });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Method not allowed" });
}
