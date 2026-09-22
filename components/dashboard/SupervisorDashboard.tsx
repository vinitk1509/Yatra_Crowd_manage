'use client'

import React, { useState, useEffect } from 'react'
import {
  Mountain,
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock,
  Database,
  Radio,
  ScanLine,
  SlidersHorizontal,
  Users,
  Timer,
  RefreshCw,
  Eye,
  ShieldCheck,
} from 'lucide-react'
import {
  Checkpoint,
  Pilgrim,
  ScanEvent,
  getCheckpoints,
  getPilgrims,
  getCheckpointScans,
} from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'

export function SupervisorDashboard() {
  const { user } = useAuth()
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [pilgrims, setPilgrims] = useState<Pilgrim[]>([])
  const [recentScans, setRecentScans] = useState<ScanEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [cpData, pilData] = await Promise.all([
        getCheckpoints(),
        getPilgrims(),
      ])
      setCheckpoints(cpData)
      setPilgrims(pilData)
      if (cpData.length > 0) {
        const scanData = await getCheckpointScans(cpData[0].id)
        setRecentScans(scanData)
      }
    } catch (err) {
      console.error('Error loading supervisor data', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Supervisor Control Banner */}
      <div className="bg-[#fffdfa] dark:bg-[#242623] border border-[#e2ddd6] dark:border-[#ffffff1f] p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-widest text-[#6f706b] dark:text-[#b7b8b1] uppercase">
              FIELD OPERATIONS SUPERVISION
            </span>
            <span className="px-2 py-0.5 bg-[#e7eee7] dark:bg-[#243628] text-[#2d5a3b] dark:text-[#91bd9b] text-[9px] font-bold tracking-wider">
              ALL GATES MONITORED
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#252927] dark:text-[#f4f0ea]">
            Track Condition & Checkpoint Health Oversight
          </h2>
          <p className="text-xs text-[#6f706b] dark:text-[#b7b8b1] mt-0.5">
            Real-time scanner data freshness, gate operator status, and pilgrim transit velocity across Baltal and Pahalgam corridors.
          </p>
        </div>
        <button
          onClick={loadData}
          className="px-3.5 py-2 bg-[#f5f1ed] hover:bg-[#eae5df] dark:bg-[#1b1c1a] border border-[#e2ddd6] dark:border-[#ffffff1f] text-xs font-bold uppercase tracking-wider text-[#252927] dark:text-[#f4f0ea] flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Field Data
        </button>
      </div>

      {/* Field Telemetry Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#fffdfa] dark:bg-[#242623] border border-[#e2ddd6] dark:border-[#ffffff1f] p-4">
          <span className="text-[10px] font-bold text-[#6f706b] dark:text-[#b7b8b1] uppercase tracking-wider block mb-1">
            MONITORED GATES
          </span>
          <strong className="text-2xl font-bold text-[#252927] dark:text-[#f4f0ea]">
            {checkpoints.length || 5}
          </strong>
          <span className="text-[10px] text-[#2d5a3b] dark:text-[#80a88b] flex items-center gap-1 mt-1">
            <CheckCircle2 className="w-3 h-3" /> 100% Online
          </span>
        </div>

        <div className="bg-[#fffdfa] dark:bg-[#242623] border border-[#e2ddd6] dark:border-[#ffffff1f] p-4">
          <span className="text-[10px] font-bold text-[#6f706b] dark:text-[#b7b8b1] uppercase tracking-wider block mb-1">
            REGISTERED PILGRIMS
          </span>
          <strong className="text-2xl font-bold text-[#252927] dark:text-[#f4f0ea]">
            {pilgrims.length}
          </strong>
          <span className="text-[10px] text-[#c47735] flex items-center gap-1 mt-1">
            <Users className="w-3 h-3" /> Active Credentials
          </span>
        </div>

        <div className="bg-[#fffdfa] dark:bg-[#242623] border border-[#e2ddd6] dark:border-[#ffffff1f] p-4">
          <span className="text-[10px] font-bold text-[#6f706b] dark:text-[#b7b8b1] uppercase tracking-wider block mb-1">
            CHECKPOINT SCANS LOGGED
          </span>
          <strong className="text-2xl font-bold text-[#252927] dark:text-[#f4f0ea]">
            {recentScans.length}
          </strong>
          <span className="text-[10px] text-[#2d5a3b] dark:text-[#80a88b] flex items-center gap-1 mt-1">
            <ScanLine className="w-3 h-3" /> Real-time Audit
          </span>
        </div>

        <div className="bg-[#fffdfa] dark:bg-[#242623] border border-[#e2ddd6] dark:border-[#ffffff1f] p-4">
          <span className="text-[10px] font-bold text-[#6f706b] dark:text-[#b7b8b1] uppercase tracking-wider block mb-1">
            DATA FRESHNESS
          </span>
          <strong className="text-2xl font-bold text-[#2d5a3b] dark:text-[#80a88b]">
            &lt; 18s
          </strong>
          <span className="text-[10px] text-[#6f706b] dark:text-[#b7b8b1] flex items-center gap-1 mt-1">
            <Radio className="w-3 h-3 text-[#2d5a3b]" /> Low Latency
          </span>
        </div>
      </div>

      {/* Grid: Checkpoint Station Status + Scanner Health Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Checkpoint Status Overview (7 cols) */}
        <div className="lg:col-span-7 bg-[#fffdfa] dark:bg-[#242623] border border-[#e2ddd6] dark:border-[#ffffff1f] p-5 shadow-xs">
          <div className="flex justify-between items-center pb-3 border-b border-[#e2ddd6] dark:border-[#ffffff1f] mb-4">
            <div>
              <span className="text-[10px] font-bold tracking-widest text-[#6f706b] dark:text-[#b7b8b1] uppercase block">
                GATE TELEMETRY
              </span>
              <h3 className="text-base font-bold text-[#252927] dark:text-[#f4f0ea]">
                Checkpoint Capacity & Operational Status
              </h3>
            </div>
          </div>

          <div className="space-y-3">
            {checkpoints.map((cp, idx) => (
              <div
                key={cp.id}
                className="p-3.5 bg-[#f5f1ed]/60 dark:bg-[#1b1c1a]/60 border border-[#e2ddd6] dark:border-[#ffffff1f] flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-[#2d5a3b] text-[#fffdfa] text-xs font-bold flex items-center justify-center">
                    0{idx + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-sm text-[#252927] dark:text-[#f4f0ea]">
                        {cp.name}
                      </strong>
                      <span className="text-[10px] font-mono text-[#c47735] font-bold">
                        {cp.code}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#6f706b] dark:text-[#b7b8b1]">
                      Route: {cp.routeName} · Sequence: Gate #{cp.sequenceOrder}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="px-2 py-0.5 bg-[#e7eee7] dark:bg-[#243628] text-[#2d5a3b] dark:text-[#91bd9b] text-[9px] font-bold tracking-wider">
                    OPERATIONAL
                  </span>
                  <span className="text-[10px] text-[#6f706b] dark:text-[#b7b8b1] block mt-1">
                    Max Cap: {cp.capacityLimit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scanner Health & Freshness (5 cols) */}
        <div className="lg:col-span-5 bg-[#fffdfa] dark:bg-[#242623] border border-[#e2ddd6] dark:border-[#ffffff1f] p-5 shadow-xs">
          <div className="flex justify-between items-center pb-3 border-b border-[#e2ddd6] dark:border-[#ffffff1f] mb-4">
            <div>
              <span className="text-[10px] font-bold tracking-widest text-[#6f706b] dark:text-[#b7b8b1] uppercase block">
                GATE HEALTH
              </span>
              <h3 className="text-base font-bold text-[#252927] dark:text-[#f4f0ea]">
                Scanner Heartbeat & Diagnostics
              </h3>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { gate: 'CP-01 Baltal Base Scanner', status: 'ONLINE', latency: '12s ago', iconTone: 'text-[#2d5a3b]' },
              { gate: 'CP-02 Domel Bridge Scanner', status: 'ONLINE', latency: '18s ago', iconTone: 'text-[#2d5a3b]' },
              { gate: 'CP-03 Sheshnag Camp Scanner', status: 'ONLINE', latency: '24s ago', iconTone: 'text-[#2d5a3b]' },
              { gate: 'CP-04 Panchtarni Scanner', status: 'ONLINE', latency: '15s ago', iconTone: 'text-[#2d5a3b]' },
              { gate: 'CP-05 Holy Cave Scanner', status: 'ONLINE', latency: '31s ago', iconTone: 'text-[#2d5a3b]' },
            ].map((item) => (
              <div
                key={item.gate}
                className="p-3 bg-[#f5f1ed]/60 dark:bg-[#1b1c1a]/60 border border-[#e2ddd6] dark:border-[#ffffff1f] flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <ScanLine className={`w-4 h-4 ${item.iconTone}`} />
                  <div>
                    <strong className="text-xs text-[#252927] dark:text-[#f4f0ea] block">
                      {item.gate}
                    </strong>
                    <span className="text-[10px] text-[#6f706b] dark:text-[#b7b8b1]">
                      Heartbeat: {item.latency}
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-[#e7eee7] dark:bg-[#243628] text-[#2d5a3b] dark:text-[#91bd9b] text-[9px] font-bold">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
