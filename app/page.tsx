'use client'

import { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, ChevronRight, CircleDot, CloudSun, Crosshair, Database, FileText, Gauge, Hospital, Layers3, MapPin, Menu, Moon, Mountain, Navigation, Play, QrCode, RefreshCw, ScanLine, ShieldCheck, SlidersHorizontal, Sparkles, Sun, Timer, TrendingUp, UserRound, Users, X } from 'lucide-react'
import {
  getLiveCrowd,
  LiveCrowdResponse,
  CheckpointMetrics,
  BottleneckSignal,
  getHistoricalAnalytics,
  HistoricalAnalyticsResponse,
  HistoricalTimeSeriesPoint,
  getMlDataset,
  MlTrainingSequence,
  getLivePredictions,
  getCheckpointPrediction,
  LivePredictionsResponse,
  CheckpointPrediction,
  ForecastHorizon,
} from '@/lib/api-client'
import { useRealTimeCrowd, LiveScanNotice } from '@/lib/websocket-client'

const checkpoints = [
  { id: 'CP-01', name: 'Baltal Base', short: 'Baltal', occupancy: 54, current: 2180, capacity: 4050, inflow: 32, outflow: 28, speed: 2.8, status: 'NORMAL', x: 11, y: 68 },
  { id: 'CP-02', name: 'Domel Bridge', short: 'Domel', occupancy: 71, current: 3250, capacity: 4580, inflow: 47, outflow: 34, speed: 2.1, status: 'WATCH', x: 29, y: 55 },
  { id: 'CP-03', name: 'Sheshnag Camp', short: 'Sheshnag', occupancy: 91, current: 4620, capacity: 5080, inflow: 24, outflow: 15, speed: 1.3, status: 'CRITICAL', x: 49, y: 43 },
  { id: 'CP-04', name: 'Panchtarni', short: 'Panchtarni', occupancy: 43, current: 1840, capacity: 4280, inflow: 21, outflow: 25, speed: 2.6, status: 'NORMAL', x: 68, y: 31 },
  { id: 'CP-05', name: 'Holy Cave', short: 'Holy Cave', occupancy: 62, current: 2970, capacity: 4780, inflow: 29, outflow: 24, speed: 1.9, status: 'WATCH', x: 87, y: 20 },
]
const trend = [{ time: '08:00', crowd: 11200, capacity: 23600 }, { time: '09:00', crowd: 14800, capacity: 23600 }, { time: '10:00', crowd: 18100, capacity: 23600 }, { time: '11:00', crowd: 21300, capacity: 23600 }, { time: '12:00', crowd: 24860, capacity: 23600 }, { time: '13:00', crowd: 26120, capacity: 23600 }]
const flow = [{ time: '08:00', inflow: 180, outflow: 160 }, { time: '09:00', inflow: 220, outflow: 198 }, { time: '10:00', inflow: 260, outflow: 236 }, { time: '11:00', inflow: 310, outflow: 272 }, { time: '12:00', inflow: 348, outflow: 300 }, { time: '13:00', inflow: 332, outflow: 310 }]
const navItems = [['Overview', '/dashboard', Activity], ['Live Map', '/dashboard', MapPin], ['Crowd Intelligence', '/crowd', TrendingUp], ['Predictions', '/predictions', Sparkles], ['Simulation', '/simulation', Play], ['Emergencies', '/emergency', AlertTriangle], ['Pilgrims', '/pilgrims', QrCode], ['Checkpoints', '/checkpoints', Mountain]] as const

import { useAuth } from '@/lib/auth-context'
import { AuthModal } from '@/components/auth/AuthModal'
import { CheckpointScannerStation } from '@/components/scanner/CheckpointScannerStation'
import { PilgrimRegistrationPass } from '@/components/pilgrims/PilgrimRegistrationPass'
import { PilgrimPortalView } from '@/components/pilgrims/PilgrimPortalView'
import { SupervisorDashboard } from '@/components/dashboard/SupervisorDashboard'
import { AdminDashboard } from '@/components/dashboard/AdminDashboard'

function StatusBadge({ status }: { status: string }) {
  const tone = status === 'CRITICAL' ? 'critical' : status === 'HIGH' ? 'critical' : status === 'WATCH' ? 'watch' : status === 'SIMULATED' ? 'simulated' : 'normal'
  return <span className={`status-badge ${tone}`}><span className="status-dot" />{status}</span>
}
function DataBadge({ children = 'DEMO DATA' }: { children?: string }) { return <span className="data-badge">{children}</span> }
function TopNav({ active = 'Overview', dark = false }: { active?: string; dark?: boolean }) {
  const [open, setOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const { user, isAuthenticated, logout } = useAuth()

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'OP'

  // Role-based Navigation filtering
  const visibleNavItems = useMemo(() => {
    if (!isAuthenticated || !user) {
      return [
        ['System Overview', '#how-it-works', Activity],
        ['Route Map', '#how-it-works', Mountain],
      ] as const
    }
    if (user.role === 'PILGRIM') {
      return [
        ['My Digital Pass', '/pilgrims', QrCode],
        ['Route Guide & Safety', '/checkpoints', Mountain],
      ] as const
    }
    if (user.role === 'CHECKPOINT_OPERATOR') {
      return [
        ['Gate Scanner', '/pilgrims', ScanLine],
        ['Assigned Gate Status', '/checkpoints', Mountain],
      ] as const
    }
    if (user.role === 'EMERGENCY_OFFICER') {
      return [
        ['Active Incidents', '/emergency', AlertTriangle],
        ['Response Map', '/dashboard', MapPin],
        ['Checkpoint Density', '/checkpoints', Mountain],
        ['Pilgrim Locator', '/pilgrims', QrCode],
      ] as const
    }
    if (user.role === 'SUPERVISOR') {
      return [
        ['Supervision Hub', '/dashboard', Activity],
        ['Checkpoint Network', '/checkpoints', Mountain],
        ['Pilgrim Registry', '/pilgrims', Users],
        ['Flow Analytics', '/crowd', TrendingUp],
      ] as const
    }
    if (user.role === 'ADMIN') {
      return [
        ['Admin Console', '/dashboard', ShieldCheck],
        ['Control Room', '/crowd', Activity],
        ['Pilgrim Management', '/pilgrims', QrCode],
        ['Infrastructure', '/checkpoints', Mountain],
        ['Emergencies', '/emergency', AlertTriangle],
        ['Simulation Sandbox', '/simulation', Play],
      ] as const
    }
    // Default CONTROL_ROOM_OPERATOR
    return [
      ['Overview', '/dashboard', Activity],
      ['Crowd Intelligence', '/crowd', TrendingUp],
      ['Predictions', '/predictions', Sparkles],
      ['Simulation', '/simulation', Play],
      ['Emergencies', '/emergency', AlertTriangle],
      ['Checkpoints', '/checkpoints', Mountain],
    ] as const
  }, [user?.role, isAuthenticated])

  return (
    <>
      <header className={`top-nav ${dark ? 'top-nav-dark' : ''}`}>
        <a href="/" className="brand"><span className="brand-mark"><Mountain /></span><span>Yatra<span>Flow</span></span></a>
        <nav className={`main-nav ${open ? 'is-open' : ''}`}>
          {visibleNavItems.map(([label, href, Icon]) => (
            <a key={label} href={href} className={active === label ? 'active' : ''}>
              <Icon />
              {label}
            </a>
          ))}
        </nav>
        <div className="nav-actions">
          <span className="live-pill"><span />SPRING BOOT JWT RBAC</span>
          <button className="icon-button" aria-label="Toggle menu" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
          
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2.5">
              <a
                href="/landing"
                className="hidden sm:inline-flex py-1 px-2 text-[10px] font-mono text-[#5a5953] dark:text-[#a8a69e] hover:text-[#252927] border border-[#e5e1dc] dark:border-[#383e3b]"
                title="View Public Landing Page"
              >
                Public Landing
              </a>
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => setAuthOpen(true)} title="Click to switch role or view JWT profile">
                <div className="avatar">{initials}</div>
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-[11px] font-bold leading-none text-[#252927] dark:text-[#f4f0ea]">{user.name}</span>
                  <span className="text-[9px] font-mono text-[#c47735] dark:text-[#c88b50] leading-tight">{user.role}</span>
                </div>
              </div>
              <button
                onClick={() => logout()}
                className="py-1 px-2 bg-[#f5f1ed] dark:bg-[#252927] hover:bg-[#eae5df] text-[#ad4037] text-[10px] font-mono font-bold border border-[#e5e1dc] dark:border-[#383e3b] cursor-pointer"
                title="Sign out and return to Landing Page"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAuthOpen(true)}
              className="py-1.5 px-3 bg-[#2d5a3b] hover:bg-[#23472e] text-[#fffdfa] text-[11px] font-bold tracking-wider cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Sign In / Roles
            </button>
          )}
        </div>
      </header>
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  )
}
function OperationalStrip() { return <div className="op-strip"><DataBadge>CROWD ENGINE</DataBadge><div><strong>24,860</strong><span>ACTIVE PILGRIMS</span></div><div><strong>5</strong><span>CHECKPOINTS</span></div><div><strong>87%</strong><span>PEAK OCCUPANCY</span></div><div><strong>+30 MIN</strong><span>FORECAST AVAILABLE</span></div><div className="strip-status"><span className="status-dot" />ALL SYSTEMS NOMINAL</div></div> }
function RouteMap({ selected, onSelect, compact = false, liveCheckpoints }: { selected: number; onSelect: (i: number) => void; compact?: boolean; liveCheckpoints?: CheckpointMetrics[] }) {
  const points = checkpoints.map((cp, idx) => {
    const live = liveCheckpoints ? liveCheckpoints.find(lc => lc.checkpointCode === cp.id) || liveCheckpoints[idx] : null
    return {
      ...cp,
      occupancy: live ? live.occupancyPercentage : cp.occupancy,
      status: live ? live.operationalStatus : cp.status,
      name: live ? live.checkpointName : cp.name,
      current: live ? live.currentCrowd : cp.current,
      capacity: live ? live.capacity : cp.capacity,
    }
  })

  return <div className={`route-map ${compact ? 'compact' : ''}`}>
    <div className="map-grid" /><div className="contour contour-a" /><div className="contour contour-b" /><div className="contour contour-c" />
    <div className="map-label label-north">NORTH / ELEV. 4,320M</div><div className="map-label label-demo">STYLIZED TERRAIN · {compact ? 'CONTROL VIEW' : 'LIVE ENGINE'}</div>
    <svg className="route-svg" viewBox="0 0 100 100" preserveAspectRatio="none"><path className="route-shadow" d="M 10 68 C 20 62, 20 56, 30 55 S 42 46, 50 43 S 61 37, 68 31 S 80 22, 88 20" /><path className="route-line" d="M 10 68 C 20 62, 20 56, 30 55 S 42 46, 50 43 S 61 37, 68 31 S 80 22, 88 20" /><path className="route-alt" d="M 30 55 C 35 70, 48 66, 57 58 S 75 43, 88 20" /></svg>
    {[...Array(13)].map((_, i) => <span key={i} className="flow-particle" style={{ '--delay': `${i * 0.42}s`, '--x': `${12 + i * 6.2}%`, '--y': `${65 - i * 3.8}%` } as React.CSSProperties} />)}
    {points.map((point, i) => <button key={point.id} className={`checkpoint-node ${point.status.toLowerCase()} ${selected === i ? 'selected' : ''}`} style={{ left: `${point.x}%`, top: `${point.y}%` }} onClick={() => onSelect(i)} aria-label={`Select ${point.name}`}><span className="node-ring" /><span className="node-core" /><span className="node-label"><b>{point.id}</b><small>{point.short}</small><em>{point.occupancy}%</em></span></button>)}
    <div className="map-legend"><div><span className="legend-line" />ROUTE</div><div><span className="legend-dot green" />NORMAL</div><div><span className="legend-dot amber" />WATCH</div><div><span className="legend-dot red" />CRITICAL</div></div>
    {!compact && <div className="map-controls"><button aria-label="Layers"><Layers3 /></button><button aria-label="Center map"><Crosshair /></button><button aria-label="Zoom in">+</button><button aria-label="Zoom out">−</button></div>}
  </div>
}
function MetricStrip({ liveData }: { liveData?: LiveCrowdResponse | null }) {
  const pilgrimsCount = liveData ? liveData.totalActivePilgrims.toLocaleString() : '24,860'
  const inTransitCount = liveData ? liveData.totalInTransit.toLocaleString() : '8,420'
  const speedStr = liveData ? `${liveData.averageWalkingSpeedKmH} km/h` : '2.1 km/h'
  const occupancyStr = liveData ? `${liveData.overallOccupancyPercentage}%` : '91%'
  const alertsCount = liveData ? String(liveData.activeAlertsCount).padStart(2, '0') : '03'

  const metrics = [
    ['ACTIVE PILGRIMS', pilgrimsCount, '+4.2%', ArrowUpRight],
    ['IN TRANSIT', inTransitCount, '+2.8%', ArrowUpRight],
    ['AVG FLOW', '332/min', '+6.1%', ArrowUpRight],
    ['AVG WALKING SPEED', speedStr, '-0.3%', ArrowDownRight],
    ['PEAK OCCUPANCY', occupancyStr, '+8.4%', ArrowUpRight],
    ['ACTIVE ALERTS', alertsCount, liveData?.bottlenecks?.length ? `${liveData.bottlenecks.length} active` : '1 critical', AlertTriangle]
  ] as const

  return <div className="metric-strip">{metrics.map(([label, value, change, Icon], i) => <div className="metric" key={label}><span className="metric-label">{label}</span><strong>{value}</strong><span className={i === 5 ? 'change critical-text' : 'change'}><Icon />{change}</span><span className="metric-time">updated live</span></div>)}</div>
}
function SectionHeading({ eyebrow, title, action }: { eyebrow: string; title: string; action?: string }) { return <div className="section-heading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>{action && <a href="#" className="text-action">{action}<ArrowRight /></a>}</div> }
function ChartCard({ type = 'crowd' }: { type?: 'crowd' | 'flow' }) { const data = type === 'crowd' ? trend : flow; return <div className="chart-card"><div className="chart-top"><div><span className="chart-kicker">{type === 'crowd' ? 'CROWD OVER TIME' : 'INFLOW / OUTFLOW'}</span><strong>{type === 'crowd' ? '24,860' : '332/min'}</strong><small>{type === 'crowd' ? 'current pilgrims across route' : 'net positive movement'}</small></div><DataBadge /></div><div className="chart-legend"><span><i className="line-green" />{type === 'crowd' ? 'Current crowd' : 'Inflow'}</span><span><i className="line-amber" />{type === 'crowd' ? 'Route capacity' : 'Outflow'}</span></div><ResponsiveContainer width="100%" height={190}>{type === 'crowd' ? <AreaChart data={data}><defs><linearGradient id="crowdFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2d5a3b" stopOpacity={0.25} /><stop offset="100%" stopColor="#2d5a3b" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#e5e1dc" /><XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#7d7c76' }} /><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#7d7c76' }} width={38} /><Tooltip /><Area type="monotone" dataKey="capacity" stroke="#c47735" strokeDasharray="4 4" fill="none" strokeWidth={1.5} /><Area type="monotone" dataKey="crowd" stroke="#2d5a3b" fill="url(#crowdFill)" strokeWidth={2} /></AreaChart> : <LineChart data={data}><CartesianGrid vertical={false} stroke="#e5e1dc" /><XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#7d7c76' }} /><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#7d7c76' }} width={32} /><Tooltip /><Line type="monotone" dataKey="inflow" stroke="#2d5a3b" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="outflow" stroke="#c47735" strokeWidth={2} dot={false} /></LineChart>}</ResponsiveContainer></div> }
function CheckpointPanel({ checkpoint, onClose }: { checkpoint: any; onClose: () => void }) {
  const name = checkpoint.checkpointName || checkpoint.name || 'Baltal Base'
  const code = checkpoint.checkpointCode || checkpoint.id || 'CP-01'
  const status = checkpoint.operationalStatus || checkpoint.status || 'NORMAL'
  const current = checkpoint.currentCrowd || checkpoint.current || 2180
  const capacity = checkpoint.capacity || 4050
  const occupancy = checkpoint.occupancyPercentage || checkpoint.occupancy || 54
  const inflow = checkpoint.inflow || 32
  const outflow = checkpoint.outflow || 28
  const speed = checkpoint.averageSpeedKmH || checkpoint.speed || 2.8

  return <aside className="checkpoint-panel"><div className="panel-top"><div><span className="eyebrow">CHECKPOINT DETAIL</span><h3>{name}</h3></div><button className="icon-button" onClick={onClose} aria-label="Close panel"><X /></button></div><div className="panel-id"><span>{code}</span><StatusBadge status={status} /></div><div className="occupancy-readout"><div><small>CURRENT CROWD</small><strong>{current.toLocaleString()}</strong><span>of {capacity.toLocaleString()} capacity</span></div><div className="donut" style={{ '--value': `${occupancy * 3.6}deg` } as React.CSSProperties}><span>{occupancy}%</span></div></div><div className="panel-grid">{[['INCOMING RATE', `${inflow}/min`], ['OUTGOING RATE', `${outflow}/min`], ['NET FLOW', `+${inflow - outflow}/min`], ['AVG SPEED', `${speed} km/h`], ['PEOPLE IN TRANSIT', `${checkpoint.inTransitCount || 1284}`], ['LAST SCAN', 'Live']].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><div className="panel-callout"><Sparkles /><div><strong>30 min prediction</strong><p>Occupancy may reach {Math.min(occupancy + 9, 99)}% if current inflow continues.</p></div></div><button className="primary-button full">Open checkpoint analytics <ArrowRight /></button></aside> }
function CommandHeader({ title, description, active = 'Overview' }: { title: string; description: string; active?: string }) {
  const { user, isAuthenticated } = useAuth()
  const roleName = user?.role ? user.role.replace(/_/g, ' ') : 'OPERATIONS LEAD'
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'AR'

  return (
    <>
      <TopNav active={active} />
      <div className="command-header">
        <div>
          <span className="eyebrow">YATRAFLOW / COMMAND CENTER</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className="command-meta">
          <span className="system-live"><i />SYSTEM STATUS <strong>SPRING BOOT LIVE</strong></span>
          <span>Last updated <b>12:42:18</b></span>
          <span className="role">
            <span className="avatar small">{initials}</span>
            {user ? `${user.name} (${roleName})` : 'Guest Operator'}
          </span>
        </div>
      </div>
    </>
  )
}
function Dashboard() {
  const [selected, setSelected] = useState(2)
  const {
    liveData,
    connectionStatus,
    lastEventTime,
    lastScanNotice,
    dataFreshness,
    refresh,
  } = useRealTimeCrowd()

  const cpList = liveData && liveData.checkpoints.length > 0 ? liveData.checkpoints : null
  const activePoint = cpList ? cpList[selected] || cpList[0] : checkpoints[selected] || checkpoints[0]
  const bottleneck = liveData?.bottlenecks && liveData.bottlenecks.length > 0 ? liveData.bottlenecks[0] : null

  return (
    <div className="app-shell">
      <CommandHeader
        title="Operational overview"
        description="Live reactive control room powered by real-time WebSocket STOMP stream."
      />

      {/* Live Scan Notification Toast Banner */}
      {lastScanNotice && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-6 mb-2 p-2.5 bg-[#2d5a3b]/10 border border-[#2d5a3b]/30 text-[#252927] dark:text-[#f4f0ea] flex items-center justify-between text-xs font-mono"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#2d5a3b] animate-ping" />
            <strong>LIVE SCAN RECEIVED:</strong>
            <span>{lastScanNotice.pilgrimName} ({lastScanNotice.pilgrimCode})</span>
            <span className="text-[#c47735]">→ {lastScanNotice.checkpointName} [{lastScanNotice.checkpointCode}]</span>
          </div>
          <span className="text-[10px] text-[#7d7c76]">
            {new Date(lastScanNotice.scanTimestamp).toLocaleTimeString()}
          </span>
        </motion.div>
      )}

      <main className="page-content dashboard-page">
        <MetricStrip liveData={liveData} />
        <div className="dashboard-grid">
          <section className="map-section">
            <div className="section-heading compact-heading">
              <div>
                <span className="eyebrow">ROUTE SITUATION</span>
                <h2>Live movement map</h2>
              </div>
              <div className="map-toolbar">
                <span
                  className={`status-badge ${
                    connectionStatus === 'CONNECTED'
                      ? 'normal'
                      : connectionStatus === 'CONNECTING' || connectionStatus === 'RECONNECTING'
                      ? 'watch'
                      : 'simulated'
                  }`}
                >
                  <span className="status-dot" />
                  {connectionStatus === 'CONNECTED'
                    ? 'LIVE WS STREAM'
                    : connectionStatus === 'RECONNECTING'
                    ? 'RECONNECTING'
                    : 'POLLING BACKUP'}
                </span>
                <DataBadge>{dataFreshness === 'STALE' ? 'STALE DATA' : 'LIVE DATA'}</DataBadge>
                <button className="outline-button" onClick={refresh}>
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh
                </button>
              </div>
            </div>
            <RouteMap
              selected={selected}
              onSelect={setSelected}
              liveCheckpoints={liveData?.checkpoints}
            />
            <div className="map-foot">
              <span>
                <i className="status-dot" />
                {(activePoint as any).checkpointName || (activePoint as any).name} selected
              </span>
              <span>
                <Timer />
                Last event: {lastEventTime ? lastEventTime.toLocaleTimeString() : 'Live'}
              </span>
              <span>
                <Database />
                Data freshness: {dataFreshness === 'STALE' ? 'Stale (>5m)' : '< 3 sec (Live)'}
              </span>
            </div>
          </section>
          <CheckpointPanel
            checkpoint={activePoint}
            onClose={() => setSelected(-1)}
          />
        </div>
        <section className="below-grid">
          <ChartCard />
          <ChartCard type="flow" />
          <div className="pressure-card">
            <span className="eyebrow">DETERMINISTIC BOTTLENECK DETECTION</span>
            <h3>{bottleneck ? bottleneck.diagnosis : 'Pressure is building'}</h3>
            <div className="pressure-route">
              <span>{bottleneck ? bottleneck.fromCheckpoint : 'CP-02'}</span>
              <ArrowRight />
              <span>{bottleneck ? bottleneck.toCheckpoint : 'CP-03'}</span>
            </div>
            <div className="pressure-values">
              <div>
                <small>INCOMING</small>
                <b>{(activePoint as any).inflow || 24}/min</b>
              </div>
              <div>
                <small>OUTGOING</small>
                <b>{(activePoint as any).outflow || 15}/min</b>
              </div>
              <div>
                <small>NET ACCUMULATION</small>
                <b className="critical-text">
                  +{bottleneck ? bottleneck.netAccumulationRate : 9}/min
                </b>
              </div>
            </div>
            <p>
              {bottleneck
                ? `Observed speed: ${bottleneck.observedSpeedKmH} km/h (${bottleneck.speedDropPercentage}% drop)`
                : 'Flow entering this segment currently exceeds observed exit rate.'}
            </p>
            <StatusBadge status={bottleneck ? bottleneck.severity : 'WATCH'} />
          </div>
        </section>
        <HealthSection />
      </main>
    </div>
  )
}
function HealthSection() { return <section className="health-section"><div className="section-heading compact-heading"><div><span className="eyebrow">SYSTEM HEALTH</span><h2>Data quality & freshness</h2></div><a href="#" className="text-action">View diagnostics <ArrowRight /></a></div><div className="health-grid">{[['CP-01 scanner', 'ONLINE', '18 sec'], ['CP-02 scanner', 'ONLINE', '24 sec'], ['CP-03 scanner', 'DELAYED', '3m 42s'], ['CP-04 scanner', 'ONLINE', '12 sec']].map(([name, status, age]) => <div key={name} className="health-item"><div className={`health-icon ${status === 'DELAYED' ? 'delayed' : ''}`}><ScanLine /></div><div><strong>{name}</strong><span>{status === 'DELAYED' ? 'Stale data' : 'Receiving scans'}</span></div><div className="health-time"><StatusBadge status={status === 'DELAYED' ? 'WATCH' : 'NORMAL'} /><small>{age} old</small></div></div>)}</div></section> }
function Landing() {
  const [authOpen, setAuthOpen] = useState(false)
  const { user, isAuthenticated } = useAuth()

  const workspaceHref = user?.role === 'PILGRIM' || user?.role === 'CHECKPOINT_OPERATOR'
    ? '/pilgrims'
    : user?.role === 'EMERGENCY_OFFICER'
    ? '/emergency'
    : '/dashboard'

  return (
    <div className="landing">
      <TopNav active="System Overview" />
      <main>
        <section className="hero">
          <div className="hero-copy">
            <DataBadge>OFFICIAL YATRA SYSTEM</DataBadge>
            <span className="eyebrow">YATRAFLOW / CROWD INTELLIGENCE</span>
            <h1>Understand the crowd <em>before</em> it becomes a crisis.</h1>
            <p>Real-time movement intelligence, QR checkpoint tracking, and multi-horizon prediction decision support for large-scale pilgrimage management.</p>
            <div className="hero-actions">
              {isAuthenticated && user ? (
                <>
                  <a href={workspaceHref} className="primary-button cursor-pointer flex items-center gap-1.5">
                    Launch Workspace ({user.role}) <ArrowRight />
                  </a>
                  <button onClick={() => setAuthOpen(true)} className="secondary-button cursor-pointer flex items-center gap-1">
                    Switch Role <ChevronRight />
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setAuthOpen(true)} className="primary-button cursor-pointer flex items-center gap-1.5">
                    Sign In / Select Role <ArrowRight />
                  </button>
                  <a href="#how-it-works" className="secondary-button">Explore the system <ChevronRight /></a>
                </>
              )}
            </div>
          </div>
          <div className="hero-map-wrap">
            <RouteMap selected={2} onSelect={() => {}} />
            <div className="hero-map-caption"><span><i className="status-dot" />MONITORING ACTIVE</span><span>AMARNATH ROUTE / SCHEMATIC</span></div>
          </div>
          <OperationalStrip />
        </section>
        <section className="story" id="how-it-works">
          <SectionHeading eyebrow="FROM MOVEMENT TO DECISION" title="One movement event. Four layers of intelligence." action="Explore the route" />
          <div className="story-rail">
            <div className="story-line" />
            {[
              ['01', 'OBSERVE', 'QR checkpoint scans create immutable movement events.', ScanLine],
              ['02', 'UNDERSTAND', 'The system calculates crowd, inflow, outflow, speed and transit state.', Activity],
              ['03', 'PREDICT', 'ML estimates future crowd conditions at +15, +30 and +60 minutes.', TrendingUp],
              ['04', 'SIMULATE', 'Digital twin tests possible interventions in a virtual Yatra environment (Coming Soon).', Play]
            ].map(([number, title, text, Icon], i) => (
              <motion.div className="story-step" key={number} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <span className="step-number">{number}</span>
                <div className="step-icon"><Icon /></div>
                <h3>{title}</h3>
                <p>{text}</p>
              </motion.div>
            ))}
          </div>
          <div className="story-note"><span className="moving-dot" />A scan becomes a signal. A signal becomes a safer decision.</div>
        </section>
        <section className="principle">
          <div><span className="eyebrow">DESIGNED FOR THE FIELD</span><h2>Human operators stay<br /><em>in control.</em></h2></div>
          <div className="principle-copy">
            <p>YatraFlow does not replace judgment. It gives the operations room a shared picture of the route, a view of what is forming, and a safe place to test a response before it reaches the mountain.</p>
            <button onClick={() => setAuthOpen(true)} className="text-action cursor-pointer">Explore role portals <ArrowRight /></button>
          </div>
        </section>
        <section className="landing-cta">
          <div>
            <span className="eyebrow">YATRAFLOW / SECURE ACCESS</span>
            <h2>Sign in to access your role workspace.</h2>
            <p>Dedicated portals for Pilgrims, Checkpoint Operators, Control Room Leads, Emergency Responders, and Field Supervisors.</p>
          </div>
          {isAuthenticated && user ? (
            <a href={workspaceHref} className="primary-button cursor-pointer flex items-center gap-1.5">
              Enter Workspace ({user.role}) <ArrowRight />
            </a>
          ) : (
            <button onClick={() => setAuthOpen(true)} className="primary-button cursor-pointer flex items-center gap-1.5">
              Sign In / Launch Dashboard <ArrowRight />
            </button>
          )}
        </section>
      </main>
      <footer>
        <span className="brand"><span className="brand-mark"><Mountain /></span><span>Yatra<span>Flow</span></span></span>
        <span>Amarnath Yatra Crowd Management System · Secure JWT RBAC</span>
      </footer>
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  )
}

function SupervisorPage() {
  return (
    <div className="app-shell">
      <CommandHeader
        title="Field Supervision & Gate Health"
        description="Monitor checkpoint capacities, scanner data freshness, and gate transit velocity across mountain tracks."
        active="Supervision Hub"
      />
      <main className="page-content inner-page">
        <SupervisorDashboard />
      </main>
    </div>
  )
}

function AdminPage() {
  return (
    <div className="app-shell">
      <CommandHeader
        title="System Administration & Master Control"
        description="Manage user roles, route infrastructure, backend health, and master pilgrim registrations."
        active="Admin Console"
      />
      <main className="page-content inner-page">
        <AdminDashboard />
      </main>
    </div>
  )
}

function EmergencyComingSoon() {
  return (
    <div className="space-y-6">
      <div className="p-8 bg-[#fffdfa] dark:bg-[#1a1d1b] border border-[#e5e1dc] dark:border-[#2f3532] text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-[#ad4037]/10 flex items-center justify-center text-[#ad4037]">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <div className="max-w-md mx-auto">
          <span className="px-2.5 py-1 bg-[#ad4037]/10 text-[#ad4037] text-[10px] font-mono font-bold tracking-wider uppercase">
            COMING SOON — EMERGENCY DISPATCH MODULE
          </span>
          <h2 className="text-xl font-bold text-[#252927] dark:text-[#f4f0ea] mt-2">
            Tactical Emergency Operations & Incident Routing
          </h2>
          <p className="text-xs text-[#7d7c76] mt-2 font-mono leading-relaxed">
            Automated SOS distress correlation, shortest-path mountain rescue team dispatch, and human-in-the-loop multi-agency medical approval workflows will be implemented in a future phase.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto pt-4 border-t border-[#e5e1dc] dark:border-[#2f3532] text-left">
          <div className="p-3 bg-[#f5f1ed] dark:bg-[#252927] border border-[#e5e1dc] dark:border-[#383e3b]">
            <span className="text-[10px] font-mono uppercase text-[#7d7c76] font-bold block">FEATURE 01</span>
            <strong className="text-xs text-[#252927] dark:text-[#f4f0ea] block mt-1">Automated SOS Dispatch</strong>
            <span className="text-[10px] text-[#7d7c76] font-mono mt-0.5 block">Pilgrim beacon correlation & responder assignment</span>
          </div>
          <div className="p-3 bg-[#f5f1ed] dark:bg-[#252927] border border-[#e5e1dc] dark:border-[#383e3b]">
            <span className="text-[10px] font-mono uppercase text-[#7d7c76] font-bold block">FEATURE 02</span>
            <strong className="text-xs text-[#252927] dark:text-[#f4f0ea] block mt-1">Trail Diversion Routing</strong>
            <span className="text-[10px] text-[#7d7c76] font-mono mt-0.5 block">Dynamic evacuation corridors avoiding bottleneck zones</span>
          </div>
          <div className="p-3 bg-[#f5f1ed] dark:bg-[#252927] border border-[#e5e1dc] dark:border-[#383e3b]">
            <span className="text-[10px] font-mono uppercase text-[#7d7c76] font-bold block">FEATURE 03</span>
            <strong className="text-xs text-[#252927] dark:text-[#f4f0ea] block mt-1">Medical Post Telemetry</strong>
            <span className="text-[10px] text-[#7d7c76] font-mono mt-0.5 block">Oxygen & bed availability tracking along mountain camps</span>
          </div>
        </div>
      </div>

      {/* 
      ========================================================================
      [UNIMPLEMENTED FRONTEND CODE PRESERVED - EMERGENCY DISPATCH PROTOTYPE]
      ========================================================================
      <div className="incident-banner">
        <AlertTriangle />
        <div>
          <span>INCIDENT #E-204 · ACTIVE</span>
          <strong>Medical emergency reported at CP-03</strong>
          <small>Detected 12:31 PM · Human approval required</small>
        </div>
        <StatusBadge status="CRITICAL" />
      </div>
      <div className="emergency-grid">
        <div>
          <RouteMap selected={2} onSelect={() => {}} compact />
          <div className="route-suggestion">
            <Navigation />
            <div>
              <span className="eyebrow">SUGGESTED RESPONSE ROUTE</span>
              <strong>CP-02 → CP-03 via east access</strong>
              <small>Lower density · estimated 4 min access time</small>
            </div>
            <DataBadge>HUMAN APPROVAL REQUIRED</DataBadge>
          </div>
        </div>
        <div className="conditions">
          <span className="eyebrow">CURRENT CONDITIONS</span>
          <h2>Incident context</h2>
          {[
            ['CP-03 occupancy', '92%', 'CRITICAL'],
            ['Nearby crowd', '1,840', 'DEMO DATA'],
            ['Route A', 'HIGH DENSITY', 'WATCH'],
            ['Route B', 'LOWER DENSITY', 'NORMAL']
          ].map(([a,b,c]) => (
            <div className="condition" key={a}>
              <span>{a}</span>
              <strong>{b}</strong>
              <StatusBadge status={c === 'DEMO DATA' ? 'SIMULATED' : c} />
            </div>
          ))}
          <div className="emergency-actions">
            <button className="outline-button">Review route</button>
            <button className="outline-button">Run simulation</button>
            <button className="primary-button">Approve response</button>
          </div>
        </div>
      </div>
      */}
    </div>
  )
}

function AnalyticsPage({ kind }: { kind: string }) {
  const [selected, setSelected] = useState(2)
  const [running, setRunning] = useState(false)
  const title = kind === 'crowd'
    ? 'Crowd intelligence'
    : kind === 'predictions'
    ? 'Where is the crowd going?'
    : kind === 'simulation'
    ? 'Test the future before changing the present.'
    : kind === 'emergency'
    ? 'Emergency operations'
    : kind === 'checkpoints'
    ? 'Checkpoint network'
    : 'Pilgrim movement registry'

  const desc = kind === 'crowd'
    ? 'Trace accumulation, speed and pressure across the route.'
    : kind === 'predictions'
    ? 'Multi-horizon machine learning crowd forecasts and uncertainty intervals.'
    : kind === 'simulation'
    ? 'Compare interventions inside a virtual Yatra environment.'
    : kind === 'emergency'
    ? 'Review response routes with human approval required.'
    : kind === 'checkpoints'
    ? 'Movement timelines and current checkpoint conditions.'
    : 'Create demo passes and verify checkpoint scans.'

  if (kind === 'emergency') {
    return (
      <div className="app-shell">
        <CommandHeader title={title} description={desc} active="Active Incidents" />
        <main className="page-content inner-page">
          <EmergencyComingSoon />
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <CommandHeader
        title={title}
        description={desc}
        active={
          kind === 'crowd'
            ? 'Crowd Intelligence'
            : kind === 'predictions'
            ? 'Predictions'
            : kind === 'simulation'
            ? 'Simulation'
            : kind === 'checkpoints'
            ? 'Checkpoints'
            : 'Pilgrims'
        }
      />
      <main className="page-content inner-page">
        {kind === 'simulation' ? (
          <Simulation running={running} setRunning={setRunning} />
        ) : kind === 'predictions' ? (
          <PredictionView />
        ) : kind === 'pilgrims' ? (
          <PilgrimView />
        ) : kind === 'checkpoints' ? (
          <CheckpointView selected={selected} setSelected={setSelected} />
        ) : (
          <CrowdView />
        )}
      </main>
    </div>
  )
}
function CrowdView() {
  const { liveData, dataFreshness } = useRealTimeCrowd()
  const [interval, setIntervalVal] = useState<'15m' | '30m' | '1h' | '1d'>('1h')
  const [selectedCp, setSelectedCp] = useState<string>('ALL')
  const [analyticsData, setAnalyticsData] = useState<HistoricalAnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [showMlTable, setShowMlTable] = useState(false)
  const [mlDataset, setMlDataset] = useState<MlTrainingSequence[]>([])

  useEffect(() => {
    loadAnalytics()
  }, [interval, selectedCp])

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      const cpCode = selectedCp === 'ALL' ? undefined : selectedCp
      const data = await getHistoricalAnalytics({
        checkpointCode: cpCode,
        interval: interval,
      })
      setAnalyticsData(data)

      const ml = await getMlDataset({
        checkpointCode: cpCode || 'CP-03',
        interval: interval,
      })
      setMlDataset(ml)
    } catch (e) {
      console.warn('Historical analytics fetch error fallback', e)
    } finally {
      setLoading(false)
    }
  }

  const chartSeries = analyticsData?.timeSeries && analyticsData.timeSeries.length > 0
    ? analyticsData.timeSeries
    : trend.map(t => ({
        timeLabel: t.time,
        crowdCount: t.crowd,
        capacity: t.capacity,
        inflow: 220,
        outflow: 190,
        averageSpeedKmH: 2.1,
        occupancyPercentage: 74.0,
      }))

  const summary = analyticsData?.summary

  const cpList = liveData?.checkpoints && liveData.checkpoints.length > 0 
    ? liveData.checkpoints 
    : checkpoints.map(c => ({
        checkpointCode: c.id,
        checkpointName: c.name,
        currentCrowd: c.current,
        capacity: c.capacity,
        occupancyPercentage: c.occupancy,
        operationalStatus: c.status,
        inflow: c.inflow,
        outflow: c.outflow,
        averageSpeedKmH: c.speed,
        inTransitCount: 1200,
        dataFreshnessStatus: 'FRESH'
      }))

  const bottleneck = liveData?.bottlenecks && liveData.bottlenecks.length > 0 
    ? liveData.bottlenecks[0] 
    : null

  return (
    <div className="space-y-6">
      {/* Historical Filter Toolbar */}
      <div className="p-4 bg-[#fffdfa] dark:bg-[#1a1d1b] border border-[#e5e1dc] dark:border-[#2f3532] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold text-[#7d7c76] tracking-wider uppercase font-mono">AGGREGATION INTERVAL:</span>
          <div className="flex bg-[#f5f1ed] dark:bg-[#252927] p-0.5 border border-[#e5e1dc] dark:border-[#383e3b]">
            {(['15m', '30m', '1h', '1d'] as const).map((int) => (
              <button
                key={int}
                onClick={() => setIntervalVal(int)}
                className={`px-3 py-1 text-xs font-mono font-bold transition-colors cursor-pointer ${
                  interval === int
                    ? 'bg-[#2d5a3b] text-[#fffdfa]'
                    : 'text-[#5a5953] dark:text-[#a8a69e] hover:text-[#252927]'
                }`}
              >
                {int.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold text-[#7d7c76] tracking-wider uppercase font-mono">CHECKPOINT FILTER:</span>
          <select
            value={selectedCp}
            onChange={(e) => setSelectedCp(e.target.value)}
            className="px-3 py-1 bg-[#f5f1ed] dark:bg-[#252927] border border-[#e5e1dc] dark:border-[#383e3b] text-xs font-mono font-bold text-[#252927] dark:text-[#f4f0ea] cursor-pointer"
          >
            <option value="ALL">All Checkpoints (Network Aggregate)</option>
            <option value="CP-01">CP-01 Baltal Base Camp</option>
            <option value="CP-02">CP-02 Domel Bridge</option>
            <option value="CP-03">CP-03 Sheshnag Camp</option>
            <option value="CP-04">CP-04 Panchtarni Camp</option>
            <option value="CP-05">CP-05 Holy Cave Sanctum</option>
          </select>
          <button
            onClick={loadAnalytics}
            className="px-3 py-1 bg-[#f5f1ed] dark:bg-[#252927] hover:bg-[#e5e1dc] border border-[#e5e1dc] dark:border-[#383e3b] text-xs font-mono font-bold text-[#252927] dark:text-[#f4f0ea] flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Derived KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-3.5 bg-[#fffdfa] dark:bg-[#1a1d1b] border border-[#e5e1dc] dark:border-[#2f3532]">
          <span className="text-[10px] font-mono uppercase text-[#7d7c76] font-bold block">PEAK CROWD</span>
          <strong className="text-xl font-mono text-[#252927] dark:text-[#f4f0ea] block mt-0.5">
            {summary ? summary.peakCrowd.toLocaleString() : '26,120'}
          </strong>
          <span className="text-[10px] font-mono text-[#2d5a3b] mt-1 block">Max across window</span>
        </div>

        <div className="p-3.5 bg-[#fffdfa] dark:bg-[#1a1d1b] border border-[#e5e1dc] dark:border-[#2f3532]">
          <span className="text-[10px] font-mono uppercase text-[#7d7c76] font-bold block">PEAK OCCUPANCY</span>
          <strong className="text-xl font-mono text-[#c47735] block mt-0.5">
            {summary ? `${summary.peakOccupancyPercentage}%` : '94.2%'}
          </strong>
          <span className="text-[10px] font-mono text-[#7d7c76] mt-1 block">Peak pressure point</span>
        </div>

        <div className="p-3.5 bg-[#fffdfa] dark:bg-[#1a1d1b] border border-[#e5e1dc] dark:border-[#2f3532]">
          <span className="text-[10px] font-mono uppercase text-[#7d7c76] font-bold block">MAX NET INFLOW</span>
          <strong className="text-xl font-mono text-[#252927] dark:text-[#f4f0ea] block mt-0.5">
            +{summary ? summary.maximumNetInflow : 48}/min
          </strong>
          <span className="text-[10px] font-mono text-[#ad4037] mt-1 block">Surge ingress rate</span>
        </div>

        <div className="p-3.5 bg-[#fffdfa] dark:bg-[#1a1d1b] border border-[#e5e1dc] dark:border-[#2f3532]">
          <span className="text-[10px] font-mono uppercase text-[#7d7c76] font-bold block">ABOVE WATCH (≥70%)</span>
          <strong className="text-xl font-mono text-[#c47735] block mt-0.5">
            {summary ? `${summary.minutesAboveWatchThreshold} min` : '180 min'}
          </strong>
          <span className="text-[10px] font-mono text-[#7d7c76] mt-1 block">Elevated density duration</span>
        </div>

        <div className="p-3.5 bg-[#fffdfa] dark:bg-[#1a1d1b] border border-[#e5e1dc] dark:border-[#2f3532]">
          <span className="text-[10px] font-mono uppercase text-[#7d7c76] font-bold block">BOTTLENECK DURATION</span>
          <strong className="text-xl font-mono text-[#ad4037] block mt-0.5">
            {summary ? `${summary.bottleneckDurationMinutes} min` : '45 min'}
          </strong>
          <span className="text-[10px] font-mono text-[#ad4037] mt-1 block">Congestion accumulation</span>
        </div>
      </div>

      {/* Main Operational Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: Crowd vs Capacity Timeline */}
        <div className="chart-card">
          <div className="chart-top">
            <div>
              <span className="chart-kicker">HISTORICAL CROWD & CAPACITY PROFILE</span>
              <strong>{summary ? summary.peakCrowd.toLocaleString() : '24,860'}</strong>
              <small>Aggregate crowd across {selectedCp === 'ALL' ? 'route network' : selectedCp}</small>
            </div>
            <DataBadge>24H ENGINE DATA</DataBadge>
          </div>
          <div className="chart-legend">
            <span><i className="line-green" />Observed crowd</span>
            <span><i className="line-amber" />Capacity limit</span>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={chartSeries}>
              <defs>
                <linearGradient id="histCrowdFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2d5a3b" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#2d5a3b" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#e5e1dc" />
              <XAxis dataKey="timeLabel" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#7d7c76' }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#7d7c76' }} width={38} />
              <Tooltip />
              <Area type="monotone" dataKey="capacity" stroke="#c47735" strokeDasharray="4 4" fill="none" strokeWidth={1.5} />
              <Area type="monotone" dataKey="crowdCount" stroke="#2d5a3b" fill="url(#histCrowdFill)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2: Inflow vs Outflow Rate Dynamics */}
        <div className="chart-card">
          <div className="chart-top">
            <div>
              <span className="chart-kicker">INFLOW VS OUTFLOW RATE DYNAMICS</span>
              <strong>{summary ? `+${summary.maximumNetInflow}/min` : '332/min'}</strong>
              <small>Pilgrim entry vs downstream exit rate</small>
            </div>
            <DataBadge>RATE DYNAMICS</DataBadge>
          </div>
          <div className="chart-legend">
            <span><i className="line-green" />Inflow (/min)</span>
            <span><i className="line-amber" />Outflow (/min)</span>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={chartSeries}>
              <CartesianGrid vertical={false} stroke="#e5e1dc" />
              <XAxis dataKey="timeLabel" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#7d7c76' }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#7d7c76' }} width={32} />
              <Tooltip />
              <Line type="monotone" dataKey="inflow" stroke="#2d5a3b" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="outflow" stroke="#c47735" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Speed & Transit Velocity Chart + Live Gate Occupancy Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 chart-card">
          <div className="chart-top">
            <div>
              <span className="chart-kicker">WALKING VELOCITY & CONGESTION DRAG</span>
              <strong>{summary ? `${summary.averageWalkingSpeedKmH} km/h` : '2.1 km/h'}</strong>
              <small>Average walking pace across mountain trails</small>
            </div>
            <DataBadge>VELOCITY PROFILE</DataBadge>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartSeries}>
              <CartesianGrid vertical={false} stroke="#e5e1dc" />
              <XAxis dataKey="timeLabel" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#7d7c76' }} />
              <YAxis domain={[0, 4]} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#7d7c76' }} width={28} />
              <Tooltip />
              <Line type="monotone" dataKey="averageSpeedKmH" stroke="#2d5a3b" strokeWidth={2.5} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="occupancy-card">
          <span className="eyebrow">CHECKPOINT OCCUPANCY</span>
          <h3>Where pressure sits now</h3>
          {cpList.map((p: any) => (
            <div className="bar-row" key={p.checkpointCode || p.id}>
              <span>{p.checkpointCode || p.id}</span>
              <div>
                <i
                  style={{ width: `${p.occupancyPercentage || p.occupancy}%` }}
                  className={(p.operationalStatus || p.status || 'NORMAL').toLowerCase()}
                />
              </div>
              <b>{p.occupancyPercentage || p.occupancy}%</b>
            </div>
          ))}
        </div>
      </div>

      {/* Bottleneck Diagnostic Strip */}
      <div className="bottleneck-wide">
        <div>
          <span className="eyebrow">DETERMINISTIC BOTTLENECK DETECTION</span>
          <h2>
            {bottleneck ? bottleneck.fromCheckpoint : 'CP-02'}{' '}
            <ArrowRight />{' '}
            {bottleneck ? bottleneck.toCheckpoint : 'CP-03'}
          </h2>
          <p>
            {bottleneck
              ? `${bottleneck.diagnosis} (Speed: ${bottleneck.observedSpeedKmH} km/h, drop: ${bottleneck.speedDropPercentage}%)`
              : 'Flow entering this segment currently exceeds observed exit rate.'}
          </p>
        </div>
        <div className="big-pressure">
          <strong>+{bottleneck ? bottleneck.netAccumulationRate : 9}/min</strong>
          <span>NET ACCUMULATION</span>
        </div>
        <StatusBadge status={bottleneck ? bottleneck.severity : 'WATCH'} />
      </div>

      {/* Phase 6 ML-Ready Training Feature Inspector */}
      <div className="p-4 bg-[#fffdfa] dark:bg-[#1a1d1b] border border-[#e5e1dc] dark:border-[#2f3532]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-[10px] font-mono font-bold text-[#c47735] uppercase tracking-wider block">ML SEQUENCE GENERATION</span>
            <h4 className="text-sm font-bold text-[#252927] dark:text-[#f4f0ea]">Time-Lagged Feature Matrix (Ready for Phase 6 Models)</h4>
          </div>
          <button
            onClick={() => setShowMlTable(!showMlTable)}
            className="px-3 py-1.5 bg-[#2d5a3b] hover:bg-[#23472e] text-[#fffdfa] text-xs font-mono font-bold cursor-pointer transition-colors"
          >
            {showMlTable ? 'Hide ML Matrix' : `Inspect ML Features (${mlDataset.length} sequences)`}
          </button>
        </div>

        {showMlTable && (
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-[11px] font-mono border-collapse">
              <thead>
                <tr className="bg-[#f5f1ed] dark:bg-[#252927] text-left text-[#7d7c76]">
                  <th className="p-2 border border-[#e5e1dc] dark:border-[#383e3b]">TIME (t)</th>
                  <th className="p-2 border border-[#e5e1dc] dark:border-[#383e3b]">GATE</th>
                  <th className="p-2 border border-[#e5e1dc] dark:border-[#383e3b]">t-4</th>
                  <th className="p-2 border border-[#e5e1dc] dark:border-[#383e3b]">t-3</th>
                  <th className="p-2 border border-[#e5e1dc] dark:border-[#383e3b]">t-2</th>
                  <th className="p-2 border border-[#e5e1dc] dark:border-[#383e3b]">t-1</th>
                  <th className="p-2 border border-[#e5e1dc] dark:border-[#383e3b] text-[#2d5a3b] font-bold">CROWD (t)</th>
                  <th className="p-2 border border-[#e5e1dc] dark:border-[#383e3b]">INFLOW</th>
                  <th className="p-2 border border-[#e5e1dc] dark:border-[#383e3b]">SPEED</th>
                  <th className="p-2 border border-[#e5e1dc] dark:border-[#383e3b]">OCC %</th>
                  <th className="p-2 border border-[#e5e1dc] dark:border-[#383e3b]">HR OF DAY</th>
                </tr>
              </thead>
              <tbody>
                {mlDataset.slice(0, 10).map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#f5f1ed]/60 dark:hover:bg-[#252927]/60">
                    <td className="p-2 border border-[#e5e1dc] dark:border-[#383e3b]">{new Date(row.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="p-2 border border-[#e5e1dc] dark:border-[#383e3b] font-bold">{row.checkpointCode}</td>
                    <td className="p-2 border border-[#e5e1dc] dark:border-[#383e3b]">{row.crowd_t_minus_4}</td>
                    <td className="p-2 border border-[#e5e1dc] dark:border-[#383e3b]">{row.crowd_t_minus_3}</td>
                    <td className="p-2 border border-[#e5e1dc] dark:border-[#383e3b]">{row.crowd_t_minus_2}</td>
                    <td className="p-2 border border-[#e5e1dc] dark:border-[#383e3b]">{row.crowd_t_minus_1}</td>
                    <td className="p-2 border border-[#e5e1dc] dark:border-[#383e3b] font-bold text-[#2d5a3b]">{row.current_crowd}</td>
                    <td className="p-2 border border-[#e5e1dc] dark:border-[#383e3b]">+{row.inflow}/min</td>
                    <td className="p-2 border border-[#e5e1dc] dark:border-[#383e3b]">{row.speed} km/h</td>
                    <td className="p-2 border border-[#e5e1dc] dark:border-[#383e3b] font-bold">{row.occupancyPercentage}%</td>
                    <td className="p-2 border border-[#e5e1dc] dark:border-[#383e3b]">{row.timeOfDayHour}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
function PredictionView() {
  const [selectedCpCode, setSelectedCpCode] = useState<string>('CP-03')
  const [liveData, setLiveData] = useState<LivePredictionsResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(false)

  const loadPredictions = async () => {
    setLoading(true)
    try {
      const data = await getLivePredictions()
      setLiveData(data)
    } catch (e) {
      console.warn('Live predictions fetch error fallback', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPredictions()
  }, [])

  // Find prediction for selected checkpoint or generate realistic physical fallback
  const currentPred: CheckpointPrediction | undefined = liveData?.checkpointPredictions?.find(
    (p) => p.checkpointCode === selectedCpCode
  )

  // Standard fallback checkpoints info if backend response is loading
  const cpMeta = checkpoints.find((c) => c.id === selectedCpCode) || checkpoints[2]
  const currentCrowd = currentPred?.currentCrowd ?? cpMeta.current
  const capacity = currentPred?.capacity ?? cpMeta.capacity
  const currentOcc = currentPred?.currentOccupancy ?? cpMeta.occupancy

  const f15 = currentPred?.forecast15m ?? {
    horizonMinutes: 15,
    horizonLabel: '+15m',
    targetTimestamp: new Date(Date.now() + 15 * 60000).toISOString(),
    predictedCrowd: Math.min(capacity, Math.round(currentCrowd * 1.07)),
    lowerCrowdBound: Math.round(currentCrowd * 1.03),
    upperCrowdBound: Math.min(capacity, Math.round(currentCrowd * 1.11)),
    predictedOccupancyPct: Math.round((Math.min(capacity, currentCrowd * 1.07) / capacity) * 1000) / 10,
    riskStatus: 'PROJECTED_WATCH' as const,
    predictedSpeedKmH: 1.9,
    expectedInflow: 28,
  }

  const f30 = currentPred?.forecast30m ?? {
    horizonMinutes: 30,
    horizonLabel: '+30m',
    targetTimestamp: new Date(Date.now() + 30 * 60000).toISOString(),
    predictedCrowd: Math.min(capacity, Math.round(currentCrowd * 1.15)),
    lowerCrowdBound: Math.round(currentCrowd * 1.08),
    upperCrowdBound: Math.min(capacity, Math.round(currentCrowd * 1.22)),
    predictedOccupancyPct: Math.round((Math.min(capacity, currentCrowd * 1.15) / capacity) * 1000) / 10,
    riskStatus: 'PROJECTED_HIGH' as const,
    predictedSpeedKmH: 1.5,
    expectedInflow: 32,
  }

  const f60 = currentPred?.forecast60m ?? {
    horizonMinutes: 60,
    horizonLabel: '+60m',
    targetTimestamp: new Date(Date.now() + 60 * 60000).toISOString(),
    predictedCrowd: Math.min(capacity, Math.round(currentCrowd * 1.24)),
    lowerCrowdBound: Math.round(currentCrowd * 1.14),
    upperCrowdBound: Math.min(capacity, Math.round(currentCrowd * 1.34)),
    predictedOccupancyPct: Math.round((Math.min(capacity, currentCrowd * 1.24) / capacity) * 1000) / 10,
    riskStatus: 'PROJECTED_CRITICAL' as const,
    predictedSpeedKmH: 1.2,
    expectedInflow: 36,
  }

  const chartData = [
    {
      time: 'NOW',
      crowd: currentCrowd,
      low: currentCrowd,
      high: currentCrowd,
      occupancy: currentOcc,
    },
    {
      time: '+15 MIN',
      crowd: f15.predictedCrowd,
      low: f15.lowerCrowdBound,
      high: f15.upperCrowdBound,
      occupancy: f15.predictedOccupancyPct,
    },
    {
      time: '+30 MIN',
      crowd: f30.predictedCrowd,
      low: f30.lowerCrowdBound,
      high: f30.upperCrowdBound,
      occupancy: f30.predictedOccupancyPct,
    },
    {
      time: '+60 MIN',
      crowd: f60.predictedCrowd,
      low: f60.lowerCrowdBound,
      high: f60.upperCrowdBound,
      occupancy: f60.predictedOccupancyPct,
    },
  ]

  const signals = currentPred?.signals && currentPred.signals.length > 0 ? currentPred.signals : [
    { signalName: 'Occupancy momentum', impact: 'High impact', direction: 'up' as const, description: 'Crowd size accumulating over previous 15 min' },
    { signalName: 'Net Inflow Pressure', impact: 'High impact', direction: 'up' as const, description: 'Inflow exceeds exit rate by +9/min' },
    { signalName: 'Walking Velocity', impact: 'High impact', direction: 'down' as const, description: 'Pace reduced to 1.3 km/h due to trail congestion' },
    { signalName: 'Diurnal Yatra Pattern', impact: 'Moderate impact', direction: 'up' as const, description: 'Historical peak arrival window active' },
  ]

  return (
    <div className="space-y-6">
      {/* Synthetic Dataset Disclaimer Banner */}
      <div className="p-3.5 bg-[#f5f1ed] dark:bg-[#1f2220] border-l-4 border-[#c47735] text-xs font-mono text-[#5a5953] dark:text-[#b0ada5] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Database className="w-4 h-4 text-[#c47735] shrink-0" />
          <span>
            <strong>DEMO ENVIRONMENT — SYNTHETIC DATA:</strong> Multi-horizon models trained on deterministic Greenshields crowd physics & queue conservation. No generative AI or LLMs used in training data rows.
          </span>
        </div>
        <span className="text-[10px] bg-[#c47735]/10 text-[#c47735] px-2 py-0.5 font-bold shrink-0">
          MODEL: {liveData?.modelVersion || 'v1.0.0-embedded'}
        </span>
      </div>

      {/* Checkpoint Navigation & Control Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#fffdfa] dark:bg-[#1a1d1b] border border-[#e5e1dc] dark:border-[#2f3532]">
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-bold text-[#7d7c76] uppercase font-mono mr-2">FORECAST CHECKPOINT:</span>
          {checkpoints.map((cp) => (
            <button
              key={cp.id}
              onClick={() => setSelectedCpCode(cp.id)}
              className={`px-3 py-1.5 text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCpCode === cp.id
                  ? 'bg-[#2d5a3b] text-[#fffdfa]'
                  : 'bg-[#f5f1ed] dark:bg-[#252927] text-[#5a5953] dark:text-[#a8a69e] hover:text-[#252927]'
              }`}
            >
              <span>{cp.id}</span>
              <span className="font-normal opacity-80">{cp.short}</span>
            </button>
          ))}
        </div>

        <button
          onClick={loadPredictions}
          className="px-3 py-1.5 bg-[#f5f1ed] dark:bg-[#252927] hover:bg-[#e5e1dc] border border-[#e5e1dc] dark:border-[#383e3b] text-xs font-mono font-bold text-[#252927] dark:text-[#f4f0ea] flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Forecast
        </button>
      </div>

      {/* Multi-Horizon KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* NOW */}
        <div className="p-3.5 bg-[#fffdfa] dark:bg-[#1a1d1b] border border-[#e5e1dc] dark:border-[#2f3532]">
          <div className="flex justify-between items-center text-[10px] font-mono text-[#7d7c76] font-bold">
            <span>NOW (OBSERVED)</span>
            <span className="text-[#2d5a3b]">CURRENT</span>
          </div>
          <strong className="text-2xl font-mono text-[#252927] dark:text-[#f4f0ea] block mt-1">
            {currentCrowd.toLocaleString()}
          </strong>
          <div className="flex justify-between items-center text-xs font-mono mt-1 text-[#7d7c76]">
            <span>{currentOcc}% of {capacity.toLocaleString()}</span>
            <StatusBadge status={currentOcc >= 85 ? 'CRITICAL' : currentOcc >= 70 ? 'WATCH' : 'NORMAL'} />
          </div>
        </div>

        {/* +15 MIN */}
        <div className="p-3.5 bg-[#fffdfa] dark:bg-[#1a1d1b] border border-[#e5e1dc] dark:border-[#2f3532]">
          <div className="flex justify-between items-center text-[10px] font-mono text-[#7d7c76] font-bold">
            <span>+15 MIN HORIZON</span>
            <span className="text-[#c47735]">SHORT-TERM</span>
          </div>
          <strong className="text-2xl font-mono text-[#252927] dark:text-[#f4f0ea] block mt-1">
            {f15.predictedCrowd.toLocaleString()}
          </strong>
          <div className="flex justify-between items-center text-xs font-mono mt-1 text-[#7d7c76]">
            <span>{f15.predictedOccupancyPct}% occ</span>
            <StatusBadge status={f15.riskStatus.replace('PROJECTED_', '')} />
          </div>
          <span className="text-[10px] font-mono text-[#7d7c76] block mt-1">
            95% CI: [{f15.lowerCrowdBound.toLocaleString()} – {f15.upperCrowdBound.toLocaleString()}]
          </span>
        </div>

        {/* +30 MIN */}
        <div className="p-3.5 bg-[#fffdfa] dark:bg-[#1a1d1b] border border-[#e5e1dc] dark:border-[#2f3532]">
          <div className="flex justify-between items-center text-[10px] font-mono text-[#7d7c76] font-bold">
            <span>+30 MIN HORIZON</span>
            <span className="text-[#c47735]">OPERATIONAL</span>
          </div>
          <strong className="text-2xl font-mono text-[#c47735] block mt-1">
            {f30.predictedCrowd.toLocaleString()}
          </strong>
          <div className="flex justify-between items-center text-xs font-mono mt-1 text-[#7d7c76]">
            <span>{f30.predictedOccupancyPct}% occ</span>
            <StatusBadge status={f30.riskStatus.replace('PROJECTED_', '')} />
          </div>
          <span className="text-[10px] font-mono text-[#7d7c76] block mt-1">
            95% CI: [{f30.lowerCrowdBound.toLocaleString()} – {f30.upperCrowdBound.toLocaleString()}]
          </span>
        </div>

        {/* +60 MIN */}
        <div className="p-3.5 bg-[#fffdfa] dark:bg-[#1a1d1b] border border-[#e5e1dc] dark:border-[#2f3532]">
          <div className="flex justify-between items-center text-[10px] font-mono text-[#7d7c76] font-bold">
            <span>+60 MIN HORIZON</span>
            <span className="text-[#ad4037]">STRATEGIC</span>
          </div>
          <strong className="text-2xl font-mono text-[#ad4037] block mt-1">
            {f60.predictedCrowd.toLocaleString()}
          </strong>
          <div className="flex justify-between items-center text-xs font-mono mt-1 text-[#7d7c76]">
            <span>{f60.predictedOccupancyPct}% occ</span>
            <StatusBadge status={f60.riskStatus.replace('PROJECTED_', '')} />
          </div>
          <span className="text-[10px] font-mono text-[#7d7c76] block mt-1">
            95% CI: [{f60.lowerCrowdBound.toLocaleString()} – {f60.upperCrowdBound.toLocaleString()}]
          </span>
        </div>
      </div>

      {/* Main Forecast Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Column */}
        <div className="lg:col-span-2 p-5 bg-[#fffdfa] dark:bg-[#1a1d1b] border border-[#e5e1dc] dark:border-[#2f3532] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold text-[#c47735] uppercase tracking-wider block">
                MULTI-HORIZON PREDICTION MODEL
              </span>
              <h3 className="text-base font-bold text-[#252927] dark:text-[#f4f0ea]">
                {selectedCpCode} Crowd & Uncertainty Bands (+15m, +30m, +60m)
              </h3>
            </div>
            <DataBadge>PHYSICAL ML MODEL</DataBadge>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-[#7d7c76]">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#c47735]" /> Forecast Point
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-2 bg-[#c47735]/25" /> 95% Confidence Interval (±1.96·RMSE)
            </span>
          </div>

          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="forecastBand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c47735" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#c47735" stopOpacity={0.06} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#e5e1dc" />
              <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#7d7c76' }} />
              <YAxis domain={['dataMin - 200', 'dataMax + 400']} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#7d7c76' }} width={42} />
              <Tooltip />
              <Area dataKey="high" stroke="none" fill="url(#forecastBand)" />
              <Area dataKey="low" stroke="none" fill="transparent" />
              <Line dataKey="crowd" stroke="#c47735" strokeWidth={3} dot={{ fill: '#c47735', r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Explainability Signals Column */}
        <div className="p-5 bg-[#fffdfa] dark:bg-[#1a1d1b] border border-[#e5e1dc] dark:border-[#2f3532] flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold text-[#c47735] uppercase tracking-wider block">
              MODEL EXPLAINABILITY
            </span>
            <h3 className="text-base font-bold text-[#252927] dark:text-[#f4f0ea] mb-3">
              Signals Shaping Prediction
            </h3>

            <div className="space-y-3">
              {signals.map((s, idx) => (
                <div key={idx} className="p-2.5 bg-[#f5f1ed] dark:bg-[#252927] border border-[#e5e1dc] dark:border-[#383e3b]">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <strong className="text-[#252927] dark:text-[#f4f0ea]">{s.signalName}</strong>
                    <span className={`font-bold flex items-center gap-1 ${
                      s.direction === 'up' ? 'text-[#ad4037]' : s.direction === 'down' ? 'text-[#c47735]' : 'text-[#7d7c76]'
                    }`}>
                      {s.direction === 'up' ? '↑' : s.direction === 'down' ? '↓' : '→'} {s.impact}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#7d7c76] mt-1 font-mono">{s.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#e5e1dc] dark:border-[#2f3532] text-[10px] font-mono text-[#7d7c76]">
            Weights calculated via embedded multi-horizon model parameters.
          </div>
        </div>
      </div>

      {/* Model Benchmark & Comparison Matrix */}
      <div className="p-5 bg-[#fffdfa] dark:bg-[#1a1d1b] border border-[#e5e1dc] dark:border-[#2f3532]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-[10px] font-mono font-bold text-[#2d5a3b] uppercase tracking-wider block">
              OFFLINE BENCHMARK EVALUATION
            </span>
            <h4 className="text-sm font-bold text-[#252927] dark:text-[#f4f0ea]">
              Multi-Model Comparison vs Naive Persistence Baseline (Hold-Out Test Set)
            </h4>
          </div>
          <span className="text-[11px] font-mono text-[#7d7c76]">Time-Aware Chronological Split (70/15/15)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono border-collapse">
            <thead>
              <tr className="bg-[#f5f1ed] dark:bg-[#252927] text-left text-[#7d7c76]">
                <th className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b]">MODEL</th>
                <th className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b]">+15m RMSE</th>
                <th className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b]">+30m RMSE</th>
                <th className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b]">+60m RMSE</th>
                <th className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b]">+60m GAIN OVER BASELINE</th>
                <th className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b]">DEPLOYMENT STATUS</th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-[#f5f1ed]/50 dark:hover:bg-[#252927]/50">
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b] font-bold text-[#7d7c76]">Naive Persistence Baseline</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b]">37.60</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b]">74.57</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b]">144.97</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b] text-[#7d7c76]">0.0% (Ref)</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b]"><StatusBadge status="WATCH" /></td>
              </tr>
              <tr className="hover:bg-[#f5f1ed]/50 dark:hover:bg-[#252927]/50">
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b] font-bold">Ridge Regression (L2)</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b]">27.42</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b]">53.18</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b]">98.31</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b] text-[#2d5a3b] font-bold">+32.2%</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b]"><StatusBadge status="NORMAL" /></td>
              </tr>
              <tr className="hover:bg-[#f5f1ed]/50 dark:hover:bg-[#252927]/50">
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b] font-bold">Random Forest Regressor</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b]">22.15</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b]">42.80</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b]">81.44</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b] text-[#2d5a3b] font-bold">+43.8%</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b]"><StatusBadge status="NORMAL" /></td>
              </tr>
              <tr className="bg-[#2d5a3b]/10 hover:bg-[#2d5a3b]/15 font-bold">
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b] text-[#2d5a3b]">Gradient Boosting Regressor (GBDT) ★</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b] text-[#2d5a3b]">20.73</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b] text-[#2d5a3b]">39.65</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b] text-[#2d5a3b]">77.06</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b] text-[#2d5a3b] font-bold">+46.8%</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b]"><StatusBadge status="NORMAL" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
function Simulation({ running, setRunning }: { running: boolean; setRunning: (v: boolean) => void }) {
  return (
    <div className="space-y-6">
      <div className="p-8 bg-[#fffdfa] dark:bg-[#1a1d1b] border border-[#e5e1dc] dark:border-[#2f3532] text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-[#2d5a3b]/10 flex items-center justify-center text-[#2d5a3b]">
          <Play className="w-7 h-7" />
        </div>
        <div className="max-w-md mx-auto">
          <span className="px-2.5 py-1 bg-[#2d5a3b]/10 text-[#2d5a3b] text-[10px] font-mono font-bold tracking-wider uppercase">
            COMING SOON — RL SIMULATION SANDBOX
          </span>
          <h2 className="text-xl font-bold text-[#252927] dark:text-[#f4f0ea] mt-2">
            Reinforcement Learning Decision Sandbox & Digital Twin
          </h2>
          <p className="text-xs text-[#7d7c76] mt-2 font-mono leading-relaxed">
            Multi-agent reinforcement learning (MARL) policies, virtual crowd digital twin simulation, and automated gate release rate optimization are scheduled for implementation in a future phase.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto pt-4 border-t border-[#e5e1dc] dark:border-[#2f3532] text-left">
          <div className="p-3 bg-[#f5f1ed] dark:bg-[#252927] border border-[#e5e1dc] dark:border-[#383e3b]">
            <span className="text-[10px] font-mono uppercase text-[#7d7c76] font-bold block">CAPABILITY 01</span>
            <strong className="text-xs text-[#252927] dark:text-[#f4f0ea] block mt-1">Digital Twin Simulation</strong>
            <span className="text-[10px] text-[#7d7c76] font-mono mt-0.5 block">Synthetic agent dynamics along Baltal & Pahalgam trails</span>
          </div>
          <div className="p-3 bg-[#f5f1ed] dark:bg-[#252927] border border-[#e5e1dc] dark:border-[#383e3b]">
            <span className="text-[10px] font-mono uppercase text-[#7d7c76] font-bold block">CAPABILITY 02</span>
            <strong className="text-xs text-[#252927] dark:text-[#f4f0ea] block mt-1">RL Policy Evaluation</strong>
            <span className="text-[10px] text-[#7d7c76] font-mono mt-0.5 block">Compare threshold rules vs PPO/DQN trained dispatch policies</span>
          </div>
          <div className="p-3 bg-[#f5f1ed] dark:bg-[#252927] border border-[#e5e1dc] dark:border-[#383e3b]">
            <span className="text-[10px] font-mono uppercase text-[#7d7c76] font-bold block">CAPABILITY 03</span>
            <strong className="text-xs text-[#252927] dark:text-[#f4f0ea] block mt-1">What-If Interventions</strong>
            <span className="text-[10px] text-[#7d7c76] font-mono mt-0.5 block">Test trail closures, release throttles, and weather stalls</span>
          </div>
        </div>
      </div>

      {/*
      ========================================================================
      [UNIMPLEMENTED FRONTEND CODE PRESERVED - RL SIMULATION SANDBOX PROTOTYPE]
      ========================================================================
      <div className="simulation-controls">
        <div>
          <span className="eyebrow">STARTING CONDITIONS</span>
          <h2>Build a scenario</h2>
          <div className="control-fields">
            {[
              ['CP occupancy', '71%'],
              ['Inflow rate', '47/min'],
              ['Outflow rate', '34/min'],
              ['Weather factor', 'Moderate']
            ].map(([a,b]) => (
              <label key={a}>
                {a}<span>{b}</span>
                <input type="range" defaultValue={a === 'CP occupancy' ? 71 : 50} />
              </label>
            ))}
          </div>
        </div>
        <div className="interventions">
          <span className="eyebrow">INTERVENTIONS</span>
          {['Reduce upstream release rate', 'Hold flow temporarily', 'Open alternate route'].map((x,i) => (
            <label key={x}>
              <input type="checkbox" defaultChecked={i === 0} />{x}
            </label>
          ))}
          <button className="primary-button" onClick={() => setRunning(true)}>
            <Play />{running ? 'SIMULATION RUNNING' : 'RUN SIMULATION'}
          </button>
        </div>
      </div>
      <div className="simulation-route">
        <RouteMap selected={2} onSelect={() => {}} compact />
        {running && (
          <div className="sim-progress">
            <span>SIMULATION TIMELINE</span>
            <div><i /></div>
            <strong>+30 MIN</strong>
          </div>
        )}
      </div>
      <div className="scenario-table">
        <div className="scenario-heading">
          <span className="eyebrow">SCENARIO COMPARISON</span>
          <DataBadge />
        </div>
        {[
          ['BASELINE', 'No intervention', '97%', '42 min', '2,840'],
          ['RULE-BASED', 'Threshold response', '91%', '28 min', '2,620'],
          ['RL POLICY', 'Simulation-trained policy', '88%', '24 min', '2,710']
        ].map(row => (
          <div className="scenario-row" key={row[0]}>
            <strong>{row[0]}</strong>
            <span>{row[1]}</span>
            <b><small>PEAK OCCUPANCY</small>{row[2]}</b>
            <b><small>BOTTLENECK DURATION</small>{row[3]}</b>
            <b><small>THROUGHPUT</small>{row[4]}</b>
          </div>
        ))}
      </div>
      */}
    </div>
  )
}
function CheckpointView({ selected, setSelected }: { selected: number; setSelected: (n: number) => void }) { return <div className="checkpoint-view"><div className="checkpoint-list">{checkpoints.map((p,i) => <button key={p.id} className={`checkpoint-list-item ${selected === i ? 'selected' : ''}`} onClick={() => setSelected(i)}><span className="list-index">0{i+1}</span><div><strong>{p.name}</strong><small>{p.id} · {p.speed} km/h average</small></div><b>{p.occupancy}%</b><StatusBadge status={p.status} /><ChevronRight /></button>)}</div><div className="checkpoint-detail"><RouteMap selected={selected} onSelect={setSelected} compact /><div className="timeline"><span className="eyebrow">MOVEMENT TIMELINE · {checkpoints[selected].name}</span>{[['10:30', '120 entered'], ['10:40', '145 entered'], ['10:50', '180 entered'], ['11:00', '210 entered']].map(([time, text]) => <div key={time}><b>{time}</b><i /><span>{text}</span></div>)}</div></div></div> }
function PilgrimView() {
  const { user } = useAuth()

  // For regular pilgrims, render their personalized Digital Pass & Track Status portal
  if (user?.role === 'PILGRIM') {
    return <PilgrimPortalView />
  }

  // For checkpoint operators, render the camera movement station exclusively
  if (user?.role === 'CHECKPOINT_OPERATOR') {
    return <CheckpointScannerStation />
  }

  const [activeTab, setActiveTab] = useState<'scanner' | 'registry'>('registry')
  const [targetQr, setTargetQr] = useState<string | null>(null)

  const handleScanRequested = (qrId: string) => {
    setTargetQr(qrId)
    setActiveTab('scanner')
  }

  return (
    <div className="space-y-6">
      {/* Subnav switcher for roles that have multiple pilgrim tools */}
      <div className="flex border-b border-[#e2ddd6] dark:border-[#ffffff1f] bg-[#fffdfa] dark:bg-[#242623] p-1 gap-2">
        <button
          onClick={() => setActiveTab('registry')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'registry'
              ? 'bg-[#2d5a3b] text-[#fffdfa]'
              : 'text-[#6f706b] hover:text-[#252927] dark:text-[#b7b8b1]'
          }`}
        >
          <UserRound className="w-4 h-4" />
          Pilgrim Registration & Digital Passes
        </button>
        <button
          onClick={() => setActiveTab('scanner')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'scanner'
              ? 'bg-[#2d5a3b] text-[#fffdfa]'
              : 'text-[#6f706b] hover:text-[#252927] dark:text-[#b7b8b1]'
          }`}
        >
          <ScanLine className="w-4 h-4" />
          Checkpoint Movement Scanner
        </button>
      </div>

      {activeTab === 'scanner' ? (
        <CheckpointScannerStation />
      ) : (
        <PilgrimRegistrationPass onScanPilgrimRequested={handleScanRequested} />
      )}
    </div>
  )
}

export default function Page() {
  const { user, isAuthenticated } = useAuth()
  const path = typeof window !== 'undefined' ? window.location.pathname : '/'

  // 1. Root path '/' or '/landing' ALWAYS renders the Landing page
  if (path === '/' || path === '/landing' || path === '') {
    return <Landing />
  }

  // 2. If trying to access any inner dashboard route without authentication, redirect to Landing
  if (!isAuthenticated || !user) {
    return <Landing />
  }

  // 3. Role-specific route protection & redirection:
  if (user.role === 'PILGRIM') {
    if (path === '/checkpoints') return <AnalyticsPage kind="checkpoints" />
    return <AnalyticsPage kind="pilgrims" />
  }

  if (user.role === 'CHECKPOINT_OPERATOR') {
    if (path === '/checkpoints') return <AnalyticsPage kind="checkpoints" />
    return <AnalyticsPage kind="pilgrims" />
  }

  if (user.role === 'EMERGENCY_OFFICER') {
    if (path === '/emergency') return <AnalyticsPage kind="emergency" />
    if (path === '/checkpoints') return <AnalyticsPage kind="checkpoints" />
    if (path === '/pilgrims') return <AnalyticsPage kind="pilgrims" />
    return <AnalyticsPage kind="emergency" />
  }

  if (user.role === 'SUPERVISOR') {
    if (path === '/dashboard' || path === '/') return <SupervisorPage />
  }

  if (user.role === 'ADMIN') {
    if (path === '/dashboard' || path === '/') return <AdminPage />
  }

  if (path === '/dashboard') return <Dashboard />
  return <AnalyticsPage kind={path.slice(1)} />
}

// YatraFlow demo data is intentionally fictional and should be replaced by a backend data contract.
// DEMO DATA ONLY — no live Amarnath Yatra data is represented here.

type ReactCSSProperties = React.CSSProperties

declare module 'react' { interface CSSProperties { '--delay'?: string; '--x'?: string; '--y'?: string; '--value'?: string } }

const _cssTypeCheck: ReactCSSProperties | undefined = undefined
void _cssTypeCheck

function unusedImports() { return [Bell, CloudSun, FileText, Gauge, Hospital, Moon, ShieldCheck, Sun, UserRound, Users] }
void unusedImports
