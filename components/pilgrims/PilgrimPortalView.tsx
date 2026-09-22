'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  QrCode as QrIcon,
  Mountain,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Navigation,
  RefreshCw,
  Phone,
  User,
  Compass,
} from 'lucide-react'
import {
  Pilgrim,
  ScanEvent,
  getPilgrims,
  getPilgrimScans,
} from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'

export function PilgrimPortalView() {
  const { user } = useAuth()
  const [pilgrim, setPilgrim] = useState<Pilgrim | null>(null)
  const [scans, setScans] = useState<ScanEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPilgrimData()
  }, [user])

  const loadPilgrimData = async () => {
    setLoading(true)
    try {
      const allPilgrims = await getPilgrims()
      // Match by email or name, or pick first pilgrim
      const found = allPilgrims.find((p) => p.name.toLowerCase() === user?.name?.toLowerCase()) || allPilgrims[0]
      if (found) {
        setPilgrim(found)
        const scanHistory = await getPilgrimScans(found.id)
        setScans(scanHistory)
      }
    } catch (err) {
      console.error('Error loading pilgrim portal data', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#fffdfa] dark:bg-[#242623] border border-[#e2ddd6] dark:border-[#ffffff1f] p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-[#6f706b] dark:text-[#b7b8b1] uppercase block mb-1">
            PILGRIM CREDENTIAL & TRANSIT PORTAL
          </span>
          <h2 className="text-xl font-bold text-[#252927] dark:text-[#f4f0ea]">
            Welcome, {user?.name || 'Yatri'}
          </h2>
          <p className="text-xs text-[#6f706b] dark:text-[#b7b8b1] mt-0.5">
            Present your official QR code credential at each gate along your authorized track.
          </p>
        </div>
        <button
          onClick={loadPilgrimData}
          className="px-3 py-1.5 bg-[#f5f1ed] hover:bg-[#eae5df] dark:bg-[#1b1c1a] border border-[#e2ddd6] dark:border-[#ffffff1f] text-xs font-bold uppercase tracking-wider text-[#252927] dark:text-[#f4f0ea] flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Status
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Official Digital Pass Card (6 cols) */}
        <div className="lg:col-span-6 bg-[#30483a] border border-[#3b5344] p-6 shadow-xs text-[#edf3ec] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#ffffff20] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Mountain className="w-5 h-5 text-[#f1c18c]" />
                <span className="text-xs font-bold tracking-widest uppercase text-[#c5d5c7]">
                  SHRI AMARNATH JI YATRA PASS
                </span>
              </div>
              <span className="px-2 py-0.5 bg-[#ffffff18] text-[#f1c18c] text-[9px] font-bold tracking-wider">
                ACTIVE PASS
              </span>
            </div>

            {pilgrim ? (
              <div className="bg-[#fffdfa] text-[#252927] p-5 shadow-lg max-w-sm mx-auto">
                <div className="flex justify-between items-start border-b border-[#e2ddd6] pb-2 mb-3">
                  <div>
                    <span className="text-[8px] font-bold tracking-widest text-[#a5632c] uppercase block">
                      VERIFIED CREDENTIAL
                    </span>
                    <h3 className="text-base font-bold tracking-tight text-[#252927]">
                      {pilgrim.name}
                    </h3>
                  </div>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 ${
                      pilgrim.status === 'COMPLETED'
                        ? 'bg-[#e5edf1] text-[#55707c]'
                        : pilgrim.status === 'IN_TRANSIT'
                        ? 'bg-[#f6eadc] text-[#a5632c]'
                        : 'bg-[#e7eee7] text-[#2d5a3b]'
                    }`}
                  >
                    {pilgrim.status}
                  </span>
                </div>

                {/* QR Matrix Graphic */}
                <div className="grid grid-cols-8 gap-1.5 w-40 h-40 mx-auto p-3 border-4 border-[#252927] bg-white my-3">
                  {Array.from({ length: 64 }).map((_, i) => (
                    <i
                      key={i}
                      className="bg-[#252927] rounded-none"
                      style={{
                        opacity: (i * 13 + (pilgrim.id || 1) * 7) % 5 === 0 ? 0.08 : 1,
                      }}
                    />
                  ))}
                </div>

                <div className="text-center font-mono text-[9px] text-[#6f706b] mb-3">
                  {pilgrim.qrCode?.qrId || 'QR-YF-PENDING'}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-[#e2ddd6] pt-2">
                  <div>
                    <span className="text-[#6f706b] block text-[8px] font-bold">PILGRIM ID</span>
                    <b className="font-mono text-[#252927]">{pilgrim.pilgrimCode}</b>
                  </div>
                  <div>
                    <span className="text-[#6f706b] block text-[8px] font-bold">ASSIGNED ROUTE</span>
                    <b className="text-[#c47735]">{pilgrim.routeCode}</b>
                  </div>
                  <div>
                    <span className="text-[#6f706b] block text-[8px] font-bold">AGE / GENDER</span>
                    <span>{pilgrim.age} / {pilgrim.gender}</span>
                  </div>
                  <div>
                    <span className="text-[#6f706b] block text-[8px] font-bold">SECURITY VERSION</span>
                    <span>1.0 IMMUTABLE</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-[#c5d5c7]">
                <QrIcon className="w-12 h-12 mx-auto mb-2 opacity-40 text-[#f1c18c]" />
                <p className="text-sm font-semibold">Loading your Yatra Pass...</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Movement Timeline (6 cols) */}
        <div className="lg:col-span-6 bg-[#fffdfa] dark:bg-[#242623] border border-[#e2ddd6] dark:border-[#ffffff1f] p-6 shadow-xs">
          <span className="text-[10px] font-bold tracking-widest text-[#6f706b] dark:text-[#b7b8b1] uppercase block mb-1">
            OFFICIAL TRANSIT AUDIT
          </span>
          <h3 className="text-lg font-bold text-[#252927] dark:text-[#f4f0ea] mb-4">
            Movement Timeline & Gate Checkpoints
          </h3>

          {scans.length === 0 ? (
            <div className="py-16 text-center text-[#6f706b] dark:text-[#b7b8b1]">
              <Compass className="w-10 h-10 mx-auto mb-2 opacity-40 text-[#c47735]" />
              <p className="text-xs font-semibold">No checkpoint scans logged yet.</p>
              <p className="text-[10px] opacity-75 mt-1">
                Your journey begins when your QR pass is scanned at the base camp gate.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative pl-6 border-l-2 border-[#2d5a3b]/40 space-y-5">
                {scans.map((scan, idx) => (
                  <div key={scan.id} className="relative">
                    <span className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-[#2d5a3b] border-2 border-white dark:border-[#242623]" />
                    <div className="bg-[#f5f1ed]/60 dark:bg-[#1b1c1a]/60 border border-[#e2ddd6] dark:border-[#ffffff1f] p-3 text-xs">
                      <div className="flex justify-between items-center">
                        <strong className="text-sm text-[#252927] dark:text-[#f4f0ea]">
                          {scan.checkpointName} ({scan.checkpointCode})
                        </strong>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[#e7eee7] text-[#2d5a3b] dark:bg-[#243628] dark:text-[#91bd9b]">
                          {scan.validationStatus}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#6f706b] dark:text-[#b7b8b1] mt-1 flex items-center gap-3">
                        <span>Time: {new Date(scan.scanTimestamp).toLocaleString()}</span>
                        <span>Operator: {scan.operatorEmail}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
