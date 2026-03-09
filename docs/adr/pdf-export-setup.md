# PDF Export — React-PDF + Puppeteer Setup

> **Strategy:** React-PDF (primary, client-side) → Puppeteer API (fallback, server-side) → HTML print (last resort)

---

## Dependencies

| Package | Consumer | Purpose |
|---------|----------|---------|
| **@react-pdf/renderer** | `@afenda/web` | Primary PDF generation (client-side) |
| **puppeteer** | `@afenda/api` | Fallback server-side PDF (optional) |

---

## Flow

1. **React-PDF** — Client generates PDF blob, triggers download. No server round-trip.
2. **Puppeteer** — If React-PDF throws (e.g. large doc, browser limit), client calls `POST /v1/export/pdf` with JSON body; API returns PDF.
3. **HTML print** — If Puppeteer unavailable (503) or API unreachable, opens new window with HTML table and triggers print.

---

## API Route

**POST /v1/export/pdf**

- **Body:** `{ title, columns: [{ label }], rows: [[...]] }`
- **Response:** `application/pdf` blob or `503` if Puppeteer not installed

Puppeteer is in `optionalDependencies` — install may skip if build scripts are blocked. To enable:

```bash
pnpm approve-builds  # or add puppeteer to allowed scripts
pnpm install
```

---

## Puppeteer Fallback

When enabled, Puppeteer launches headless Chrome and renders HTML to PDF. Requires:

- `--no-sandbox` for containerized environments
- ~300MB Chrome binary (downloaded on first use)

---

## Configuration

- **NEXT_PUBLIC_API_URL** — API base URL for Puppeteer fallback (default: `http://localhost:3001`)
