# Snackible Meta Ads Viewer

A read-only dashboard showing Meta Ads data for the Snackible e-commerce team.
Requires Google sign-in; access is limited to the allowlist in `ALLOWED_EMAILS`.

## How it works

- **Live data** (`/`): fetches directly from the Meta Marketing API on page load
- **History** (`/campaigns`, `/adsets`, `/ads`, `/low-performers`): reads from a Google Sheet populated by the daily cron job
- **Cron** (`/api/snapshot`): runs every day at 6am IST, re-pulls the last 7 days and overwrites existing rows (Meta revises recent numbers)

## Environment variables

| Variable | Where to get it |
|---|---|
| `META_TOKEN` | Meta Business Manager → System Users → Generate Token (needs `ads_read`) |
| `META_AD_ACCOUNT_ID` | Ads Manager URL: `?act=XXXXXXXXXX` → use `act_XXXXXXXXXX` |
| `NEXTAUTH_URL` | Your production URL, e.g. `https://meta.snackible.com` |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | Google Cloud Console → OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | Same OAuth client |
| `ALLOWED_EMAILS` | Comma-separated emails, e.g. `aditi@snackible.com` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account email from JSON key file |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Private key from JSON key file (replace newlines with `\n`) |
| `GOOGLE_SHEET_ID` | Long ID from the Google Sheet URL |
| `CRON_SECRET` | `openssl rand -base64 32` |

## Google service account setup (one-time, 5 minutes)

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project (or use an existing one)
3. Enable the **Google Sheets API**
4. Go to **IAM & Admin → Service Accounts** → Create service account
5. Download the JSON key file
6. Create a new Google Sheet, share it with the service account email (Editor role)
7. Copy the sheet ID from the URL and paste into `GOOGLE_SHEET_ID`
8. From the JSON key file, copy `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
9. Copy `private_key` → `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (keep the `\n` characters)

## Running the snapshot job manually

```bash
curl -X POST https://your-domain.vercel.app/api/snapshot \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Running the backfill (one-time, pulls all Meta history)

```bash
curl -X POST "https://your-domain.vercel.app/api/backfill?months=37" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

This can take several minutes. Batches in groups of 30 days to avoid timeouts.

## What to do if the snapshot fails

1. Check Vercel function logs: `vercel logs --prod`
2. The `Log` tab in the Google Sheet shows each run's timestamp and any errors
3. If the sheet connection fails, check that the service account still has Editor access
4. If Meta API fails, check that `META_TOKEN` has not expired (System User tokens don't expire, but page tokens do)
