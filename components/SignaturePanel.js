import { useState, useEffect, useRef } from "react";
import { PenIcon } from "./Icons";

const OPTIONS = [
  { key: "noted", label: "Noted by" },
  { key: "prepared", label: "Prepared by" },
  { key: "approved", label: "Approved by" },
];
const SLOTS = ["Left", "Center", "Right"];

export default function SignaturePanel({ config = [], onChange, theme }) {
  const dk = theme === "dark";
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function isChecked(key) { return config.some((c) => c.type === key); }
  function slotOf(key) {
    const idx = config.findIndex((c) => c.type === key);
    return idx > -1 ? SLOTS[idx] : "";
  }
  function toggle(key, checked) {
    if (checked) {
      onChange([...config, { type: key, name: "", position: "" }]);
    } else {
      onChange(config.filter((c) => c.type !== key));
    }
  }
  function update(key, field, value) {
    onChange(config.map((c) => (c.type === key ? { ...c, [field]: value } : c)));
  }

  return (
    <div className={`sig-wrap${open ? " open" : ""}`} ref={wrapRef}>
      <button className="btn-sig" type="button" onClick={() => setOpen((o) => !o)}>
        <PenIcon size={13} /> Signature
      </button>
      {open && (
        <div className="sig-pop">
          <div className="sig-pop-title">Signature block</div>
          {OPTIONS.map((o) => {
            const checked = isChecked(o.key);
            const slot = slotOf(o.key);
            const cur = config.find((c) => c.type === o.key) || { name: "", position: "" };
            return (
              <div className={`sig-row${checked ? " on" : ""}`} key={o.key}>
                <label className="sig-check">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => toggle(o.key, e.target.checked)}
                  />
                  <span className="sig-check-label">{o.label}</span>
                  {slot && <em className="sig-slot">{slot}</em>}
                </label>
                {checked && (
                  <div className="sig-fields">
                    <input
                      className="sig-input"
                      placeholder="Name"
                      value={cur.name}
                      onChange={(e) => update(o.key, "name", e.target.value)}
                    />
                    <input
                      className="sig-input"
                      placeholder="Position"
                      value={cur.position}
                      onChange={(e) => update(o.key, "position", e.target.value)}
                    />
                  </div>
                )}
              </div>
            );
          })}
          <div className="sig-hint">Order of ticking sets placement — 1st: Left, 2nd: Center, 3rd: Right.</div>
        </div>
      )}

      <style jsx>{`
        .sig-wrap { position: relative; display: inline-flex; }

        .btn-sig {
          display: flex; align-items: center; gap: 4px;
          background: transparent; border: 1px solid ${dk ? "#2d3354" : "#d1d9e6"};
          color: ${dk ? "#8892b0" : "#718096"};
          padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.78rem; white-space: nowrap;
        }
        .btn-sig:hover { border-color: #4f8ef7; color: #4f8ef7; }

        .sig-pop {
          position: absolute; top: calc(100% + 6px); right: 0; z-index: 60;
          width: 300px; max-width: min(320px, calc(100vw - 24px));
          background: ${dk ? "#131929" : "#ffffff"};
          border: 1px solid ${dk ? "#2d3354" : "#e2e8f0"};
          border-radius: 10px; padding: 12px 14px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.18);
        }

        .sig-pop-title {
          font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.08em;
          color: #4f8ef7; font-weight: 700; margin-bottom: 8px;
        }

        .sig-row { padding: 6px 0; border-bottom: 1px solid ${dk ? "#2d3354" : "#f0f4f8"}; }
        .sig-row:last-of-type { border-bottom: none; }

        .sig-check { display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.85rem; color: ${dk ? "#e2e8f0" : "#1a202c"}; }
        .sig-check input { accent-color: #4f8ef7; cursor: pointer; }
        .sig-check-label { font-weight: 500; }

        .sig-slot {
          font-style: normal; font-size: 0.68rem; font-weight: 700; color: #4f8ef7; margin-left: auto;
          background: rgba(79,142,247,0.1); border: 1px solid rgba(79,142,247,0.3);
          border-radius: 4px; padding: 1px 6px;
        }

        .sig-fields { display: flex; gap: 6px; margin-top: 8px; }
        .sig-input {
          flex: 1; min-width: 0;
          background: ${dk ? "#0d1117" : "#f7fafc"};
          border: 1px solid ${dk ? "#2d3354" : "#d1d9e6"};
          color: ${dk ? "#e2e8f0" : "#1a202c"};
          border-radius: 6px; padding: 6px 8px; font-size: 0.8rem; outline: none;
        }
        .sig-input:focus { border-color: #4f8ef7; }
        .sig-input::placeholder { color: ${dk ? "#4a5568" : "#a0aec0"}; }

        .sig-hint { font-size: 0.7rem; color: ${dk ? "#8892b0" : "#a0aec0"}; margin-top: 8px; line-height: 1.4; }
      `}</style>
    </div>
  );
}