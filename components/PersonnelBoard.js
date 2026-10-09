// PERSONNEL-TRACKER — the monday.com-style "Board" view of the Personnel Tracker tab (plus its sidebar icon).
import { useMemo, useState } from "react";
import { PERSONNEL_TYPES, personnelType, parsePersonnel, eventRange, formatRange, durationLabel, initialsOf, nameColor } from "../lib/personnel";

export function PersonnelIcon({ size = 20, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

const Avatar = ({ name, size = 30 }) => (
  <span aria-hidden="true" style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, display: "inline-grid", placeItems: "center", background: nameColor(name), color: "#fff", fontWeight: 800, fontSize: Math.round(size * 0.38), letterSpacing: ".02em" }}>
    {initialsOf(name)}
  </span>
);

const pad = (n) => String(n).padStart(2, "0");

export default function PersonnelBoard({ events, cursor, todayStr, readOnly, onOpen, onAdd }) {
  const [scope, setScope] = useState("month"); // "month" | "all"
  const [typeFilter, setTypeFilter] = useState("");
  const [closed, setClosed] = useState({});

  const y = cursor.getFullYear(), m = cursor.getMonth();
  const mStart = `${y}-${pad(m + 1)}-01`, mEnd = `${y}-${pad(m + 1)}-${pad(new Date(y, m + 1, 0).getDate())}`;
  const monthLabel = cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const rows = useMemo(() => events.map((ev) => {
    const p = parsePersonnel(ev.details), r = eventRange(ev);
    return { ev, id: ev.id, name: (ev.venue || "").trim() || "Unnamed", type: personnelType(ev.team).name, position: p.position, text: p.text, ...r };
  }).sort((a, b) => a.start.localeCompare(b.start) || a.name.localeCompare(b.name)), [events]);

  const scoped = scope === "month" ? rows.filter((r) => r.start <= mEnd && r.end >= mStart) : rows;
  const nowRows = rows.filter((r) => r.start <= todayStr && r.end >= todayStr);
  const outToday = [...new Map(nowRows.map((r) => [r.name.toLowerCase(), r])).values()];

  const counts = {};
  PERSONNEL_TYPES.forEach((t) => { counts[t.name] = { n: 0, now: 0 }; });
  scoped.forEach((r) => { counts[r.type].n++; });
  nowRows.forEach((r) => { counts[r.type].now++; });

  const groups = PERSONNEL_TYPES.filter((t) => !typeFilter || t.name === typeFilter);
  const toggleType = (name) => setTypeFilter((cur) => (cur === name ? "" : name));
  const open = (r) => onOpen(r.ev);

  return (
    <div className="pb">
      <div className="pb-cards">
        <button className={`pcard total${!typeFilter ? " on" : ""}`} onClick={() => setTypeFilter("")} aria-pressed={!typeFilter}>
          <span className="pc-top">All entries</span>
          <b>{scoped.length}</b>
          <small>{outToday.length} {outToday.length === 1 ? "person" : "people"} out today</small>
        </button>
        {PERSONNEL_TYPES.map((t) => (
          <button key={t.name} className={`pcard${typeFilter === t.name ? " on" : ""}`} style={{ "--c": t.color, "--ti": t.ink }} onClick={() => toggleType(t.name)} aria-pressed={typeFilter === t.name}>
            <span className="pc-top"><i className="pc-dot" />{t.name}</span>
            <b>{counts[t.name].n}</b>
            <small>{counts[t.name].now} now</small>
          </button>
        ))}
      </div>

      {outToday.length > 0 && (
        <div className="pb-today" aria-label="Out today">
          <span className="pt-title">Out today</span>
          {outToday.map((r) => (
            <span key={r.id} className="pt-chip" style={{ "--c": personnelType(r.type).color }}>
              <Avatar name={r.name} size={22} />
              <span className="pt-name">{r.name}</span>
              <em>{r.type}</em>
            </span>
          ))}
        </div>
      )}

      <div className="pb-tools">
        <div className="seg" role="group" aria-label="Time range">
          <button className={scope === "month" ? "on" : ""} onClick={() => setScope("month")}>{monthLabel}</button>
          <button className={scope === "all" ? "on" : ""} onClick={() => setScope("all")}>All time</button>
        </div>
        {typeFilter && <button className="clearf" onClick={() => setTypeFilter("")}>Showing: {typeFilter} ×</button>}
        <span className="sp" />
        {!readOnly && <button className="newitem" onClick={() => onAdd(typeFilter)}>+ New item</button>}
      </div>

      {scope === "month" && scoped.length === 0 && rows.length > 0 && (
        <div className="pb-hint">Nothing in {monthLabel}. <button onClick={() => setScope("all")}>Show all time</button></div>
      )}

      {groups.map((t) => {
        const list = scoped.filter((r) => r.type === t.name);
        const isClosed = !!closed[t.name];
        return (
          <section key={t.name} className="pgroup" style={{ "--c": t.color, "--ti": t.ink }}>
            <header className="pg-head">
              <button className="pg-toggle" onClick={() => setClosed((c) => ({ ...c, [t.name]: !c[t.name] }))} aria-expanded={!isClosed} aria-label={`${isClosed ? "Expand" : "Collapse"} ${t.name}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isClosed ? "rotate(-90deg)" : "none", transition: "transform .15s" }}><path d="M6 9l6 6 6-6" /></svg>
              </button>
              <h3>{t.name}</h3>
              <span className="pg-count">{list.length} {list.length === 1 ? "item" : "items"}</span>
            </header>
            {!isClosed && (
              <div className="pg-scroll">
                <div className="pg-table">
                  <div className="prow phead"><span /><span>Person</span><span>Position</span><span>Status</span><span>Dates</span><span>Duration</span><span>Details</span><span /></div>
                  {list.map((r) => {
                    const now = r.start <= todayStr && r.end >= todayStr;
                    return (
                      <div key={r.id} className="prow pbody" role="button" tabIndex={0} aria-label={`${r.name}, ${r.type}, ${formatRange(r.start, r.end)}`}
                        onClick={() => open(r)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(r); } }}>
                        <span className="pbar" />
                        <span className="pperson"><Avatar name={r.name} /><b>{r.name}</b></span>
                        <span className="ppos">{r.position || <i className="dash">—</i>}</span>
                        <span className="pstatus">{r.type}</span>
                        <span className="pdates"><i className="pdpill">{formatRange(r.start, r.end)}</i>{now && <em className="now"><s />Now</em>}</span>
                        <span className="pdur">{durationLabel(r.days)}</span>
                        <span className="pdet">{r.text || <i className="dash">—</i>}</span>
                        <span className="pedit">{!readOnly && "Edit"}</span>
                      </div>
                    );
                  })}
                  {list.length === 0 && <div className="pempty">No {t.name} entries{scope === "month" ? ` in ${monthLabel}` : ""}.</div>}
                  {!readOnly && <button className="padd" onClick={() => onAdd(t.name)}>+ Add {t.name}</button>}
                </div>
              </div>
            )}
          </section>
        );
      })}

      <style jsx>{`
        .pb { display: flex; flex-direction: column; gap: 16px; padding-top: 4px; }
        .sp { flex: 1; }

        /* stat tiles */
        .pb-cards { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
        .pcard { text-align: left; border: 1px solid var(--line); border-top: 5px solid var(--c, var(--brand)); border-radius: 12px; padding: 12px 14px 10px; cursor: pointer;
          background: linear-gradient(180deg, color-mix(in srgb, var(--c, var(--brand)) 13%, var(--surface)), var(--surface) 70%);
          display: flex; flex-direction: column; gap: 2px; transition: transform .12s, box-shadow .12s; }
        .pcard:hover { transform: translateY(-2px); box-shadow: var(--shadow); }
        .pcard.on { box-shadow: 0 0 0 2px var(--c, var(--brand)); }
        .pcard.total { --c: var(--brand); }
        .pc-top { display: flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 700; color: var(--mute); text-transform: uppercase; letter-spacing: .05em; }
        .pc-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--c); display: inline-block; }
        .pcard b { font-size: 30px; line-height: 1.15; font-weight: 800; color: var(--ink); }
        .pcard small { color: var(--faint); font-size: 12px; font-weight: 600; }

        /* who is out today */
        .pb-today { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 10px 14px; border-radius: 12px; border: 1px solid var(--line);
          background: linear-gradient(90deg, color-mix(in srgb, var(--brand) 9%, var(--surface)), var(--surface)); }
        .pt-title { font-size: 12px; font-weight: 800; color: var(--brand); text-transform: uppercase; letter-spacing: .06em; margin-right: 4px; }
        .pt-chip { display: inline-flex; align-items: center; gap: 7px; padding: 3px 12px 3px 4px; border-radius: 20px; background: var(--surface); border: 2px solid var(--c); font-size: 13px; font-weight: 600; }
        .pt-chip em { font-style: normal; font-size: 11px; font-weight: 700; color: var(--mute); }

        /* toolbar */
        .pb-tools { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .seg { display: inline-flex; padding: 3px; gap: 3px; border-radius: 10px; background: var(--sub); border: 1px solid var(--line); }
        .seg button { border: 0; background: transparent; padding: 6px 14px; border-radius: 7px; font-weight: 600; color: var(--mute); }
        .seg button.on { background: var(--brand); color: var(--brand-ink); }
        .clearf { border: 0; border-radius: 16px; padding: 5px 12px; font-weight: 600; background: var(--brand-soft); color: var(--brand); }
        .newitem { border: 0; border-radius: 8px; padding: 8px 16px; font-weight: 700; background: var(--brand); color: var(--brand-ink); }
        .newitem:hover { filter: brightness(.92); }
        .pb-hint { padding: 10px 14px; border-radius: 10px; background: var(--brand-soft); color: var(--brand); font-weight: 600; }
        .pb-hint button { border: 0; background: none; color: inherit; text-decoration: underline; font-weight: 700; }

        /* groups */
        .pgroup { border: 1px solid var(--line); border-radius: 12px; background: var(--surface); overflow: hidden; }
        .pg-head { display: flex; align-items: center; gap: 8px; padding: 12px 14px; border-bottom: 3px solid var(--c); background: color-mix(in srgb, var(--c) 9%, var(--surface)); }
        .pg-toggle { border: 0; background: none; display: grid; place-items: center; width: 26px; height: 26px; border-radius: 6px; color: color-mix(in srgb, var(--c) 70%, var(--ink)); }
        .pg-toggle:hover { background: color-mix(in srgb, var(--c) 22%, var(--surface)); }
        .pg-head h3 { margin: 0; font-size: 17px; font-weight: 800; color: color-mix(in srgb, var(--c) 68%, var(--ink)); }
        .pg-count { font-size: 12px; font-weight: 700; color: var(--mute); background: var(--surface); border: 1px solid var(--line); padding: 2px 10px; border-radius: 12px; }
        .pg-scroll { overflow-x: auto; }
        .pg-table { min-width: 980px; }
        .prow { display: grid; grid-template-columns: 8px minmax(190px, 2fr) minmax(130px, 1.3fr) 140px 210px 96px minmax(150px, 2fr) 56px; align-items: stretch; border-bottom: 1px solid var(--line); }
        .prow > span { padding: 10px 12px; display: flex; align-items: center; min-width: 0; }
        .phead { background: var(--sub); }
        .phead > span { padding: 8px 12px; font-size: 11px; font-weight: 800; color: var(--faint); text-transform: uppercase; letter-spacing: .06em; }
        .pbody { cursor: pointer; background: var(--surface); }
        .pbody:hover { background: color-mix(in srgb, var(--c) 7%, var(--surface)); }
        .pbody:focus-visible { outline: 2px solid var(--brand); outline-offset: -2px; }
        .pbar { padding: 0 !important; background: var(--c); }
        .pperson { gap: 10px; }
        .pperson b { font-weight: 700; overflow-wrap: anywhere; }
        .ppos { color: var(--mute); overflow-wrap: anywhere; }
        .pstatus { justify-content: center; text-align: center; font-weight: 800; background: var(--c); color: var(--ti); box-shadow: inset 0 0 0 1px var(--surface); }
        .pdates { gap: 8px; flex-wrap: wrap; }
        .pdpill { font-style: normal; font-weight: 700; font-size: 12.5px; padding: 4px 12px; border-radius: 14px; background: color-mix(in srgb, var(--c) 28%, var(--surface)); border: 1px solid var(--c); white-space: nowrap; }
        .now { display: inline-flex; align-items: center; gap: 5px; font-style: normal; font-size: 11px; font-weight: 800; color: #037f4c; background: #d9f7e8; padding: 2px 8px; border-radius: 10px; }
        .now s { width: 7px; height: 7px; border-radius: 50%; background: #00c875; text-decoration: none; animation: pulse 1.6s ease-in-out infinite; }
        @keyframes pulse { 50% { opacity: .3; } }
        .pdur { color: var(--mute); font-weight: 600; }
        .pdet { color: var(--mute); overflow-wrap: anywhere; white-space: pre-wrap; }
        .pedit { color: var(--brand); font-weight: 700; font-size: 12px; justify-content: flex-end; }
        .dash { color: var(--faint); font-style: normal; }
        .pempty { padding: 14px 18px; color: var(--faint); }
        .padd { display: block; width: 100%; text-align: left; border: 0; background: none; padding: 12px 20px; font-weight: 700; color: color-mix(in srgb, var(--c) 70%, var(--ink)); }
        .padd:hover { background: color-mix(in srgb, var(--c) 12%, var(--surface)); }

        @media (max-width: 860px) {
          .pb-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .pcard b { font-size: 26px; }
        }
        @media print {
          .pb-cards, .pb-tools, .pb-hint, .padd, .pedit, .pg-toggle { display: none !important; }
          .pb-today { border: 0; background: none; padding: 0 0 6px; }
          .pgroup { break-inside: avoid; border-radius: 0; margin-bottom: 8px; }
          .pg-scroll { overflow: visible; }
          .pg-table { min-width: 0; }
          .prow { grid-template-columns: 6px 1.6fr 1.2fr 100px 150px 70px 1.5fr 0; font-size: 11px; break-inside: avoid; }
          .prow > span { padding: 5px 8px; }
          .pdpill { font-size: 10.5px; padding: 2px 8px; }
          .now s { animation: none; }
        }
      `}</style>
    </div>
  );
}
