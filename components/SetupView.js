export default function SetupView({ theme }) {
  const dk = theme === "dark";
  const gasUrl = process.env.NEXT_PUBLIC_GAS_URL || "(not set)";
  const connected = gasUrl !== "(not set)" && !gasUrl.includes("YOUR_SCRIPT_ID");

  return (
    <div className="wrap">
      <h2>Setup & Connection</h2>

      <div className={`status ${connected ? "ok" : "warn"}`}>
        {connected ? "✅ Connected to Google Sheets" : "⚠️ Not connected — set your environment variables"}
      </div>

      <div className="card">
        <h3>Environment Variables</h3>
        <table><tbody>
          <tr><td><code>NEXT_PUBLIC_GAS_URL</code></td><td className="val">{gasUrl}</td></tr>
          <tr><td><code>GAS_SECRET</code></td><td className="val">(server-only, hidden)</td></tr>
        </tbody></table>
      </div>

      <div className="card">
        <h3>How to connect</h3>
        <ol>
          <li>Deploy your <code>Code.gs</code> as a Google Apps Script Web App.</li>
          <li>Copy the <code>/exec</code> URL.</li>
          <li>Add it as <code>NEXT_PUBLIC_GAS_URL</code> in <code>.env.local</code> (local) or Vercel environment variables (production).</li>
          <li>Set a matching <code>GAS_SECRET</code> in both places.</li>
          <li>Redeploy / restart the dev server.</li>
        </ol>
      </div>

      <style jsx>{`
        .wrap { padding: 28px; max-width: 680px; }
        h2 { color: ${dk ? "#e2e8f0" : "#1a202c"}; margin-bottom: 20px; }
        .status { display: inline-block; padding: 8px 16px; border-radius: 8px; font-size: 0.9rem; font-weight: 600; margin-bottom: 24px; }
        .status.ok  { background: rgba(72,187,120,0.12); color: ${dk ? "#68d391" : "#276749"}; }
        .status.warn { background: rgba(246,173,85,0.12); color: ${dk ? "#f6ad55" : "#b7791f"}; }
        .card { background: ${dk ? "#131929" : "#ffffff"}; border: 1px solid ${dk ? "#2d3354" : "#e2e8f0"}; border-radius: 10px; padding: 20px 24px; margin-bottom: 20px; }
        .card h3 { color: #4f8ef7; margin: 0 0 14px; font-size: 1rem; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 8px 12px; font-size: 0.85rem; color: ${dk ? "#8892b0" : "#718096"}; vertical-align: top; }
        td.val { color: ${dk ? "#e2e8f0" : "#1a202c"}; word-break: break-all; }
        code { background: ${dk ? "#0d1117" : "#f0f4f8"}; padding: 2px 6px; border-radius: 4px; color: #4f8ef7; font-size: 0.82rem; }
        ol { color: ${dk ? "#8892b0" : "#718096"}; font-size: 0.88rem; line-height: 1.9; padding-left: 20px; margin: 0; }
      `}</style>
    </div>
  );
}
