'use client'

import React, { useState, useEffect } from 'react'
import {
  ShieldCheck,
  Users,
  Server,
  Database,
  Mountain,
  Lock,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Activity,
  Layers3,
  Cpu,
  UserPlus,
} from 'lucide-react'
import {
  getCheckpoints,
  getPilgrims,
  getCheckpointScans,
  Checkpoint,
  Pilgrim,
  ScanEvent,
} from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'

export function AdminDashboard({ onNavigate }: { onNavigate?: (path: string) => void }) {
  const { user } = useAuth()
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [pilgrims, setPilgrims] = useState<Pilgrim[]>([])
  const [scans, setScans] = useState<ScanEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAdminData()
  }, [])

  const loadAdminData = async () => {
    setLoading(true)
    try {
      const [cp, pil] = await Promise.all([
        getCheckpoints(),
        getPilgrims(),
      ])
      setCheckpoints(cp)
      setPilgrims(pil)
      if (cp.length > 0) {
        const sc = await getCheckpointScans(cp[0].id)
        setScans(sc)
      }
    } catch (err) {
      console.error('Error loading admin console data', err)
    } finally {
      setLoading(false)
    }
  }

  const systemUsers = [
    { name: 'System Administrator', email: 'admin@yatraflow.gov.in', role: 'ADMIN', status: 'ACTIVE' },
    { name: 'Control Room Lead', email: 'control@yatraflow.gov.in', role: 'CONTROL_ROOM_OPERATOR', status: 'ACTIVE' },
    { name: 'Gate Officer', email: 'checkpoint@yatraflow.gov.in', role: 'CHECKPOINT_OPERATOR', status: 'ACTIVE' },
    { name: 'Emergency Dispatcher', email: 'emergency@yatraflow.gov.in', role: 'EMERGENCY_OFFICER', status: 'ACTIVE' },
    { name: 'Route Field Supervisor', email: 'supervisor@yatraflow.gov.in', role: 'SUPERVISOR', status: 'ACTIVE' },
    { name: 'Pilgrim Yatri Account', email: 'pilgrim@yatraflow.gov.in', role: 'PILGRIM', status: 'ACTIVE' },
  ]

  return (
    <div className="space-y-6">
      {/* Admin Header Banner */}
      <div className="bg-[#fffdfa] dark:bg-[#242623] border border-[#e2ddd6] dark:border-[#ffffff1f] p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-widest text-[#6f706b] dark:text-[#b7b8b1] uppercase">
              MASTER SYSTEM ADMINISTRATION
            </span>
            <span className="px-2 py-0.5 bg-[#e7eee7] dark:bg-[#243628] text-[#2d5a3b] dark:text-[#91bd9b] text-[9px] font-bold tracking-wider">
              SPRING BOOT 3 LIVE
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#252927] dark:text-[#f4f0ea]">
            YatraFlow Infrastructure & Security Administration
          </h2>
          <p className="text-xs text-[#6f706b] dark:text-[#b7b8b1] mt-0.5">
            Role-Based Access Control (RBAC), database persistence, master registries, and system diagnostics.
          </p>
        </div>

        <button
          onClick={loadAdminData}
          className="px-3.5 py-2 bg-[#f5f1ed] hover:bg-[#eae5df] dark:bg-[#1b1c1a] border border-[#e2ddd6] dark:border-[#ffffff1f] text-xs font-bold uppercase tracking-wider text-[#252927] dark:text-[#f4f0ea] flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Systems
        </button>
      </div>

      {/* System Telemetry & KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#fffdfa] dark:bg-[#242623] border border-[#e2ddd6] dark:border-[#ffffff1f] p-4">
          <span className="text-[10px] font-bold text-[#6f706b] dark:text-[#b7b8b1] uppercase tracking-wider block mb-1">
            RBAC ROLES CONFIGURED
          </span>
          <strong className="text-2xl font-bold text-[#252927] dark:text-[#f4f0ea]">6 Roles</strong>
          <span className="text-[10px] text-[#2d5a3b] dark:text-[#80a88b] flex items-center gap-1 mt-1">
            <ShieldCheck className="w-3 h-3" /> JWT Auth Enforced
          </span>
        </div>

        <div className="bg-[#fffdfa] dark:bg-[#242623] border border-[#e2ddd6] dark:border-[#ffffff1f] p-4">
          <span className="text-[10px] font-bold text-[#6f706b] dark:text-[#b7b8b1] uppercase tracking-wider block mb-1">
            MASTER PILGRIM REGISTRY
          </span>
          <strong className="text-2xl font-bold text-[#252927] dark:text-[#f4f0ea]">
            {pilgrims.length} Records
          </strong>
          <span className="text-[10px] text-[#c47735] flex items-center gap-1 mt-1">
            <Users className="w-3 h-3" /> Auto QR Issued
          </span>
        </div>

        <div className="bg-[#fffdfa] dark:bg-[#242623] border border-[#e2ddd6] dark:border-[#ffffff1f] p-4">
          <span className="text-[10px] font-bold text-[#6f706b] dark:text-[#b7b8b1] uppercase tracking-wider block mb-1">
            CHECKPOINT STATIONS
          </span>
          <strong className="text-2xl font-bold text-[#252927] dark:text-[#f4f0ea]">
            {checkpoints.length || 5} Active
          </strong>
          <span className="text-[10px] text-[#2d5a3b] dark:text-[#80a88b] flex items-center gap-1 mt-1">
            <Mountain className="w-3 h-3" /> 2 Mountain Corridors
          </span>
        </div>

        <div className="bg-[#fffdfa] dark:bg-[#242623] border border-[#e2ddd6] dark:border-[#ffffff1f] p-4">
          <span className="text-[10px] font-bold text-[#6f706b] dark:text-[#b7b8b1] uppercase tracking-wider block mb-1">
            IMMUTABLE SCAN AUDITS
          </span>
          <strong className="text-2xl font-bold text-[#252927] dark:text-[#f4f0ea]">
            {scans.length} Events
          </strong>
          <span className="text-[10px] text-[#2d5a3b] dark:text-[#80a88b] flex items-center gap-1 mt-1">
            <Database className="w-3 h-3" /> JPA Audit Logs
          </span>
        </div>
      </div>

      {/* Grid: User Accounts & System Infrastructure */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Role & User Management Table (7 cols) */}
        <div className="lg:col-span-7 bg-[#fffdfa] dark:bg-[#242623] border border-[#e2ddd6] dark:border-[#ffffff1f] p-5 shadow-xs">
          <div className="flex justify-between items-center pb-3 border-b border-[#e2ddd6] dark:border-[#ffffff1f] mb-4">
            <div>
              <span className="text-[10px] font-bold tracking-widest text-[#6f706b] dark:text-[#b7b8b1] uppercase block">
                SECURITY ACCOUNTS
              </span>
              <h3 className="text-base font-bold text-[#252927] dark:text-[#f4f0ea]">
                Role-Based Operator & User Directory
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[#2d5a3b] bg-[#e7eee7] dark:bg-[#243628] px-2 py-0.5 font-bold">
              6 Active Accounts
            </span>
          </div>

          <div className="space-y-2.5">
            {systemUsers.map((u) => (
              <div
                key={u.email}
                className="p-3 bg-[#f5f1ed]/60 dark:bg-[#1b1c1a]/60 border border-[#e2ddd6] dark:border-[#ffffff1f] flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-[#252927] dark:text-[#f4f0ea]">{u.name}</strong>
                    <span className="px-1.5 py-0.5 bg-[#f6eadc] dark:bg-[#3d2c1c] text-[#a5632c] dark:text-[#e89d58] text-[9px] font-mono font-bold">
                      {u.role}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#6f706b] dark:text-[#b7b8b1] font-mono">
                    {u.email}
                  </span>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 bg-[#e7eee7] text-[#2d5a3b] dark:bg-[#243628] dark:text-[#91bd9b] text-[9px] font-bold">
                    {u.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Infrastructure & Services Status (5 cols) */}
        <div className="lg:col-span-5 bg-[#fffdfa] dark:bg-[#242623] border border-[#e2ddd6] dark:border-[#ffffff1f] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-[#e2ddd6] dark:border-[#ffffff1f] mb-4">
              <span className="text-[10px] font-bold tracking-widest text-[#6f706b] dark:text-[#b7b8b1] uppercase block">
                STACK DIAGNOSTICS
              </span>
              <h3 className="text-base font-bold text-[#252927] dark:text-[#f4f0ea]">
                Backend Services & Security
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#f5f1ed]/60 dark:bg-[#1b1c1a]/60 border border-[#e2ddd6] dark:border-[#ffffff1f] flex items-center justify-between">
                <div>
                  <strong className="block text-[#252927] dark:text-[#f4f0ea]">Spring Boot 3 Core</strong>
                  <span className="text-[10px] text-[#6f706b] dark:text-[#b7b8b1]">Java 22 · Port 8080</span>
                </div>
                <span className="px-2 py-0.5 bg-[#e7eee7] text-[#2d5a3b] dark:bg-[#243628] dark:text-[#91bd9b] text-[9px] font-bold">
                  HEALTHY
                </span>
              </div>

              <div className="p-3 bg-[#f5f1ed]/60 dark:bg-[#1b1c1a]/60 border border-[#e2ddd6] dark:border-[#ffffff1f] flex items-center justify-between">
                <div>
                  <strong className="block text-[#252927] dark:text-[#f4f0ea]">JJWT Token Engine</strong>
                  <span className="text-[10px] text-[#6f706b] dark:text-[#b7b8b1]">HMAC-SHA256 · Stateless</span>
                </div>
                <span className="px-2 py-0.5 bg-[#e7eee7] text-[#2d5a3b] dark:bg-[#243628] dark:text-[#91bd9b] text-[9px] font-bold">
                  ACTIVE
                </span>
              </div>

              <div className="p-3 bg-[#f5f1ed]/60 dark:bg-[#1b1c1a]/60 border border-[#e2ddd6] dark:border-[#ffffff1f] flex items-center justify-between">
                <div>
                  <strong className="block text-[#252927] dark:text-[#f4f0ea]">JPA Relational Storage</strong>
                  <span className="text-[10px] text-[#6f706b] dark:text-[#b7b8b1]">H2 / In-Memory Persistence</span>
                </div>
                <span className="px-2 py-0.5 bg-[#e7eee7] text-[#2d5a3b] dark:bg-[#243628] dark:text-[#91bd9b] text-[9px] font-bold">
                  CONNECTED
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#e2ddd6] dark:border-[#ffffff1f] mt-4 flex gap-2">
            <a
              href="/pilgrims"
              className="flex-1 py-2.5 px-3 bg-[#2d5a3b] hover:bg-[#23472e] text-[#fffdfa] text-xs font-bold uppercase tracking-wider text-center transition-colors"
            >
              Manage Pilgrims & Passes
            </a>
            <a
              href="/dashboard"
              className="py-2.5 px-3 bg-[#f5f1ed] hover:bg-[#eae5df] dark:bg-[#1b1c1a] border border-[#e2ddd6] dark:border-[#ffffff1f] text-xs font-bold uppercase tracking-wider text-[#252927] dark:text-[#f4f0ea] transition-colors"
            >
              Control Room
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
