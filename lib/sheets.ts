import { google } from 'googleapis'
import type { MetaRow, SummaryRow } from './meta'

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!
  const key   = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n')
  const jwt = new google.auth.JWT()
  jwt.email  = email
  jwt.key    = key
  jwt.scopes = ['https://www.googleapis.com/auth/spreadsheets']
  return jwt
}

const SHEET_ID = () => process.env.GOOGLE_SHEET_ID!

const TABS = {
  Summary:      ['date', 'window', 'spend', 'orders', 'cpc', 'roas'],
  Campaigns:    ['date', 'name', 'spend', 'clicks', 'cpc', 'orders', 'roas', 'cpr', 'signal'],
  Adsets:       ['date', 'name', 'campaign', 'spend', 'clicks', 'cpc', 'orders', 'roas', 'cpr', 'signal'],
  Ads:          ['date', 'name', 'campaign', 'spend', 'clicks', 'cpc', 'orders', 'roas', 'cpr', 'signal'],
  LowPerformers:['date', 'name', 'campaign', 'type', 'spend', 'clicks', 'cpc', 'orders', 'roas', 'cpr', 'signal'],
  Log:          ['timestamp_ist', 'date_range', 'rows_written', 'errors'],
} as const

type TabName = keyof typeof TABS

async function ensureTabs(sheets: any) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID() })
  const existing = new Set(meta.data.sheets.map((s: any) => s.properties.title))
  const requests: any[] = []
  for (const tab of Object.keys(TABS) as TabName[]) {
    if (!existing.has(tab)) {
      requests.push({ addSheet: { properties: { title: tab } } })
    }
  }
  if (requests.length) {
    await sheets.spreadsheets.batchUpdate({ spreadsheetId: SHEET_ID(), requestBody: { requests } })
  }
  // Write headers
  for (const [tab, cols] of Object.entries(TABS) as [TabName, readonly string[]][]) {
    const note = tab === 'Log' ? '' : ' (INR, IST dates)'
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID(),
      range: `${tab}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [[...cols, note ? `# ${tab}${note}` : '']] },
    })
  }
}

async function readTab(sheets: any, tab: TabName): Promise<any[][]> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID(),
    range: `${tab}!A2:Z`,
  })
  return res.data.values || []
}

async function writeTab(sheets: any, tab: TabName, rows: any[][]) {
  // Clear existing data (keep header at row 1)
  await sheets.spreadsheets.values.clear({ spreadsheetId: SHEET_ID(), range: `${tab}!A2:Z` })
  if (rows.length === 0) return
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID(),
    range: `${tab}!A2`,
    valueInputOption: 'RAW',
    requestBody: { values: rows },
  })
}

function summaryToRow(r: SummaryRow): any[] {
  return [r.date, r.window, r.spend.toFixed(2), r.orders, r.cpc.toFixed(2), r.roas.toFixed(4)]
}

function metaToRow(r: MetaRow, includeType?: string): any[] {
  if (includeType) {
    return [r.date, r.name, r.campaign, includeType, r.spend.toFixed(2), r.clicks, r.cpc.toFixed(2), r.orders, r.roas.toFixed(4), r.cpr, r.signal]
  }
  if (r.level === 'campaign') {
    return [r.date, r.name, r.spend.toFixed(2), r.clicks, r.cpc.toFixed(2), r.orders, r.roas.toFixed(4), r.cpr, r.signal]
  }
  return [r.date, r.name, r.campaign, r.spend.toFixed(2), r.clicks, r.cpc.toFixed(2), r.orders, r.roas.toFixed(4), r.cpr, r.signal]
}

export async function upsertSnapshot(
  dates: string[],
  data: { campaigns: MetaRow[]; adsets: MetaRow[]; ads: MetaRow[]; summary: SummaryRow }[]
) {
  const auth   = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  await ensureTabs(sheets)

  const dateSet = new Set(dates)

  // Helper: remove rows for these dates then add new
  async function upsertRows(tab: TabName, newRows: any[][]) {
    const existing = await readTab(sheets, tab)
    const kept = existing.filter(row => !dateSet.has(String(row[0])))
    await writeTab(sheets, tab, [...kept, ...newRows])
  }

  const newSummary    = data.flatMap(d => [summaryToRow(d.summary)])
  const newCampaigns  = data.flatMap(d => d.campaigns.map(r => metaToRow(r)))
  const newAdsets     = data.flatMap(d => d.adsets.map(r => metaToRow(r)))
  const newAds        = data.flatMap(d => d.ads.map(r => metaToRow(r)))
  const roas_warn = 2.5, high_spend = 5000
  const newLow = data.flatMap(d => [
    ...d.campaigns.filter(r => r.spend >= high_spend && r.roas < roas_warn).map(r => metaToRow(r, 'Campaign')),
    ...d.adsets.filter(r => r.spend >= high_spend && r.roas < roas_warn).map(r => metaToRow(r, 'Ad Set')),
  ])

  await Promise.all([
    upsertRows('Summary',       newSummary),
    upsertRows('Campaigns',     newCampaigns),
    upsertRows('Adsets',        newAdsets),
    upsertRows('Ads',           newAds),
    upsertRows('LowPerformers', newLow),
  ])

  // Log
  const istNow = new Date(Date.now() + 5.5 * 3600000).toISOString().replace('T', ' ').slice(0, 19) + ' IST'
  const logRows = await readTab(sheets, 'Log')
  await writeTab(sheets, 'Log', [
    ...logRows,
    [istNow, dates.join(', '), newCampaigns.length + newAdsets.length + newAds.length, ''],
  ])
}

export async function readHistory(tab: 'Campaigns' | 'Adsets' | 'Ads' | 'LowPerformers' | 'Summary') {
  const auth   = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  const cols   = TABS[tab]
  const rows   = await readTab(sheets, tab as TabName)
  return rows.map(row => {
    const obj: any = {}
    cols.forEach((col, i) => { obj[col] = row[i] ?? '' })
    return obj
  })
}
