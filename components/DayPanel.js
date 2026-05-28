import { getTeamColor, getTeamName } from "../lib/constants";
import { CloseIcon } from "./Icons";

export default function DayPanel({ date, events, onEdit, onAdd, onClose, theme, teams, eventTitle }) {
  const dk = theme === "dark";

  const label = date
    ? (() => {
        const [y, m, d] = date.split("-");
        return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString("en-US", {
          weekday: "long", year: "numeric", month: "long", day: "numeric",
        });
      })()
    : "";

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <div className="panel-label">Schedule</div>
          <div className="panel-date">{label}</div>
        </div>
        <button className="close-btn" onClick={onClose}><CloseIcon size={16} /></button>
      </div>

      <div className="panel-body">
        {events.length === 0 ? (
          <div className="empty">No schedules for this day.</div>
        ) : (
          events.map((ev) => {
            const cardColor = ev.color || getTeamColor(ev.team);
            return (
            <div
              key={ev.id}
              className="event-card"
              style={{ borderLeftColor: cardColor }}
              onClick={() => onEdit(ev)}
            >
              <div className="ev-title">{eventTitle}</div>
              <div className="ev-team">{ev.venue || getTeamName(ev.team, teams)}</div>
              {ev.details && <div className="ev-details">{ev.details}</div>}
            </div>
            );
          })
        )}
      </div>

      <div className="panel-footer">
        <button className="btn-add" onClick={() => onAdd(date)}>+ Add Schedule</button>
      </div>

      <style jsx>{`
        .panel { height: 100%; display: flex; flex-direction: column; background: ${dk ? "#131929" : "#ffffff"}; }
        .panel-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 20px 20px 16px; border-bottom: 1px solid ${dk ? "#2d3354" : "#e2e8f0"}; }
        .panel-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; color: #4f8ef7; margin-bottom: 4px; font-weight: 700; }
        .panel-date { font-size: 0.95rem; font-weight: 600; color: ${dk ? "#e2e8f0" : "#1a202c"}; }
        .close-btn { background: none; border: none; color: ${dk ? "#8892b0" : "#a0aec0"}; cursor: pointer; padding: 4px; display: flex; align-items: center; }
        .close-btn:hover { color: ${dk ? "#e2e8f0" : "#1a202c"}; }
        .panel-body { flex: 1; overflow-y: auto; padding: 16px 20px; }
        .empty { color: ${dk ? "#8892b0" : "#a0aec0"}; font-size: 0.9rem; text-align: center; padding: 40px 0; }
        .event-card {
          background: ${dk ? "#0d1117" : "#f7f9fc"};
          border: 1px solid ${dk ? "#2d3354" : "#e8edf5"};
          border-left: 4px solid #4f8ef7;
          border-radius: 8px; padding: 12px 14px; margin-bottom: 10px;
          cursor: pointer; transition: background 0.15s;
        }
        .event-card:hover { background: ${dk ? "#1a2040" : "#edf2f7"}; }
        .ev-title { font-weight: 600; color: #4f8ef7; font-size: 0.88rem; margin-bottom: 4px; }
        .ev-team { color: ${dk ? "#e2e8f0" : "#2d3748"}; font-size: 0.875rem; font-weight: 500; }
        .ev-details { color: ${dk ? "#8892b0" : "#718096"}; font-size: 0.8rem; margin-top: 5px; }
        .panel-footer { padding: 12px 20px; border-top: 1px solid ${dk ? "#2d3354" : "#e2e8f0"}; }
        .btn-add { width: 100%; background: #4f8ef7; color: #fff; border: none; padding: 10px; border-radius: 8px; cursor: pointer; font-size: 0.9rem; font-weight: 600; }
        .btn-add:hover { background: #3a7de0; }

        @media (max-width: 768px) {
          .panel-header { padding: 16px 16px 12px; }
          .panel-body { padding: 12px 16px; }
        }

        @media print { .panel { display: none !important; } }
      `}</style>
    </div>
  );
}
