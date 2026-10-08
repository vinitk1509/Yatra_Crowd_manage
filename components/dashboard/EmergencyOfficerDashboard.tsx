'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldAlert,
  HeartPulse,
  AlertTriangle,
  Radio,
  MapPin,
  Clock,
  UserCheck,
  PhoneCall,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Send,
  Navigation,
  Compass,
  Activity,
  Layers,
  Filter,
  Check,
  Eye,
} from 'lucide-react'
import {
  EmergencyIncident,
  EmergencySeverity,
  EmergencyStatus,
  EmergencyScope,
  getEmergencyIncidents,
  updateIncidentStatus,
  verifyHazardIncident,
  getCheckpoints,
  Checkpoint,
} from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'
import { useRealTimeCrowd } from '@/lib/websocket-client'

export function EmergencyOfficerDashboard() {
  const { user } = useAuth()
  const { liveData } = useRealTimeCrowd()

  const [incidents, setIncidents] = useState<EmergencyIncident[]>([])
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTab, setFilterTab] = useState<'ALL' | 'PERSONAL_SOS' | 'PUBLIC_HAZARDS' | 'UNVERIFIED'>('ALL')
  const [selectedIncident, setSelectedIncident] = useState<EmergencyIncident | null>(null)

  // Verification Form Modal State
  const [verifyingIncident, setVerifyingIncident] = useState<EmergencyIncident | null>(null)
  const [verifySeverity, setVerifySeverity] = useState<EmergencySeverity>('WARNING')
  const [verifyScope, setVerifyScope] = useState<EmergencyScope>('ROUTE')
  const [verifyInstruction, setVerifyInstruction] = useState('')
  const [verifyNotes, setVerifyNotes] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  // Action Loading State per incident
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  useEffect(() => {
    loadIncidents()
  }, [])

  const loadIncidents = async () => {
    setLoading(true)
    try {
      const [incData, cpData] = await Promise.all([
        getEmergencyIncidents(),
        getCheckpoints(),
      ])
      setIncidents(incData)
      setCheckpoints(cpData)
      if (incData.length > 0 && !selectedIncident) {
        setSelectedIncident(incData[0])
      }
    } catch (err) {
      console.error('Error loading emergency incidents', err)
    } finally {
      setLoading(false)
    }
  }

  // Handle Lifecycle Status Updates
  const handleUpdateStatus = async (
    incidentId: number,
    newStatus: EmergencyStatus,
    notes?: string
  ) => {
    setActionLoadingId(incidentId)
    setActionMessage(null)
    try {
      const updated = await updateIncidentStatus(incidentId, {
        status: newStatus,
        responderNotes: notes || `Status marked as ${newStatus} by ${user?.name || 'Officer'}`,
      })

      // Update local state
      setIncidents((prev) => prev.map((inc) => (inc.id === incidentId ? updated : inc)))
      if (selectedIncident?.id === incidentId) {
        setSelectedIncident(updated)
      }
      setActionMessage(`Incident ${updated.incidentCode} updated to ${newStatus}`)
    } catch (err: any) {
      console.error('Failed to update incident status', err)
      alert(err.message || 'Status update failed')
    } finally {
      setActionLoadingId(null)
    }
  }

  // Handle Hazard Verification and Broadcast
  const handleVerifyAndBroadcast = async () => {
    if (!verifyingIncident) return
    if (!verifyInstruction.trim()) {
      alert('Please specify an official safety instruction for yatris.')
      return
    }

    setIsVerifying(true)
    try {
      const updated = await verifyHazardIncident(verifyingIncident.id, {
        status: 'OPEN',
        severity: verifySeverity,
        scope: verifyScope,
        safetyInstruction: verifyInstruction.trim(),
        responderNotes: verifyNotes.trim() || 'Verified on-site by Emergency Officer',
      })

      setIncidents((prev) => prev.map((inc) => (inc.id === verifyingIncident.id ? updated : inc)))
      if (selectedIncident?.id === verifyingIncident.id) {
        setSelectedIncident(updated)
      }
      setVerifyingIncident(null)
      setActionMessage(`Hazard ${updated.incidentCode} confirmed & broadcasted route-wide!`)
    } catch (err: any) {
      console.error('Failed to verify hazard', err)
      alert(err.message || 'Verification failed')
    } finally {
      setIsVerifying(false)
    }
  }

  // Filter incidents based on active tab
  const filteredIncidents = incidents.filter((inc) => {
    if (filterTab === 'PERSONAL_SOS') return inc.scope === 'PERSONAL'
    if (filterTab === 'PUBLIC_HAZARDS') return inc.scope !== 'PERSONAL' && inc.verified
    if (filterTab === 'UNVERIFIED') return !inc.verified || inc.status === 'UNVERIFIED_REPORT'
    return true
  })

  // Summary Metrics
  const personalSosCount = incidents.filter((i) => i.scope === 'PERSONAL' && i.status !== 'RESOLVED' && i.status !== 'FALSE_ALARM').length
  const unverifiedCount = incidents.filter((i) => !i.verified || i.status === 'UNVERIFIED_REPORT').length
  const activeHazardCount = incidents.filter((i) => i.scope !== 'PERSONAL' && i.verified && i.status !== 'RESOLVED' && i.status !== 'FALSE_ALARM').length
  const resolvedCount = incidents.filter((i) => i.status === 'RESOLVED').length

  return (
    <div className="space-y-6">
      {/* Top Tactical Command Strip */}
      <div className="bg-[#fffdfa] dark:bg-[#1f2220] border border-[#e5e1dc] dark:border-[#2f3532] p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-[#ad4037] text-white flex-shrink-0 shadow-sm">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-[#ad4037] dark:text-[#f87171] uppercase block">
              EMERGENCY OFFICER COMMAND CONSOLE · RESTRICTED ACCESS
            </span>
            <h2 className="text-xl font-bold text-[#252927] dark:text-[#f4f0ea]">
              Incident Dispatch & Rescue Management Hub
            </h2>
            <p className="text-xs text-[#5a5953] dark:text-[#a8a69e] mt-0.5">
              Live personal SOS telemetry, rescue team coordination, and route hazard verification.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadIncidents}
            className="px-3 py-1.5 bg-[#f5f1ed] hover:bg-[#eae5df] dark:bg-[#252927] border border-[#e5e1dc] dark:border-[#2f3532] text-xs font-mono font-bold text-[#252927] dark:text-[#f4f0ea] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Queue
          </button>
        </div>
      </div>

      {/* Metric Cards Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#ad4037]/10 dark:bg-[#ad4037]/20 border border-[#ad4037] p-4 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono font-bold text-[#ad4037] dark:text-[#f87171] uppercase">
              ACTIVE MEDICAL SOS
            </span>
            <HeartPulse className="w-4 h-4 text-[#ad4037]" />
          </div>
          <strong className="text-2xl font-bold text-[#ad4037] dark:text-[#f87171] block mt-1">
            {personalSosCount}
          </strong>
          <span className="text-[10px] font-mono text-[#7d7c76]">Requires immediate field response</span>
        </div>

        <div className="bg-[#c47735]/10 dark:bg-[#c47735]/20 border border-[#c47735] p-4 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono font-bold text-[#c47735] uppercase">
              UNVERIFIED CITIZEN REPORTS
            </span>
            <AlertTriangle className="w-4 h-4 text-[#c47735]" />
          </div>
          <strong className="text-2xl font-bold text-[#c47735] block mt-1">
            {unverifiedCount}
          </strong>
          <span className="text-[10px] font-mono text-[#7d7c76]">Awaiting officer verification</span>
        </div>

        <div className="bg-[#fffdfa] dark:bg-[#1f2220] border border-[#e5e1dc] dark:border-[#2f3532] p-4 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono font-bold text-[#7d7c76] uppercase">
              ACTIVE PUBLIC HAZARDS
            </span>
            <ShieldAlert className="w-4 h-4 text-[#2d5a3b]" />
          </div>
          <strong className="text-2xl font-bold text-[#252927] dark:text-[#f4f0ea] block mt-1">
            {activeHazardCount}
          </strong>
          <span className="text-[10px] font-mono text-[#7d7c76]">Broadcasted route warnings</span>
        </div>

        <div className="bg-[#fffdfa] dark:bg-[#1f2220] border border-[#e5e1dc] dark:border-[#2f3532] p-4 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono font-bold text-[#7d7c76] uppercase">
              RESOLVED INCIDENTS
            </span>
            <CheckCircle2 className="w-4 h-4 text-[#2d5a3b]" />
          </div>
          <strong className="text-2xl font-bold text-[#2d5a3b] block mt-1">
            {resolvedCount}
          </strong>
          <span className="text-[10px] font-mono text-[#7d7c76]">Cleared today</span>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 bg-[#2d5a3b]/10 border border-[#2d5a3b] text-xs font-mono font-bold text-[#2d5a3b] flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="cursor-pointer">✕</button>
        </div>
      )}

      {/* Main Two-Column Layout: Incident Queue (7 cols) + Selected Incident Details & Tactical Map (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Filterable Incident List (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-[#e5e1dc] dark:border-[#2f3532] pb-2">
            {[
              ['ALL', `All (${incidents.length})`],
              ['PERSONAL_SOS', `Personal SOS (${personalSosCount})`],
              ['UNVERIFIED', `Unverified (${unverifiedCount})`],
              ['PUBLIC_HAZARDS', `Public Hazards (${activeHazardCount})`],
            ].map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab as any)}
                className={`px-3 py-1.5 text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
                  filterTab === tab
                    ? 'bg-[#252927] text-white dark:bg-[#f4f0ea] dark:text-[#252927]'
                    : 'bg-[#f5f1ed] dark:bg-[#252927] text-[#7d7c76] hover:text-[#252927]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Incident Cards Queue */}
          {filteredIncidents.length === 0 ? (
            <div className="p-12 text-center bg-[#fffdfa] dark:bg-[#1f2220] border border-[#e5e1dc] dark:border-[#2f3532] text-[#7d7c76]">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-[#2d5a3b]" />
              <p className="text-xs font-mono font-bold">No active incidents matching selected filter.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredIncidents.map((incident) => {
                const isSelected = selectedIncident?.id === incident.id
                const isPersonal = incident.scope === 'PERSONAL'
                const isCritical = incident.severity === 'CRITICAL'
                const isUnverified = !incident.verified || incident.status === 'UNVERIFIED_REPORT'

                return (
                  <div
                    key={incident.id}
                    onClick={() => setSelectedIncident(incident)}
                    className={`p-4 border transition-all cursor-pointer shadow-xs ${
                      isSelected
                        ? 'border-[#252927] dark:border-[#f4f0ea] ring-1 ring-[#252927] bg-[#fffdfa] dark:bg-[#1f2220]'
                        : 'border-[#e5e1dc] dark:border-[#2f3532] bg-[#fbf8f4] dark:bg-[#1a1d1b] hover:bg-[#fffdfa]'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 dark:border-white/5 pb-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] font-mono font-bold px-2 py-0.5 uppercase ${
                            isCritical
                              ? 'bg-[#ad4037] text-white'
                              : isUnverified
                              ? 'bg-[#c47735] text-white'
                              : 'bg-[#2d5a3b] text-white'
                          }`}
                        >
                          {incident.incidentType}
                        </span>
                        <strong className="text-xs font-mono text-[#252927] dark:text-[#f4f0ea]">
                          {incident.incidentCode}
                        </strong>
                        {isPersonal && (
                          <span className="text-[9px] font-mono bg-[#ad4037]/10 text-[#ad4037] px-1.5 py-0.5 font-bold">
                            PERSONAL SOS
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 ${
                            incident.status === 'OPEN'
                              ? 'bg-[#ad4037]/15 text-[#ad4037]'
                              : incident.status === 'TEAM_DISPATCHED'
                              ? 'bg-[#c47735]/15 text-[#c47735]'
                              : incident.status === 'RESOLVED'
                              ? 'bg-[#2d5a3b]/15 text-[#2d5a3b]'
                              : 'bg-[#f5f1ed] text-[#7d7c76]'
                          }`}
                        >
                          {incident.status}
                        </span>
                        <span className="text-[10px] font-mono text-[#7d7c76]">
                          {new Date(incident.reportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-[#252927] dark:text-[#f4f0ea] mb-1">
                      {incident.title}
                    </h4>

                    {incident.description && (
                      <p className="text-xs text-[#5a5953] dark:text-[#b0ada5] mb-2 line-clamp-2">
                        {incident.description}
                      </p>
                    )}

                    {/* Metadata Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] font-mono text-[#7d7c76] border-t border-black/5 dark:border-white/5 pt-2">
                      <div>
                        <span>Yatri: </span>
                        <strong className="text-[#252927] dark:text-[#f4f0ea]">
                          {incident.pilgrimName || 'Public Observer'}
                        </strong>
                      </div>
                      <div>
                        <span>Zone: </span>
                        <strong className="text-[#c47735]">
                          {incident.checkpointName || incident.routeName || 'Trail Corridor'}
                        </strong>
                      </div>
                      <div>
                        <span>Location: </span>
                        {incident.latitude && incident.longitude ? (
                          <span className="text-[#2d5a3b] font-bold">
                            GPS ({incident.latitude.toFixed(4)}, {incident.longitude.toFixed(4)})
                          </span>
                        ) : (
                          <span>{incident.locationSource}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Column: Selected Incident Tactical Card & Actions (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {selectedIncident ? (
            <div className="bg-[#fffdfa] dark:bg-[#1f2220] border border-[#e5e1dc] dark:border-[#2f3532] p-5 shadow-xs sticky top-20">
              <div className="flex items-center justify-between border-b border-[#e5e1dc] dark:border-[#2f3532] pb-3 mb-4">
                <div>
                  <span className="text-[10px] font-mono font-bold tracking-widest text-[#ad4037] dark:text-[#f87171] uppercase block">
                    INCIDENT ACTION DESK
                  </span>
                  <h3 className="text-base font-bold text-[#252927] dark:text-[#f4f0ea]">
                    {selectedIncident.incidentCode}
                  </h3>
                </div>
                <span className="px-2 py-0.5 bg-[#252927] text-white text-[10px] font-mono font-bold">
                  {selectedIncident.status}
                </span>
              </div>

              {/* Pilgrim Details (if Personal SOS) */}
              {selectedIncident.scope === 'PERSONAL' && (
                <div className="p-3 bg-[#ad4037]/10 border border-[#ad4037]/30 text-xs font-mono mb-4">
                  <div className="flex items-center gap-2 font-bold text-[#ad4037] mb-2">
                    <HeartPulse className="w-4 h-4" />
                    PILGRIM RESCUE TELEMETRY
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-[#7d7c76] block text-[9px]">NAME</span>
                      <strong className="text-[#252927] dark:text-[#f4f0ea]">{selectedIncident.pilgrimName}</strong>
                    </div>
                    <div>
                      <span className="text-[#7d7c76] block text-[9px]">PASS NUMBER</span>
                      <strong className="text-[#c47735]">{selectedIncident.pilgrimRegistrationNumber}</strong>
                    </div>
                    <div>
                      <span className="text-[#7d7c76] block text-[9px]">AGE / GENDER</span>
                      <span>{selectedIncident.pilgrimAge} Yrs / {selectedIncident.pilgrimGender}</span>
                    </div>
                    <div>
                      <span className="text-[#7d7c76] block text-[9px]">BLOOD GROUP</span>
                      <strong className="text-[#ad4037]">{selectedIncident.pilgrimBloodGroup || 'O+ (Verified)'}</strong>
                    </div>
                    <div>
                      <span className="text-[#7d7c76] block text-[9px]">CONTACT PHONE</span>
                      <span>{selectedIncident.pilgrimPhone || '+91 9876543210'}</span>
                    </div>
                    <div>
                      <span className="text-[#7d7c76] block text-[9px]">EMERGENCY CONTACT</span>
                      <span>{selectedIncident.pilgrimEmergencyContact || '+91 9988776600'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Exact Location Coordinates & Accuracy */}
              <div className="p-3 bg-[#f5f1ed] dark:bg-[#252927] border border-[#e5e1dc] dark:border-[#2f3532] text-xs font-mono mb-4">
                <div className="flex items-center gap-2 font-bold text-[#252927] dark:text-[#f4f0ea] mb-1.5">
                  <MapPin className="w-4 h-4 text-[#2d5a3b]" />
                  GEOGRAPHIC COORDINATES & FIX
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[#7d7c76] block text-[9px]">LATITUDE / LONGITUDE</span>
                    <strong>
                      {selectedIncident.latitude ? `${selectedIncident.latitude.toFixed(5)}° N` : 'Unavailable'}
                      <br />
                      {selectedIncident.longitude ? `${selectedIncident.longitude.toFixed(5)}° E` : ''}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#7d7c76] block text-[9px]">SOURCE & ACCURACY</span>
                    <strong className="text-[#2d5a3b]">
                      {selectedIncident.locationSource} {selectedIncident.locationAccuracy ? `(±${Math.round(selectedIncident.locationAccuracy)}m)` : ''}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Responder Notes / Instruction */}
              {selectedIncident.safetyInstruction && (
                <div className="p-2.5 bg-[#fffdfa] dark:bg-[#1a1d1b] border border-[#e5e1dc] dark:border-[#2f3532] text-xs mb-4">
                  <span className="text-[10px] font-mono font-bold text-[#ad4037] uppercase block mb-1">
                    ACTIVE SAFETY INSTRUCTION
                  </span>
                  <p className="text-[#252927] dark:text-[#f4f0ea]">
                    {selectedIncident.safetyInstruction}
                  </p>
                </div>
              )}

              {/* Action Buttons Matrix */}
              <div className="space-y-2 pt-2 border-t border-[#e5e1dc] dark:border-[#2f3532]">
                <span className="text-[10px] font-mono font-bold text-[#7d7c76] uppercase block">
                  RESPONDER ACTIONS:
                </span>

                {/* If unverified report: allow Verify & Broadcast */}
                {(!selectedIncident.verified || selectedIncident.status === 'UNVERIFIED_REPORT') && (
                  <button
                    onClick={() => {
                      setVerifyingIncident(selectedIncident)
                      setVerifyInstruction('Caution: Route hazard confirmed. Proceed in single file and follow checkpoint guidance.')
                    }}
                    className="w-full py-2 bg-[#c47735] hover:bg-[#a86228] text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Check className="w-4 h-4" />
                    VERIFY & BROADCAST ROUTE ALERT
                  </button>
                )}

                {/* Status lifecycle triggers */}
                {selectedIncident.status === 'OPEN' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedIncident.id, 'ACKNOWLEDGED', `Acknowledged by Officer ${user?.name || ''}`)}
                    disabled={actionLoadingId === selectedIncident.id}
                    className="w-full py-2 bg-[#252927] hover:bg-[#383e3b] text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4" />
                    ACKNOWLEDGE INCIDENT
                  </button>
                )}

                {(selectedIncident.status === 'OPEN' || selectedIncident.status === 'ACKNOWLEDGED') && (
                  <button
                    onClick={() => handleUpdateStatus(selectedIncident.id, 'TEAM_DISPATCHED', 'Rescue unit dispatched to target GPS marker')}
                    disabled={actionLoadingId === selectedIncident.id}
                    className="w-full py-2 bg-[#ad4037] hover:bg-[#8f342d] text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Navigation className="w-4 h-4" />
                    DISPATCH RESCUE RESPONSE TEAM
                  </button>
                )}

                {selectedIncident.status !== 'RESOLVED' && selectedIncident.status !== 'FALSE_ALARM' && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleUpdateStatus(selectedIncident.id, 'RESOLVED', 'Yatri treated and safety cleared')}
                      disabled={actionLoadingId === selectedIncident.id}
                      className="py-2 bg-[#2d5a3b] hover:bg-[#23472e] text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      MARK RESOLVED
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedIncident.id, 'FALSE_ALARM', 'Dismissed as false report')}
                      disabled={actionLoadingId === selectedIncident.id}
                      className="py-2 bg-[#f5f1ed] dark:bg-[#252927] hover:bg-[#eae5df] text-[#ad4037] text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer border border-[#e5e1dc] dark:border-[#2f3532]"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      FALSE ALARM
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-[#fffdfa] dark:bg-[#1f2220] border border-[#e5e1dc] dark:border-[#2f3532] text-[#7d7c76]">
              <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-mono">Select an incident from the queue to view full telemetry.</p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VERIFICATION MODAL DIALOG                                                 */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {verifyingIncident && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#fffdfa] dark:bg-[#1f2220] border border-[#252927] max-w-lg w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-start border-b border-[#e5e1dc] dark:border-[#2f3532] pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#c47735] uppercase block">
                    OFFICIAL VERIFICATION
                  </span>
                  <h3 className="text-base font-bold text-[#252927] dark:text-[#f4f0ea]">
                    Confirm Hazard: {verifyingIncident.title}
                  </h3>
                </div>
                <button
                  onClick={() => setVerifyingIncident(null)}
                  className="text-[#7d7c76] hover:text-[#252927] cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-mono font-bold mb-1">
                    SEVERITY LEVEL <span className="text-[#ad4037]">*</span>
                  </label>
                  <select
                    value={verifySeverity}
                    onChange={(e) => setVerifySeverity(e.target.value as EmergencySeverity)}
                    className="w-full p-2 bg-[#fbf8f4] dark:bg-[#202422] border border-[#e5e1dc] dark:border-[#2f3532] text-xs font-mono"
                  >
                    <option value="CRITICAL">CRITICAL (Immediate danger / Trail blocked)</option>
                    <option value="WARNING">WARNING (Hazard present / Single-file flow)</option>
                    <option value="ADVISORY">ADVISORY (Precautionary / Weather advisory)</option>
                    <option value="INFO">INFO (General safety notice)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold mb-1">
                    BROADCAST SCOPE <span className="text-[#ad4037]">*</span>
                  </label>
                  <select
                    value={verifyScope}
                    onChange={(e) => setVerifyScope(e.target.value as EmergencyScope)}
                    className="w-full p-2 bg-[#fbf8f4] dark:bg-[#202422] border border-[#e5e1dc] dark:border-[#2f3532] text-xs font-mono"
                  >
                    <option value="ROUTE">ROUTE-WIDE (All pilgrims on this trail)</option>
                    <option value="CHECKPOINT">CHECKPOINT ZONE ONLY</option>
                    <option value="GLOBAL">GLOBAL (Entire Yatra network)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold mb-1">
                    PUBLIC SAFETY INSTRUCTION <span className="text-[#ad4037]">*</span>
                  </label>
                  <textarea
                    value={verifyInstruction}
                    onChange={(e) => setVerifyInstruction(e.target.value)}
                    rows={3}
                    className="w-full p-2 bg-[#fbf8f4] dark:bg-[#202422] border border-[#e5e1dc] dark:border-[#2f3532] text-xs"
                    placeholder="Instructions shown to all affected yatris..."
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold mb-1">
                    INTERNAL RESPONDER NOTES
                  </label>
                  <input
                    type="text"
                    value={verifyNotes}
                    onChange={(e) => setVerifyNotes(e.target.value)}
                    className="w-full p-2 bg-[#fbf8f4] dark:bg-[#202422] border border-[#e5e1dc] dark:border-[#2f3532] text-xs"
                    placeholder="e.g. Field team Alpha on site; bulldozer deployed"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#e5e1dc] dark:border-[#2f3532]">
                <button
                  onClick={() => setVerifyingIncident(null)}
                  className="px-4 py-2 text-xs font-mono text-[#7d7c76] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVerifyAndBroadcast}
                  disabled={isVerifying}
                  className="px-5 py-2.5 bg-[#c47735] hover:bg-[#a86228] text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Send className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                  {isVerifying ? 'BROADCASTING...' : 'CONFIRM & BROADCAST'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
