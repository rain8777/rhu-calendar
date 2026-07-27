import { useState, useEffect, useCallback, useRef } from "react";
import Head from "next/head";
import DayPanel from "../components/DayPanel";
import SheetView from "../components/SheetView";
import { PROGRAMS, getTeamColor, getTeamName, MONTHS, DAYS_OF_WEEK } from "../lib/constants";
import { CalendarIcon, ListIcon, HospitalIcon, VaccineIcon, HeartIcon, FamilyIcon, TransportIcon, MedicalIcon, ShieldIcon, LeafIcon, SunIcon, MoonIcon, RefreshIcon, ChevronLeftIcon, ChevronRightIcon, MenuIcon, ActivityIcon } from "../components/Icons";

const POLL_INTERVAL = 30000;

async function apiGet(programId) {
  const res = await fetch(`/api/events?program=${programId}`);
  if (!res.ok) throw new Error("Failed to load events");
  return (await res.json()).events || [];
}

function toDateStr(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function firstDayOfMonth(y, m) { return new Date(y, m, 1).getDay(); }

export default function View() {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [programId, setProgramId] = useState(PROGRAMS[0].id);
  const program = PROGRAMS.find((p) => p.id === programId) || PROGRAMS[0];
  const [eventsByProgram, setEventsByProgram] = useState({});
  const events = eventsByProgram[programId] || [];
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState("");
  const [tab, setTab]             = useState("calendar");
  const [theme, setTheme]         = useState("light");
  const [selectedDate, setSelectedDate] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lastRefresh, setLastRefresh] = useState({});
  const lastRef = lastRefresh[programId];
  const refreshLabel = lastRef
    ? `Updated ${lastRef.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : "";
  const dk = theme === "dark";
  function eventsForDate(dateStr) { return events.filter((e) => e.date === dateStr); }

  const loadEvents = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setLoadError("");
    try {
      const evs = await apiGet(programId);
      const filtered = evs.filter((e) => e.title === program.title);
      setEventsByProgram((prev) => ({ ...prev, [programId]: filtered }));
      setLastRefresh((prev) => ({ ...prev, [programId]: new Date() }));
    } catch (e) {
      setLoadError(e.message);
    } finally { if (showLoader) setLoading(false); }
  }, [programId, program.title]);

  useEffect(() => { loadEvents(); const id = setInterval(() => loadEvents(false), POLL_INTERVAL); return () => clearInterval(id); }, [loadEvents]);

  const totalDays = daysInMonth(year, month);
  const startDay  = firstDayOfMonth(year, month);
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const NAV_ITEMS = [
    { id: "calendar", label: "Calendar", icon: <CalendarIcon size={16} />, mobIcon: <CalendarIcon size={20} /> },
    { id: "list",     label: "List View", icon: <ListIcon size={16} />, mobIcon: <ListIcon size={20} /> },
  ];

  function programIcon(name) {
    switch (name) {
      case "hospital":     return <HospitalIcon size={18} />;
      case "vaccine":      return <VaccineIcon size={18} />;
      case "heart":        return <HeartIcon size={18} />;
      case "family":       return <FamilyIcon size={18} />;
      case "transport":    return <TransportIcon size={18} />;
      case "activity":     return <ActivityIcon size={18} />;
      case "medical":      return <MedicalIcon size={18} />;
      case "shield":       return <ShieldIcon size={18} />;
      case "leaf":         return <LeafIcon size={18} />;
      default:             return <HospitalIcon size={18} />;
    }
  }

  return (
    <>
      <Head>
        <title>RHU Calendar — Viewer</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className={`app-shell ${dk ? "dark" : "light"}`}>
        <aside className={`sidebar ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
          <div className="brand">
            <span className="brand-icon"><MedicalIcon size={26} /></span>
            <div>
              <div className="brand-title">RHU Calendar</div>
              <div className="brand-badge">VIEWER</div>
            </div>
          </div>

          <nav className="nav">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                className={`nav-btn ${tab === item.id ? "active" : ""}`}
                onClick={() => { setTab(item.id); setMobileMenuOpen(false); }}
              >
                <span className="nav-btn-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="theme-row">
            <span className="theme-label">{dk ? <><MoonIcon size={14} /> Dark</> : <><SunIcon size={14} /> Light</>}</span>
            <button className={`toggle ${dk ? "toggle-dark" : "toggle-light"}`} onClick={() => setTheme(dk ? "light" : "dark")} aria-label="Toggle theme">
              <span className="toggle-knob" />
            </button>
          </div>

          {program.type !== "activity" && (
          <div className="legend">
            <div className="legend-title">Barangay</div>
            {program.northTeams ? (
              <>
                <div className="legend-group-label">North</div>
                {program.northTeams.map((t) => (
                  <div key={t.id} className="legend-item">
                    <span className="legend-dot" style={{ background: getTeamColor(t.id) }} />
                    <span>{t.name}</span>
                  </div>
                ))}
                <div className="legend-group-label" style={{ marginTop: 8 }}>South</div>
                {program.southTeams.map((t) => (
                  <div key={t.id} className="legend-item">
                    <span className="legend-dot" style={{ background: getTeamColor(t.id) }} />
                    <span>{t.name}</span>
                  </div>
                ))}
              </>
            ) : (
              program.teams.map((t) => (
                <div key={t.id} className="legend-item">
                  <span className="legend-dot" style={{ background: getTeamColor(t.id) }} />
                  <span>{t.name}</span>
                </div>
              ))
            )}
          </div>
          )}
        </aside>
        {mobileMenuOpen && <div className="sidebar-backdrop" onClick={() => setMobileMenuOpen(false)} />}

        <main className="main-area">
          <div className="mob-header">
            <button className="btn-menu-mobile" onClick={() => setMobileMenuOpen(true)} aria-label="Menu"><MenuIcon size={20} /></button>
            <span className="mob-header-title">RHU Calendar</span>
            <span className="mob-header-badge">VIEWER</span>
            <div className="mob-header-spacer" />
          </div>

          <div className="program-tabs-bar">
            {PROGRAMS.map((p) => (
              <button
                key={p.id}
                className={`prog-tab ${programId === p.id ? "prog-tab-active" : ""}`}
                onClick={() => { setProgramId(p.id); setSelectedDate(null); }}
              >
                <span className="prog-tab-icon">{programIcon(p.icon)}</span>
                <span className="prog-tab-label">{p.label}</span>
                {p.nipLabel && <span className="prog-tab-badge">{p.nipLabel}</span>}
              </button>
            ))}
          </div>

          {loading && <div className="loading-bar" />}

          {loadError && (
            <div className="error-banner">
              {loadError}
              <button className="error-retry" onClick={() => loadEvents()}>Retry</button>
            </div>
          )}

          {tab === "calendar" && (
            <div className="cal-layout">
              <div className="cal-pane">
                <div className="cal-header">
                  <button className="nav-arrow" onClick={() => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); setSelectedDate(null); }}><ChevronLeftIcon size={18} /></button>
                  <h1 className="cal-title">{MONTHS[month]} {year}</h1>
                  <span className="print-program">{program.label}</span>
                  <button className="nav-arrow" onClick={() => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); setSelectedDate(null); }}><ChevronRightIcon size={18} /></button>
                  <button className="btn-today" onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}>Today</button>
                  <button className="btn-refresh" onClick={() => loadEvents(false)} title={refreshLabel}><RefreshIcon size={12} /> <span className="btn-refresh-label">{refreshLabel}</span></button>
                </div>

                <div className="dow-row">{DAYS_OF_WEEK.map((d) => <div key={d} className="dow-cell">{d}</div>)}</div>

                <div className="grid">
                  {cells.map((day, i) => {
                    if (day === null) return <div key={`e${i}`} className="grid-cell empty" />;
                    const dateStr = toDateStr(year, month, day);
                    const dayEvents = events.filter((e) => e.date === dateStr);
                    const isToday = dateStr === todayStr;
                    const isSel   = dateStr === selectedDate;
                    return (
                      <div key={dateStr} className={`grid-cell${isToday ? " today" : ""}${isSel ? " selected" : ""}`} onClick={() => setSelectedDate(isSel ? null : dateStr)}>
                        <div className="day-num">{day}</div>
                        <div className="day-events">
                          {dayEvents.slice(0, 3).map((ev) => {
                            const pillColor = ev.color || getTeamColor(ev.team);
                            const pillLabel = programId === "nip" ? getTeamName(ev.team, program.teams) : (ev.venue || getTeamName(ev.team, program.teams));
                            return (
                            <div key={ev.id} className="day-pill" style={{ background: pillColor + "28", color: pillColor, borderColor: pillColor }} title={pillLabel}>
                              {pillLabel}
                            </div>
                            );
                          })}
                          {dayEvents.length > 3 && <div className="more-pill">+{dayEvents.length - 3} more</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedDate && (
                <div className="side-panel">
                  <DayPanel
                    date={selectedDate}
                    events={eventsForDate(selectedDate)}
                    onEdit={() => {}}
                    onAdd={() => {}}
                    onClose={() => setSelectedDate(null)}
                    theme={theme}
                    teams={program.teams}
                    eventTitle={program.title}
                    readOnly
                  />
                </div>
              )}
            </div>
          )}

          {tab === "list" && (
            <SheetView
              events={events}
              onEdit={() => {}}
              onAdd={() => {}}
              theme={theme}
              onRefresh={() => loadEvents(false)}
              refreshLabel={refreshLabel}
              teams={program.teams}
              eventTitle={program.title}
              readOnly
              programId={programId}
            />
          )}

          <nav className="bottom-nav">
            {NAV_ITEMS.map((item) => (
              <button key={item.id} className={`bottom-nav-btn ${tab === item.id ? "bottom-nav-active" : ""}`} onClick={() => setTab(item.id)}>
                {item.mobIcon}
                <span className="bottom-nav-label">{item.label}</span>
              </button>
            ))}
          </nav>
        </main>
      </div>

      <style jsx>{`
        .mob-header-badge { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.06em; background: #4f8ef7; color: #fff; border-radius: 4px; padding: 1px 6px; margin-left: 6px; }
        .brand-badge { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.06em; background: #4f8ef728; color: #4f8ef7; border-radius: 4px; padding: 1px 6px; margin-top: 2px; display: inline-block; }
      `}</style>

      <style jsx global>{`
        .app-shell { display: flex; height: 100vh; overflow: hidden; }

        .sidebar { width: 230px; flex-shrink: 0; background: ${dk ? "#131929" : "#ffffff"}; border-right: 1px solid ${dk ? "#2d3354" : "#e2e8f0"}; display: flex; flex-direction: column; overflow-y: auto; }
        .brand { display: flex; align-items: center; gap: 10px; padding: 20px 16px 16px; border-bottom: 1px solid ${dk ? "#2d3354" : "#e2e8f0"}; }
        .brand-icon { display: flex; align-items: center; color: #4f8ef7; }
        .brand-title { font-weight: 700; font-size: 0.9rem; color: ${dk ? "#e2e8f0" : "#1a202c"}; }
        .nav { padding: 12px 10px; border-bottom: 1px solid ${dk ? "#2d3354" : "#e2e8f0"}; }
        .nav-btn { display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; padding: 9px 12px; background: none; border: none; border-radius: 7px; color: ${dk ? "#8892b0" : "#4a5568"}; cursor: pointer; font-size: 0.88rem; margin-bottom: 2px; transition: background 0.15s, color 0.15s; }
        .nav-btn:hover { background: ${dk ? "#1e2235" : "#f0f4f8"}; color: ${dk ? "#e2e8f0" : "#1a202c"}; }
        .nav-btn.active { background: ${dk ? "#1a2a50" : "#ebf4ff"}; color: #4f8ef7; font-weight: 600; }
        .nav-btn-icon { display: flex; align-items: center; flex-shrink: 0; }

        .theme-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid ${dk ? "#2d3354" : "#e2e8f0"}; }
        .theme-label { font-size: 0.78rem; color: ${dk ? "#8892b0" : "#718096"}; display: flex; align-items: center; gap: 6px; }
        .toggle { width: 40px; height: 22px; border-radius: 11px; border: none; cursor: pointer; position: relative; transition: background 0.2s; padding: 0; }
        .toggle-dark { background: #4f8ef7; }
        .toggle-light { background: #cbd5e0; }
        .toggle-knob { position: absolute; top: 3px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: left 0.2s; left: ${dk ? "21px" : "3px"}; }

        .legend { padding: 14px; flex: 1; overflow-y: auto; }
        .legend-title { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.08em; color: #4f8ef7; margin-bottom: 10px; font-weight: 700; }
        .legend-item { display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: 0.78rem; color: ${dk ? "#8892b0" : "#4a5568"}; }
        .legend-group-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.06em; color: ${dk ? "#a5b4fc" : "#5a67d8"}; font-weight: 700; margin-bottom: 4px; }
        .legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

        .main-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: ${dk ? "#0d1117" : "#f0f4f8"}; }
        .mob-header { display: none; }

        .program-tabs-bar { display: flex; gap: 4px; padding: 10px 16px 0; background: ${dk ? "#0d1117" : "#f0f4f8"}; border-bottom: 2px solid ${dk ? "#2d3354" : "#e2e8f0"}; overflow-x: auto; flex-shrink: 0; scrollbar-width: none; }
        .program-tabs-bar::-webkit-scrollbar { display: none; }
        .prog-tab { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 14px 10px; background: none; border: none; border-radius: 8px 8px 0 0; cursor: pointer; white-space: nowrap; color: ${dk ? "#8892b0" : "#718096"}; font-size: 0.82rem; font-weight: 500; border-bottom: 3px solid transparent; transition: background 0.15s, color 0.15s, border-color 0.15s; position: relative; bottom: -2px; }
        .prog-tab:hover { background: ${dk ? "#1e2235" : "#e8edf5"}; color: ${dk ? "#e2e8f0" : "#1a202c"}; }
        .prog-tab-active { background: ${dk ? "#131929" : "#ffffff"}; color: #4f8ef7; border-bottom: 3px solid #4f8ef7; font-weight: 700; }
        .prog-tab-icon { display: flex; align-items: center; }
        .prog-tab-label { font-size: 0.8rem; }
        .prog-tab-badge { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.04em; background: #4f8ef720; color: #4f8ef7; border: 1px solid #4f8ef740; border-radius: 4px; padding: 1px 5px; margin-top: 1px; }

        .loading-bar { height: 2px; background: linear-gradient(90deg, #4f8ef7, #a5b4fc, #4f8ef7); background-size: 200% 100%; animation: loadSlide 1s linear infinite; }
        @keyframes loadSlide { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .error-banner { display: flex; align-items: center; gap: 10px; padding: 10px 16px; background: rgba(229,62,62,0.1); color: #fc8181; font-size: 0.85rem; }
        .error-retry { background: transparent; border: 1px solid #fc8181; color: #fc8181; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; }
        .sidebar-backdrop { display: none; }

        .dow-row { display: grid; grid-template-columns: repeat(7, 1fr); border-bottom: 1px solid ${dk ? "#2d3354" : "#e2e8f0"}; margin-bottom: 4px; }
        .dow-cell { text-align: center; padding: 6px 0; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.07em; color: ${dk ? "#8892b0" : "#a0aec0"}; }
        .grid { display: grid; grid-template-columns: repeat(7, 1fr); grid-template-rows: repeat(6, 1fr); gap: 3px; flex: 1; overflow: hidden; }
        .grid-cell { padding: 3px 4px; min-width: 0; background: white !important; border: 1px solid #e8edf5 !important; border-radius: 2px; break-inside: avoid; cursor: pointer; }
        .grid-cell.empty { background: transparent; border-color: transparent; cursor: default; }
        .grid-cell:not(.empty):hover { background: ${dk ? "#1a2040" : "#f7f9fc"}; border-color: ${dk ? "#2d3354" : "#c8d6e8"}; }
        .grid-cell.today { border-color: #4f8ef7; background: ${dk ? "#0f1d38" : "#ebf4ff"}; }
        .grid-cell.selected { border-color: #a5b4fc; background: ${dk ? "#1a2040" : "#f0f0ff"}; }
        .day-num { font-size: 0.8rem; font-weight: 600; color: ${dk ? "#8892b0" : "#a0aec0"}; margin-bottom: 4px; }
        .grid-cell.today .day-num { color: #4f8ef7; font-weight: 700; }
        .day-events { display: flex; flex-direction: column; gap: 2px; overflow: hidden; }
        .day-pill { font-size: 0.67rem; font-weight: 600; padding: 2px 5px; border-radius: 4px; border: 1px solid; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; cursor: default; }
        .more-pill { font-size: 0.65rem; color: ${dk ? "#8892b0" : "#a0aec0"}; padding: 1px 4px; }

        .side-panel { width: 300px; flex-shrink: 0; border-left: 1px solid ${dk ? "#2d3354" : "#e2e8f0"}; background: ${dk ? "#131929" : "#ffffff"}; overflow-y: auto; }
        .cal-layout { display: flex; flex: 1; overflow: hidden; }
        .cal-pane { flex: 1; display: flex; flex-direction: column; overflow: hidden; padding: 20px 24px; }
        .cal-header { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
        .cal-title { font-size: 1.3rem; font-weight: 700; color: ${dk ? "#e2e8f0" : "#1a202c"}; flex: 1; }
        .nav-arrow { background: ${dk ? "#1e2235" : "#ffffff"}; border: 1px solid ${dk ? "#2d3354" : "#d1d9e6"}; color: ${dk ? "#e2e8f0" : "#1a202c"}; width: 32px; height: 32px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .nav-arrow:hover { background: ${dk ? "#2d3354" : "#e2e8f0"}; }
        .btn-today { background: transparent; border: 1px solid ${dk ? "#2d3354" : "#d1d9e6"}; color: ${dk ? "#8892b0" : "#4a5568"}; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 0.82rem; }
        .btn-today:hover { color: ${dk ? "#e2e8f0" : "#1a202c"}; border-color: #4f8ef7; }
        .btn-refresh { display: flex; align-items: center; gap: 4px; background: transparent; border: 1px solid ${dk ? "#2d3354" : "#d1d9e6"}; color: ${dk ? "#8892b0" : "#718096"}; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.78rem; white-space: nowrap; }
        .btn-refresh:hover { border-color: #4f8ef7; color: #4f8ef7; }

        .print-program { display: none; }
        .bottom-nav { display: none; }

        @media (max-width: 768px) {
          .sidebar { position: fixed; top: 0; left: 0; bottom: 0; z-index: 300; width: 260px; transform: translateX(-100%); transition: transform 0.25s ease; border-right: 1px solid ${dk ? "#2d3354" : "#e2e8f0"}; box-shadow: 2px 0 12px rgba(0,0,0,0.15); }
          .sidebar.sidebar-open { transform: translateX(0); }
          .sidebar-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 299; display: block; }
          .side-panel { width: 100%; position: fixed; bottom: 0; left: 0; right: 0; height: 55vh; z-index: 200; border-top: 1px solid ${dk ? "#2d3354" : "#e2e8f0"}; border-left: none; border-radius: 12px 12px 0 0; }
          .mob-header { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: ${dk ? "#131929" : "#ffffff"}; border-bottom: 1px solid ${dk ? "#2d3354" : "#e2e8f0"}; flex-shrink: 0; }
          .btn-menu-mobile { background: none; border: none; cursor: pointer; display: flex; align-items: center; padding: 4px; color: ${dk ? "#8892b0" : "#4a5568"}; }
          .mob-header-title { font-size: 0.85rem; font-weight: 600; color: ${dk ? "#e2e8f0" : "#1a202c"}; }
          .mob-header-spacer { flex: 1; }
          .cal-pane { padding: 12px 10px; padding-bottom: 70px; }
          .cal-header { gap: 6px; }
          .cal-title { font-size: 1.05rem; }
          .btn-refresh-label { display: none; }
          .grid-cell { padding: 4px 5px; min-width: 0; }
          .day-num { font-size: 0.72rem; margin-bottom: 2px; }
          .day-pill { font-size: 0.6rem; padding: 1px 3px; max-width: 100%; }
          .day-events { gap: 1px; }
          .prog-tab { padding: 6px 8px 8px; gap: 1px; }
          .prog-tab-label { font-size: 0.62rem; display: block; }
          .prog-tab-icon svg { width: 16px; height: 16px; }
          .bottom-nav { display: flex; position: fixed; bottom: 0; left: 0; right: 0; height: 54px; z-index: 150; background: ${dk ? "#131929" : "#ffffff"}; border-top: 1px solid ${dk ? "#2d3354" : "#e2e8f0"}; justify-content: space-around; align-items: center; }
          .bottom-nav-btn { display: flex; flex-direction: column; align-items: center; gap: 2px; background: none; border: none; cursor: pointer; color: ${dk ? "#4a5568" : "#a0aec0"}; padding: 4px 10px; font-size: 0.65rem; transition: color 0.15s; }
          .bottom-nav-btn.bottom-nav-active { color: #4f8ef7; }
          .bottom-nav-label { white-space: nowrap; }
        }

        .print-program { display: none; }
        @media print {
          @page { size: A4 landscape; margin: 0.5in; }
          html, body { height: auto; overflow: visible; background: white; }
          body.dark, body.light { background: white; color: #1a202c; }
          #__next { height: auto; }
          .app-shell { display: block; height: auto; overflow: visible; }
          .sidebar, .sidebar-backdrop, .side-panel, .mob-header, .bottom-nav, .program-tabs-bar, .theme-row, .legend, .btn-today, .btn-refresh, .nav-arrow { display: none !important; }
          .main-area { overflow: visible; background: white; display: block; height: auto; }
          .cal-layout { display: block; overflow: visible; }
          .cal-pane { padding: 0; overflow: visible; }
          .grid { overflow: visible; }
          .grid-cell { padding: 3px 4px; min-width: 0; background: white !important; border: 1px solid #e8edf5 !important; border-radius: 2px; break-inside: avoid; }
          .grid-cell.empty { background: transparent !important; border-color: transparent !important; }
          .grid-cell.today { border-color: #4f8ef7 !important; background: #f7f9fc !important; }
          .day-num { font-size: 0.7rem; color: #a0aec0; }
          .day-events { gap: 1px; }
          .day-pill { font-size: 0.55rem; padding: 1px 3px; border-radius: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .more-pill { font-size: 0.55rem; color: #a0aec0; }
          .sheet-wrap { display: block !important; height: auto; overflow: visible; padding: 0; }
          .sheet-wrap .toolbar, .sheet-wrap .filter-bar, .sheet-wrap .btn-edit, .sheet-wrap .btn-print, .sheet-wrap .btn-export, .sheet-wrap .results-info { display: none !important; }
          .sheet-wrap .table-wrap { overflow: visible; border: none; border-radius: 0; }
          .sheet-wrap .sheet-table { min-width: auto; }
          .sheet-wrap .sheet-table th, .sheet-wrap .sheet-table td { padding: 6px 10px; font-size: 0.75rem; color: #1a202c; }
          .sheet-wrap .sheet-table th { background: #f7f9fc; color: #718096; }
          .sheet-wrap .sheet-table td { border-color: #e2e8f0; }
          .sheet-wrap .sheet-table tr:last-child td { border-bottom: 1px solid #e2e8f0; }
          .sheet-wrap .date-cell { color: #4a6cf7; }
          .sheet-wrap .details-cell { color: #718096; }
          .sheet-wrap .team-badge { border: 1px solid; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .sheet-wrap .print-title { display: block; text-align: center; font-size: 1.2rem; font-weight: 700; color: #1a202c; margin-bottom: 16px; padding-top: 8px; }
          .sheet-wrap .empty { display: none !important; }
        }
      `}</style>
    </>
  );
}


