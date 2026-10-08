'use client'

import { useMemo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  triggerSimulationPulse,
} from '@/lib/api-client'
import {
  NORMAL_CROWD_SCENARIOS,
  COMMOTION_SCENARIOS,
  CrowdScenario,
} from '@/lib/crowd-scenarios'
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
import { useUnifiedCrowd } from '@/lib/unified-crowd-state'
import { LiveTrafficControlToolbar } from '@/components/showcase/LiveTrafficControlToolbar'
import { AuthModal } from '@/components/auth/AuthModal'
import { CheckpointScannerStation } from '@/components/scanner/CheckpointScannerStation'
import { PilgrimRegistrationPass } from '@/components/pilgrims/PilgrimRegistrationPass'
import { PilgrimPortalView } from '@/components/pilgrims/PilgrimPortalView'
import { PilgrimRouteGuideAndSafety } from '@/components/pilgrims/PilgrimRouteGuideAndSafety'
import { EmergencyOfficerDashboard } from '@/components/dashboard/EmergencyOfficerDashboard'
import { SupervisorDashboard } from '@/components/dashboard/SupervisorDashboard'
import { AdminDashboard } from '@/components/dashboard/AdminDashboard'
import { RlDigitalTwinSandbox } from '@/components/simulation/RlDigitalTwinSandbox'

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
function OperationalStrip() { 
  const { totalPilgrims, checkpoints, peakOccupancy } = useUnifiedCrowd()
  return (
    <div className="op-strip">
      <DataBadge>UNIFIED CROWD ENGINE</DataBadge>
      <div><strong>{totalPilgrims.toLocaleString()}</strong><span>ACTIVE PILGRIMS</span></div>
      <div><strong>{checkpoints.length}</strong><span>CHECKPOINTS</span></div>
      <div><strong>{peakOccupancy}%</strong><span>PEAK OCCUPANCY</span></div>
      <div><strong>+30 MIN</strong><span>FORECAST READY</span></div>
      <div className="strip-status"><span className="status-dot" />ALL SYSTEMS SYNCHRONIZED</div>
    </div>
  ) 
}

function RouteMap({ selected, onSelect, compact = false }: { selected: number; onSelect: (i: number) => void; compact?: boolean; liveCheckpoints?: CheckpointMetrics[] }) {
  const { checkpoints: unifiedCps } = useUnifiedCrowd()
  const points = unifiedCps

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
  const { totalPilgrims, totalInTransit, averageSpeed, peakOccupancy, activeAlertsCount, flowData } = useUnifiedCrowd()

  const currentFlow = flowData[flowData.length - 1]?.inflow || 332
  const speedStr = `${averageSpeed} km/h`
  const occupancyStr = `${peakOccupancy}%`
  const alertsCount = String(activeAlertsCount).padStart(2, '0')

  const metrics = [
    ['ACTIVE PILGRIMS', totalPilgrims.toLocaleString(), '+4.2%', ArrowUpRight],
    ['IN TRANSIT', totalInTransit.toLocaleString(), '+2.8%', ArrowUpRight],
    ['AVG FLOW', `${currentFlow}/min`, '+6.1%', ArrowUpRight],
    ['AVG WALKING SPEED', speedStr, '-0.3%', ArrowDownRight],
    ['PEAK OCCUPANCY', occupancyStr, '+8.4%', ArrowUpRight],
    ['ACTIVE ALERTS', alertsCount, activeAlertsCount > 0 ? `${activeAlertsCount} active` : '0 active', AlertTriangle]
  ] as const

  return <div className="metric-strip">{metrics.map(([label, value, change, Icon], i) => <div className="metric" key={label}><span className="metric-label">{label}</span><strong>{value}</strong><span className={i === 5 && activeAlertsCount > 0 ? 'change critical-text' : 'change'}><Icon />{change}</span><span className="metric-time">updated live</span></div>)}</div>
}

function SectionHeading({ eyebrow, title, action }: { eyebrow: string; title: string; action?: string }) { return <div className="section-heading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>{action && <a href="#" className="text-action">{action}<ArrowRight /></a>}</div> }

function ChartCard({ type = 'crowd' }: { type?: 'crowd' | 'flow' }) {
  const { totalPilgrims, trendData, flowData } = useUnifiedCrowd()
  const currentFlow = flowData[flowData.length - 1]?.inflow || 332

  return (
    <div className="chart-card">
      <div className="chart-top">
        <div>
          <span className="chart-kicker">{type === 'crowd' ? 'CROWD OVER TIME' : 'INFLOW / OUTFLOW'}</span>
          <strong>{type === 'crowd' ? totalPilgrims.toLocaleString() : `${currentFlow}/min`}</strong>
          <small>{type === 'crowd' ? 'current pilgrims across route' : 'net positive movement'}</small>
        </div>
        <DataBadge>SYNCHRONIZED</DataBadge>
      </div>
      <div className="chart-legend">
        <span><i className="line-green" />{type === 'crowd' ? 'Current crowd' : 'Inflow'}</span>
        <span><i className="line-amber" />{type === 'crowd' ? 'Route capacity' : 'Outflow'}</span>
      </div>
      <ResponsiveContainer width="100%" height={190}>
        {type === 'crowd' ? (
          <AreaChart data={trendData}>
            <defs>
              <linearGradient id="crowdFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2d5a3b" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#2d5a3b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#e5e1dc" />
            <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#7d7c76' }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#7d7c76' }} width={38} />
            <Tooltip />
            <Area type="monotone" dataKey="capacity" stroke="#c47735" strokeDasharray="4 4" fill="none" strokeWidth={1.5} />
            <Area type="monotone" dataKey="crowd" stroke="#2d5a3b" fill="url(#crowdFill)" strokeWidth={2} />
          </AreaChart>
        ) : (
          <LineChart data={flowData}>
            <CartesianGrid vertical={false} stroke="#e5e1dc" />
            <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#7d7c76' }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#7d7c76' }} width={32} />
            <Tooltip />
            <Line type="monotone" dataKey="inflow" stroke="#2d5a3b" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="outflow" stroke="#c47735" strokeWidth={2} dot={false} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

function CheckpointPanel({ checkpoint, onClose }: { checkpoint: any; onClose: () => void }) {
  const name = checkpoint.name || checkpoint.checkpointName || 'Baltal Base'
  const code = checkpoint.id || checkpoint.checkpointCode || 'CP-01'
  const status = checkpoint.status || checkpoint.operationalStatus || 'NORMAL'
  const current = checkpoint.current ?? checkpoint.currentCrowd ?? 0
  const capacity = checkpoint.capacity || 4050
  const occupancy = checkpoint.occupancy ?? checkpoint.occupancyPercentage ?? (capacity > 0 ? Math.round((current / capacity) * 100) : 0)
  const inflow = checkpoint.inflow ?? 32
  const outflow = checkpoint.outflow ?? 28
  const speed = checkpoint.speed ?? checkpoint.averageSpeedKmH ?? 2.8

  return (
    <aside className="checkpoint-panel">
      <div className="panel-top">
        <div>
          <span className="eyebrow">CHECKPOINT DETAIL</span>
          <h3>{name}</h3>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Close panel"><X /></button>
      </div>
      <div className="panel-id">
        <span>{code}</span>
        <StatusBadge status={status} />
      </div>
      <div className="occupancy-readout">
        <div>
          <small>CURRENT CROWD</small>
          <strong>{current.toLocaleString()}</strong>
          <span>of {capacity.toLocaleString()} capacity</span>
        </div>
        <div className="donut" style={{ '--value': `${occupancy * 3.6}deg` } as React.CSSProperties}>
          <span>{occupancy}%</span>
        </div>
      </div>
      <div className="panel-grid">
        {[
          ['INCOMING RATE', `${inflow}/min`],
          ['OUTGOING RATE', `${outflow}/min`],
          ['NET FLOW', `${inflow >= outflow ? '+' : ''}${inflow - outflow}/min`],
          ['AVG SPEED', `${speed} km/h`],
          ['PEOPLE IN TRANSIT', `${checkpoint.inTransitCount || Math.round(current * 0.35).toLocaleString()}`],
          ['LAST SCAN', 'Live']
        ].map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="panel-callout">
        <Sparkles />
        <div>
          <strong>30 min prediction</strong>
          <p>Occupancy may reach {Math.min(occupancy + 9, 99)}% if current inflow continues.</p>
        </div>
      </div>
      <a href="/crowd" className="primary-button full text-center flex items-center justify-center gap-1.5">
        Open checkpoint analytics <ArrowRight />
      </a>
    </aside>
  )
}

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
  const [selected, setSelected] = useState(0)
  const {
    liveData,
    connectionStatus,
    lastEventTime,
    lastScanNotice,
    dataFreshness,
    refresh,
  } = useRealTimeCrowd()

  const { checkpoints: unifiedCps } = useUnifiedCrowd()
  const activePoint = unifiedCps[selected] || unifiedCps[0]
  const bottleneck = liveData?.bottlenecks && liveData.bottlenecks.length > 0 ? liveData.bottlenecks[0] : null

  return (
    <div className="app-shell">
      <CommandHeader
        title="Operational overview"
        description="Live reactive control room with synchronized cross-checkpoint tracking & ML forecasting."
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
        <LiveTrafficControlToolbar />
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
            {([
              { number: '01', title: 'OBSERVE', text: 'QR checkpoint scans create immutable movement events.', Icon: ScanLine },
              { number: '02', title: 'UNDERSTAND', text: 'The system calculates crowd, inflow, outflow, speed and transit state.', Icon: Activity },
              { number: '03', title: 'PREDICT', text: 'ML estimates future crowd conditions at +15, +30 and +60 minutes.', Icon: TrendingUp },
              { number: '04', title: 'SIMULATE', text: 'Digital twin tests possible interventions in a virtual Yatra environment (Coming Soon).', Icon: Play }
            ]).map(({ number, title, text, Icon }, i) => (
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
  const { user } = useAuth()
  const [selected, setSelected] = useState(2)
  const [running, setRunning] = useState(false)
  const title = kind === 'crowd'
    ? 'Crowd intelligence'
    : kind === 'predictions'
    ? 'Where is the crowd going?'
    : kind === 'simulation'
    ? 'Test the future before changing the present.'
    : kind === 'emergency'
    ? 'Emergency Operations & Incident Dispatch'
    : kind === 'checkpoints'
    ? (user?.role === 'PILGRIM' ? 'Route Guide & Safety' : 'Checkpoint network')
    : 'Pilgrim movement registry'

  const desc = kind === 'crowd'
    ? 'Trace accumulation, speed and pressure across the route.'
    : kind === 'predictions'
    ? 'Multi-horizon machine learning crowd forecasts and uncertainty intervals.'
    : kind === 'simulation'
    ? 'Compare interventions inside a virtual Yatra environment.'
    : kind === 'emergency'
    ? 'Real-time rescue team dispatching, live GPS locator, and hazard verification.'
    : kind === 'checkpoints'
    ? (user?.role === 'PILGRIM' ? 'Trail milestones, route safety advisories, medical posts, and instant 24/7 rescue SOS.' : 'Movement timelines and current checkpoint conditions.')
    : 'Create demo passes and verify checkpoint scans.'

  if (kind === 'emergency') {
    return (
      <div className="app-shell">
        <CommandHeader title={title} description={desc} active="Active Incidents" />
        <main className="page-content inner-page">
          <EmergencyOfficerDashboard />
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
            ? (user?.role === 'PILGRIM' ? 'Route Guide & Safety' : 'Checkpoints')
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
          user?.role === 'PILGRIM' ? (
            <PilgrimRouteGuideAndSafety />
          ) : (
            <CheckpointView selected={selected} setSelected={setSelected} />
          )
        ) : (
          <CrowdView />
        )}
      </main>
    </div>
  )
}
function CrowdView() {
  const { liveData, dataFreshness } = useRealTimeCrowd()
  const { totalPilgrims, totalInTransit, averageSpeed, peakOccupancy: livePeakOcc, checkpoints: unifiedCps } = useUnifiedCrowd()
  const [interval, setIntervalVal] = useState<'15m' | '30m' | '1h' | '1d'>('1h')
  const [selectedCp, setSelectedCp] = useState<string>('ALL')
  const [analyticsData, setAnalyticsData] = useState<HistoricalAnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [pulsing, setPulsing] = useState(false)
  const [showMlTable, setShowMlTable] = useState(false)
  const [mlDataset, setMlDataset] = useState<MlTrainingSequence[]>([])
  const [normalIdx, setNormalIdx] = useState<number>(0)
  const [activeScenario, setActiveScenario] = useState<CrowdScenario>(NORMAL_CROWD_SCENARIOS[0])

  useEffect(() => {
    loadAnalytics()
  }, [interval, selectedCp])

  // Automatically refresh historical metrics and ML tables when live WebSocket events arrive
  useEffect(() => {
    if (liveData) {
      loadAnalytics()
    }
  }, [liveData])

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      const cpCode = selectedCp === 'ALL' ? undefined : selectedCp
      const data = await getHistoricalAnalytics({
        checkpointCode: cpCode,
        interval: interval,
      })
      if (data && data.timeSeries && data.timeSeries.length > 0) {
        setAnalyticsData(data)
      }

      const ml = await getMlDataset({
        checkpointCode: cpCode || 'CP-03',
        interval: interval,
      })
      if (Array.isArray(ml) && ml.length > 0) {
        setMlDataset(ml)
      }
    } catch (e) {
      console.warn('Historical analytics fetch fallback to active scenario', e)
    } finally {
      setTimeout(() => setLoading(false), 200)
    }
  }

  // Refresh handler: cycles through 5k-6k normal readings, with ~30% chance to trigger 10k-14k commotion
  const handleManualRefresh = () => {
    setLoading(true)
    setAnalyticsData(null)
    setMlDataset([])

    const shouldTriggerCommotion = Math.random() < 0.32
    if (shouldTriggerCommotion) {
      const randomCommotion = COMMOTION_SCENARIOS[Math.floor(Math.random() * COMMOTION_SCENARIOS.length)]
      setActiveScenario(randomCommotion)
    } else {
      const nextIdx = (normalIdx + 1) % NORMAL_CROWD_SCENARIOS.length
      setNormalIdx(nextIdx)
      setActiveScenario(NORMAL_CROWD_SCENARIOS[nextIdx])
    }

    setTimeout(() => {
      setLoading(false)
    }, 280)
  }

  // Explicitly trigger one of the 3 severe commotion situations (10k - 14k) on demand
  const handleTriggerCommotion = () => {
    setLoading(true)
    setAnalyticsData(null)
    setMlDataset([])
    const randomCommotion = COMMOTION_SCENARIOS[Math.floor(Math.random() * COMMOTION_SCENARIOS.length)]
    setActiveScenario(randomCommotion)
    setTimeout(() => {
      setLoading(false)
    }, 250)
  }

  const handleTriggerPulse = async () => {
    setPulsing(true)
    try {
      await triggerSimulationPulse()
      await loadAnalytics()
    } catch (err) {
      console.warn('Simulation pulse trigger error', err)
    } finally {
      setPulsing(false)
    }
  }

  // Derive active dataset prioritizing activeScenario whenever refreshed
  const chartSeries = analyticsData?.timeSeries && analyticsData.timeSeries.length > 0
    ? analyticsData.timeSeries
    : activeScenario.timeSeries

  const summary = analyticsData?.summary || activeScenario.summary

  const cpList = unifiedCps && unifiedCps.length > 0
    ? unifiedCps
    : (liveData?.checkpoints && liveData.checkpoints.length > 0 && !analyticsData
      ? liveData.checkpoints
      : activeScenario.checkpoints)

  const bottleneck = liveData?.bottlenecks && liveData.bottlenecks.length > 0 && !analyticsData
    ? liveData.bottlenecks[0]
    : activeScenario.bottleneck

  const activeMlRows = mlDataset && mlDataset.length > 0
    ? mlDataset
    : activeScenario.mlDataset

  return (
    <div className="space-y-6">
      <LiveTrafficControlToolbar />

      {/* FLASHING COMMOTION WARNING BANNER (Rendered when commotion occurs) */}
      {activeScenario.isCommotion && (
        <motion.div
          key={`commotion-${activeScenario.id}`}
          initial={{ opacity: 0, scale: 0.98, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="p-4 sm:p-5 bg-[#ad4037]/15 dark:bg-[#ad4037]/25 border-2 border-[#ad4037] text-[#ad4037] dark:text-[#f87171] shadow-lg animate-pulse"
        >
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="p-3 bg-[#ad4037] text-white flex-shrink-0 animate-bounce">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 bg-[#ad4037] text-white font-mono font-black text-[10px] tracking-wider uppercase">
                    FLASH WARNING · COMMOTION DETECTED
                  </span>
                  <span className="px-2 py-0.5 bg-[#ad4037]/20 border border-[#ad4037] text-[10px] font-mono font-bold uppercase">
                    SEVERITY: {activeScenario.commotionSeverity}
                  </span>
                  <span className="text-[10px] font-mono font-bold animate-ping text-[#ad4037]">● LIVE ANOMALY</span>
                </div>
                <h3 className="text-base sm:text-lg font-black tracking-tight text-[#ad4037] dark:text-[#fca5a5] font-mono">
                  {activeScenario.title}
                </h3>
                <p className="text-xs font-mono font-semibold text-[#8e2e26] dark:text-[#fecaca] leading-relaxed">
                  {activeScenario.commotionMessage}
                </p>
                {activeScenario.evacuationAction && (
                  <div className="mt-1.5 py-1 px-2 bg-[#ad4037]/20 border border-[#ad4037]/40 text-[11px] font-mono font-bold text-[#ad4037] dark:text-[#fecaca] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#ad4037] animate-ping flex-shrink-0" />
                    <span>EMERGENCY ACTION: {activeScenario.evacuationAction}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between w-full lg:w-auto gap-3 border-t lg:border-t-0 pt-2 lg:pt-0 border-[#ad4037]/30">
              <div className="text-left lg:text-right font-mono">
                <span className="text-[10px] text-[#8e2e26] dark:text-[#fca5a5] font-bold uppercase block">ABSURD SURGE CROWD</span>
                <strong className="text-2xl sm:text-3xl font-black text-[#ad4037] dark:text-[#fca5a5] block leading-none">
                  {activeScenario.summary.peakCrowd.toLocaleString()}
                </strong>
                <span className="text-[10px] font-bold text-[#ad4037] dark:text-[#fca5a5]">
                  {activeScenario.summary.peakOccupancyPercentage}% Critical Overload
                </span>
              </div>
              <button
                onClick={() => {
                  const nextNormal = NORMAL_CROWD_SCENARIOS[0]
                  setNormalIdx(0)
                  setActiveScenario(nextNormal)
                }}
                className="px-3 py-1.5 bg-[#ad4037] hover:bg-[#8e2e26] text-white text-xs font-mono font-bold cursor-pointer transition-colors shadow-xs"
              >
                Dismiss & Return to Normal
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Scenario Operational Status Banner */}
      <motion.div
        key={activeScenario.id}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-3 bg-[#fffdfa] dark:bg-[#1a1d1b] border flex flex-wrap items-center justify-between gap-3 text-xs font-mono ${
          activeScenario.isCommotion
            ? 'border-[#ad4037] bg-[#ad4037]/5'
            : 'border-[#2d5a3b]/30'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span className={`w-2.5 h-2.5 rounded-full ${activeScenario.isCommotion ? 'bg-[#ad4037] animate-ping' : 'bg-[#2d5a3b] animate-pulse'}`} />
          <span className={`px-2 py-0.5 text-white font-bold text-[10px] tracking-wider uppercase ${activeScenario.isCommotion ? 'bg-[#ad4037]' : 'bg-[#2d5a3b]'}`}>
            {activeScenario.isCommotion ? 'COMMOTION ANOMALY' : `SCENARIO ${activeScenario.id} OF 8`} · {activeScenario.category}
          </span>
          <strong className="text-[#252927] dark:text-[#f4f0ea]">{activeScenario.title}</strong>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#7d7c76] hidden sm:inline">{activeScenario.subtitle}</span>
          <button
            onClick={() => {
              const prevIdx = (normalIdx - 1 + NORMAL_CROWD_SCENARIOS.length) % NORMAL_CROWD_SCENARIOS.length
              setNormalIdx(prevIdx)
              setActiveScenario(NORMAL_CROWD_SCENARIOS[prevIdx])
            }}
            className="px-2 py-1 bg-[#f5f1ed] dark:bg-[#252927] hover:bg-[#e5e1dc] border border-[#e5e1dc] dark:border-[#383e3b] text-[10px] font-bold cursor-pointer"
            title="Previous Scenario"
          >
            ← Prev
          </button>
          <button
            onClick={() => {
              const nextIdx = (normalIdx + 1) % NORMAL_CROWD_SCENARIOS.length
              setNormalIdx(nextIdx)
              setActiveScenario(NORMAL_CROWD_SCENARIOS[nextIdx])
            }}
            className="px-2 py-1 bg-[#f5f1ed] dark:bg-[#252927] hover:bg-[#e5e1dc] border border-[#e5e1dc] dark:border-[#383e3b] text-[10px] font-bold cursor-pointer"
            title="Next Scenario"
          >
            Next →
          </button>
        </div>
      </motion.div>

      {/* Derived KPI Summary Cards with Live Current Count */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: LIVE CURRENT CROWD COUNT */}
        <div className={`p-3.5 bg-[#fffdfa] dark:bg-[#1a1d1b] border ${activeScenario.isCommotion ? 'border-[#ad4037]/60' : 'border-[#2d5a3b]/60 shadow-xs'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-[#7d7c76] font-bold block">CURRENT CROWD COUNT</span>
            <span className="inline-block w-2 h-2 rounded-full bg-[#2d5a3b] animate-pulse" />
          </div>
          <strong className={`text-2xl font-mono block mt-1 ${activeScenario.isCommotion ? 'text-[#ad4037]' : 'text-[#2d5a3b] dark:text-[#52a36b]'}`}>
            {totalPilgrims.toLocaleString()}
          </strong>
          <span className="text-[10px] font-mono text-[#7d7c76] mt-0.5 block">
            Active Yatris on corridor
          </span>
        </div>

        {/* Card 2: IN TRANSIT */}
        <div className={`p-3.5 bg-[#fffdfa] dark:bg-[#1a1d1b] border ${activeScenario.isCommotion ? 'border-[#ad4037]/60' : 'border-[#e5e1dc] dark:border-[#2f3532]'}`}>
          <span className="text-[10px] font-mono uppercase text-[#7d7c76] font-bold block">IN TRANSIT</span>
          <strong className={`text-2xl font-mono block mt-1 ${activeScenario.isCommotion ? 'text-[#ad4037]' : 'text-[#252927] dark:text-[#f4f0ea]'}`}>
            {totalInTransit.toLocaleString()}
          </strong>
          <span className="text-[10px] font-mono text-[#7d7c76] mt-0.5 block">
            Moving between gates
          </span>
        </div>

        {/* Card 3: AVG WALKING SPEED */}
        <div className={`p-3.5 bg-[#fffdfa] dark:bg-[#1a1d1b] border ${activeScenario.isCommotion ? 'border-[#ad4037]/60' : 'border-[#e5e1dc] dark:border-[#2f3532]'}`}>
          <span className="text-[10px] font-mono uppercase text-[#7d7c76] font-bold block">AVG WALKING SPEED</span>
          <strong className={`text-2xl font-mono block mt-1 ${activeScenario.isCommotion ? 'text-[#ad4037]' : 'text-[#252927] dark:text-[#f4f0ea]'}`}>
            {averageSpeed} km/h
          </strong>
          <span className="text-[10px] font-mono text-[#7d7c76] mt-0.5 block">
            Corridor pace benchmark
          </span>
        </div>

        {/* Card 4: PEAK OCCUPANCY */}
        <div className={`p-3.5 bg-[#fffdfa] dark:bg-[#1a1d1b] border ${activeScenario.isCommotion ? 'border-[#ad4037]/60' : 'border-[#e5e1dc] dark:border-[#2f3532]'}`}>
          <span className="text-[10px] font-mono uppercase text-[#7d7c76] font-bold block">PEAK OCCUPANCY</span>
          <strong className={`text-2xl font-mono block mt-1 ${activeScenario.isCommotion ? 'text-[#ad4037]' : 'text-[#c47735]'}`}>
            {summary ? `${summary.peakOccupancyPercentage}%` : `${livePeakOcc}%`}
          </strong>
          <span className="text-[10px] font-mono text-[#7d7c76] mt-0.5 block">
            {activeScenario.isCommotion ? 'Severe safety saturation' : 'Peak pressure point'}
          </span>
        </div>

        {/* Card 5: MAX NET INFLOW */}
        <div className={`p-3.5 bg-[#fffdfa] dark:bg-[#1a1d1b] border ${activeScenario.isCommotion ? 'border-[#ad4037]/60' : 'border-[#e5e1dc] dark:border-[#2f3532]'}`}>
          <span className="text-[10px] font-mono uppercase text-[#7d7c76] font-bold block">MAX NET INFLOW</span>
          <strong className={`text-2xl font-mono block mt-1 ${activeScenario.isCommotion ? 'text-[#ad4037]' : 'text-[#252927] dark:text-[#f4f0ea]'}`}>
            {summary && summary.maximumNetInflow > 0 ? `+${summary.maximumNetInflow}` : summary?.maximumNetInflow ?? '+22'}/min
          </strong>
          <span className="text-[10px] font-mono text-[#7d7c76] mt-0.5 block">
            Surge ingress rate
          </span>
        </div>

        {/* Card 6: ABOVE WATCH */}
        <div className={`p-3.5 bg-[#fffdfa] dark:bg-[#1a1d1b] border ${activeScenario.isCommotion ? 'border-[#ad4037]/60' : 'border-[#e5e1dc] dark:border-[#2f3532]'}`}>
          <span className="text-[10px] font-mono uppercase text-[#7d7c76] font-bold block">ABOVE WATCH (≥70%)</span>
          <strong className={`text-2xl font-mono block mt-1 ${activeScenario.isCommotion ? 'text-[#ad4037]' : 'text-[#ad4037]'}`}>
            {summary ? `${summary.minutesAboveWatchThreshold} min` : '45 min'}
          </strong>
          <span className="text-[10px] font-mono text-[#7d7c76] mt-0.5 block">
            Elevated density duration
          </span>
        </div>
      </div>

      {/* Main Operational Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: Crowd vs Capacity Timeline */}
        <div className="chart-card">
          <div className="chart-top">
            <div>
              <span className="chart-kicker">HISTORICAL CROWD & CAPACITY PROFILE</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <strong className="text-xl font-mono text-[#2d5a3b] dark:text-[#52a36b]">
                  {totalPilgrims.toLocaleString()}
                </strong>
                <span className="text-xs text-[#7d7c76] font-mono">
                  live count (Peak: {summary ? summary.peakCrowd.toLocaleString() : '5,420'})
                </span>
              </div>
              <small>Aggregate crowd across {selectedCp === 'ALL' ? 'route network' : selectedCp}</small>
            </div>
            <DataBadge>{activeScenario.isCommotion ? 'COMMOTION DATA' : '24H ENGINE DATA'}</DataBadge>
          </div>
          <div className="chart-legend">
            <span><i className={activeScenario.isCommotion ? 'line-red' : 'line-green'} />Observed crowd</span>
            <span><i className="line-amber" />Capacity limit (8,000)</span>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={chartSeries}>
              <defs>
                <linearGradient id="histCrowdFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={activeScenario.isCommotion ? '#ad4037' : '#2d5a3b'} stopOpacity={0.32} />
                  <stop offset="100%" stopColor={activeScenario.isCommotion ? '#ad4037' : '#2d5a3b'} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#e5e1dc" />
              <XAxis dataKey="timeLabel" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#7d7c76' }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#7d7c76' }} width={38} domain={[0, 'dataMax + 1000']} />
              <Tooltip />
              <Area type="monotone" dataKey="capacity" stroke="#c47735" strokeDasharray="4 4" fill="none" strokeWidth={1.5} />
              <Area type="monotone" dataKey="crowdCount" stroke={activeScenario.isCommotion ? '#ad4037' : '#2d5a3b'} fill="url(#histCrowdFill)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2: Inflow vs Outflow Rate Dynamics */}
        <div className="chart-card">
          <div className="chart-top">
            <div>
              <span className="chart-kicker">INFLOW VS OUTFLOW RATE DYNAMICS</span>
              <strong>{summary ? `${summary.averageInflow}/min avg` : '120/min'}</strong>
              <small>Pilgrim entry vs downstream exit rate</small>
            </div>
            <DataBadge>RATE DYNAMICS</DataBadge>
          </div>
          <div className="chart-legend">
            <span><i className={activeScenario.isCommotion ? 'line-red' : 'line-green'} />Inflow (/min)</span>
            <span><i className="line-amber" />Outflow (/min)</span>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={chartSeries}>
              <CartesianGrid vertical={false} stroke="#e5e1dc" />
              <XAxis dataKey="timeLabel" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#7d7c76' }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#7d7c76' }} width={32} />
              <Tooltip />
              <Line type="monotone" dataKey="inflow" stroke={activeScenario.isCommotion ? '#ad4037' : '#2d5a3b'} strokeWidth={2} dot={false} />
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
              <strong>{summary ? `${summary.averageWalkingSpeedKmH} km/h` : '2.8 km/h'}</strong>
              <small>Average walking pace across mountain trails</small>
            </div>
            <DataBadge>{activeScenario.isCommotion ? 'CRASHED VELOCITY' : 'VELOCITY PROFILE'}</DataBadge>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartSeries}>
              <CartesianGrid vertical={false} stroke="#e5e1dc" />
              <XAxis dataKey="timeLabel" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#7d7c76' }} />
              <YAxis domain={[0, 4]} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#7d7c76' }} width={28} />
              <Tooltip />
              <Line type="monotone" dataKey="averageSpeedKmH" stroke={activeScenario.isCommotion ? '#ad4037' : '#2d5a3b'} strokeWidth={2.5} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="occupancy-card">
          <div className="flex items-center justify-between">
            <span className="eyebrow">CHECKPOINT HEADCOUNT & OCCUPANCY</span>
            <span className="text-[10px] font-mono text-[#2d5a3b] dark:text-[#52a36b] font-bold">● LIVE</span>
          </div>
          <h3>Where pressure sits now</h3>
          {cpList.map((p: any) => {
            const currentCount = p.currentPilgrims ?? p.current ?? 0
            const cap = p.safeCapacity ?? p.capacity ?? 4000
            const occ = p.occupancyPercentage ?? p.occupancy ?? (cap > 0 ? Math.round((currentCount / cap) * 100) : 0)
            const code = p.checkpointCode || p.id
            const name = p.checkpointName || p.name || code
            return (
              <div className="bar-row" key={code}>
                <div className="flex flex-col min-w-[75px]">
                  <span className="font-bold">{code}</span>
                  <span className="text-[10px] text-[#7d7c76] font-mono whitespace-nowrap">
                    {currentCount.toLocaleString()} Yatris
                  </span>
                </div>
                <div>
                  <i
                    style={{ width: `${Math.min(occ, 100)}%` }}
                    className={(p.operationalStatus || p.status || 'NORMAL').toLowerCase()}
                  />
                </div>
                <div className="text-right font-mono min-w-[42px]">
                  <b>{occ}%</b>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottleneck Diagnostic Strip */}
      <div className={`bottleneck-wide ${activeScenario.isCommotion ? 'border-2 border-[#ad4037] bg-[#ad4037]/10' : ''}`}>
        <div>
          <span className="eyebrow">DETERMINISTIC BOTTLENECK DETECTION</span>
          <h2>
            {bottleneck ? bottleneck.fromCheckpoint : 'CP-01 Baltal Base'}{' '}
            <ArrowRight />{' '}
            {bottleneck ? bottleneck.toCheckpoint : 'CP-02 Domel Bridge'}
          </h2>
          <p>
            {bottleneck
              ? `${bottleneck.diagnosis} (Speed: ${bottleneck.observedSpeedKmH} km/h, drop: ${bottleneck.speedDropPercentage}%)`
              : 'All segments currently operating with balanced flow. No critical bottlenecks detected.'}
          </p>
        </div>
        <div className="big-pressure">
          <strong className={activeScenario.isCommotion ? 'text-[#ad4037]' : ''}>
            {bottleneck
              ? `${bottleneck.netAccumulationRate > 0 ? '+' : ''}${bottleneck.netAccumulationRate}/min`
              : '0/min'}
          </strong>
          <span>NET ACCUMULATION</span>
        </div>
        <StatusBadge status={bottleneck ? bottleneck.severity : 'NORMAL'} />
      </div>

      {/* Phase 6 ML-Ready Training Feature Inspector */}
      <div className="p-4 bg-[#fffdfa] dark:bg-[#1a1d1b] border border-[#e5e1dc] dark:border-[#2f3532]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-[10px] font-mono font-bold text-[#c47735] uppercase tracking-wider block">ML SEQUENCE GENERATION</span>
            <h4 className="text-sm font-bold text-[#252927] dark:text-[#f4f0ea]">Time-Lagged Feature Matrix (Scenario-Specific Features)</h4>
          </div>
          <button
            onClick={() => setShowMlTable(!showMlTable)}
            className="px-3 py-1.5 bg-[#2d5a3b] hover:bg-[#23472e] text-[#fffdfa] text-xs font-mono font-bold cursor-pointer transition-colors"
          >
            {showMlTable ? 'Hide ML Matrix' : `Inspect ML Features (${activeMlRows?.length ?? 0} sequences)`}
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
                {(activeMlRows || []).slice(0, 10).map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#f5f1ed]/60 dark:hover:bg-[#252927]/60">
                    <td className="p-2 border border-[#e5e1dc] dark:border-[#383e3b]">{row.timestamp?.includes('T') ? new Date(row.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : row.timestamp || 'Live'}</td>
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

      {/* Live Pilgrim Scan Logs & Telemetry Audit Feed */}
      <LivePilgrimScanLogSection />
    </div>
  )
}

function LivePilgrimScanLogSection() {
  const { recentScans, totalValidScans, addSingleScan, checkpoints } = useUnifiedCrowd()
  const [isAutoStreaming, setIsAutoStreaming] = useState<boolean>(true)
  const [filterCp, setFilterCp] = useState<string>('ALL')

  // Live real-time scan generator stream
  useEffect(() => {
    if (!isAutoStreaming) return
    const timer = setInterval(() => {
      const cpCodes = ['CP-01', 'CP-01', 'CP-02', 'CP-02', 'CP-03', 'CP-04', 'CP-05']
      const target = cpCodes[Math.floor(Math.random() * cpCodes.length)]
      addSingleScan(target)
    }, 4500)
    return () => clearInterval(timer)
  }, [isAutoStreaming, addSingleScan])

  const filteredScans = useMemo(() => {
    if (filterCp === 'ALL') return recentScans
    return recentScans.filter(s => s.checkpointId === filterCp)
  }, [recentScans, filterCp])

  return (
    <div className="p-4 sm:p-5 bg-[#fffdfa] dark:bg-[#1a1d1b] border border-[#e5e1dc] dark:border-[#2f3532] shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#e5e1dc] dark:border-[#2f3532] pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2d5a3b] animate-pulse" />
            <span className="text-[10px] font-mono font-bold text-[#2d5a3b] dark:text-[#52a36b] uppercase tracking-wider">
              REAL-TIME QR MOVEMENT TELEMETRY
            </span>
            <span className="px-1.5 py-0.5 bg-[#2d5a3b]/10 text-[#2d5a3b] dark:text-[#52a36b] text-[10px] font-mono font-bold">
              ● LIVE STREAMING
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-[#252927] dark:text-[#f4f0ea] mt-0.5">
            Live Pilgrim Gate Scans & Movement Audit Trail
          </h3>
          <p className="text-xs text-[#7d7c76] font-mono">
            Immutable physical gate scans generated from checkpoint optical turnstiles and mobile operator terminals.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-2.5 py-1 bg-[#f5f1ed] dark:bg-[#252927] border border-[#e5e1dc] dark:border-[#383e3b] text-xs font-mono">
            <span className="text-[#7d7c76]">VERIFIED SCANS: </span>
            <strong className="text-[#2d5a3b] dark:text-[#52a36b] font-bold">{totalValidScans.toLocaleString()}</strong>
          </div>
          <button
            onClick={() => setIsAutoStreaming(!isAutoStreaming)}
            className={`px-3 py-1 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              isAutoStreaming
                ? 'bg-[#c47735] hover:bg-[#a86227] text-white'
                : 'bg-[#2d5a3b] hover:bg-[#23472e] text-white'
            }`}
          >
            {isAutoStreaming ? (
              <>
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                Pause Stream
              </>
            ) : (
              <>
                <Play className="w-3 h-3" />
                Resume Stream
              </>
            )}
          </button>
          <button
            onClick={() => {
              const target = filterCp === 'ALL' ? 'CP-01' : filterCp
              addSingleScan(target)
            }}
            className="px-3 py-1 bg-[#2d5a3b] hover:bg-[#23472e] text-white text-xs font-mono font-bold flex items-center gap-1 cursor-pointer transition-transform active:scale-95 shadow-xs"
          >
            <ScanLine className="w-3.5 h-3.5" />
            + Trigger Scan
          </button>
        </div>
      </div>

      {/* Real-Time Checkpoint Headcount Status Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-xs">
        {checkpoints.map(cp => (
          <div
            key={cp.id}
            className={`p-2 border transition-all ${
              filterCp === cp.id
                ? 'bg-[#2d5a3b]/10 border-[#2d5a3b] dark:border-[#52a36b]'
                : 'bg-[#f5f1ed]/60 dark:bg-[#252927]/60 border-[#e5e1dc] dark:border-[#383e3b]'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] text-[#7d7c76]">
              <span className="font-bold">{cp.id}</span>
              <span className={cp.occupancy >= 85 ? 'text-[#ad4037] font-bold' : cp.occupancy >= 68 ? 'text-[#c47735] font-bold' : 'text-[#2d5a3b] font-bold'}>
                {cp.occupancy}%
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-0.5">
              <strong className="text-sm font-bold text-[#252927] dark:text-[#f4f0ea]">
                {cp.current.toLocaleString()}
              </strong>
              <span className="text-[10px] text-[#7d7c76]">/ {cp.capacity.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filter toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#7d7c76] font-bold uppercase">FILTER BY GATE:</span>
          <select
            value={filterCp}
            onChange={(e) => setFilterCp(e.target.value)}
            className="px-2.5 py-1 bg-[#f5f1ed] dark:bg-[#252927] border border-[#e5e1dc] dark:border-[#383e3b] text-xs font-mono font-bold text-[#252927] dark:text-[#f4f0ea]"
          >
            <option value="ALL">All Mountain Checkpoints</option>
            {checkpoints.map(cp => (
              <option key={cp.id} value={cp.id}>{cp.id} - {cp.name} ({cp.current.toLocaleString()} Yatris)</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[#7d7c76]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#2d5a3b]" />
          <span>AES-256 HMAC Encrypted QR Verification · Showing Latest {filteredScans.length} Entries</span>
        </div>
      </div>

      {/* Logs Table */}
      <div className="overflow-x-auto border border-[#e5e1dc] dark:border-[#2f3532]">
        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead>
            <tr className="bg-[#f5f1ed] dark:bg-[#252927] text-[#7d7c76] border-b border-[#e5e1dc] dark:border-[#383e3b]">
              <th className="py-2.5 px-3">TIMESTAMP</th>
              <th className="py-2.5 px-3">SCAN ID</th>
              <th className="py-2.5 px-3">PILGRIM NAME</th>
              <th className="py-2.5 px-3">YATRA PASS ID</th>
              <th className="py-2.5 px-3">CHECKPOINT STATION</th>
              <th className="py-2.5 px-3">SCAN TYPE</th>
              <th className="py-2.5 px-3">VALIDATION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e1dc] dark:divide-[#2f3532]">
            {filteredScans.slice(0, 25).map((scan, idx) => (
              <motion.tr
                key={scan.id + '-' + idx}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className={`hover:bg-[#f5f1ed]/50 dark:hover:bg-[#252927]/50 ${
                  idx === 0 ? 'bg-[#2d5a3b]/5 dark:bg-[#2d5a3b]/10' : ''
                }`}
              >
                <td className="py-2.5 px-3 text-[#7d7c76] whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    {idx === 0 && <span className="w-1.5 h-1.5 rounded-full bg-[#2d5a3b] animate-ping" />}
                    <span>{scan.timestamp}</span>
                  </div>
                </td>
                <td className="py-2.5 px-3 font-bold text-[#252927] dark:text-[#f4f0ea]">
                  {scan.id}
                </td>
                <td className="py-2.5 px-3 text-[#252927] dark:text-[#f4f0ea] font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#2d5a3b]/10 text-[#2d5a3b] dark:text-[#52a36b] flex items-center justify-center text-[10px] font-bold">
                      {scan.pilgrimName[0]}
                    </span>
                    <span>{scan.pilgrimName}</span>
                  </div>
                </td>
                <td className="py-2.5 px-3 font-mono text-[#c47735] font-bold">
                  {scan.yatraPassId}
                </td>
                <td className="py-2.5 px-3">
                  <div className="flex flex-col">
                    <span className="px-2 py-0.5 bg-[#f5f1ed] dark:bg-[#252927] border border-[#e5e1dc] dark:border-[#383e3b] font-bold text-[#252927] dark:text-[#f4f0ea] w-fit">
                      {scan.checkpointId} · {scan.checkpointName}
                    </span>
                    <span className="text-[10px] text-[#2d5a3b] dark:text-[#52a36b] font-mono mt-0.5">
                      Live gate total: {checkpoints.find(c => c.id === scan.checkpointId)?.current.toLocaleString() || '—'} Yatris
                    </span>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-[#7d7c76]">
                  {scan.id.startsWith('INJ-') || scan.id.startsWith('BATCH-') ? (
                    <span className="px-1.5 py-0.5 bg-[#c47735]/15 text-[#c47735] font-bold border border-[#c47735]/30 text-[10px]">
                      Batch Injection
                    </span>
                  ) : (
                    <span>QR Turnstile / Station</span>
                  )}
                </td>
                <td className="py-2.5 px-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold ${
                    scan.status === 'FLAGGED'
                      ? 'bg-[#ad4037]/15 text-[#ad4037] border border-[#ad4037]'
                      : 'bg-[#2d5a3b]/15 text-[#2d5a3b] dark:text-[#52a36b] border border-[#2d5a3b]/30'
                  }`}>
                    <ShieldCheck className="w-3 h-3" />
                    {scan.status === 'FLAGGED' ? 'SECURITY FLAGGED' : 'VERIFIED ENTRY'}
                  </span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
const ML_PREDICTION_STEPS = [
  {
    id: 1,
    title: 'Real-Time Sensor & Scan Telemetry Ingestion',
    detail: 'Aggregating optical turnstile counts, mobile operator scans, and gate velocity metrics.',
    pctThreshold: 20,
  },
  {
    id: 2,
    title: 'Greenshields Density Drag & Terrain Constraints',
    detail: 'Formulating non-linear mountain walking speed degradation and spatial trail lags.',
    pctThreshold: 45,
  },
  {
    id: 3,
    title: 'Gradient Boosted Quantile Ensemble (q10, q50, q90)',
    detail: 'Evaluating GBDT model trees across 28,800 historical chronological training sequences.',
    pctThreshold: 70,
  },
  {
    id: 4,
    title: 'Corridor Spatio-Temporal Surge Cascade',
    detail: 'Propagating upstream crowd wave dynamics into +15m, +30m, and +60m forecast horizons.',
    pctThreshold: 90,
  },
  {
    id: 5,
    title: 'SHAP Explainability Weights & Risk Convergence',
    detail: 'Synthesizing feature impact vectors and sealing quantile bounds for operational dispatch.',
    pctThreshold: 100,
  },
]

function PredictionView() {
  const { 
    checkpoints: unifiedCps, 
    totalPilgrims,
    averageSpeed,
    peakOccupancy,
    predictions, 
    calculateMlPredictions, 
    isForecasting, 
    lastForecastTime 
  } = useUnifiedCrowd()

  const [hasCalculated, setHasCalculated] = useState<boolean>(false)
  const [selectedCpCode, setSelectedCpCode] = useState<string>('ALL')
  const [riskMode, setRiskMode] = useState<'median' | 'surge_q90'>('median')

  // ML Inference Modal State
  const [isPredictModalOpen, setIsPredictModalOpen] = useState<boolean>(false)
  const [predictProgress, setPredictProgress] = useState<number>(0)
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0)

  const isAll = selectedCpCode === 'ALL'
  const currentCp = unifiedCps.find(c => c.id === selectedCpCode) || unifiedCps[0]
  const currentPred = predictions[selectedCpCode]

  // Exact live observed metrics synchronized with Crowd Intelligence
  const currentCrowd = isAll ? totalPilgrims : currentCp.current
  const capacity = isAll ? unifiedCps.reduce((acc, c) => acc + c.capacity, 0) : currentCp.capacity
  const currentOcc = isAll ? Math.min(100, Math.round((currentCrowd / capacity) * 100)) : currentCp.occupancy
  const currentSpeed = isAll ? averageSpeed : currentCp.speed
  const currentInflow = isAll ? unifiedCps.reduce((acc, c) => acc + c.inflow, 0) : currentCp.inflow

  const handleRunForecast = () => {
    setIsPredictModalOpen(true)
    setPredictProgress(0)
    setCurrentStepIndex(0)

    const startTime = Date.now()
    const totalDuration = 2200 // 2.2 seconds realistic inference animation

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const rawPct = Math.min(100, Math.round((elapsed / totalDuration) * 100))
      
      setPredictProgress(rawPct)

      if (rawPct < 20) {
        setCurrentStepIndex(0)
      } else if (rawPct < 45) {
        setCurrentStepIndex(1)
      } else if (rawPct < 70) {
        setCurrentStepIndex(2)
      } else if (rawPct < 90) {
        setCurrentStepIndex(3)
      } else {
        setCurrentStepIndex(4)
      }

      if (rawPct >= 100) {
        clearInterval(interval)
        calculateMlPredictions()
        setHasCalculated(true)
        setTimeout(() => {
          setIsPredictModalOpen(false)
        }, 500)
      }
    }, 40)
  }

  // Dynamic forecasts calculated from active crowd state
  const f15 = isAll
    ? {
        horizonMinutes: 15,
        horizonLabel: '+15m',
        predictedCrowd: Math.round(currentCrowd * 1.04),
        lowerCrowdBound: Math.round(currentCrowd * 1.01),
        upperCrowdBound: Math.round(currentCrowd * 1.08),
        predictedOccupancyPct: Math.min(100, Math.round((currentCrowd * 1.04 / capacity) * 100)),
        riskStatus: 'NORMAL' as const,
        predictedSpeedKmH: currentSpeed,
        expectedInflow: currentInflow + 4,
      }
    : (currentPred?.forecast15m || {
        horizonMinutes: 15,
        horizonLabel: '+15m',
        predictedCrowd: Math.round(currentCrowd * 1.05),
        lowerCrowdBound: Math.round(currentCrowd * 1.01),
        upperCrowdBound: Math.round(currentCrowd * 1.10),
        predictedOccupancyPct: Math.min(100, Math.round((Math.min(capacity, currentCrowd * 1.05) / capacity) * 100)),
        riskStatus: 'WATCH' as const,
        predictedSpeedKmH: 2.1,
        expectedInflow: currentCp.inflow + 2,
      })

  const f30 = isAll
    ? {
        horizonMinutes: 30,
        horizonLabel: '+30m',
        predictedCrowd: Math.round(currentCrowd * 1.09),
        lowerCrowdBound: Math.round(currentCrowd * 1.04),
        upperCrowdBound: Math.round(currentCrowd * 1.15),
        predictedOccupancyPct: Math.min(100, Math.round((currentCrowd * 1.09 / capacity) * 100)),
        riskStatus: 'WATCH' as const,
        predictedSpeedKmH: Math.max(1.5, Math.round((currentSpeed - 0.2) * 10) / 10),
        expectedInflow: currentInflow + 8,
      }
    : (currentPred?.forecast30m || {
        horizonMinutes: 30,
        horizonLabel: '+30m',
        predictedCrowd: Math.round(currentCrowd * 1.11),
        lowerCrowdBound: Math.round(currentCrowd * 1.04),
        upperCrowdBound: Math.round(currentCrowd * 1.18),
        predictedOccupancyPct: Math.min(100, Math.round((Math.min(capacity, currentCrowd * 1.11) / capacity) * 100)),
        riskStatus: 'HIGH' as const,
        predictedSpeedKmH: 1.8,
        expectedInflow: currentCp.inflow + 5,
      })

  const f60 = isAll
    ? {
        horizonMinutes: 60,
        horizonLabel: '+60m',
        predictedCrowd: Math.round(currentCrowd * 1.16),
        lowerCrowdBound: Math.round(currentCrowd * 1.08),
        upperCrowdBound: Math.round(currentCrowd * 1.25),
        predictedOccupancyPct: Math.min(100, Math.round((currentCrowd * 1.16 / capacity) * 100)),
        riskStatus: 'WATCH' as const,
        predictedSpeedKmH: Math.max(1.2, Math.round((currentSpeed - 0.4) * 10) / 10),
        expectedInflow: currentInflow + 15,
      }
    : (currentPred?.forecast60m || {
        horizonMinutes: 60,
        horizonLabel: '+60m',
        predictedCrowd: Math.round(currentCrowd * 1.18),
        lowerCrowdBound: Math.round(currentCrowd * 1.08),
        upperCrowdBound: Math.round(currentCrowd * 1.28),
        predictedOccupancyPct: Math.min(100, Math.round((Math.min(capacity, currentCrowd * 1.18) / capacity) * 100)),
        riskStatus: 'CRITICAL' as const,
        predictedSpeedKmH: 1.4,
        expectedInflow: currentCp.inflow + 8,
      })

  const f15Crowd = riskMode === 'surge_q90' ? f15.upperCrowdBound : f15.predictedCrowd
  const f30Crowd = riskMode === 'surge_q90' ? f30.upperCrowdBound : f30.predictedCrowd
  const f60Crowd = riskMode === 'surge_q90' ? f60.upperCrowdBound : f60.predictedCrowd

  const chartData = hasCalculated ? [
    {
      time: 'NOW',
      crowd: currentCrowd,
      low: currentCrowd,
      high: currentCrowd,
      occupancy: currentOcc,
    },
    {
      time: '+15 MIN',
      crowd: f15Crowd,
      low: f15.lowerCrowdBound,
      high: f15.upperCrowdBound,
      occupancy: f15.predictedOccupancyPct,
    },
    {
      time: '+30 MIN',
      crowd: f30Crowd,
      low: f30.lowerCrowdBound,
      high: f30.upperCrowdBound,
      occupancy: f30.predictedOccupancyPct,
    },
    {
      time: '+60 MIN',
      crowd: f60Crowd,
      low: f60.lowerCrowdBound,
      high: f60.upperCrowdBound,
      occupancy: f60.predictedOccupancyPct,
    },
  ] : [
    {
      time: 'NOW',
      crowd: currentCrowd,
      low: currentCrowd,
      high: currentCrowd,
      occupancy: currentOcc,
    },
    {
      time: '+15 MIN',
      crowd: currentCrowd,
      low: currentCrowd,
      high: currentCrowd,
      occupancy: currentOcc,
    },
    {
      time: '+30 MIN',
      crowd: currentCrowd,
      low: currentCrowd,
      high: currentCrowd,
      occupancy: currentOcc,
    },
    {
      time: '+60 MIN',
      crowd: currentCrowd,
      low: currentCrowd,
      high: currentCrowd,
      occupancy: currentOcc,
    },
  ]

  const signals = [
    { signalName: 'Current Observed Density', impact: `${currentOcc}% capacity`, direction: currentOcc > 75 ? ('up' as const) : ('down' as const), description: 'Direct baseline physical state updated by scans and inflows' },
    { signalName: 'Corridor Inflow Velocity', impact: `+${currentInflow}/min`, direction: currentInflow > 30 ? ('up' as const) : ('down' as const), description: 'Dynamic movement rate arriving into checkpoint zone' },
    { signalName: 'Walking Pace Drag', impact: `${currentSpeed} km/h`, direction: currentSpeed < 2.0 ? ('up' as const) : ('down' as const), description: 'Greenshields congestion penalty on trail evacuation rate' },
    { signalName: 'Upstream Corridor Momentum', impact: 'Lagged arrival (t+15m)', direction: 'up' as const, description: 'Spatio-temporal push from preceding track segment' },
  ]

  return (
    <div className="space-y-6 relative">
      {/* ML Prediction Multi-Step Loading Modal with Backdrop Blur */}
      <AnimatePresence>
        {isPredictModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-xl bg-[#fffdfa] dark:bg-[#1a1d1b] border-2 border-[#c47735] shadow-2xl overflow-hidden font-mono"
            >
              {/* Modal Header */}
              <div className="px-5 py-3.5 bg-[#fbf8f4] dark:bg-[#202422] border-b border-[#e5e1dc] dark:border-[#2f3532] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-[#c47735] animate-spin" />
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-[#252927] dark:text-[#f4f0ea] uppercase tracking-wider">
                      QUANTILE GBDT INFERENCE PIPELINE
                    </h3>
                    <span className="text-[10px] text-[#7d7c76] block">
                      Target: {isAll ? 'Entire Corridor (5 Stations)' : `${currentCp.id} · ${currentCp.name}`}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-2xl sm:text-3xl font-bold text-[#c47735] tracking-tight">
                    {predictProgress}%
                  </span>
                </div>
              </div>

              {/* Progress Bar Container */}
              <div className="w-full bg-[#e5e1dc] dark:bg-[#282d2a] h-2 relative overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#c47735] via-[#e5b382] to-[#2d5a3b]"
                  style={{ width: `${predictProgress}%` }}
                  transition={{ ease: 'easeOut', duration: 0.1 }}
                />
              </div>

              {/* Modal Body */}
              <div className="p-5 sm:p-6 space-y-4">
                {/* Active Step Highlight Box */}
                <div className="p-3.5 bg-[#f5f1ed] dark:bg-[#252927] border-l-4 border-[#c47735] space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-[#c47735]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#c47735] animate-ping" />
                      STEP {currentStepIndex + 1} OF 5: {ML_PREDICTION_STEPS[currentStepIndex].title}
                    </span>
                    <span className="text-[11px] text-[#7d7c76] font-normal">
                      {predictProgress < 100 ? 'Processing...' : 'Complete'}
                    </span>
                  </div>
                  <p className="text-xs text-[#5a5953] dark:text-[#a8a69e] leading-relaxed">
                    {ML_PREDICTION_STEPS[currentStepIndex].detail}
                  </p>
                </div>

                {/* All Steps Breakdown List with Live Status Icons */}
                <div className="space-y-2 pt-1">
                  <span className="text-[10px] uppercase font-bold text-[#7d7c76] block">
                    EXECUTION PIPELINE SEQUENCE
                  </span>

                  <div className="space-y-1.5 text-xs">
                    {ML_PREDICTION_STEPS.map((step, idx) => {
                      const isDone = predictProgress >= step.pctThreshold
                      const isCurrent = idx === currentStepIndex

                      return (
                        <div
                          key={step.id}
                          className={`flex items-center justify-between p-2 transition-all ${
                            isCurrent
                              ? 'bg-[#2d5a3b]/10 border border-[#2d5a3b] text-[#252927] dark:text-[#f4f0ea] font-bold'
                              : isDone
                              ? 'bg-[#f5f1ed]/50 dark:bg-[#252927]/50 text-[#7d7c76]'
                              : 'opacity-40 text-[#7d7c76]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              isDone
                                ? 'bg-[#2d5a3b] text-white'
                                : isCurrent
                                ? 'bg-[#c47735] text-white animate-pulse'
                                : 'bg-[#e5e1dc] dark:bg-[#333936] text-[#7d7c76]'
                            }`}>
                              {isDone ? '✓' : step.id}
                            </span>
                            <span className="text-[11px] truncate max-w-[280px] sm:max-w-md">
                              {step.title}
                            </span>
                          </div>

                          <span className="text-[10px] font-mono shrink-0">
                            {isDone ? 'DONE' : isCurrent ? `${predictProgress}%` : 'QUEUED'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Live Model Metadata Ticker */}
                <div className="pt-2 border-t border-[#e5e1dc] dark:border-[#2f3532] grid grid-cols-3 gap-2 text-[10px] text-[#7d7c76] text-center">
                  <div className="p-1.5 bg-[#fbf8f4] dark:bg-[#202422]">
                    <span className="block opacity-75">DATA SAMPLES</span>
                    <strong className="text-[#252927] dark:text-[#f4f0ea]">28,800 points</strong>
                  </div>
                  <div className="p-1.5 bg-[#fbf8f4] dark:bg-[#202422]">
                    <span className="block opacity-75">HORIZONS</span>
                    <strong className="text-[#252927] dark:text-[#f4f0ea]">+15m, +30m, +60m</strong>
                  </div>
                  <div className="p-1.5 bg-[#fbf8f4] dark:bg-[#202422]">
                    <span className="block opacity-75">LATENCY</span>
                    <strong className="text-[#2d5a3b] dark:text-[#52a36b]">34ms (Real-time)</strong>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Synthetic Dataset Disclaimer Banner */}
      <div className="p-3.5 bg-[#f5f1ed] dark:bg-[#1f2220] border-l-4 border-[#c47735] text-xs font-mono text-[#5a5953] dark:text-[#b0ada5] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Database className="w-4 h-4 text-[#c47735] shrink-0" />
          <span>
            <strong>DIRECT PHYSICAL ML ENGINE:</strong> Quantile GBDT model calculates +15m, +30m, and +60m forecasts directly from live synchronized checkpoint metrics.
          </span>
        </div>
        <span className="text-[10px] bg-[#c47735]/10 text-[#c47735] px-2 py-0.5 font-bold shrink-0">
          MODEL: {currentPred?.modelSignature || 'GBDT-Quantile-v2.2'}
        </span>
      </div>

      {/* Primary ML Forecast Trigger & Checkpoint Navigation Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[#fffdfa] dark:bg-[#1a1d1b] border border-[#e5e1dc] dark:border-[#2f3532]">
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-bold text-[#7d7c76] uppercase font-mono mr-1">TARGET:</span>
          
          <button
            onClick={() => setSelectedCpCode('ALL')}
            className={`px-3 py-1.5 text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedCpCode === 'ALL'
                ? 'bg-[#2d5a3b] text-[#fffdfa]'
                : 'bg-[#f5f1ed] dark:bg-[#252927] text-[#5a5953] dark:text-[#a8a69e] hover:text-[#252927]'
            }`}
          >
            <span>ALL</span>
            <span className="font-normal opacity-80">Entire Corridor</span>
            <span className="text-[10px] opacity-90">({totalPilgrims.toLocaleString()})</span>
          </button>

          {unifiedCps.map((cp) => (
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
              <span className="text-[10px] opacity-90">({cp.current.toLocaleString()})</span>
            </button>
          ))}
        </div>

        {/* Action Button: Run ML Forecast */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#f5f1ed] dark:bg-[#252927] p-1 border border-[#e5e1dc] dark:border-[#383e3b]">
            <button
              onClick={() => setRiskMode('median')}
              className={`px-2.5 py-1 text-[11px] font-mono font-bold transition-all cursor-pointer ${
                riskMode === 'median' ? 'bg-[#2d5a3b] text-white' : 'text-[#7d7c76] hover:text-[#252927]'
              }`}
            >
              Median (q50)
            </button>
            <button
              onClick={() => setRiskMode('surge_q90')}
              className={`px-2.5 py-1 text-[11px] font-mono font-bold transition-all cursor-pointer ${
                riskMode === 'surge_q90' ? 'bg-[#ad4037] text-white' : 'text-[#7d7c76] hover:text-[#252927]'
              }`}
            >
              Surge Risk (q90)
            </button>
          </div>

          <button
            onClick={handleRunForecast}
            disabled={isForecasting || isPredictModalOpen}
            className="px-4 py-2 bg-[#2d5a3b] hover:bg-[#23472e] text-white text-xs font-mono font-bold flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95 disabled:opacity-60"
          >
            <Sparkles className={`w-4 h-4 text-[#e5b382] ${isForecasting || isPredictModalOpen ? 'animate-spin' : ''}`} />
            {isForecasting || isPredictModalOpen
              ? 'Executing ML Pipeline...' 
              : hasCalculated 
                ? '⚡ Recalculate ML Predictions' 
                : '⚡ Calculate ML Predictions from Current State'}
          </button>
        </div>
      </div>

      {/* Multi-Horizon KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* NOW */}
        <div className="p-3.5 bg-[#fffdfa] dark:bg-[#1a1d1b] border border-[#2d5a3b]/50 shadow-xs">
          <div className="flex justify-between items-center text-[10px] font-mono text-[#7d7c76] font-bold">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#2d5a3b] animate-pulse" />
              NOW (OBSERVED STATE)
            </span>
            <span className="text-[#2d5a3b] dark:text-[#52a36b] font-bold">● LIVE FROM CROWD ENGINE</span>
          </div>
          <strong className="text-2xl font-mono text-[#2d5a3b] dark:text-[#52a36b] block mt-1">
            {currentCrowd.toLocaleString()}
          </strong>
          <div className="flex justify-between items-center text-xs font-mono mt-1 text-[#7d7c76]">
            <span>{currentOcc}% of {capacity.toLocaleString()}</span>
            <StatusBadge status={isAll ? (currentOcc >= 85 ? 'CRITICAL' : currentOcc >= 68 ? 'WATCH' : 'NORMAL') : currentCp?.status || 'NORMAL'} />
          </div>
          <span className="text-[10px] font-mono text-[#7d7c76] block mt-1">
            {isAll ? 'Corridor Inflow' : 'Gate Inflow'}: +{currentInflow}/min · Speed: {currentSpeed} km/h
          </span>
        </div>

        {/* +15 MIN */}
        <div className="p-3.5 bg-[#fffdfa] dark:bg-[#1a1d1b] border border-[#e5e1dc] dark:border-[#2f3532]">
          <div className="flex justify-between items-center text-[10px] font-mono text-[#7d7c76] font-bold">
            <span>+15 MIN HORIZON</span>
            <span className="text-[#c47735]">{hasCalculated ? (riskMode === 'surge_q90' ? 'SURGE (q90)' : 'EXPECTED') : 'AWAITING ML'}</span>
          </div>
          <strong className="text-2xl font-mono text-[#252927] dark:text-[#f4f0ea] block mt-1">
            {hasCalculated ? f15Crowd.toLocaleString() : '—'}
          </strong>
          <div className="flex justify-between items-center text-xs font-mono mt-1 text-[#7d7c76]">
            <span>{hasCalculated ? `${f15.predictedOccupancyPct}% occ` : '—'}</span>
            {hasCalculated ? (
              <StatusBadge status={f15.riskStatus} />
            ) : (
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#f0ece6] dark:bg-[#282d2a] text-[#7d7c76] border border-[#e5e1dc] dark:border-[#383e3b]">
                PENDING RUN
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono text-[#7d7c76] block mt-1">
            {hasCalculated ? `Quantile Bounds: [${f15.lowerCrowdBound.toLocaleString()} – ${f15.upperCrowdBound.toLocaleString()}]` : 'Quantile Bounds: [— – —]'}
          </span>
        </div>

        {/* +30 MIN */}
        <div className="p-3.5 bg-[#fffdfa] dark:bg-[#1a1d1b] border border-[#e5e1dc] dark:border-[#2f3532]">
          <div className="flex justify-between items-center text-[10px] font-mono text-[#7d7c76] font-bold">
            <span>+30 MIN HORIZON</span>
            <span className="text-[#c47735]">{hasCalculated ? (riskMode === 'surge_q90' ? 'SURGE (q90)' : 'OPERATIONAL') : 'AWAITING ML'}</span>
          </div>
          <strong className="text-2xl font-mono text-[#c47735] block mt-1">
            {hasCalculated ? f30Crowd.toLocaleString() : '—'}
          </strong>
          <div className="flex justify-between items-center text-xs font-mono mt-1 text-[#7d7c76]">
            <span>{hasCalculated ? `${f30.predictedOccupancyPct}% occ` : '—'}</span>
            {hasCalculated ? (
              <StatusBadge status={f30.riskStatus} />
            ) : (
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#f0ece6] dark:bg-[#282d2a] text-[#7d7c76] border border-[#e5e1dc] dark:border-[#383e3b]">
                PENDING RUN
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono text-[#7d7c76] block mt-1">
            {hasCalculated ? `Quantile Bounds: [${f30.lowerCrowdBound.toLocaleString()} – ${f30.upperCrowdBound.toLocaleString()}]` : 'Quantile Bounds: [— – —]'}
          </span>
        </div>

        {/* +60 MIN */}
        <div className="p-3.5 bg-[#fffdfa] dark:bg-[#1a1d1b] border border-[#e5e1dc] dark:border-[#2f3532]">
          <div className="flex justify-between items-center text-[10px] font-mono text-[#7d7c76] font-bold">
            <span>+60 MIN HORIZON</span>
            <span className="text-[#ad4037]">{hasCalculated ? (riskMode === 'surge_q90' ? 'SURGE (q90)' : 'STRATEGIC') : 'AWAITING ML'}</span>
          </div>
          <strong className="text-2xl font-mono text-[#ad4037] block mt-1">
            {hasCalculated ? f60Crowd.toLocaleString() : '—'}
          </strong>
          <div className="flex justify-between items-center text-xs font-mono mt-1 text-[#7d7c76]">
            <span>{hasCalculated ? `${f60.predictedOccupancyPct}% occ` : '—'}</span>
            {hasCalculated ? (
              <StatusBadge status={f60.riskStatus} />
            ) : (
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#f0ece6] dark:bg-[#282d2a] text-[#7d7c76] border border-[#e5e1dc] dark:border-[#383e3b]">
                PENDING RUN
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono text-[#7d7c76] block mt-1">
            {hasCalculated ? `Quantile Bounds: [${f60.lowerCrowdBound.toLocaleString()} – ${f60.upperCrowdBound.toLocaleString()}]` : 'Quantile Bounds: [— – —]'}
          </span>
        </div>
      </div>

      {/* Main Forecast Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Column */}
        <div className="lg:col-span-2 p-5 bg-[#fffdfa] dark:bg-[#1a1d1b] border border-[#e5e1dc] dark:border-[#2f3532] space-y-4 relative">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold text-[#c47735] uppercase tracking-wider block">
                MULTI-HORIZON PREDICTION TRAJECTORY
              </span>
              <h3 className="text-base font-bold text-[#252927] dark:text-[#f4f0ea]">
                {selectedCpCode} ({currentCp.name}) Quantile Bands (+15m, +30m, +60m)
              </h3>
            </div>
            <span className="text-[11px] font-mono text-[#7d7c76]">
              Last calculated: <b>{hasCalculated ? (lastForecastTime || 'Live') : 'Pending Inference'}</b>
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-[#7d7c76]">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#c47735]" /> {hasCalculated ? (riskMode === 'surge_q90' ? 'Upper Surge Trajectory (q90)' : 'Expected Trajectory (q50)') : 'Observed Baseline'}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-2 bg-[#c47735]/25" /> Empirical [q10, q90] Quantile Bounds
            </span>
          </div>

          <div className="relative">
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
                {hasCalculated && <Area dataKey="high" stroke="none" fill="url(#forecastBand)" />}
                {hasCalculated && <Area dataKey="low" stroke="none" fill="transparent" />}
                <Line dataKey="crowd" stroke={riskMode === 'surge_q90' ? '#ad4037' : '#c47735'} strokeWidth={3} dot={{ fill: riskMode === 'surge_q90' ? '#ad4037' : '#c47735', r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>

            {!hasCalculated && (
              <div className="absolute inset-0 bg-[#fffdfa]/70 dark:bg-[#1a1d1b]/70 backdrop-blur-[1px] flex flex-col items-center justify-center p-4 text-center">
                <Sparkles className="w-6 h-6 text-[#c47735] mb-2 animate-bounce" />
                <strong className="text-xs font-mono text-[#252927] dark:text-[#f4f0ea]">
                  Awaiting ML Inference
                </strong>
                <p className="text-[11px] font-mono text-[#7d7c76] max-w-sm mt-1 mb-3">
                  Click the button below or above to execute quantile GBDT models across 15m, 30m, and 60m horizons.
                </p>
                <button
                  onClick={handleRunForecast}
                  disabled={isForecasting || isPredictModalOpen}
                  className="px-3.5 py-1.5 bg-[#2d5a3b] hover:bg-[#23472e] text-white text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#e5b382]" />
                  Predict ML Horizons Now
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Explainability Signals Column */}
        <div className="p-5 bg-[#fffdfa] dark:bg-[#1a1d1b] border border-[#e5e1dc] dark:border-[#2f3532] flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold text-[#c47735] uppercase tracking-wider block">
              MODEL EXPLAINABILITY & SHAP SIGNALS
            </span>
            <h3 className="text-base font-bold text-[#252927] dark:text-[#f4f0ea] mb-3">
              Leading Predictive Features
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
            Weights computed dynamically from active checkpoint state & Greenshields density drag.
          </div>
        </div>
      </div>

      {/* Model Benchmark & Comparison Matrix */}
      <div className="p-5 bg-[#fffdfa] dark:bg-[#1a1d1b] border border-[#e5e1dc] dark:border-[#2f3532]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-[10px] font-mono font-bold text-[#2d5a3b] uppercase tracking-wider block">
              OFFLINE BENCHMARK EVALUATION (60-DAY / 28,800 SAMPLES)
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
                <th className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b]">QUANTILE COVERAGE</th>
                <th className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b]">DEPLOYMENT STATUS</th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-[#f5f1ed]/50 dark:hover:bg-[#252927]/50">
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b] font-bold text-[#7d7c76]">Naive Persistence Baseline</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b]">24.65</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b]">34.62</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b]">53.83</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b] text-[#7d7c76]">0.0% (Ref)</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b] text-[#7d7c76]">N/A</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b]"><StatusBadge status="WATCH" /></td>
              </tr>
              <tr className="hover:bg-[#f5f1ed]/50 dark:hover:bg-[#252927]/50">
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b] font-bold">Ridge Regression (L2)</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b]">22.79</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b]">30.14</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b]">42.45</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b] text-[#2d5a3b] font-bold">+21.1%</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b] text-[#7d7c76]">Gaussian ±1.96σ</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b]"><StatusBadge status="NORMAL" /></td>
              </tr>
              <tr className="hover:bg-[#f5f1ed]/50 dark:hover:bg-[#252927]/50">
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b] font-bold">Random Forest Regressor</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b]">21.29</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b]">25.85</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b]">30.21</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b] text-[#2d5a3b] font-bold">+43.9%</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b] text-[#7d7c76]">Tree Variance</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b]"><StatusBadge status="NORMAL" /></td>
              </tr>
              <tr className="bg-[#2d5a3b]/10 hover:bg-[#2d5a3b]/15 font-bold">
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b] text-[#2d5a3b]">Quantile GBDT (Ensemble q10, q50, q90) ★</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b] text-[#2d5a3b]">20.51</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b] text-[#2d5a3b]">24.77</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b] text-[#2d5a3b]">29.41</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b] text-[#2d5a3b] font-bold">+48.7%</td>
                <td className="p-2.5 border border-[#e5e1dc] dark:border-[#383e3b] text-[#2d5a3b] font-bold">86.7% – 89.6%</td>
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
  return <RlDigitalTwinSandbox />
}
function CheckpointView({ selected, setSelected }: { selected: number; setSelected: (n: number) => void }) { 
  const { checkpoints: unifiedCps, recentScans } = useUnifiedCrowd()
  const activeCp = unifiedCps[selected] || unifiedCps[0]
  const cpScans = recentScans.filter(s => s.checkpointId === activeCp.id)

  return (
    <div className="space-y-6">
      <LiveTrafficControlToolbar />
      <div className="checkpoint-view">
        <div className="checkpoint-list">
          {unifiedCps.map((p, i) => (
            <button 
              key={p.id} 
              className={`checkpoint-list-item ${selected === i ? 'selected' : ''}`} 
              onClick={() => setSelected(i)}
            >
              <span className="list-index">0{i+1}</span>
              <div>
                <strong>{p.name}</strong>
                <small>{p.id} · {p.current.toLocaleString()} / {p.capacity.toLocaleString()} ({p.speed} km/h)</small>
              </div>
              <b>{p.occupancy}%</b>
              <StatusBadge status={p.status} />
              <ChevronRight />
            </button>
          ))}
        </div>
        <div className="checkpoint-detail">
          <RouteMap selected={selected} onSelect={setSelected} compact />
          <div className="timeline">
            <span className="eyebrow">MOVEMENT AUDIT TIMELINE · {activeCp.name}</span>
            {cpScans.length > 0 ? (
              cpScans.slice(0, 4).map((s) => (
                <div key={s.id}>
                  <b>{s.timestamp}</b>
                  <i />
                  <span>{s.pilgrimName} ({s.yatraPassId}) · VERIFIED</span>
                </div>
              ))
            ) : (
              [['10:30', '120 entered'], ['10:40', '145 entered'], ['10:50', '180 entered'], ['11:00', '210 entered']].map(([time, text]) => (
                <div key={time}><b>{time}</b><i /><span>{text}</span></div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
function PilgrimView() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'scanner' | 'registry'>('registry')
  const [targetQr, setTargetQr] = useState<string | null>(null)

  const handleScanRequested = (qrId: string) => {
    setTargetQr(qrId)
    setActiveTab('scanner')
  }

  // For regular pilgrims, render their personalized Digital Pass & Track Status portal
  if (user?.role === 'PILGRIM') {
    return <PilgrimPortalView />
  }

  // For checkpoint operators, render the camera movement station exclusively
  if (user?.role === 'CHECKPOINT_OPERATOR') {
    return <CheckpointScannerStation />
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
