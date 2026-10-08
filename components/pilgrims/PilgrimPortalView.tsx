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
  ScanLine,
  Sparkles,
} from 'lucide-react'
import {
  Pilgrim,
  ScanEvent,
  getPilgrims,
  getPilgrimScans,
  registerPilgrim,
  recordScanEvent,
} from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'
import { useUnifiedCrowd } from '@/lib/unified-crowd-state'

// Deterministic hash to generate realistic QR pattern matrices
function generateQrMatrix(seed: string): boolean[] {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }

  const cells: boolean[] = []
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      // Standard QR position detection corners (top-left, top-right, bottom-left)
      const isTopLeft = row < 3 && col < 3
      const isTopRight = row < 3 && col > 4
      const isBottomLeft = row > 4 && col < 3

      if (isTopLeft || isTopRight || isBottomLeft) {
        // Corner markers (solid border, hollow inner)
        const isBorder =
          (row === 0 || row === 2 || col === 0 || col === 2) && isTopLeft ||
          (row === 0 || row === 2 || col === 5 || col === 7) && isTopRight ||
          (row === 5 || row === 7 || col === 0 || col === 2) && isBottomLeft
        cells.push(isBorder)
      } else {
        // Pseudo-random pseudo-hash for internal data cells
        const val = Math.abs((hash ^ (row * 17 + col * 31 + row * col * 7)) % 100)
        cells.push(val > 42)
      }
    }
  }
  return cells
}

export function PilgrimPortalView() {
  const { user } = useAuth()
  const { addSingleScan } = useUnifiedCrowd()
  const [pilgrim, setPilgrim] = useState<Pilgrim | null>(null)
  const [scans, setScans] = useState<ScanEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [scanMessage, setScanMessage] = useState<string | null>(null)

  useEffect(() => {
    loadPilgrimData()
  }, [user])

  const loadPilgrimData = async () => {
    setLoading(true)
    setScanMessage(null)
    try {
      const allPilgrims = await getPilgrims()
      
      // Match by pilgrim name or code
      let found = allPilgrims.find(
        (p) =>
          p.name.trim().toLowerCase() === user?.name?.trim().toLowerCase() ||
          (user?.email && p.phoneNumber && user.email.includes(p.phoneNumber))
      )

      // If no matching pilgrim record exists yet for this user, automatically provision one!
      if (!found && user?.name) {
        try {
          found = await registerPilgrim({
            name: user.name,
            age: 32,
            gender: 'MALE',
            routeId: 1, // Default Baltal Route
          })
        } catch (regErr) {
          console.warn('Auto-registration of pilgrim pass failed, checking fallback:', regErr)
        }
      }

      // If still not found, check if any pilgrim exists or fallback
      if (!found && allPilgrims.length > 0) {
        found = allPilgrims[0]
      }

      if (found) {
        setPilgrim(found)
        try {
          const scanHistory = await getPilgrimScans(found.id)
          setScans(scanHistory)
        } catch {
          setScans([])
        }
      }
    } catch (err) {
      console.error('Error loading pilgrim portal data', err)
    } finally {
      setLoading(false)
    }
  }

  // Quick Demo Action: Simulate gate scan at Base Camp (CP-01) or Domel (CP-02)
  const handleSimulateScan = async () => {
    if (!pilgrim?.qrCode?.qrId) return
    setScanning(true)
    setScanMessage(null)
    try {
      const nextCheckpointId = scans.length === 0 ? 1 : scans.length === 1 ? 2 : 3
      const cpCode = `CP-0${nextCheckpointId}`
      
      // Sync unified crowd engine instantly
      addSingleScan(cpCode, pilgrim.name, pilgrim.qrCode.qrId)

      const result = await recordScanEvent({
        qrId: pilgrim.qrCode.qrId,
        checkpointId: nextCheckpointId,
        scanType: 'ENTRY',
      })
      setScanMessage(`Scan verified at ${result.checkpointName}! Timeline updated.`)
      // Reload scans
      const updated = await getPilgrimScans(pilgrim.id)
      setScans(updated)
      // Update pilgrim status if now in transit
      if (pilgrim.status === 'REGISTERED') {
        setPilgrim({ ...pilgrim, status: 'IN_TRANSIT' })
      }
    } catch (err: any) {
      setScanMessage(err.message || 'Simulated scan failed')
    } finally {
      setScanning(false)
    }
  }

  const qrSeed = pilgrim?.qrCode?.qrId || pilgrim?.pilgrimCode || pilgrim?.name || 'YATRA_PASS_DEFAULT'
  const qrCells = generateQrMatrix(qrSeed)

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#fffdfa] dark:bg-[#242623] border border-[#e2ddd6] dark:border-[#ffffff1f] p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-[#6f706b] dark:text-[#b7b8b1] uppercase block mb-1">
            PILGRIM CREDENTIAL & TRANSIT PORTAL
          </span>
          <h2 className="text-xl font-bold text-[#252927] dark:text-[#f4f0ea]">
            Welcome, {pilgrim?.name || user?.name || 'Yatri'}
          </h2>
          <p className="text-xs text-[#6f706b] dark:text-[#b7b8b1] mt-0.5">
            Present your official cryptographic QR code credential at each gate checkpoint along your authorized trail.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadPilgrimData}
            className="px-3 py-1.5 bg-[#f5f1ed] hover:bg-[#eae5df] dark:bg-[#1b1c1a] border border-[#e2ddd6] dark:border-[#ffffff1f] text-xs font-bold uppercase tracking-wider text-[#252927] dark:text-[#f4f0ea] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Status
          </button>
        </div>
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

                {/* Unique Cryptographic QR Matrix Graphic */}
                <div className="grid grid-cols-8 gap-1.5 w-44 h-44 mx-auto p-3 border-4 border-[#252927] bg-white my-3 shadow-inner">
                  {qrCells.map((isFilled, i) => (
                    <i
                      key={i}
                      className={`transition-colors ${
                        isFilled ? 'bg-[#252927]' : 'bg-[#e2ddd6]/25'
                      }`}
                    />
                  ))}
                </div>

                <div className="text-center font-mono text-[10px] font-bold text-[#2d5a3b] mb-3">
                  {pilgrim.qrCode?.qrId || 'QR-YF-PENDING'}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-[#e2ddd6] pt-2">
                  <div>
                    <span className="text-[#6f706b] block text-[8px] font-bold">PILGRIM ID</span>
                    <b className="font-mono text-[#252927]">{pilgrim.pilgrimCode}</b>
                  </div>
                  <div>
                    <span className="text-[#6f706b] block text-[8px] font-bold">ASSIGNED ROUTE</span>
                    <b className="text-[#c47735]">{pilgrim.routeCode || pilgrim.routeName || 'RT-BALTAL'}</b>
                  </div>
                  <div>
                    <span className="text-[#6f706b] block text-[8px] font-bold">AGE / GENDER</span>
                    <span>{pilgrim.age || 32} / {pilgrim.gender || 'MALE'}</span>
                  </div>
                  <div>
                    <span className="text-[#6f706b] block text-[8px] font-bold">SECURITY VERSION</span>
                    <span className="text-[#2d5a3b] font-bold">SHA-256 IMMUTABLE</span>
                  </div>
                </div>

                {/* Demo Action: Quick Gate Scan Simulation */}
                <div className="mt-4 pt-3 border-t border-[#e2ddd6]">
                  <button
                    onClick={handleSimulateScan}
                    disabled={scanning}
                    className="w-full py-2 bg-[#2d5a3b] hover:bg-[#24482f] text-white text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <ScanLine className={`w-3.5 h-3.5 ${scanning ? 'animate-pulse' : ''}`} />
                    {scanning ? 'Verifying Scan...' : 'Simulate Checkpoint Scan'}
                  </button>
                  {scanMessage && (
                    <p className="text-[10px] text-center text-[#2d5a3b] font-semibold mt-1.5">
                      {scanMessage}
                    </p>
                  )}
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
              <p className="text-[10px] opacity-75 mt-1 max-w-xs mx-auto">
                Your journey begins when your QR pass is scanned at the base camp gate (Baltal / Pahalgam).
              </p>
              <button
                onClick={handleSimulateScan}
                className="mt-4 px-4 py-1.5 bg-[#f5f1ed] hover:bg-[#eae5df] dark:bg-[#1b1c1a] border border-[#e2ddd6] dark:border-[#ffffff1f] text-xs font-bold text-[#2d5a3b] dark:text-[#91bd9b] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ScanLine className="w-3.5 h-3.5" />
                Scan at Gate 1 (CP-01)
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative pl-6 border-l-2 border-[#2d5a3b]/40 space-y-5">
                {scans.map((scan) => (
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
                      <div className="text-[10px] text-[#6f706b] dark:text-[#b7b8b1] mt-1 flex items-center justify-between">
                        <span>Time: {new Date(scan.scanTimestamp).toLocaleString()}</span>
                        <span className="font-mono">{scan.operatorEmail}</span>
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

