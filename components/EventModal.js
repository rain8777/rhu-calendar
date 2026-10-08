import { useState, useRef, useEffect } from "react";
import { getTeamColor, MEDIC_TYPES } from "../lib/constants";
import { CloseIcon } from "./Icons";
import { parseMeta, buildDetails } from "../lib/meta";

export default function EventModal({ event, defaultDate, onSave, onDelete, onClose, theme, teams, eventTitle, programType, programId, barangays = [], nameSuggestions = [], dutySuggestions = [] }) {
  // Close on backdrop click only if the press AND the release both happened on the backdrop.
  // (Dragging a text selection out of the modal must not dismiss it.)
  const boxRef = useRef(null);
  const pressedOnBackdrop = useRef(false);
  const releasedOnBackdrop = useRef(false);
  const dk = theme === "dark";
  // Focus the first field when it opens (desktop only, so phones don't pop the keyboard), and give focus back on close.
  useEffect(() => {
    const prev = document.activeElement;
    if (window.matchMedia && window.matchMedia("(pointer: fine)").matches && boxRef.current) {
      const f = boxRef.current.querySelector("input:not([readonly]):not([disabled]), select, textarea");
      if (f) f.focus();
    }
    return () => { if (prev && prev.focus) prev.focus(); };
  }, []);
  const trapTab = (e) => {
    if (e.key !== "Tab" || !boxRef.current) return;
    const els = [...boxRef.current.querySelectorAll("button:not([disabled]), input:not([disabled]), select, textarea")].filter((x) => x.offsetParent !== null);
    if (!els.length) return;
    const first = els[0], last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  const isMedic = programType === "medic";
  const isActivity = programType === "activity" || isMedic; // both keep Location + Barangay in the details text
  const activityRequired = eventTitle === "Family Planning";
  const defaultTeam = teams[0]?.id || "agao-ao";
  const [team,    setTeam]    = useState(event?.team    || defaultTeam);

  const rawDetails = event?.details || "";
  const shouldParseVenue = isActivity || programId === "nip";
  const meta = parseMeta(rawDetails);
  const parsed = shouldParseVenue ? [meta.venue, meta.text] : [null, rawDetails];

  const [venue,   setVenue]   = useState(event?.venue   || "");
  const [venueLocation, setVenueLocation] = useState(parsed[0] || "");
  const [actBarangay, setActBarangay] = useState(meta.barangay || "");
  const [names, setNames] = useState(meta.names || []);
  const [duty, setDuty] = useState(meta.duty || "");
  const [nameInput, setNameInput] = useState("");
  const nameBox = useRef(null);

  // split on comma / semicolon / new line, drop blanks and duplicates (case-insensitive)
  const addNames = (list, text) => {
    const out = [...list];
    text.split(/[,;\n]/).map((t) => t.trim()).filter(Boolean).forEach((t) => {
      if (!out.some((n) => n.toLowerCase() === t.toLowerCase())) out.push(t);
    });
    return out;
  };
  const commitName = () => { if (nameInput.trim()) { setNames((n) => addNames(n, nameInput)); setNameInput(""); } };
  const typeOptions = event?.venue && !MEDIC_TYPES.some((t) => t.name === event.venue) ? [{ name: event.venue }, ...MEDIC_TYPES] : MEDIC_TYPES;
  const [color,   setColor]   = useState(event?.color   || "#6161ff");
  const [date,    setDate]    = useState(event?.date    || defaultDate || "");
  const [details, setDetails] = useState(parsed[1] || "");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const isEdit = !!event?.id;

  async function handleSave() {
    if (!date) { setError("Date is required."); return; }
    if (activityRequired && !venue.trim()) { setError("Activity Name is required."); return; }
    const allNames = addNames(names, nameInput);
    if (isMedic && !venue) { setError("Please choose a type."); return; }
    if (isMedic && allNames.length === 0) { setError("Add at least one name."); return; }
    setSaving(true); setError("");
    const finalDetails = isActivity
      ? buildDetails({ venue: venueLocation, barangay: actBarangay, names: isMedic ? allNames : [], duty: isMedic ? duty : "", text: details })
      : programId === "nip" ? buildDetails({ venue: venueLocation, text: details }) : details;
    try {
      // Only boards with a color picker store a color; the others derive it (barangay / type) when displayed.
      await onSave({ id: event?.id, team, venue, color: programType === "activity" ? color : "", date, details: finalDetails });
      onClose();
    } catch (e) {
      setError(e.message || "Save failed.");
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!confirm("Delete this schedule?")) return;
    setSaving(true);
    try { await onDelete(event.id); onClose(); }
    catch (e) { setError(e.message || "Delete failed."); }
    finally { setSaving(false); }
  }

  return (
    <div
      className="overlay"
      onMouseDown={(e) => { pressedOnBackdrop.current = e.target === e.currentTarget; releasedOnBackdrop.current = false; }}
      onMouseUp={(e) => { releasedOnBackdrop.current = e.target === e.currentTarget; }}
      onClick={() => { const ok = pressedOnBackdrop.current && releasedOnBackdrop.current; pressedOnBackdrop.current = false; releasedOnBackdrop.current = false; if (ok) onClose(); }}
    >
      <div className="box" ref={boxRef} role="dialog" aria-modal="true" aria-label={event ? "Edit schedule" : "Add schedule"} onKeyDown={trapTab} onClick={(e) => e.stopPropagation()}>
        <div className="header">
          <h2>{isEdit ? "Edit Schedule" : "Add Schedule"}</h2>
          <button className="close-btn" aria-label="Close" onClick={onClose}><CloseIcon size={16} /></button>
        </div>

        <div className="field">
          <label>Title</label>
          <div className="fixed-title">{eventTitle}</div>
        </div>

        {isMedic ? (
          <>
            <div className="field">
              <label>Type *</label>
              <select value={venue} onChange={(e) => setVenue(e.target.value)}>
                <option value="">Select type…</option>
                {typeOptions.map((t) => (<option key={t.name} value={t.name}>{t.name}</option>))}
              </select>
              {venue && <div className="color-bar" style={{ background: (MEDIC_TYPES.find((t) => t.name === venue) || {}).color || "#8892b0" }} />}
            </div>
            <div className="field">
              <label>Duty Assignment (optional)</label>
              <input type="text" list="medic-duty-list" value={duty} onChange={(e) => setDuty(e.target.value)} placeholder="e.g. Typhoon Uwan, Basketball game, Disaster Response" />
              <datalist id="medic-duty-list">
                {dutySuggestions.map((d) => (<option key={d} value={d} />))}
              </datalist>
            </div>
            <div className="field">
              <label>Names *</label>
              <div className="names-box" onClick={() => nameBox.current && nameBox.current.focus()}>
                {names.map((n, i) => (
                  <span className="name-chip" key={n + i}>
                    {n}
                    <button type="button" aria-label={`Remove ${n}`} onClick={(e) => { e.stopPropagation(); setNames(names.filter((_, k) => k !== i)); }}>×</button>
                  </span>
                ))}
                <input
                  ref={nameBox}
                  type="text"
                  list="medic-name-list"
                  value={nameInput}
                  placeholder={names.length ? "Add another name…" : "Type a name, then press Enter"}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/[,;\n]/.test(v)) { setNames((n) => addNames(n, v)); setNameInput(""); } else setNameInput(v);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); commitName(); }
                    else if (e.key === "Backspace" && !nameInput && names.length) setNames(names.slice(0, -1));
                  }}
                  onBlur={commitName}
                />
              </div>
              <datalist id="medic-name-list">
                {nameSuggestions.filter((n) => !names.some((x) => x.toLowerCase() === n.toLowerCase())).map((n) => (<option key={n} value={n} />))}
              </datalist>
              <div className="hint">Press Enter or comma after each name. Add as many as you need.</div>
            </div>
          </>
        ) : (
        <div className="field">
          <label>Activity Name{activityRequired ? " *" : " (optional)"}</label>
          <input type="text" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder={activityRequired ? "Required — this displays on the calendar" : "Displayed on calendar — leave blank to show barangay"} />
        </div>
        )}

        {isActivity ? (
          <>
            <div className="field">
              <label>Location</label>
              <input type="text" value={venueLocation} onChange={(e) => setVenueLocation(e.target.value)} placeholder="e.g. Zone 7, RHU Main Office, Barangay Hall" />
            </div>
            <div className="field">
              <label>Barangay (optional)</label>
              <select value={actBarangay} onChange={(e) => setActBarangay(e.target.value)}>
                <option value="">— None —</option>
                {barangays.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
              </select>
            </div>
            {!isMedic && <div className="field">
              <label>Color</label>
              <div className="color-picker-row">
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="color-picker" />
                <span className="color-hex">{color}</span>
              </div>
            </div>}
          </>
        ) : (
          <>
            <div className="field">
              <label>Barangay</label>
              <select value={team} onChange={(e) => setTeam(e.target.value)}>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <div className="color-bar" style={{ background: getTeamColor(team) }} />
            </div>
            {programId === "nip" && (
              <div className="field">
                <label>Venue (optional)</label>
                <input type="text" value={venueLocation} onChange={(e) => setVenueLocation(e.target.value)} placeholder="e.g. RHU Main Office, Barangay Hall" />
              </div>
            )}
          </>
        )}

        <div className="field">
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className="field">
          <label>Details (optional)</label>
          <textarea rows={3} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="e.g. Routine Immunization, Pre Natal…" />
        </div>

        {error && <div className="error-msg">{error}</div>}

        <div className="actions">
          {isEdit && <button className="btn-danger" onClick={handleDelete} disabled={saving}>Delete</button>}
          <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
          <button className="btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
        </div>
      </div>

      <style jsx>{`
        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .box {
          background: ${dk ? "#1e2235" : "#ffffff"};
          border-radius: 12px; padding: 28px; width: 440px; max-width: 95vw; max-height: 92vh; overflow-y: auto;
          border: 1px solid ${dk ? "#2d3354" : "#e2e8f0"};
          box-shadow: 0 8px 32px rgba(0,0,0,${dk ? "0.5" : "0.12"});
        }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .header h2 { margin: 0; font-size: 1.15rem; color: ${dk ? "#e2e8f0" : "#1a202c"}; }
        .close-btn { background: none; border: none; color: ${dk ? "#8892b0" : "#a0aec0"}; cursor: pointer; padding: 4px; display: flex; align-items: center; }
        .close-btn:hover { color: ${dk ? "#e2e8f0" : "#1a202c"}; }
        .field { margin-bottom: 16px; }
        .field label { display: block; font-size: 0.74rem; color: ${dk ? "#8892b0" : "#718096"}; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; font-weight: 600; }
        .fixed-title { background: ${dk ? "#131929" : "#f0f4f8"}; border: 1px solid ${dk ? "#2d3354" : "#e2e8f0"}; border-radius: 6px; padding: 8px 12px; color: #6161ff; font-weight: 600; font-size: 0.95rem; }
        select, input[type="date"], input[type="text"], textarea {
          width: 100%; background: ${dk ? "#131929" : "#f7fafc"};
          border: 1px solid ${dk ? "#2d3354" : "#d1d9e6"};
          border-radius: 6px; color: ${dk ? "#e2e8f0" : "#1a202c"};
          padding: 8px 12px; font-size: 0.9rem; box-sizing: border-box; outline: none;
        }
        select:focus, input:focus, textarea:focus { border-color: #6161ff; }
        input[type="text"]::placeholder { color: ${dk ? "#4a5278" : "#a0aec0"}; }
        textarea { resize: vertical; font-family: inherit; }
        .names-box { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 6px 8px; min-height: 42px; box-sizing: border-box; cursor: text;
          background: ${dk ? "#131929" : "#f7fafc"}; border: 1px solid ${dk ? "#2d3354" : "#d1d9e6"}; border-radius: 6px; }
        .names-box:focus-within { border-color: #6161ff; }
        .names-box input[type="text"] { flex: 1; min-width: 140px; width: auto; border: 0; background: transparent; padding: 4px 2px; }
        .name-chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 4px 3px 10px; border-radius: 14px; font-size: 0.85rem; font-weight: 600;
          background: ${dk ? "#2c2f5c" : "#ecebff"}; color: ${dk ? "#c9c9ff" : "#4d4de6"}; }
        .name-chip button { border: 0; background: transparent; color: inherit; cursor: pointer; font-size: 1rem; line-height: 1; width: 20px; height: 20px; border-radius: 50%; padding: 0; }
        .name-chip button:hover { background: rgba(97,97,255,0.2); }
        .hint { font-size: 0.74rem; color: ${dk ? "#8892b0" : "#a0aec0"}; margin-top: 6px; }
        .color-bar { height: 3px; border-radius: 2px; margin-top: 6px; transition: background 0.2s; }
        .error-msg { color: #e53e3e; font-size: 0.85rem; margin-bottom: 12px; padding: 8px 12px; background: rgba(229,62,62,0.08); border-radius: 6px; }
        .actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
        .btn-primary { background: #6161ff; color: #fff; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer; font-size: 0.9rem; font-weight: 600; }
        .btn-primary:hover:not(:disabled) { background: #4d4de6; }
        .btn-ghost { background: transparent; color: ${dk ? "#8892b0" : "#718096"}; border: 1px solid ${dk ? "#2d3354" : "#e2e8f0"}; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.9rem; }
        .btn-ghost:hover { color: ${dk ? "#e2e8f0" : "#1a202c"}; border-color: #6161ff; }
        .btn-danger { background: transparent; color: #e53e3e; border: 1px solid #e53e3e; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.9rem; margin-right: auto; }
        .btn-danger:hover { background: rgba(229,62,62,0.08); }
        .color-picker-row { display: flex; align-items: center; gap: 10px; }
        .color-picker { width: 40px; height: 36px; padding: 2px; border: 1px solid ${dk ? "#2d3354" : "#d1d9e6"}; border-radius: 6px; cursor: pointer; background: none; }
        .color-hex { font-size: 0.85rem; color: ${dk ? "#8892b0" : "#718096"}; font-family: monospace; }
        button:disabled { opacity: 0.5; cursor: not-allowed; }

        @media (max-width: 768px) {
          .box { padding: 20px 16px; width: 100vw; max-width: 100vw; height: 90vh; max-height: 90vh; border-radius: 16px 16px 0 0; overflow-y: auto; display: flex; flex-direction: column; margin-top: auto; }
          .overlay { align-items: flex-end; }
          .field { margin-bottom: 12px; }
          .field label { font-size: 0.7rem; }
          select, input[type="date"], input[type="text"], textarea { padding: 10px 10px; font-size: 0.85rem; }
          .actions { margin-top: auto; padding-top: 12px; gap: 8px; }
          .btn-primary, .btn-ghost, .btn-danger { padding: 10px 14px; font-size: 0.85rem; flex: 1; text-align: center; }
          .color-picker { width: 36px; height: 32px; }
        }

        @media print { .overlay { display: none !important; } }
      `}</style>
    </div>
  );
}
