const LABELS = { noted: "Noted by", prepared: "Prepared by", approved: "Approved by" };

export default function SignaturePrint({ config = [] }) {
  if (!config || config.length === 0) return null;

  return (
    <div className="sig-print">
      {[0, 1, 2].map((i) => {
        const c = config[i];
        return c ? (
          <div key={c.type} className="sig-block">
            <div className="sig-line" />
            <div className="sig-label">{LABELS[c.type] || c.type}</div>
            <div className="sig-name">{c.name}</div>
            <div className="sig-position">{c.position}</div>
          </div>
        ) : (
          <div key={`empty-${i}`} className="sig-block" />
        );
      })}

      <style jsx>{`
        .sig-print { display: none; }

        @media print {
          .sig-print {
            display: flex; justify-content: space-between; gap: 48px; align-items: flex-start;
            padding: 4px 24px 0; page-break-inside: avoid;
          }
          .sig-block { flex: 1; text-align: center; }
          .sig-line { border-top: 1.5px solid #1a202c; margin-bottom: 8px; }
          .sig-label { font-size: 0.8rem; font-weight: 700; color: #1a202c; }
          .sig-name { font-size: 0.82rem; font-weight: 600; color: #1a202c; margin-top: 3px; }
          .sig-position { font-size: 0.72rem; color: #4a5568; margin-top: 1px; }
        }
      `}</style>
    </div>
  );
}