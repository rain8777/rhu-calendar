// PERSONNEL-TRACKER — the add/edit form for the Personnel Tracker tab (separate from EventModal on purpose).
import { useState, useRef, useEffect } from "react";
import { CloseIcon } from "./Icons";
import { PERSONNEL_TYPES, personnelType, parsePersonnel, buildPersonnelDetails, eventRange, dayDiff } from "../lib/personnel";

export default function PersonnelModal({ event, defaultDate, defaultType = "", onSave, onDelete, onClose, theme, nameSuggestions = [], positionSuggestions = [], positionByName = {} }) {
  const dk = theme === "dark";
  const boxRef = useRef(null);
  const pressedOnBackdrop = useRef(false);
  const releasedOnBackdrop = useRef(false);

  const parsed = parsePersonnel(event?.details);
  const range = event ? eventRange(event) : null;
  const [type, setType] = useState(event?.team && PERSONNEL_TYPES.some((t) => t.name === event.team) ? event.team : event ? "Other" : defaultType);
  const [name, setName] = useState(event?.venue || "");
  const [position, setPosition] = useState(parsed.position || "");
  const [mode, setMode] = useState(range && range.days > 1 ? "range" : "one");
  const [from, setFrom] = useState(event?.date || defaultDate || "");
  const [to, setTo] = useState(range && range.days > 1 ? range.end : "");
  const [details, setDetails] = useState(parsed.text || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isEdit = !!event?.id;
  const color = type ? personnelType(type).color : null;

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

  // choosing a known person fills in the position they used last time (only if it is still empty)
  const fillPosition = () => {
    const known = positionByName[name.trim().toLowerCase()];
    if (known && !position.trim()) setPosition(known);
  };

  async function handleSave() {
    if (!type) { setError("Please choose a type."); return; }
    if (!name.trim()) { setError("Name is required."); return; }
    if (!from) { setError(mode === "range" ? "The From date is required." : "Date is required."); return; }
    let end = "";
    if (mode === "range") {
      if (!to) { setError("Choose the To date, or switch to One day."); return; }
      if (to < from) { setError("The To date can't be before the From date."); return; }
      if (to > from) end = to;
    }
    // catch mistyped years (e.g. 2062) and runaway ranges before they are saved
    const yr = new Date().getFullYear(), okYear = (d) => { const y = Number(d.slice(0, 4)); return y >= yr - 10 && y <= yr + 5; };
    if (!okYear(from) || (end && !okYear(end))) { setError(`Please check the year — it should be between ${yr - 10} and ${yr + 5}.`); return; }
    if (end && dayDiff(from, end) + 1 > 366) { setError("A range can't be longer than one year. Please check the dates."); return; }
    setSaving(true); setError("");
    try {
      await onSave({ id: event?.id, team: type, venue: name.trim(), color: "", date: from, details: buildPersonnelDetails({ position, to: end, text: details }) });
      onClose();
    } catch (e) {
      setError(e.message || "Save failed.");
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!confirm("Delete this entry?")) return;
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
      <div className="box" ref={boxRef} role="dialog" aria-modal="true" aria-label={isEdit ? "Edit personnel entry" : "Add personnel entry"} onKeyDown={trapTab} onClick={(e) => e.stopPropagation()}>
        <div className="header">
          <h2>{isEdit ? "Edit Personnel Entry" : "Add Personnel Entry"}</h2>
          <button className="close-btn" aria-label="Close" onClick={onClose}><CloseIcon size={16} /></button>
        </div>

        <div className="field">
          <label>Type *</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Select type…</option>
            {PERSONNEL_TYPES.map((t) => (<option key={t.name} value={t.name}>{t.name}</option>))}
          </select>
          {color && <div className="color-bar" style={{ background: color }} />}
        </div>

        <div className="field">
          <label>Name *</label>
          <input type="text" list="personnel-name-list" value={name} onChange={(e) => setName(e.target.value)} onBlur={fillPosition} placeholder="e.g. Juan Dela Cruz" />
          <datalist id="personnel-name-list">{nameSuggestions.map((n) => (<option key={n} value={n} />))}</datalist>
        </div>

        <div className="field">
          <label>Position (optional)</label>
          <input type="text" list="personnel-position-list" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g. Nurse II, Midwife, Medical Officer" />
          <datalist id="personnel-position-list">{positionSuggestions.map((n) => (<option key={n} value={n} />))}</datalist>
        </div>

        <div className="field">
          <label>Dates *</label>
          <div className="seg" role="radiogroup" aria-label="One day or from–to">
            <button type="button" role="radio" aria-checked={mode === "one"} className={mode === "one" ? "on" : ""} onClick={() => setMode("one")}>One day</button>
            <button type="button" role="radio" aria-checked={mode === "range"} className={mode === "range" ? "on" : ""} onClick={() => { setMode("range"); if (!to || to < from) setTo(from); }}>From – To</button>
          </div>
          {mode === "one" ? (
            <input type="date" aria-label="Date" value={from} onChange={(e) => setFrom(e.target.value)} />
          ) : (
            <div className="two">
              <div><span className="sub">From</span><input type="date" aria-label="From" value={from} onChange={(e) => { setFrom(e.target.value); if (to && to < e.target.value) setTo(e.target.value); }} /></div>
              <div><span className="sub">To</span><input type="date" aria-label="To" min={from || undefined} value={to} onChange={(e) => setTo(e.target.value)} /></div>
            </div>
          )}
        </div>

        <div className="field">
          <label>Details (optional)</label>
          <textarea rows={3} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="e.g. Reason, destination, contact number…" />
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
        .field > label { display: block; font-size: 0.74rem; color: ${dk ? "#8892b0" : "#718096"}; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; font-weight: 600; }
        select, input[type="date"], input[type="text"], textarea {
          width: 100%; background: ${dk ? "#131929" : "#f7fafc"};
          border: 1px solid ${dk ? "#2d3354" : "#d1d9e6"};
          border-radius: 6px; color: ${dk ? "#e2e8f0" : "#1a202c"};
          padding: 8px 12px; font-size: 0.9rem; box-sizing: border-box; outline: none;
        }
        select:focus, input:focus, textarea:focus { border-color: #6161ff; }
        input[type="text"]::placeholder { color: ${dk ? "#4a5278" : "#a0aec0"}; }
        textarea { resize: vertical; font-family: inherit; }
        .color-bar { height: 4px; border-radius: 2px; margin-top: 6px; transition: background 0.2s; }
        .seg { display: inline-flex; padding: 3px; gap: 3px; border-radius: 8px; margin-bottom: 10px; background: ${dk ? "#131929" : "#eef1f6"}; }
        .seg button { border: 0; background: transparent; padding: 6px 14px; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; color: ${dk ? "#8892b0" : "#718096"}; }
        .seg button.on { background: #6161ff; color: #fff; }
        .two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .sub { display: block; font-size: 0.72rem; color: ${dk ? "#8892b0" : "#718096"}; margin-bottom: 4px; font-weight: 600; }
        .error-msg { color: #e53e3e; font-size: 0.85rem; margin-bottom: 12px; padding: 8px 12px; background: rgba(229,62,62,0.08); border-radius: 6px; }
        .actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
        .btn-primary { background: #6161ff; color: #fff; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer; font-size: 0.9rem; font-weight: 600; }
        .btn-primary:hover:not(:disabled) { background: #4d4de6; }
        .btn-ghost { background: transparent; color: ${dk ? "#8892b0" : "#718096"}; border: 1px solid ${dk ? "#2d3354" : "#e2e8f0"}; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.95rem; }
        .btn-ghost:hover { color: ${dk ? "#e2e8f0" : "#1a202c"}; border-color: #6161ff; }
        .btn-danger { background: transparent; color: #e53e3e; border: 1px solid #e53e3e; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.9rem; margin-right: auto; }
        .btn-danger:hover { background: rgba(229,62,62,0.08); }
        button:disabled { opacity: 0.5; cursor: not-allowed; }

        @media (max-width: 768px) {
          .box { padding: 20px 16px; width: 100vw; max-width: 100vw; height: 90vh; max-height: 90vh; border-radius: 16px 16px 0 0; overflow-y: auto; display: flex; flex-direction: column; }
          .overlay { align-items: flex-end; }
          .field { margin-bottom: 12px; }
          select, input[type="date"], input[type="text"], textarea { padding: 10px 10px; font-size: 0.85rem; }
          .actions { margin-top: auto; padding-top: 12px; gap: 8px; }
          .btn-primary, .btn-ghost, .btn-danger { padding: 10px 14px; font-size: 0.85rem; flex: 1; text-align: center; }
        }
        @media print { .overlay { display: none !important; } }
      `}</style>
    </div>
  );
}
