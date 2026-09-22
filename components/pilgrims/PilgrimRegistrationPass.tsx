'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  QrCode as QrIcon,
  UserPlus,
  CheckCircle2,
  Mountain,
  MapPin,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Phone,
  User,
  ScanLine,
} from 'lucide-react'
import {
  Route,
  Pilgrim,
  getRoutes,
  getPilgrims,
  registerPilgrim,
} from '@/lib/api-client'

interface PilgrimRegistrationPassProps {
  onScanPilgrimRequested?: (qrId: string) => void
}

export function PilgrimRegistrationPass({ onScanPilgrimRequested }: PilgrimRegistrationPassProps) {
  const [routes, setRoutes] = useState<Route[]>([])
  const [pilgrims, setPilgrims] = useState<Pilgrim[]>([])
  const [selectedPilgrim, setSelectedPilgrim] = useState<Pilgrim | null>(null)

  // Form State
  const [name, setName] = useState('')
  const [age, setAge] = useState<number>(32)
  const [gender, setGender] = useState('MALE')
  const [phone, setPhone] = useState('')
  const [emergencyContact, setEmergencyContact] = useState('')
  const [routeId, setRouteId] = useState<number>(1)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [rData, pData] = await Promise.all([getRoutes(), getPilgrims()])
      setRoutes(rData)
      if (rData.length > 0) {
        setRouteId(rData[0].id)
      }
      setPilgrims(pData)
      if (pData.length > 0 && !selectedPilgrim) {
        setSelectedPilgrim(pData[0])
      }
    } catch (err) {
      console.error('Failed to load routes or pilgrims', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const newPilgrim = await registerPilgrim({
        name,
        age: Number(age),
        gender,
        phoneNumber: phone || undefined,
        emergencyContact: emergencyContact || undefined,
        routeId: Number(routeId),
      })

      setSuccess(`Pilgrim registered! QR Credential ${newPilgrim.qrCode?.qrId} generated.`)
      setSelectedPilgrim(newPilgrim)
      setName('')
      setPhone('')
      setEmergencyContact('')
      loadData()
    } catch (err: any) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Registration Form (6 cols) */}
        <div className="lg:col-span-6 bg-[#fffdfa] dark:bg-[#242623] border border-[#e2ddd6] dark:border-[#ffffff1f] p-6 shadow-xs">
          <span className="text-[10px] font-bold tracking-widest text-[#6f706b] dark:text-[#b7b8b1] uppercase block mb-1">
            PILGRIM CREDENTIAL ISSUANCE
          </span>
          <h2 className="text-xl font-bold text-[#252927] dark:text-[#f4f0ea] mb-4">
            Register Pilgrim & Auto-Generate QR
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-[#f6dfdc] dark:bg-[#4b302c] border border-[#ad4037]/40 text-[#9e3c34] dark:text-[#ec9b70] text-xs">
              <strong>Error:</strong> {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-[#e7eee7] dark:bg-[#243628] border border-[#2d5a3b]/40 text-[#2d5a3b] dark:text-[#91bd9b] text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6f706b] dark:text-[#b7b8b1] mb-1">
                Pilgrim Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-[#6f706b]" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Chandra"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-[#f5f1ed] dark:bg-[#1b1c1a] border border-[#e2ddd6] dark:border-[#ffffff1f] focus:border-[#2d5a3b] outline-hidden text-[#252927] dark:text-[#f4f0ea]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6f706b] dark:text-[#b7b8b1] mb-1">
                  Age *
                </label>
                <input
                  type="number"
                  required
                  min={5}
                  max={100}
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-[#f5f1ed] dark:bg-[#1b1c1a] border border-[#e2ddd6] dark:border-[#ffffff1f] focus:border-[#2d5a3b] outline-hidden text-[#252927] dark:text-[#f4f0ea]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6f706b] dark:text-[#b7b8b1] mb-1">
                  Gender *
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#f5f1ed] dark:bg-[#1b1c1a] border border-[#e2ddd6] dark:border-[#ffffff1f] focus:border-[#2d5a3b] outline-hidden text-[#252927] dark:text-[#f4f0ea] h-[38px]"
                >
                  <option value="MALE">MALE</option>
                  <option value="FEMALE">FEMALE</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6f706b] dark:text-[#b7b8b1] mb-1">
                Authorized Pilgrimage Track *
              </label>
              <select
                value={routeId}
                onChange={(e) => setRouteId(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-bold bg-[#f5f1ed] dark:bg-[#1b1c1a] border border-[#e2ddd6] dark:border-[#ffffff1f] focus:border-[#2d5a3b] outline-hidden text-[#252927] dark:text-[#f4f0ea] h-[38px]"
              >
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code} · {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6f706b] dark:text-[#b7b8b1] mb-1">
                  Phone (Optional)
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full px-3 py-2 text-xs bg-[#f5f1ed] dark:bg-[#1b1c1a] border border-[#e2ddd6] dark:border-[#ffffff1f] focus:border-[#2d5a3b] outline-hidden text-[#252927] dark:text-[#f4f0ea]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6f706b] dark:text-[#b7b8b1] mb-1">
                  Emergency Contact
                </label>
                <input
                  type="text"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="+91 9876543211"
                  className="w-full px-3 py-2 text-xs bg-[#f5f1ed] dark:bg-[#1b1c1a] border border-[#e2ddd6] dark:border-[#ffffff1f] focus:border-[#2d5a3b] outline-hidden text-[#252927] dark:text-[#f4f0ea]"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#2d5a3b] hover:bg-[#23472e] text-[#fffdfa] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                {loading ? 'Issuing Official QR Pass...' : 'Register & Generate QR Pass'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Active Pilgrim Official Digital Pass (6 cols) */}
        <div className="lg:col-span-6 bg-[#30483a] border border-[#3b5344] p-6 shadow-xs text-[#edf3ec] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#ffffff20] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Mountain className="w-5 h-5 text-[#f1c18c]" />
                <span className="text-xs font-bold tracking-widest uppercase text-[#c5d5c7]">
                  AMARNATH YATRA DIGITAL PASS
                </span>
              </div>
              <span className="px-2 py-0.5 bg-[#ffffff18] text-[#f1c18c] text-[9px] font-bold tracking-wider">
                OFFICIAL CREDENTIAL
              </span>
            </div>

            {selectedPilgrim ? (
              <div className="space-y-4">
                <div className="bg-[#fffdfa] text-[#252927] p-5 shadow-lg max-w-sm mx-auto">
                  <div className="flex justify-between items-start border-b border-[#e2ddd6] pb-2 mb-3">
                    <div>
                      <span className="text-[8px] font-bold tracking-widest text-[#a5632c] uppercase block">
                        SASB VERIFIED PASS
                      </span>
                      <h3 className="text-base font-bold tracking-tight text-[#252927]">
                        {selectedPilgrim.name}
                      </h3>
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[#e7eee7] text-[#2d5a3b]">
                      {selectedPilgrim.status}
                    </span>
                  </div>

                  {/* QR Matrix Graphic */}
                  <div className="grid grid-cols-8 gap-1.5 w-36 h-36 mx-auto p-3 border-4 border-[#252927] bg-white my-3">
                    {Array.from({ length: 64 }).map((_, i) => (
                      <i
                        key={i}
                        className="bg-[#252927] rounded-none"
                        style={{
                          opacity: (i * 13 + (selectedPilgrim.id || 1) * 7) % 5 === 0 ? 0.08 : 1,
                        }}
                      />
                    ))}
                  </div>

                  <div className="text-center font-mono text-[9px] text-[#6f706b] mb-3">
                    {selectedPilgrim.qrCode?.qrId || 'QR-YF-PENDING'}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-[#e2ddd6] pt-2">
                    <div>
                      <span className="text-[#6f706b] block text-[8px] font-bold">PILGRIM CODE</span>
                      <b className="font-mono text-[#252927]">{selectedPilgrim.pilgrimCode}</b>
                    </div>
                    <div>
                      <span className="text-[#6f706b] block text-[8px] font-bold">ROUTE</span>
                      <b className="text-[#c47735]">{selectedPilgrim.routeCode}</b>
                    </div>
                    <div>
                      <span className="text-[#6f706b] block text-[8px] font-bold">AGE / GENDER</span>
                      <span>{selectedPilgrim.age} / {selectedPilgrim.gender}</span>
                    </div>
                    <div>
                      <span className="text-[#6f706b] block text-[8px] font-bold">VERSION</span>
                      <span>1.0 IMMUTABLE</span>
                    </div>
                  </div>
                </div>

                {onScanPilgrimRequested && selectedPilgrim.qrCode && (
                  <div className="text-center pt-2">
                    <button
                      onClick={() => onScanPilgrimRequested(selectedPilgrim.qrCode!.qrId)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#f1c18c] text-[#27372f] text-xs font-bold uppercase tracking-wider hover:bg-[#e3a05b] transition-colors cursor-pointer"
                    >
                      <ScanLine className="w-4 h-4" />
                      Test Scan This Pass at Checkpoint
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-16 text-center text-[#c5d5c7]">
                <QrIcon className="w-12 h-12 mx-auto mb-2 opacity-40 text-[#f1c18c]" />
                <p className="text-sm font-semibold">No Pilgrim Selected</p>
                <p className="text-xs opacity-75 mt-1">Register a pilgrim to view their official QR Pass.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pilgrim Registry Table */}
      <div className="bg-[#fffdfa] dark:bg-[#242623] border border-[#e2ddd6] dark:border-[#ffffff1f] p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#e2ddd6] dark:border-[#ffffff1f] mb-3">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-[#6f706b] dark:text-[#b7b8b1] uppercase block">
              REGISTRY
            </span>
            <h4 className="text-sm font-bold text-[#252927] dark:text-[#f4f0ea]">
              Registered Pilgrims ({pilgrims.length})
            </h4>
          </div>
          <button
            onClick={loadData}
            className="p-1.5 text-[#6f706b] hover:text-[#252927] dark:text-[#b7b8b1] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#252927] dark:text-[#f4f0ea]">
            <thead>
              <tr className="border-b border-[#e2ddd6] dark:border-[#ffffff1f] text-[10px] text-[#6f706b] dark:text-[#b7b8b1] uppercase">
                <th className="pb-2">Pilgrim</th>
                <th className="pb-2">Code</th>
                <th className="pb-2">Route</th>
                <th className="pb-2">QR ID</th>
                <th className="pb-2">Status</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2ddd6] dark:divide-[#ffffff1f]">
              {pilgrims.map((p) => (
                <tr key={p.id} className="hover:bg-[#f5f1ed]/50 dark:hover:bg-[#1b1c1a]/50">
                  <td className="py-2.5 font-semibold">{p.name}</td>
                  <td className="py-2.5 font-mono text-[#6f706b] dark:text-[#b7b8b1]">{p.pilgrimCode}</td>
                  <td className="py-2.5 text-[#c47735]">{p.routeName}</td>
                  <td className="py-2.5 font-mono text-[10px]">{p.qrCode?.qrId || 'N/A'}</td>
                  <td className="py-2.5">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 ${
                        p.status === 'COMPLETED'
                          ? 'bg-[#e5edf1] text-[#55707c]'
                          : p.status === 'IN_TRANSIT'
                          ? 'bg-[#f6eadc] text-[#a5632c]'
                          : 'bg-[#e7eee7] text-[#2d5a3b]'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="py-2.5 text-right">
                    <button
                      onClick={() => setSelectedPilgrim(p)}
                      className="px-2 py-1 bg-[#f5f1ed] hover:bg-[#eae5df] dark:bg-[#1b1c1a] border border-[#e2ddd6] dark:border-[#ffffff1f] text-[10px] font-bold uppercase transition-colors cursor-pointer"
                    >
                      View Pass
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
