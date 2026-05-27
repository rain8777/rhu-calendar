# 📅 Ragay PK Team Calendar — GitHub & Vercel Deployment

This is the **Next.js web app** for the Ragay Purok Kalusugan Team Calendar.
It connects to your Google Apps Script Web App as its backend database.

## Project Structure

```
├── pages/
│   ├── index.js          ← Main calendar page
│   ├── _app.js           ← Global styles wrapper
│   └── api/
│       └── events.js     ← Server proxy to GAS (keeps secret safe)
├── components/
│   ├── EventModal.js     ← Add / edit schedule form
│   ├── DayPanel.js       ← Right panel: schedules for a day
│   ├── SheetView.js      ← List view of all schedules
│   └── SetupView.js      ← Setup / connection info tab
├── lib/
│   ├── constants.js      ← Purok names, colors, helpers
│   └── gasApi.js         ← GAS client helpers
├── styles/
│   └── globals.css
├── Code.gs               ← Google Apps Script backend (paste into GAS editor)
├── .env.example
├── next.config.js
└── package.json
```

## Sheet Columns (auto-created by Code.gs)

| A  | B    | C     | D    | E       |
|----|------|-------|------|---------|
| id | Date | Title | Team | Details |

- **Title** is always `Purok Kalusugan` (set by the script)
- **Team** uses slugs: `agao-ao`, `agrupacion`, `san-rafael`, `banga-caves`, `cabugao`, `cabadisan`, `binahan-proper`, `poblacion-iraya`, `buenasuerte`, `inandawa`, `lower-omon`, `lower-santa-cruz`, `patalunan`, `panaytayan-nuevo`
- **Date** format: `YYYY-MM-DD`

## Deploy Steps

### 1 — Google Apps Script (backend)
1. Create a Google Sheet
2. Click **Extensions → Apps Script**
3. Paste the contents of `Code.gs`
4. Set `SHEET_ID` and `SECRET` at the top
5. **Deploy → New Deployment → Web App** (Execute as: Me, Who has access: Anyone)
6. Copy the `/exec` URL

### 2 — Vercel (frontend)
1. Push this folder to GitHub
2. Import repo on [vercel.com](https://vercel.com)
3. Add environment variables:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_GAS_URL` | Your GAS `/exec` URL |
| `GAS_SECRET` | Same string as in `Code.gs` |

4. Deploy ✅

### 3 — Local Dev
```bash
npm install
cp .env.example .env.local
# Edit .env.local with your GAS URL and secret
npm run dev
```
