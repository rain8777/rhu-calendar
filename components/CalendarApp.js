import { useState, useEffect, useCallback, useMemo } from "react";
import Head from "next/head";
import EventModal from "./EventModal";
import SheetView from "./SheetView";
import SignaturePanel from "./SignaturePanel";
import SignaturePrint from "./SignaturePrint";
import { PROGRAMS, getTeamColor, getTeamName, MONTHS, DAYS_OF_WEEK } from "../lib/constants";
import * as I from "./Icons";

const ICONS = { hospital: I.HospitalIcon, vaccine: I.VaccineIcon, heart: I.HeartIcon, family: I.FamilyIcon, transport: I.TransportIcon, activity: I.ActivityIcon, medical: I.MedicalIcon, shield: I.ShieldIcon, leaf: I.LeafIcon };
const VIEWS = [["month", "Month"], ["week", "Week"], ["day", "Day"], ["year", "Year"], ["agenda", "Agenda"], ["timeline", "Timeline"], ["table", "Table"]];

const pad = (n) => String(n).padStart(2, "0");
const ds = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const pd = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const longDate = (d) => d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
const splitDetails = (t = "") => {
  if (!t.startsWith("Venue: ")) return ["", t];
  const i = t.indexOf("\n");
  return i > -1 ? [t.slice(7, i), t.slice(i + 1)] : [t.slice(7), ""];
};

async function apiGet(pid) {
  const r = await fetch(`/api/events?program=${pid}`);
  if (!r.ok) throw new Error("Failed to load schedules");
  return (await r.json()).events || [];
}
async function apiPost(body, pid) {
  const r = await fetch(`/api/events?program=${pid}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error("Request failed");
  return r.json();
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState({});
  const [sel, setSel] = useState(null);
  const [modal, setModal] = useState(null);
  const [theme, setTheme] = useState("light");
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState("");
  const [brgy, setBrgy] = useState("");
  const [sig, setSig] = useState([]);

  useEffect(() => { document.body.className = theme; }, [theme]);
  useEffect(() => {
    try {
      const t = localStorage.getItem("rhu-theme"); if (t) setTheme(t);
      const s = localStorage.getItem("rhu-calendar-signatures"); if (s) setSig(JSON.parse(s));
    } catch (e) {}
  }, []);
  useEffect(() => { try { localStorage.setItem("rhu-calendar-signatures", JSON.stringify(sig)); } catch (e) {} }, [sig]);
  const toggleTheme = () => { const t = theme === "dark" ? "light" : "dark"; setTheme(t); try { localStorage.setItem("rhu-theme", t); } catch (e) {} };

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const evs = (await apiGet(programId)).filter((e) => e.title === program.title);
      setByProgram((p) => ({ ...p, [programId]: evs }));
      setUpdated((u) => ({ ...u, [programId]: new Date() }));
    } catch (e) { if (!silent) setError(e.message); }
    finally { if (!silent) setLoading(false); }
  }, [programId, program.title]);

  // One-time fetch per board: loads the first time a board is opened, then stays cached.
  // New data only comes in on manual Refresh or a browser reload.
  useEffect(() => { if (!byProgram[programId]) load(); }, [programId]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const teamName = (ev) => getTeamName(ev.team, teams);
  const label = (ev) => (programId === "nip" ? teamName(ev) : ev.venue || teamName(ev));
  const colorOf = (ev) => ev.color || getTeamColor(ev.team);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return events.filter((e) => {
      if (brgy && e.team !== brgy) return false;
      if (!s) return true;
      return [e.venue, e.details, getTeamName(e.team, teams)].some((v) => (v || "").toLowerCase().includes(s));
    });
  }, [events, q, brgy, teams]);
  const byDate = useMemo(() => {
    const m = {};
    shown.forEach((e) => { (m[e.date] = m[e.date] || []).push(e); });
    return m;
  }, [shown]);
  const on = (d) => byDate[ds(d)] || [];

  const cy = cursor.getFullYear(), cm = cursor.getMonth();
  const range = (() => {
    if (view === "year") return [`${cy}-01-01`, `${cy}-12-31`, "this year"];
    if (view === "day") return [ds(cursor), ds(cursor), "on this day"];
    if (view === "week") { const a = addDays(cursor, -cursor.getDay()); return [ds(a), ds(addDays(a, 6)), "this week"]; }
    return [`${cy}-${pad(cm + 1)}-01`, `${cy}-${pad(cm + 1)}-31`, "this month"];
  })();
  const rangeCount = shown.filter((e) => e.date >= range[0] && e.date <= range[1]).length;

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
  const addAt = (d) => !readOnly && setModal({ event: null, defaultDate: d });
  const openEv = (ev, e) => { e && e.stopPropagation(); readOnly ? setSel(ev.date) : setModal({ event: ev, defaultDate: ev.date }); };
  const goDay = (d) => { setCursor(d); setView("day"); setSel(null); };

  const Chip = ({ ev }) => <div key={ev.id} className="chip" style={{ "--c": colorOf(ev) }} title={label(ev)} onClick={(e) => openEv(ev, e)}>{label(ev)}</div>;
  const Card = ({ ev }) => {
    const [v, txt] = splitDetails(ev.details);
    const venue = v;
    return (
      <button key={ev.id} className="card" style={{ "--c": colorOf(ev) }} onClick={(e) => openEv(ev, e)}>
        <b>{label(ev)}</b>
        {(teams.length > 0 && ev.venue) && <small>{teamName(ev)}</small>}
        {venue && <small>{venue}</small>}
        {txt && <p>{txt}</p>}
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
        <div className="mgrid" style={{ gridTemplateRows: `repeat(${weeks}, minmax(104px, 1fr))` }}>
          {Array.from({ length: weeks * 7 }, (_, i) => {
            const d = addDays(start, i), k = ds(d), evs = byDate[k] || [];
            return (
              <div key={k} className={`cell${d.getMonth() !== cm ? " out" : ""}${k === todayStr ? " today" : ""}${k === sel ? " sel" : ""}`} onClick={() => setSel(k === sel ? null : k)}>
                <div className="dn">{d.getDate()}</div>
                {!readOnly && <button className="add" aria-label="Add schedule" onClick={(e) => { e.stopPropagation(); addAt(k); }}>+</button>}
                {evs.slice(0, 3).map((ev) => Chip({ ev }))}
                {evs.length > 3 && <button className="more" onClick={(e) => { e.stopPropagation(); setSel(k); }}>+{evs.length - 3} more</button>}
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
    shown.filter((e) => e.date.startsWith(pre)).forEach((e) => {
      const key = teams.length ? e.team : label(e);
      const r = (rows[key] = rows[key] || { name: teams.length ? teamName(e) : label(e), color: colorOf(e), days: {} });
      (r.days[+e.date.slice(8)] = r.days[+e.date.slice(8)] || []).push(e);
    });
    const list = Object.values(rows).sort((a, b) => a.name.localeCompare(b.name));
    if (!list.length) return <div className="frame grow"><Empty text={`No schedules in ${MONTHS[cm]}`} /></div>;
    const dayCls = (i) => { const d = new Date(cy, cm, i + 1); return (d.getDay() % 6 === 0 ? " we" : "") + (ds(d) === todayStr ? " tdc" : ""); };
    return (
      <div className="frame"><div className="tl" style={{ gridTemplateColumns: `180px repeat(${n}, minmax(36px, 1fr))` }}>
        <div className="h rn">{teams.length ? "Barangay" : "Activity"}</div>
        {Array.from({ length: n }, (_, i) => <div key={i} className={`h${dayCls(i)}`}><b>{i + 1}</b>{DAYS_OF_WEEK[new Date(cy, cm, i + 1).getDay()][0]}</div>)}
        {list.map((r) => [
          <div key={r.name} className="rn"><span className="dot" style={{ background: r.color, marginRight: 8 }} />{r.name}</div>,
          ...Array.from({ length: n }, (_, i) => {
            const evs = r.days[i + 1];
            return <div key={r.name + i} className={dayCls(i).trim()}>{evs && <button className="bk" style={{ "--c": colorOf(evs[0]) }} title={evs.map(label).join(", ")} onClick={() => setSel(pre + pad(i + 1))}>{evs.length > 1 ? evs.length : ""}</button>}</div>;
          }),
        ])}
      </div></div>
    );
  }

  const selEvents = sel ? byDate[sel] || [] : [];
  const stamp = updated[programId] ? `Updated ${updated[programId].toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Refresh";
  const legend = (list) => list.map((t) => (
    <button key={t.id} className={`leg${brgy === t.id ? " on" : ""}`} onClick={() => setBrgy(brgy === t.id ? "" : t.id)}>
      <span className="dot" style={{ background: getTeamColor(t.id) }} />{t.name}
    </button>
  ));
  const Views = { month: Month, week: Week, day: Day, year: Year, agenda: Agenda, timeline: Timeline }[view];

  return (
    <>
      <Head>
        <title>RHU Calendar</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <div className="shell">
        <aside className={`side${menu ? " open" : ""}`}>
          <div className="brand"><img src="/Logo/RHU.png" alt="" /><div><b>RHU Ragay</b><small>{readOnly ? "Viewer" : "Schedule boards"}</small></div></div>
          <div className="side-scroll">
            <h4>Programs</h4>
            {PROGRAMS.map((p) => {
              const Ic = ICONS[p.icon] || I.HospitalIcon;
              return (
                <button key={p.id} className={`board${p.id === programId ? " on" : ""}`} onClick={() => { setProgramId(p.id); setSel(null); setBrgy(""); setMenu(false); }}>
                  <Ic size={18} /><span className="t">{p.label}</span>{byProgram[p.id] && <em>{byProgram[p.id].length}</em>}
                </button>
              );
            })}
            {program.type !== "activity" && <>
              <h4>Filter by barangay</h4>
              {program.northTeams ? <><h4 style={{ paddingTop: 2 }}>North</h4>{legend(program.northTeams)}<h4>South</h4>{legend(program.southTeams)}</> : legend(teams)}
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
            <button className="hb" onClick={() => load()} title="Refresh"><I.RefreshIcon size={14} /><span className="lb">{stamp}</span></button>
            <SignaturePanel config={sig} onChange={setSig} theme={theme} />
            <button className="hb" onClick={() => window.print()}><I.PrinterIcon size={14} /><span className="lb">Print</span></button>
            {!readOnly && <button className="hb primary" onClick={() => addAt(sel || (view === "day" ? ds(cursor) : todayStr))}>+ <span className="lb">New schedule</span></button>}
          </div>
          <div className="tabs" role="tablist">
            {VIEWS.map(([id, name]) => <button key={id} role="tab" aria-selected={view === id} className={`tab${view === id ? " on" : ""}`} onClick={() => { setView(id); setSel(null); }}>{name}</button>)}
          </div>
          {view !== "table" && (
            <div className="bar">
              <button className="hb icon" onClick={() => step(-1)} aria-label="Previous"><I.ChevronLeftIcon size={16} /></button>
              <button className="hb icon" onClick={() => step(1)} aria-label="Next"><I.ChevronRightIcon size={16} /></button>
              <button className="hb" onClick={() => { setCursor(new Date()); setSel(null); }}>Today</button>
              <h2>{title()}</h2>
              {brgy && <button className="chipf" onClick={() => setBrgy("")}>{getTeamName(brgy, teams)} <I.CloseIcon size={12} /></button>}
              <span className="sp" />
              <span style={{ color: "var(--mute)" }}>{rangeCount} {range[2]}</span>
              <label className="search"><I.SearchIcon size={14} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search schedules" /></label>
            </div>
          )}
          {loading ? <div className="lbar" /> : null}
          {error && <div className="note err">{error} — <button onClick={() => load()}>Retry</button></div>}

          <div className="body">
            <div className="view">
              <div className="print-head">
                <div><img src="/Logo/LGU.png" alt="" /><img src="/Logo/RHU.png" alt="" /></div>
                <div className="c">Republic of the Philippines<br />Province of Camarines Sur<br />Municipality of Ragay<b>{program.label} — {title()}</b></div>
                <div>{programId === "nip" && <img src="/Logo/NIP.png" alt="" />}<img src="/Logo/Bagong_pilipinas.png" alt="" /></div>
              </div>
              {view === "table"
                ? <SheetView events={events} onEdit={(ev) => openEv(ev)} onAdd={(d) => addAt(d || todayStr)} theme={theme} onRefresh={() => load()} refreshLabel={stamp} teams={teams} eventTitle={program.title} programId={programId} readOnly={readOnly} />
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

      {modal && <EventModal event={modal.event} defaultDate={modal.defaultDate} onSave={save} onDelete={remove} onClose={() => setModal(null)} theme={theme} teams={teams} eventTitle={program.title} programType={program.type} programId={programId} />}
    </>
  );
}
