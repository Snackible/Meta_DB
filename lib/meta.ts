const TOKEN   = process.env.META_TOKEN!
const ACCOUNT = process.env.META_AD_ACCOUNT_ID!
const BASE    = `https://graph.facebook.com/v21.0/${ACCOUNT}/insights`

function getOrders(actions: any[]): number {
  return parseInt(actions?.find(a => a.action_type === 'omni_purchase')?.value || '0')
}
function getRoas(list: any[]): number {
  return parseFloat(list?.find(r => r.action_type === 'omni_purchase')?.value || '0')
}

const ROAS_SCALE = 3.5, ROAS_GOOD = 3.0, ROAS_WARN = 2.5, HIGH_SPEND = 5000, CPC_ALERT = 12
function getSignal(spend: number, roas: number, cpc: number): string {
  const s = roas >= ROAS_SCALE ? 'Scale'
    : roas >= ROAS_GOOD  ? 'Good'
    : roas >= ROAS_WARN  ? 'Monitor'
    : spend >= HIGH_SPEND ? 'Reduce' : 'Low'
  return s + (cpc > CPC_ALERT ? ' | High CPC' : '')
}

export interface MetaRow {
  date: string
  level: 'campaign' | 'adset' | 'ad'
  name: string
  campaign: string
  spend: number
  clicks: number
  cpc: number
  orders: number
  roas: number
  cpr: number
  signal: string
}

export interface SummaryRow {
  date: string
  window: 'yesterday' | '7day'
  spend: number
  orders: number
  cpc: number
  roas: number
}

async function fetchLevel(
  level: 'campaign' | 'adset' | 'ad',
  since: string,
  until: string,
): Promise<MetaRow[]> {
  const nameField = level === 'campaign' ? 'campaign_name'
    : level === 'adset' ? 'adset_name,campaign_name' : 'ad_name,campaign_name'
  const statusField = level === 'campaign' ? 'campaign.effective_status'
    : level === 'adset' ? 'adset.effective_status' : 'ad.effective_status'

  const filters: any[] = [
    { field: statusField, operator: 'IN', value: ['ACTIVE', 'PAUSED'] },
    { field: 'objective', operator: 'IN', value: ['OUTCOME_SALES', 'CONVERSIONS'] },
  ]
  if (level === 'adset') filters.push({ field: 'campaign.effective_status', operator: 'IN', value: ['ACTIVE', 'PAUSED'] })
  if (level === 'ad') {
    filters.push({ field: 'adset.effective_status', operator: 'IN', value: ['ACTIVE', 'PAUSED'] })
    filters.push({ field: 'campaign.effective_status', operator: 'IN', value: ['ACTIVE', 'PAUSED'] })
  }

  const params = new URLSearchParams({
    access_token: TOKEN,
    time_range: JSON.stringify({ since, until }),
    fields: `spend,clicks,cpc,purchase_roas,actions,${nameField}`,
    level,
    limit: '500',
    filtering: JSON.stringify(filters),
  })

  const res  = await fetch(`${BASE}?${params}`, { signal: AbortSignal.timeout(30000) })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)

  return (data.data || []).map((row: any) => {
    const spend  = parseFloat(row.spend  || '0')
    const clicks = parseInt(row.clicks   || '0')
    const cpc    = parseFloat(row.cpc    || '0')
    const orders = getOrders(row.actions || [])
    const roas   = getRoas(row.purchase_roas || [])
    return {
      date:     since === until ? since : `${since}/${until}`,
      level,
      name:     row[level === 'campaign' ? 'campaign_name' : level === 'adset' ? 'adset_name' : 'ad_name'] || '',
      campaign: row.campaign_name || '',
      spend, clicks, cpc, orders,
      roas,
      cpr: orders ? Math.round(spend / orders) : 0,
      signal: getSignal(spend, roas, cpc),
    }
  }).filter((r: MetaRow) => r.spend > 0)
}

export async function fetchDay(date: string) {
  const [campaigns, adsets, ads] = await Promise.all([
    fetchLevel('campaign', date, date),
    fetchLevel('adset',    date, date),
    fetchLevel('ad',       date, date),
  ])
  const spend  = campaigns.reduce((s, r) => s + r.spend,  0)
  const orders = campaigns.reduce((s, r) => s + r.orders, 0)
  const clicks = campaigns.reduce((s, r) => s + r.clicks, 0)
  const rev    = campaigns.reduce((s, r) => s + r.roas * r.spend, 0)
  const summary: SummaryRow = {
    date,
    window: 'yesterday',
    spend,
    orders,
    cpc:  clicks ? spend / clicks : 0,
    roas: spend  ? rev   / spend  : 0,
  }
  return { campaigns, adsets, ads, summary }
}

export async function fetchRange(since: string, until: string) {
  const [campaigns, adsets, ads] = await Promise.all([
    fetchLevel('campaign', since, until),
    fetchLevel('adset',    since, until),
    fetchLevel('ad',       since, until),
  ])
  const spend  = campaigns.reduce((s, r) => s + r.spend,  0)
  const orders = campaigns.reduce((s, r) => s + r.orders, 0)
  const clicks = campaigns.reduce((s, r) => s + r.clicks, 0)
  const rev    = campaigns.reduce((s, r) => s + r.roas * r.spend, 0)
  const summary: SummaryRow = {
    date: `${since}/${until}`,
    window: '7day',
    spend,
    orders,
    cpc:  clicks ? spend / clicks : 0,
    roas: spend  ? rev   / spend  : 0,
  }
  return { campaigns, adsets, ads, summary }
}

export function fmt(d: Date) { return d.toISOString().split('T')[0] }
export function daysAgo(n: number, base = new Date()) {
  const d = new Date(base); d.setDate(d.getDate() - n); return fmt(d)
}

/** Pulls per-day rows directly from the Meta API for the last `days` days (no Sheets dependency). */
export async function fetchLastNDays(days: number, concurrency = 3) {
  const dates = Array.from({ length: days }, (_, i) => daysAgo(days - i))
  const perDay: Awaited<ReturnType<typeof fetchDay>>[] = []
  for (let i = 0; i < dates.length; i += concurrency) {
    const batch = await Promise.all(dates.slice(i, i + concurrency).map(fetchDay))
    perDay.push(...batch)
  }
  return {
    campaigns: perDay.flatMap(d => d.campaigns),
    adsets:    perDay.flatMap(d => d.adsets),
    ads:       perDay.flatMap(d => d.ads),
  }
}
