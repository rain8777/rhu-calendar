import { useState } from "react";
import { getTeamColor } from "../lib/constants";
import { CloseIcon } from "./Icons";

export default function EventModal({ event, defaultDate, onSave, onDelete, onClose, theme, teams, eventTitle }) {
  const dk = theme === "dark";
  const defaultTeam = teams[0]?.id || "agao-ao";
  const [team,    setTeam]    = useState(event?.team    || defaultTeam);
  const [date,    setDate]    = useState(event?.date    || defaultDate || "");
  const [details, setDetails] = useState(event?.details || "");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const isEdit = !!event?.id;

  async function handleSave() {
    if (!date) { setError("Date is required."); return; }
    setSaving(true); setError("");
    try {
      await onSave({ id: event?.id, team, date, details });
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
    <div className="overlay" onClick={onClose}>
      <div className="box" onClick={(e) => e.stopPropagation()}>
        <div className="header">
          <h2>{isEdit ? "Edit Schedule" : "Add Schedule"}</h2>
          <button className="close-btn" onClick={onClose}><CloseIcon size={16} /></button>
        </div>

        <div className="field">
          <label>Title</label>
          <div className="fixed-title">{eventTitle}</div>
        </div>

        <div className="field">
          <label>Barangay</label>
          <select value={team} onChange={(e) => setTeam(e.target.value)}>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <div className="color-bar" style={{ background: getTeamColor(team) }} />
        </div>

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
          border-radius: 12px; padding: 28px; width: 420px; max-width: 95vw;
          border: 1px solid ${dk ? "#2d3354" : "#e2e8f0"};
          box-shadow: 0 8px 32px rgba(0,0,0,${dk ? "0.5" : "0.12"});
        }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .header h2 { margin: 0; font-size: 1.15rem; color: ${dk ? "#e2e8f0" : "#1a202c"}; }
        .close-btn { background: none; border: none; color: ${dk ? "#8892b0" : "#a0aec0"}; cursor: pointer; padding: 4px; display: flex; align-items: center; }
        .close-btn:hover { color: ${dk ? "#e2e8f0" : "#1a202c"}; }
        .field { margin-bottom: 16px; }
        .field label { display: block; font-size: 0.74rem; color: ${dk ? "#8892b0" : "#718096"}; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; font-weight: 600; }
        .fixed-title { background: ${dk ? "#131929" : "#f0f4f8"}; border: 1px solid ${dk ? "#2d3354" : "#e2e8f0"}; border-radius: 6px; padding: 8px 12px; color: #4f8ef7; font-weight: 600; font-size: 0.95rem; }
        select, input[type="date"], textarea {
          width: 100%; background: ${dk ? "#131929" : "#f7fafc"};
          border: 1px solid ${dk ? "#2d3354" : "#d1d9e6"};
          border-radius: 6px; color: ${dk ? "#e2e8f0" : "#1a202c"};
          padding: 8px 12px; font-size: 0.9rem; box-sizing: border-box; outline: none;
        }
        select:focus, input:focus, textarea:focus { border-color: #4f8ef7; }
        textarea { resize: vertical; font-family: inherit; }
        .color-bar { height: 3px; border-radius: 2px; margin-top: 6px; transition: background 0.2s; }
        .error-msg { color: #e53e3e; font-size: 0.85rem; margin-bottom: 12px; padding: 8px 12px; background: rgba(229,62,62,0.08); border-radius: 6px; }
        .actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
        .btn-primary { background: #4f8ef7; color: #fff; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer; font-size: 0.9rem; font-weight: 600; }
        .btn-primary:hover:not(:disabled) { background: #3a7de0; }
        .btn-ghost { background: transparent; color: ${dk ? "#8892b0" : "#718096"}; border: 1px solid ${dk ? "#2d3354" : "#e2e8f0"}; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.9rem; }
        .btn-ghost:hover { color: ${dk ? "#e2e8f0" : "#1a202c"}; border-color: #4f8ef7; }
        .btn-danger { background: transparent; color: #e53e3e; border: 1px solid #e53e3e; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.9rem; margin-right: auto; }
        .btn-danger:hover { background: rgba(229,62,62,0.08); }
        button:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
