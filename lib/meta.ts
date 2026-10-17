const TOKEN   = process.env.META_TOKEN!
const ACCOUNT = process.env.META_AD_ACCOUNT_ID!
const BASE    = `https://graph.facebook.com/v21.0/${ACCOUNT}/insights`

function actionValue(actions: any[], types: string[]): number {
  if (!actions) return 0
  for (const t of types) {
    const hit = actions.find(a => a.action_type === t)
    if (hit) return parseFloat(hit.value) || 0
  }
  return 0
}
function getOrders(actions: any[]): number {
  return actionValue(actions, ['omni_purchase'])
}
function getRoas(list: any[]): number {
  return actionValue(list, ['omni_purchase'])
}
function getLeads(actions: any[]): number {
  return actionValue(actions, ['onsite_conversion.lead_grouped', 'lead'])
}
function getConversations(actions: any[]): number {
  return actionValue(actions, [
    'onsite_conversion.messaging_conversation_started_7d',
    'onsite_conversion.total_messaging_connection',
  ])
}
function getLandingPageViews(actions: any[]): number {
  return actionValue(actions, ['omni_landing_page_view', 'landing_page_view'])
}

export type Goal = 'Sales' | 'Leads' | 'Messaging' | 'Traffic' | 'Other'

const SALES_OBJECTIVES    = ['OUTCOME_SALES', 'CONVERSIONS', 'PRODUCT_CATALOG_SALES']
const LEADS_OBJECTIVES    = ['OUTCOME_LEADS', 'LEAD_GENERATION']
const MESSAGE_OBJECTIVES  = ['MESSAGES', 'OUTCOME_ENGAGEMENT']
const TRAFFIC_OBJECTIVES  = ['OUTCOME_TRAFFIC', 'LINK_CLICKS']

/** Judges each entity by its own goal (sales/leads/WhatsApp/traffic) rather than one global ROAS rule. */
export function classifyGoal(objective: string, channel: 'WhatsApp' | 'Website'): Goal {
  if (channel === 'WhatsApp' && (MESSAGE_OBJECTIVES.includes(objective) || LEADS_OBJECTIVES.includes(objective))) return 'Messaging'
  if (SALES_OBJECTIVES.includes(objective)) return 'Sales'
  if (LEADS_OBJECTIVES.includes(objective)) return 'Leads'
  if (MESSAGE_OBJECTIVES.includes(objective)) return 'Messaging'
  if (TRAFFIC_OBJECTIVES.includes(objective)) return 'Traffic'
  return 'Other'
}

/** WhatsApp campaigns/adsets/ads are tagged (WA) or "WA - ..." in the naming convention used on this account. */
export function classifyChannel(campaignName: string): 'WhatsApp' | 'Website' {
  return /\(wa\)|(^|\s)wa(\s*-|\s*\|)/i.test(campaignName) ? 'WhatsApp' : 'Website'
}

export interface MetaRow {
  id: string // campaign_id / adset_id / ad_id — the stable join key across tabs and days
  date: string
  level: 'campaign' | 'adset' | 'ad'
  name: string
  campaign: string
  campaignId: string
  channel: 'WhatsApp' | 'Website'
  objective: string
  goal: Goal
  spend: number
  clicks: number
  cpc: number
  orders: number
  roas: number
  cpr: number
  leads: number
  conversations: number
  landingPageViews: number
  primaryConversions: number
  costPerPrimary: number
  impressions: number
  reach: number
  frequency: number
  cpm: number
  ctr: number
  hookRate: number // 3-second video views / impressions, %
  signal: string
  reasons: string[]
  daysActive: number
}

export interface SummaryRow {
  date: string
  window: 'yesterday' | '7day'
  spend: number
  orders: number
  cpc: number
  roas: number
}

function primaryConversionsFor(goal: Goal, orders: number, leads: number, conversations: number, landingPageViews: number): number {
  if (goal === 'Sales') return orders
  if (goal === 'Leads') return leads
  if (goal === 'Messaging') return conversations
  if (goal === 'Traffic') return landingPageViews
  return orders || leads || conversations || landingPageViews
}

async function fetchLevel(
  level: 'campaign' | 'adset' | 'ad',
  since: string,
  until: string,
): Promise<MetaRow[]> {
  const nameField = level === 'campaign' ? 'campaign_name'
    : level === 'adset' ? 'adset_name,campaign_name' : 'ad_name,campaign_name'
  const idField = level === 'campaign' ? 'campaign_id'
    : level === 'adset' ? 'adset_id,campaign_id' : 'ad_id,campaign_id'
  const statusField = level === 'campaign' ? 'campaign.effective_status'
    : level === 'adset' ? 'adset.effective_status' : 'ad.effective_status'

  const filters: any[] = [
    { field: statusField, operator: 'IN', value: ['ACTIVE', 'PAUSED'] },
    {
      field: 'objective', operator: 'IN',
      value: [...SALES_OBJECTIVES, ...LEADS_OBJECTIVES, ...MESSAGE_OBJECTIVES, ...TRAFFIC_OBJECTIVES],
    },
  ]
  if (level === 'adset') filters.push({ field: 'campaign.effective_status', operator: 'IN', value: ['ACTIVE', 'PAUSED'] })
  if (level === 'ad') {
    filters.push({ field: 'adset.effective_status', operator: 'IN', value: ['ACTIVE', 'PAUSED'] })
    filters.push({ field: 'campaign.effective_status', operator: 'IN', value: ['ACTIVE', 'PAUSED'] })
  }

  const params = new URLSearchParams({
    access_token: TOKEN,
    time_range: JSON.stringify({ since, until }),
    fields: `spend,clicks,cpc,impressions,reach,frequency,cpm,ctr,objective,purchase_roas,actions,video_3_sec_watched_actions,${nameField},${idField}`,
    level,
    limit: '500',
    filtering: JSON.stringify(filters),
  })

  const res  = await fetch(`${BASE}?${params}`, { signal: AbortSignal.timeout(45000) })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)

  return (data.data || []).map((row: any) => {
    const spend  = parseFloat(row.spend  || '0')
    const clicks = parseInt(row.clicks   || '0')
    const cpc    = parseFloat(row.cpc    || '0')
    const impressions = parseInt(row.impressions || '0')
    const reach        = parseInt(row.reach || '0')
    const frequency     = parseFloat(row.frequency || '0')
    const cpm            = parseFloat(row.cpm || '0')
    const ctr             = parseFloat(row.ctr || '0')
    const video3s = actionValue(row.video_3_sec_watched_actions || [], ['video_view'])
    const hookRate = impressions ? (video3s / impressions) * 100 : 0

    const orders = getOrders(row.actions || [])
    const roas   = getRoas(row.purchase_roas || [])
    const leads  = getLeads(row.actions || [])
    const conversations = getConversations(row.actions || [])
    const landingPageViews = getLandingPageViews(row.actions || [])

    const idKey      = level === 'campaign' ? 'campaign_id' : level === 'adset' ? 'adset_id' : 'ad_id'
    const campaignName = row.campaign_name || ''
    const channel     = classifyChannel(campaignName)
    const objective   = row.objective || ''
    const goal        = classifyGoal(objective, channel)
    const primaryConversions = primaryConversionsFor(goal, orders, leads, conversations, landingPageViews)
    const costPerPrimary = primaryConversions ? spend / primaryConversions : 0

    return {
      id:          row[idKey] || '',
      date:        since === until ? since : `${since}/${until}`,
      level,
      name:        row[level === 'campaign' ? 'campaign_name' : level === 'adset' ? 'adset_name' : 'ad_name'] || '',
      campaign:    campaignName,
      campaignId:  row.campaign_id || '',
      channel, objective, goal,
      spend, clicks, cpc,
      orders, roas,
      cpr: orders ? Math.round(spend / orders) : 0,
      leads, conversations, landingPageViews,
      primaryConversions, costPerPrimary,
      impressions, reach, frequency, cpm, ctr, hookRate,
      signal: '', // assigned by lib/scoring.ts, which needs the full pool for median comparisons
      reasons: [],
      daysActive: 0, // filled in by the caller when daily granularity is available
    } as MetaRow
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

export interface DaySummary {
  date: string
  spend: number
  orders: number
  clicks: number
  roas: number
  cpa: number
  weekday: number // 0=Sun..6=Sat
}

/** Account-level spend/orders/ROAS per day, one Meta call per day (campaign-level, summed). Cheap enough for 30+ day windows. */
export async function fetchDailySummaries(
  days: number,
  concurrency = 5,
  filter: (r: MetaRow) => boolean = () => true,
): Promise<DaySummary[]> {
  const dates = Array.from({ length: days }, (_, i) => daysAgo(days - i))
  const out: DaySummary[] = []
  for (let i = 0; i < dates.length; i += concurrency) {
    const batch = dates.slice(i, i + concurrency)
    const rows = await Promise.all(batch.map(d => fetchLevel('campaign', d, d)))
    batch.forEach((date, idx) => {
      const campaigns = rows[idx].filter(filter)
      const spend  = campaigns.reduce((s, r) => s + r.spend, 0)
      const orders = campaigns.reduce((s, r) => s + r.orders, 0)
      const clicks = campaigns.reduce((s, r) => s + r.clicks, 0)
      const rev    = campaigns.reduce((s, r) => s + r.roas * r.spend, 0)
      out.push({
        date, spend, orders, clicks,
        roas: spend ? rev / spend : 0,
        cpa:  orders ? spend / orders : 0,
        weekday: new Date(date + 'T00:00:00Z').getUTCDay(),
      })
    })
  }
  return out
}

/** Counts, per entity id, how many of the given daily rows had spend > 0 — used for the "3+ days running" data-gate. */
export function daysActiveById(dailyRows: MetaRow[]): Map<string, number> {
  const byId = new Map<string, Set<string>>()
  for (const r of dailyRows) {
    if (r.spend <= 0) continue
    const dateOnly = r.date.split('/')[0]
    if (!byId.has(r.id)) byId.set(r.id, new Set())
    byId.get(r.id)!.add(dateOnly)
  }
  const out = new Map<string, number>()
  for (const [id, dates] of byId) out.set(id, dates.size)
  return out
}
