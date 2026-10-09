import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Head from "next/head";
import EventModal from "./EventModal";
import SheetView from "./SheetView";
import SignaturePanel from "./SignaturePanel";
import SignaturePrint from "./SignaturePrint";
import { PROGRAMS, getTeamColor, getMedicColor, getTeamName, MONTHS, DAYS_OF_WEEK } from "../lib/constants";
import * as I from "./Icons";
import { parseMeta } from "../lib/meta";
import PersonnelModal from "./PersonnelModal"; // PERSONNEL-TRACKER
import PersonnelBoard, { PersonnelIcon } from "./PersonnelBoard"; // PERSONNEL-TRACKER
import { personnelType, personnelColor, parsePersonnel, expandPersonnel, formatRange, eventRange, nameColor, personnelNames, personnelPositions, positionByName } from "../lib/personnel"; // PERSONNEL-TRACKER

const ICONS = { hospital: I.HospitalIcon, vaccine: I.VaccineIcon, heart: I.HeartIcon, family: I.FamilyIcon, transport: I.TransportIcon, activity: I.ActivityIcon, medical: I.MedicalIcon, firstaid: I.FirstAidIcon, shield: I.ShieldIcon, leaf: I.LeafIcon };
ICONS.personnel = PersonnelIcon; // PERSONNEL-TRACKER
const VIEWS = [["month", "Month"], ["week", "Week"], ["day", "Day"], ["year", "Year"], ["agenda", "Agenda"], ["timeline", "Timeline"], ["table", "Table"]];

const PERSONNEL_VIEWS = [["board", "Board"], ...VIEWS.filter(([id]) => id !== "table")]; // PERSONNEL-TRACKER

const pad = (n) => String(n).padStart(2, "0");
const ds = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const pd = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const longDate = (d) => d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
async function apiPost(body, pid) {
  const r = await fetch(`/api/events?program=${pid}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error("Request failed — please try again.");
  const data = await r.json();
  if (data && data.success === false) throw new Error(data.error || "The server rejected this change.");
  return data;
}

export default function CalendarApp({ readOnly = false }) {
  const now = useMemo(() => new Date(), []);
  const todayStr = ds(now);
  const [programId, setProgramId] = useState(PROGRAMS[0].id);
  const program = PROGRAMS.find((p) => p.id === programId) || PROGRAMS[0];
  const [view, setView] = useState("month");
  const [cursor, setCursor] = useState(now);
  const [byProgram, setByProgram] = useState({});
  const events = byProgram[programId] || [];
  const [pending, setPending] = useState(true);
  const [errMap, setErrMap] = useState({});
  const [updatedAt, setUpdatedAt] = useState(null);
  const started = useRef(false);
  const [sel, setSel] = useState(null);
  const [modal, setModal] = useState(null);
  const [theme, setTheme] = useState("light");
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState("");
  const [brgy, setBrgy] = useState("");
  const [sig, setSig] = useState([]);

  useEffect(() => { document.body.className = theme; }, [theme]);
  useEffect(() => {
    const k = (e) => { if (e.key !== "Escape") return; if (modal) setModal(null); else if (menu) setMenu(false); else setSel(null); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [modal, menu]);
  useEffect(() => {
    try {
      const t = localStorage.getItem("rhu-theme"); if (t) setTheme(t);
      const s = localStorage.getItem("rhu-calendar-signatures"); if (s) setSig(JSON.parse(s));
    } catch (e) {}
  }, []);
  const saveSig = (v) => { setSig(v); try { localStorage.setItem("rhu-calendar-signatures", JSON.stringify(v)); } catch (e) {} };
  const toggleTheme = () => { const t = theme === "dark" ? "light" : "dark"; setTheme(t); try { localStorage.setItem("rhu-theme", t); } catch (e) {} };

  // ONE request loads every board. After that, switching boards is instant (no fetching);
  // new data only arrives on the Refresh button or a browser reload.
  const loadAll = useCallback(async () => {
    setPending(true); setErrMap({});
    try {
      const r = await fetch("/api/events?program=all", { cache: "no-store" });
      if (!r.ok) throw new Error("Failed to load schedules");
      const data = await r.json();
      setByProgram((prev) => ({ ...prev, ...(data.programs || {}) }));
      const failed = {};
      (data.failed || []).forEach((id) => { failed[id] = "Could not load this board"; });
      setErrMap(failed);
      setUpdatedAt(new Date());
    } catch (e) { setErrMap({ all: e.message || "Failed to load schedules" }); }
    finally { setPending(false); }
  }, []);
  useEffect(() => { if (started.current) return; started.current = true; loadAll(); }, [loadAll]);
  const error = errMap.all || errMap[programId] || "";

  async function save(p) {
    const ev = { id: p.id || undefined, team: p.team || "", date: p.date, details: p.details || "", title: program.title, venue: p.venue || "", color: p.color || "" };
    const data = await apiPost({ action: "saveEvent", event: ev }, programId);
    const id = data.event?.id || data.id;
    setByProgram((prev) => {
      const list = prev[programId] || [];
      return { ...prev, [programId]: p.id ? list.map((e) => (e.id === p.id ? { ...e, ...ev, id: p.id } : e)) : [...list, { ...ev, id: id || String(Date.now()) }] };
    });
  }
  async function remove(id) {
    await apiPost({ action: "deleteEvent", id }, programId);
    setByProgram((prev) => ({ ...prev, [programId]: (prev[programId] || []).filter((e) => e.id !== id) }));
  }

  const teams = program.teams || [];
  const isPersonnel = program.type === "personnel"; // PERSONNEL-TRACKER
  const viewList = isPersonnel ? PERSONNEL_VIEWS : VIEWS; // PERSONNEL-TRACKER
  const wasPersonnel = useRef(false); // PERSONNEL-TRACKER
  useEffect(() => { // PERSONNEL-TRACKER
    if (isPersonnel && !wasPersonnel.current) setView("board");
    if (!isPersonnel && wasPersonnel.current) setView((v) => (v === "board" ? "month" : v));
    wasPersonnel.current = isPersonnel;
  }, [isPersonnel]);
  const isMedic = program.type === "medic";
  const isAct = program.type === "activity" || isMedic; // boards that keep Location + Barangay in the details text
  const usesMeta = isAct || programId === "nip";
  const meta = useCallback((ev) => (usesMeta ? parseMeta(ev.details) : { venue: "", barangay: "", duty: "", names: [], text: ev.details || "" }), [usesMeta]);
  const barangays = program.barangays || [];
  const nameSuggestions = useMemo(() => {
    const seen = new Map();
    (byProgram.medic || []).forEach((e) => parseMeta(e.details).names.forEach((n) => { if (!seen.has(n.toLowerCase())) seen.set(n.toLowerCase(), n); }));
    return [...seen.values()].sort((a, b) => a.localeCompare(b));
  }, [byProgram.medic]);
  const dutySuggestions = useMemo(() => {
    const seen = new Map();
    (byProgram.medic || []).forEach((e) => { const d = parseMeta(e.details).duty; if (d && !seen.has(d.toLowerCase())) seen.set(d.toLowerCase(), d); });
    return [...seen.values()].sort((a, b) => a.localeCompare(b));
  }, [byProgram.medic]);
  const bName = (ev) => { const id = meta(ev).barangay; return id ? getTeamName(id, barangays) : ""; };
  // grey sub-line shown under the activity name: "Location · Barangay"
  // Lines shown under the main label. Activities: "Location · Barangay".
  // Medic Support: Duty Assignment, names, then "Location · Barangay".
  const subs = (ev) => {
    if (isPersonnel) { // PERSONNEL-TRACKER: type, position, and the dates when it is a from–to entry
      const p = parsePersonnel(ev.details), r = eventRange(ev), out = [{ t: personnelType(ev.team).name, k: "du" }];
      if (p.position) out.push({ t: p.position, k: "" });
      if (r.days > 1) out.push({ t: formatRange(r.start, r.end), k: "" });
      return out;
    }
    if (!isAct) return [];
    const m = meta(ev), where = [m.venue, bName(ev)].filter(Boolean).join(" · "), out = [];
    if (isMedic && m.duty) out.push({ t: m.duty, k: "du" });
    if (isMedic && m.names.length) out.push({ t: m.names.join(", "), k: "nm" });
    if (where) out.push({ t: where, k: "" });
    return out;
  };
  const sub = (ev) => subs(ev).map((x) => x.t).join(" — ");
  const teamName = (ev) => getTeamName(ev.team, teams);
  const label = (ev) => (isPersonnel ? ev.venue || "Unnamed" : programId === "nip" ? teamName(ev) : isMedic ? ev.venue || "Medic support" : isAct ? ev.venue || bName(ev) || "Untitled activity" : ev.venue || teamName(ev)); // PERSONNEL-TRACKER
  const colorOf = (ev) => ev.color || (isPersonnel ? personnelColor(ev.team) : isMedic ? getMedicColor(ev.venue) : getTeamColor(ev.team)); // PERSONNEL-TRACKER

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return events.filter((e) => {
      const m = meta(e);
      if (brgy && (isAct ? m.barangay : e.team) !== brgy) return false;
      if (!s) return true;
      if (isPersonnel) { const p = parsePersonnel(e.details); return [e.venue, e.team, p.position, p.text].some((v) => (v || "").toLowerCase().includes(s)); } // PERSONNEL-TRACKER
      const bn = isAct ? (m.barangay ? getTeamName(m.barangay, barangays) : "") : getTeamName(e.team, teams);
      return [e.venue, m.text, m.venue, bn, m.duty, ...(m.names || [])].some((v) => (v || "").toLowerCase().includes(s));
    });
  }, [events, q, brgy, teams, barangays, isAct, isPersonnel, meta]);
  const shownX = useMemo(() => (isPersonnel ? expandPersonnel(shown) : shown), [shown, isPersonnel]); // PERSONNEL-TRACKER: one item per day for from–to entries
  const byDate = useMemo(() => {
    const m = {};
    shownX.forEach((e) => { (m[e.date] = m[e.date] || []).push(e); });
    return m;
  }, [shownX]);
  const on = (d) => byDate[ds(d)] || [];

  const cy = cursor.getFullYear(), cm = cursor.getMonth();
  const range = (() => {
    if (view === "year") return [`${cy}-01-01`, `${cy}-12-31`, "this year"];
    if (view === "day") return [ds(cursor), ds(cursor), "on this day"];
    if (view === "week") { const a = addDays(cursor, -cursor.getDay()); return [ds(a), ds(addDays(a, 6)), "this week"]; }
    return [`${cy}-${pad(cm + 1)}-01`, `${cy}-${pad(cm + 1)}-31`, "this month"];
  })();
  const rangeCount = new Set(shownX.filter((e) => e.date >= range[0] && e.date <= range[1]).map((e) => e.id)).size; // PERSONNEL-TRACKER: counts entries, not days

  function step(n) {
    setCursor((c) => {
      const d = new Date(c);
      if (view === "year") d.setFullYear(d.getFullYear() + n);
      else if (view === "week") d.setDate(d.getDate() + 7 * n);
      else if (view === "day") d.setDate(d.getDate() + n);
      else { d.setDate(1); d.setMonth(d.getMonth() + n); }
      return d;
    });
    setSel(null);
  }
  const title = () => {
    if (view === "year") return String(cy);
    if (view === "day") return longDate(cursor);
    if (view === "week") {
      const a = addDays(cursor, -cursor.getDay()), b = addDays(a, 6);
      return `${MONTHS[a.getMonth()].slice(0, 3)} ${a.getDate()} – ${a.getMonth() !== b.getMonth() ? MONTHS[b.getMonth()].slice(0, 3) + " " : ""}${b.getDate()}, ${b.getFullYear()}`;
    }
    if (view === "table") return "All schedules";
    return `${MONTHS[cm]} ${cy}`;
  };
  const addAt = (d, type) => !readOnly && setModal({ event: null, defaultDate: d, defaultType: type }); // PERSONNEL-TRACKER (type is only used by that tab)
  const openEv = (ev, e) => { e && e.stopPropagation(); const o = ev._orig || ev; /* PERSONNEL-TRACKER: edit the saved entry, not a per-day copy */ readOnly ? setSel(ev.date) : setModal({ event: o, defaultDate: o.date }); };
  const goDay = (d) => { setCursor(d); setView("day"); setSel(null); };

  const Chip = ({ ev, ovf }) => {
    const sb = sub(ev), lines = subs(ev);
    return (
      <div key={ev.id} role="button" tabIndex={0} className={`chip${sb ? " two" : ""}${ovf ? " ovf" : ""}`} style={{ "--c": colorOf(ev) }} title={sb ? `${label(ev)} — ${sb}` : label(ev)} onClick={(e) => openEv(ev, e)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openEv(ev, e); } }}>
        <span className="ct">{label(ev)}</span>{lines.map((x, i) => <span key={i} className={`cs${x.k ? " " + x.k : ""}`}>{x.t}</span>)}
      </div>
    );
  };
  const Card = ({ ev }) => {
    const m = isPersonnel ? { venue: "", text: parsePersonnel(ev.details).text } : meta(ev), lines = subs(ev); // PERSONNEL-TRACKER
    return (
      <button key={ev.id} className="card" style={{ "--c": colorOf(ev) }} onClick={(e) => openEv(ev, e)}>
        <b>{label(ev)}</b>
        {isAct || isPersonnel
          ? lines.map((x, i) => <small key={i} className={x.k}>{x.t}</small>)
          : <>{teams.length > 0 && ev.venue && <small>{teamName(ev)}</small>}{m.venue && <small>{m.venue}</small>}</>}
        {m.text && <p>{m.text}</p>}
      </button>
    );
  };
  const Empty = ({ date, text = "Nothing scheduled" }) => (
    <div className="empty"><b>{text}</b>{!readOnly && date && <button className="hb" style={{ margin: "10px auto 0" }} onClick={() => addAt(date)}>+ Add schedule</button>}</div>
  );

  // ── Views ──
  function Month() {
    const first = new Date(cy, cm, 1);
    const weeks = Math.ceil((first.getDay() + new Date(cy, cm + 1, 0).getDate()) / 7);
    const start = addDays(first, -first.getDay());
    return (
      <div className="frame grow" style={{ display: "flex", flexDirection: "column" }}>
        <div className="dow">{DAYS_OF_WEEK.map((d) => <div key={d}>{d}</div>)}</div>
        <div className={`mgrid${isAct || isPersonnel ? " tall" : ""}`} style={{ "--wk": weeks }}>
          {Array.from({ length: weeks * 7 }, (_, i) => {
            const d = addDays(start, i), k = ds(d), evs = byDate[k] || [];
            const cap = evs.some((e) => subs(e).length) ? 2 : 3;
            return (
              <div key={k} className={`cell${d.getMonth() !== cm ? " out" : ""}${k === todayStr ? " today" : ""}${k === sel ? " sel" : ""}`} onClick={() => setSel(k === sel ? null : k)}>
                <div className="dn">{d.getDate()}</div>
                {!readOnly && <button className="add" aria-label="Add schedule" onClick={(e) => { e.stopPropagation(); addAt(k); }}>+</button>}
                {evs.map((ev, i) => Chip({ ev, ovf: i >= cap }))}
                {evs.length > cap && <button className="more" onClick={(e) => { e.stopPropagation(); setSel(k); }}>+{evs.length - cap} more</button>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  function Week() {
    const a = addDays(cursor, -cursor.getDay());
    return (
      <div className="frame week">
        {Array.from({ length: 7 }, (_, i) => {
          const d = addDays(a, i), k = ds(d);
          return (
            <div key={k} className={`wcol${k === todayStr ? " today" : ""}`} onClick={() => setSel(k)}>
              <div className="wh"><span className="dn">{d.getDate()}</span><small>{DAYS_OF_WEEK[i]}</small></div>
              {!readOnly && <button className="add" aria-label="Add schedule" onClick={(e) => { e.stopPropagation(); addAt(k); }}>+</button>}
              {on(d).map((ev) => Card({ ev }))}
            </div>
          );
        })}
      </div>
    );
  }
  function Day() {
    const evs = on(cursor);
    return (
      <div className="frame grow">
        <div className="dayv">
          <h3>{evs.length ? `${evs.length} schedule${evs.length > 1 ? "s" : ""}` : "No schedules"}</h3>
          {evs.length ? evs.map((ev) => Card({ ev })) : <Empty date={ds(cursor)} text="Nothing scheduled for this day" />}
          {evs.length > 0 && !readOnly && <button className="hb" style={{ alignSelf: "flex-start" }} onClick={() => addAt(ds(cursor))}>+ Add schedule</button>}
        </div>
      </div>
    );
  }
  function Year() {
    return (
      <div className="frame"><div className="year">
        {MONTHS.map((name, m) => {
          const first = new Date(cy, m, 1), n = new Date(cy, m + 1, 0).getDate();
          return (
            <div className="mini" key={name}>
              <button className="hb" style={{ border: 0, padding: 0, height: "auto", fontWeight: 700, color: "var(--ink)" }} onClick={() => { setCursor(first); setView("month"); }}><h5>{name}</h5></button>
              <div className="mg">
                {DAYS_OF_WEEK.map((d) => <i key={d}>{d[0]}</i>)}
                {Array.from({ length: first.getDay() }, (_, i) => <span key={"e" + i} />)}
                {Array.from({ length: n }, (_, i) => {
                  const d = new Date(cy, m, i + 1), k = ds(d), c = (byDate[k] || []).length;
                  return <button key={k} className={`md${c ? " has" : ""}${k === todayStr ? " td" : ""}`} style={c ? { "--a": Math.min(c, 4) * 16 + 12 + "%" } : null} title={c ? `${c} schedule${c > 1 ? "s" : ""}` : ""} onClick={() => goDay(d)}>{i + 1}</button>;
                })}
              </div>
            </div>
          );
        })}
      </div></div>
    );
  }
  function Agenda() {
    const days = Object.keys(byDate).filter((k) => k.slice(0, 7) === `${cy}-${pad(cm + 1)}`).sort();
    return (
      <div className="frame grow">
        {days.length === 0 ? <Empty text={`No schedules in ${MONTHS[cm]}`} /> : days.map((k) => {
          const d = pd(k);
          return (
            <div className="agd" key={k}>
              <div className={`d${k === todayStr ? " td" : ""}`}><b>{d.getDate()}</b><small>{DAYS_OF_WEEK[d.getDay()]}</small></div>
              <div className="l">{byDate[k].map((ev) => Card({ ev }))}</div>
            </div>
          );
        })}
      </div>
    );
  }
  function Timeline() {
    const n = new Date(cy, cm + 1, 0).getDate(), pre = `${cy}-${pad(cm + 1)}-`;
    const rows = {};
    const allIds = new Set();
    shownX.filter((e) => e.date.startsWith(pre)).forEach((e) => {
      allIds.add(e.id);
      const duty = isMedic ? meta(e).duty : "";
      const key = isPersonnel ? (e.venue || "").trim().toLowerCase() : teams.length ? e.team : isMedic ? `${e.venue}|${duty.toLowerCase()}` : (e.venue || "").trim().toLowerCase() || "~" + label(e); // PERSONNEL-TRACKER
      const r = (rows[key] = rows[key] || { key, name: teams.length ? teamName(e) : isMedic ? duty || label(e) : label(e), kind: isPersonnel ? parsePersonnel(e.details).position : isMedic && duty ? label(e) : "", color: isPersonnel ? nameColor(e.venue) : colorOf(e), days: {}, ids: new Set() }); // PERSONNEL-TRACKER
      const d = +e.date.slice(8);
      (r.days[d] = r.days[d] || []).push(e);
      r.ids.add(e.id);
    });
    const list = Object.values(rows).sort((a, b) => a.name.localeCompare(b.name));
    if (!list.length) return <div className="frame grow"><Empty text={`No schedules in ${MONTHS[cm]}`} /></div>;

    const initials = (t) => t.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "•";
    const dayInfo = (i) => { const d = new Date(cy, cm, i + 1); return { d, we: d.getDay() % 6 === 0, td: ds(d) === todayStr }; };
    const bands = [];
    for (let d = 1; d <= n;) { const len = Math.min(7 - new Date(cy, cm, d).getDay(), n - d + 1); bands.push({ from: d, len }); d += len; }
    const runsOf = (r) => {
      const ds_ = Object.keys(r.days).map(Number).sort((a, b) => a - b), out = [];
      ds_.forEach((d) => { const last = out[out.length - 1]; if (last && last.from + last.len === d && colorOf(last.evs[0]) === colorOf(r.days[d][0])) { last.len++; last.evs.push(...r.days[d]); } else out.push({ from: d, len: 1, evs: [...r.days[d]] }); });
      return out;
    };
    const tip = (e) => (sub(e) ? `${label(e)} — ${sub(e)}` : label(e));

    return (
      <div className="frame tlf" style={{ "--nd": n }}>
        <div className="tlbar">
          <b>{list.length} {teams.length ? (list.length === 1 ? "barangay" : "barangays") : isPersonnel ? (list.length === 1 ? "person" : "people") : (isMedic ? (list.length === 1 ? "assignment" : "assignments") : (list.length === 1 ? "activity" : "activities"))}</b>
          <span>{allIds.size} schedule{allIds.size === 1 ? "" : "s"} in {MONTHS[cm]}</span>
          <span className="sp" />
          <span className="lgd"><i className="sw" style={{ background: "var(--sub)" }} />Weekend</span>
          <span className="lgd"><i className="sw" style={{ background: "var(--brand)" }} />Today</span>
          <span className="lgd"><i className="sw" style={{ background: "#6b7280" }} />Scheduled</span>
        </div>
        <div className="tl" style={{ "--nd": n, gridTemplateColumns: `var(--lw) repeat(${n}, minmax(24px, 1fr))`, gridTemplateRows: `28px 48px repeat(${list.length}, minmax(48px, auto))` }}>
          <div className="corner" style={{ gridRow: "1 / span 2", gridColumn: 1 }}>{teams.length ? "Barangay" : isPersonnel ? "Personnel" : isMedic ? "Duty / Type" : "Activity"}</div>
          {bands.map((b) => <div key={"w" + b.from} className="wk" style={{ gridRow: 1, gridColumn: `${b.from + 1} / span ${b.len}` }}>{MONTHS[cm].slice(0, 3)} {b.from}{b.len > 1 ? `–${b.from + b.len - 1}` : ""}</div>)}
          {Array.from({ length: n }, (_, i) => { const x = dayInfo(i); return (
            <div key={"h" + i} className={`dcell${x.we ? " we" : ""}${x.td ? " td" : ""}`} style={{ gridRow: 2, gridColumn: i + 2 }}><small>{DAYS_OF_WEEK[x.d.getDay()][0]}</small><b>{i + 1}</b></div>
          ); })}
          {list.map((r, ri) => [
            <div key={"l" + r.key} className={`rl${ri % 2 ? " z" : ""}`} style={{ gridRow: ri + 3, gridColumn: 1 }}>
              <span className="av" style={{ "--c": r.color }}>{initials(r.name)}</span>
              <span className="rt"><b title={r.name}>{r.name}</b><small>{r.kind ? r.kind + " · " : ""}{r.ids.size} schedule{r.ids.size === 1 ? "" : "s"}</small></span>
            </div>,
            ...Array.from({ length: n }, (_, i) => { const x = dayInfo(i); return (
              <div key={r.key + "c" + i} className={`bg${x.we ? " we" : ""}${x.td ? " td" : ""}${ri % 2 ? " z" : ""}`} style={{ gridRow: ri + 3, gridColumn: i + 2 }} />
            ); }),
            ...runsOf(r).map((run) => (
              <button key={r.key + "b" + run.from} className="tbar" style={{ "--c": colorOf(run.evs[0]), gridRow: ri + 3, gridColumn: `${run.from + 1} / span ${run.len}`, ...(isPersonnel && personnelType(run.evs[0].team).ink !== "#ffffff" ? { color: personnelType(run.evs[0].team).ink, textShadow: "none" } : {}) }}
                title={[...new Map(run.evs.map((x) => [x.id, x])).values()].map(tip).join("\n")} onClick={() => setSel(pre + pad(run.from))}>
                {run.len > 1 ? `${run.len} days` : run.evs.length > 1 ? run.evs.length : ""}
              </button>
            )),
          ])}
        </div>
      </div>
    );
  }

  const selEvents = sel ? byDate[sel] || [] : [];
  const stamp = pending ? "Loading…" : updatedAt ? `Updated ${updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Refresh";
  const legend = (list) => list.map((t) => (
    <button key={t.id} className={`leg${brgy === t.id ? " on" : ""}`} onClick={() => setBrgy(brgy === t.id ? "" : t.id)}>
      <span className="dot" style={{ background: getTeamColor(t.id) }} />{t.name}
    </button>
  ));
  const pNames = useMemo(() => personnelNames(byProgram.personnel || []), [byProgram.personnel]); // PERSONNEL-TRACKER
  const pPositions = useMemo(() => personnelPositions(byProgram.personnel || []), [byProgram.personnel]); // PERSONNEL-TRACKER
  const pPosMap = useMemo(() => positionByName(byProgram.personnel || []), [byProgram.personnel]); // PERSONNEL-TRACKER
  function Board() { // PERSONNEL-TRACKER
    return <PersonnelBoard events={shown} cursor={cursor} todayStr={todayStr} readOnly={readOnly} onOpen={(ev) => openEv(ev)} onAdd={(type) => addAt(sel || todayStr, type)} />;
  }
  const Views = { board: Board, month: Month, week: Week, day: Day, year: Year, agenda: Agenda, timeline: Timeline }[view];

  return (
    <>
      <Head>
        <title>RHU Calendar</title>
        <link rel="icon" href="/Logo/RHU.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="shell">
        <aside className={`side${menu ? " open" : ""}`}>
          <div className="brand"><img src="/Logo/RHU.png" alt="" /><div><b>RHU Ragay</b><small>{readOnly ? "Viewer" : "Schedule boards"}</small></div></div>
          <div className="side-scroll">
            <h4>Programs</h4>
            {PROGRAMS.map((p) => {
              const Ic = ICONS[p.icon] || I.HospitalIcon;
              return (
                <button key={p.id} className={`board${p.id === programId ? " on" : ""}`} onClick={() => { setProgramId(p.id); setSel(null); setBrgy(""); setQ(""); setMenu(false); }}>
                  <Ic size={18} /><span className="t">{p.label}</span>{byProgram[p.id] && <em>{byProgram[p.id].length}</em>}
                </button>
              );
            })}
            {view !== "table" && !isPersonnel && (!isAct || barangays.length > 0) && <>
              <h4>Filter by barangay</h4>
              {program.northTeams ? <><h4 style={{ paddingTop: 2 }}>North</h4>{legend(program.northTeams)}<h4>South</h4>{legend(program.southTeams)}</> : legend(isAct ? barangays : teams)}
            </>}
          </div>
          <div className="side-foot"><span>{theme === "dark" ? "Dark mode" : "Light mode"}</span>
            <button className="hb icon" onClick={toggleTheme} aria-label="Toggle theme">{theme === "dark" ? <I.SunIcon size={16} /> : <I.MoonIcon size={16} />}</button></div>
        </aside>
        {menu && <div className="back" onClick={() => setMenu(false)} />}

        <main className="main">
          <div className="head">
            <button className="hb icon menu" onClick={() => setMenu(true)} aria-label="Open menu"><I.MenuIcon size={18} /></button>
            <h1>{program.title}{program.nipLabel && <span className="pill">{program.nipLabel}</span>}</h1>
            <button className="hb" onClick={() => loadAll()} disabled={pending} title="Refresh all boards"><I.RefreshIcon size={14} /><span className="lb">{stamp}</span></button>
            <SignaturePanel config={sig} onChange={saveSig} theme={theme} />
            <button className="hb" onClick={() => window.print()}><I.PrinterIcon size={14} /><span className="lb">Print</span></button>
            {!readOnly && <button className="hb primary" onClick={() => addAt(sel || (view === "day" ? ds(cursor) : todayStr))}>+ <span className="lb">New schedule</span></button>}
          </div>
          <div className="tabs" role="tablist">
            {viewList.map(([id, name]) => <button key={id} role="tab" aria-selected={view === id} className={`tab${view === id ? " on" : ""}`} onClick={() => { setView(id); setSel(null); }}>{name}</button>)}
          </div>
          {view !== "table" && (
            <div className="bar">
              <button className="hb icon" onClick={() => step(-1)} aria-label="Previous"><I.ChevronLeftIcon size={16} /></button>
              <button className="hb icon" onClick={() => step(1)} aria-label="Next"><I.ChevronRightIcon size={16} /></button>
              <button className="hb" onClick={() => { setCursor(new Date()); setSel(null); }}>Today</button>
              <h2>{title()}</h2>
              {brgy && <button className="chipf" onClick={() => setBrgy("")}>{getTeamName(brgy, isAct ? barangays : teams)} <I.CloseIcon size={12} /></button>}
              <span className="sp" />
              <span style={{ color: "var(--mute)" }}>{rangeCount} {range[2]}</span>
              <label className="search"><I.SearchIcon size={14} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search schedules" /></label>
            </div>
          )}
          {pending ? <div className="lbar" /> : null}
          {error && <div className="note err">{error} — <button onClick={() => loadAll()}>Retry</button></div>}

          <div className="body">
            <div className={`view${view === "timeline" ? " flush" : ""}`}>
              {view !== "table" && (
                <div className="print-head">
                <div><img src="/Logo/LGU.png" alt="" /><img src="/Logo/RHU.png" alt="" /></div>
                <div className="c">Republic of the Philippines<br />Province of Camarines Sur<br />Municipality of Ragay<b>{program.label} — {title()}</b></div>
                <div>{programId === "nip" && <img src="/Logo/NIP.png" alt="" />}<img src="/Logo/Bagong_pilipinas.png" alt="" /></div>
              </div>
              )}
              {pending && !byProgram[programId]
                ? <div className="frame grow"><div className="empty"><b>Loading all schedules…</b>This only happens once.</div></div>
                : view === "table"
                ? <SheetView events={events} onEdit={(ev) => openEv(ev)} onAdd={(d) => addAt(d || todayStr)} theme={theme} onRefresh={() => loadAll()} refreshLabel={stamp} teams={teams} barangays={barangays} eventTitle={program.title} programId={programId} readOnly={readOnly} />
                : Views()}
              <SignaturePrint config={sig} />
            </div>
            {sel && view !== "table" && (
              <aside className="drawer">
                <div className="dh"><div><small>Schedule</small><b>{longDate(pd(sel))}</b></div><button className="hb icon" onClick={() => setSel(null)} aria-label="Close"><I.CloseIcon size={14} /></button></div>
                <div className="db">{selEvents.length ? selEvents.map((ev) => Card({ ev })) : <Empty text="Nothing scheduled" />}</div>
                <div className="df">
                  {!readOnly && <button className="hb primary" onClick={() => addAt(sel)}>+ Add schedule</button>}
                  {readOnly && <button className="hb" onClick={() => goDay(pd(sel))}>Open day view</button>}
                </div>
              </aside>
            )}
          </div>
        </main>
      </div>

      {modal && isPersonnel && <PersonnelModal event={modal.event} defaultDate={modal.defaultDate} defaultType={modal.defaultType} onSave={save} onDelete={remove} onClose={() => setModal(null)} theme={theme} nameSuggestions={pNames} positionSuggestions={pPositions} positionByName={pPosMap} />}{/* PERSONNEL-TRACKER */}
      {modal && !isPersonnel && <EventModal event={modal.event} defaultDate={modal.defaultDate} onSave={save} onDelete={remove} onClose={() => setModal(null)} theme={theme} teams={teams} barangays={barangays} nameSuggestions={nameSuggestions} dutySuggestions={dutySuggestions} eventTitle={program.title} programType={program.type} programId={programId} />}
    </>
  );
}
