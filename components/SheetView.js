import { useState, useMemo } from "react";
import { getTeamColor, getTeamName } from "../lib/constants";
import { SearchIcon, CloseIcon, RefreshIcon } from "./Icons";

export default function SheetView({ events, onEdit, onAdd, theme, onRefresh, refreshLabel, teams, eventTitle, readOnly }) {
  const dk = theme === "dark";
  const showPrintTitle = ["RHU Activities", "Transportation Service", "Family Planning"].includes(eventTitle);

  const today = new Date();
  const [filterDate,     setFilterDate]     = useState("");
  const [filterYear,     setFilterYear]     = useState("");
  const [filterMonth,    setFilterMonth]    = useState("");
  const [filterActivity, setFilterActivity] = useState("");
  const [filterBarangay, setFilterBarangay] = useState("");
  const [filterDetails,  setFilterDetails]  = useState("");

  const filtered = useMemo(() => {
    return [...events]
      .filter((ev) => {
        if (filterDate && ev.date !== filterDate) return false;
        if (filterYear && ev.date.slice(0,4) !== filterYear) return false;
        if (filterMonth && ev.date.slice(5,7) !== filterMonth) return false;
        if (filterActivity && !ev.venue?.toLowerCase().includes(filterActivity.toLowerCase())) return false;
        if (filterBarangay && ev.team !== filterBarangay) return false;
        if (filterDetails && !ev.details?.toLowerCase().includes(filterDetails.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [events, filterDate, filterYear, filterMonth, filterActivity, filterBarangay, filterDetails]);

  const hasFilters = filterDate || filterYear || filterMonth || filterActivity || filterBarangay || filterDetails;

  function clearFilters() {
    setFilterDate("");
    setFilterYear("");
    setFilterMonth("");
    setFilterActivity("");
    setFilterBarangay("");
    setFilterDetails("");
  }

  const years = [];
  for (let y = today.getFullYear() - 2; y <= today.getFullYear() + 2; y++) years.push(y);

  function fmtDate(dateStr) {
    if (!dateStr) return "—";
    const [y, m, d] = dateStr.split("-");
    return `${m}/${d}/${y}`;
  }

  return (
    <div className="sheet-wrap">
      {/* Toolbar */}
        <div className="toolbar">
          {!readOnly && <h2>All Schedules</h2>}
          <div className="toolbar-right">
            {!readOnly && (
              <button className="btn-refresh" onClick={onRefresh} title={refreshLabel}><RefreshIcon size={12} /> {refreshLabel}</button>
            )}
            {!readOnly && <button className="btn-add" onClick={() => onAdd(null)}>+ Add Schedule</button>}
          </div>
        </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <div className="filter-group">
          <label>Date</label>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label>Year</label>
          <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="filter-input">
            <option value="">All Years</option>
            {years.map((y) => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Month</label>
          <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="filter-input">
            <option value="">All Months</option>
            {["01","02","03","04","05","06","07","08","09","10","11","12"].map((m) => (
              <option key={m} value={m}>{new Date(2000, +m-1).toLocaleString("default", { month: "long" })}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Activity</label>
          <div className="search-wrap">
            <span className="search-icon"><SearchIcon size={14} /></span>
            <input
              type="text"
              value={filterActivity}
              onChange={(e) => setFilterActivity(e.target.value)}
              placeholder="Search activity name…"
              className="filter-input search-input"
            />
            {filterActivity && (
              <button className="clear-search" onClick={() => setFilterActivity("")}><CloseIcon size={12} /></button>
            )}
          </div>
        </div>

        {teams.length > 0 && (
          <div className="filter-group">
            <label>Barangay</label>
            <select
              value={filterBarangay}
              onChange={(e) => setFilterBarangay(e.target.value)}
              className="filter-input"
            >
              <option value="">All Barangays</option>
              {(teams || []).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="filter-group">
          <label>Details</label>
          <div className="search-wrap">
            <span className="search-icon"><SearchIcon size={14} /></span>
            <input
              type="text"
              value={filterDetails}
              onChange={(e) => setFilterDetails(e.target.value)}
              placeholder="Search details…"
              className="filter-input search-input"
            />
            {filterDetails && (
              <button className="clear-search" onClick={() => setFilterDetails("")}><CloseIcon size={12} /></button>
            )}
          </div>
        </div>

        {hasFilters && (
          <button className="btn-clear" onClick={clearFilters}>Clear filters</button>
        )}
      </div>

      {/* Results count */}
      <div className="results-info">
        {hasFilters
          ? `${filtered.length} of ${events.length} schedule${events.length !== 1 ? "s" : ""}`
          : `${events.length} schedule${events.length !== 1 ? "s" : ""} total`}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="empty">
          {events.length === 0
            ? "No schedules yet. Add one to get started."
            : "No schedules match your filters."}
        </div>
      ) : (
        <div className="table-wrap">
          {showPrintTitle && <div className="print-title">{eventTitle}</div>}
          <table className="sheet-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>{teams.length > 0 ? "Barangay" : "Activity"}</th>
                <th>{teams.length > 0 ? "Details" : "Venue"}</th>
                {!readOnly && <th></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((ev) => (
                <tr key={ev.id}>
                  <td className="date-cell">{fmtDate(ev.date)}</td>
                  <td>
                    {ev.venue ? (
                      <span
                        className="team-badge"
                        style={{
                          background:  (ev.color || getTeamColor(ev.team)) + "22",
                          color:       ev.color || getTeamColor(ev.team),
                          borderColor: ev.color || getTeamColor(ev.team),
                        }}
                      >
                        {ev.venue}
                      </span>
                    ) : (
                      <span
                        className="team-badge"
                        style={{
                          background:  getTeamColor(ev.team) + "22",
                          color:       getTeamColor(ev.team),
                          borderColor: getTeamColor(ev.team),
                        }}
                      >
                        {getTeamName(ev.team, teams)}
                      </span>
                    )}
                  </td>
                  <td className="details-cell">
                    {filterDetails && ev.details ? (
                      <HighlightText text={ev.details} query={filterDetails} />
                    ) : (
                      ev.details || <span className="dash">—</span>
                    )}
                  </td>
                  {!readOnly && (
                  <td>
                    <button className="btn-edit" onClick={() => onEdit(ev)}>Edit</button>
                  </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`
        .sheet-wrap { padding: 24px; height: 100%; display: flex; flex-direction: column; }

        .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px; }
        .toolbar h2 { margin: 0; color: ${dk ? "#e2e8f0" : "#1a202c"}; font-size: 1.2rem; }
        .toolbar-right { display: flex; gap: 8px; align-items: center; }

        .btn-refresh {
          display: flex; align-items: center; gap: 4px;
          background: transparent; border: 1px solid ${dk ? "#2d3354" : "#d1d9e6"};
          color: ${dk ? "#8892b0" : "#718096"};
          padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.78rem; white-space: nowrap;
        }
        .btn-refresh:hover { border-color: #4f8ef7; color: #4f8ef7; }

        .btn-add {
          background: #4f8ef7; color: #fff; border: none;
          padding: 8px 18px; border-radius: 6px; cursor: pointer; font-size: 0.88rem; font-weight: 600;
        }
        .btn-add:hover { background: #3a7de0; }

        /* Filter bar */
        .filter-bar {
          display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap;
          padding: 14px 16px; border-radius: 10px; margin-bottom: 12px;
          background: ${dk ? "#131929" : "#ffffff"};
          border: 1px solid ${dk ? "#2d3354" : "#e2e8f0"};
        }
        .filter-group { display: flex; flex-direction: column; gap: 5px; min-width: 160px; }
        .filter-group label {
          font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em;
          color: ${dk ? "#8892b0" : "#718096"}; font-weight: 600;
        }
        .filter-input {
          background: ${dk ? "#0d1117" : "#f7fafc"};
          border: 1px solid ${dk ? "#2d3354" : "#d1d9e6"};
          color: ${dk ? "#e2e8f0" : "#1a202c"};
          border-radius: 6px; padding: 7px 10px; font-size: 0.875rem; outline: none;
          width: 100%;
        }
        .filter-input:focus { border-color: #4f8ef7; }

        .search-wrap { position: relative; display: flex; align-items: center; }
        .search-icon { position: absolute; left: 8px; display: flex; align-items: center; pointer-events: none; color: ${dk ? "#4a5568" : "#a0aec0"}; }
        .search-input { padding-left: 26px; padding-right: 26px; }
        .clear-search {
          position: absolute; right: 6px; background: none; border: none;
          color: ${dk ? "#8892b0" : "#a0aec0"}; cursor: pointer; display: flex; align-items: center; padding: 2px;
        }
        .clear-search:hover { color: ${dk ? "#e2e8f0" : "#1a202c"}; }

        .btn-clear {
          background: transparent; border: 1px solid ${dk ? "#c94f4f" : "#fc8181"};
          color: ${dk ? "#fc8181" : "#e53e3e"};
          padding: 7px 14px; border-radius: 6px; cursor: pointer; font-size: 0.82rem;
          align-self: flex-end;
        }
        .btn-clear:hover { background: rgba(252,129,129,0.1); }

        .results-info { font-size: 0.8rem; color: ${dk ? "#8892b0" : "#a0aec0"}; margin-bottom: 10px; }

        .empty { color: ${dk ? "#8892b0" : "#a0aec0"}; text-align: center; padding: 60px 0; font-size: 0.95rem; }

        .table-wrap { flex: 1; overflow-y: auto; border-radius: 8px; border: 1px solid ${dk ? "#2d3354" : "#e2e8f0"}; }
        .sheet-table { width: 100%; border-collapse: collapse; }
        .sheet-table th {
          text-align: left; padding: 10px 14px; font-size: 0.74rem;
          text-transform: uppercase; letter-spacing: 0.07em;
          color: ${dk ? "#8892b0" : "#a0aec0"};
          background: ${dk ? "#131929" : "#f7f9fc"};
          border-bottom: 1px solid ${dk ? "#2d3354" : "#e2e8f0"};
          position: sticky; top: 0; z-index: 1;
        }
        .sheet-table td { padding: 11px 14px; font-size: 0.875rem; color: ${dk ? "#e2e8f0" : "#2d3748"}; border-bottom: 1px solid ${dk ? "#1a2040" : "#f0f4f8"}; }
        .sheet-table tr:last-child td { border-bottom: none; }
        .sheet-table tbody tr:hover td { background: ${dk ? "#1a2040" : "#f7f9fc"}; }

        .date-cell { white-space: nowrap; color: ${dk ? "#a5b4fc" : "#4a6cf7"}; font-weight: 500; }
        .title-cell { color: ${dk ? "#a5b4fc" : "#5a67d8"}; font-weight: 500; }
        .details-cell { color: ${dk ? "#8892b0" : "#718096"}; max-width: 260px; }
        .dash { color: ${dk ? "#4a5568" : "#cbd5e0"}; }

        .team-badge {
          display: inline-block; padding: 3px 10px; border-radius: 20px;
          font-size: 0.78rem; font-weight: 600; border: 1px solid; white-space: nowrap;
        }
        .btn-edit {
          background: transparent; color: #4f8ef7; border: 1px solid #4f8ef7;
          padding: 4px 12px; border-radius: 5px; cursor: pointer; font-size: 0.8rem; white-space: nowrap;
        }
        .btn-edit:hover { background: rgba(79,142,247,0.1); }

        .print-title { display: none; }

        @media (max-width: 768px) {
          .sheet-wrap { padding: 12px; padding-bottom: 64px; }
          .toolbar { flex-direction: column; align-items: stretch; }
          .toolbar h2 { font-size: 1rem; }
          .filter-bar { flex-direction: column; padding: 10px 12px; }
          .filter-group { min-width: 100%; }
          .table-wrap { overflow-x: auto; }
          .sheet-table { min-width: 560px; }
          .sheet-table td, .sheet-table th { padding: 8px 10px; font-size: 0.8rem; }
        }

        @media print {
          @page { size: A4 portrait; margin: 0.5in; }
          .print-title { display: block; text-align: center; font-size: 1.2rem; font-weight: 700; color: #1a202c; margin-bottom: 16px; padding-top: 8px; }
        }
      `}</style>
    </div>
  );
}

// Highlight matching text in details search
function HighlightText({ text, query }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: "#fef08a", color: "#1a202c", borderRadius: "2px", padding: "0 1px" }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}
