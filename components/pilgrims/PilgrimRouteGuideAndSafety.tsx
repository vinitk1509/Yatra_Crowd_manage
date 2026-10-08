'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  HeartPulse,
  MapPin,
  ShieldAlert,
  Radio,
  CheckCircle2,
  Clock,
  Compass,
  Navigation,
  PhoneCall,
  Activity,
  Send,
  RefreshCw,
  Mountain,
  Info,
  ShieldCheck,
  Hospital,
  Droplet,
  Tent,
  Flame,
  CloudRain,
  Layers,
  ChevronRight,
  Footprints,
} from 'lucide-react'
import {
  createPersonalSos,
  reportPublicHazard,
  getMyActiveEmergency,
  getPublicSafetyAlerts,
  EmergencyIncident,
  PublicSafetyAlert,
  IncidentType,
  EmergencySeverity,
  LocationSource,
  getPilgrims,
  Pilgrim,
  getCheckpoints,
  Checkpoint,
} from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'
import { useRealTimeCrowd } from '@/lib/websocket-client'
import { useUnifiedCrowd } from '@/lib/unified-crowd-state'

interface WaypointMeta {
  code: string
  name: string
  shortName: string
  x: number
  y: number
  elevation: string
  distance: string
  eta: string
  capacity: number
  facilities: string[]
  advice: string
}

const WAYPOINTS_METADATA: WaypointMeta[] = [
  {
    code: 'CP-01',
    name: 'Baltal Base Camp',
    shortName: 'Baltal Base',
    x: 11,
    y: 68,
    elevation: '2,743 m (9,000 ft)',
    distance: '0.0 KM',
    eta: 'Starting Point',
    capacity: 4500,
    facilities: [
      '50-Bed Base Hospital & ICU',
      'Central Yatri Niwas Hall',
      'Free 24/7 Langar & Hot Water',
      'Luggage Cloakroom & Lockers',
    ],
    advice: 'Begin steady acclimatization here. Take warm oral rehydration solution before departure.',
  },
  {
    code: 'CP-02',
    name: 'Domel Access Gate & Bridge',
    shortName: 'Domel',
    x: 29,
    y: 55,
    elevation: '2,900 m (9,514 ft)',
    distance: '2.7 KM',
    eta: '1h 15m from Base',
    capacity: 4800,
    facilities: [
      'CRPF Security Scan Gate',
      'First Aid Medical Clinic',
      'Pony / Palki Official Stand',
      'Emergency Oxygen Booth',
    ],
    advice: 'Mandatory RFID/QR gate check. Ensure your trekking shoes and walking stick are secured.',
  },
  {
    code: 'CP-03',
    name: 'Barari / Sheshnag Halt',
    shortName: 'Barari',
    x: 49,
    y: 43,
    elevation: '3,570 m (11,712 ft)',
    distance: '8.5 KM',
    eta: '3h 45m from Base',
    capacity: 5200,
    facilities: [
      'High-Altitude Medical Post',
      'Hyperbaric Oxygen Chamber',
      'Insulated Rest Tents',
      'NDRF Mountain Helipad',
    ],
    advice: 'High-Altitude Zone. If experiencing shortness of breath or dizziness, stop at the medical clinic for SpO2 check.',
  },
  {
    code: 'CP-04',
    name: 'Sangam Top / Panchtarni',
    shortName: 'Sangam',
    x: 68,
    y: 31,
    elevation: '3,657 m (12,000 ft)',
    distance: '11.2 KM',
    eta: '5h 15m from Base',
    capacity: 4300,
    facilities: [
      'Army Field Clinic & Doctors',
      '5,000-Capacity Tent Colony',
      'Free Hot Meals Langar',
      'Mountain Rescue Detachment',
    ],
    advice: 'Confluence point with Pahalgam track. Cold winds intensify in late afternoon; keep windcheater and thermal caps on.',
  },
  {
    code: 'CP-05',
    name: 'Holy Cave Shrine (Sanctum)',
    shortName: 'Holy Cave',
    x: 87,
    y: 20,
    elevation: '3,888 m (12,756 ft)',
    distance: '14.0 KM',
    eta: 'Corridor Summit',
    capacity: 4900,
    facilities: [
      'Shrine Board Darshan Command',
      'Direct Resuscitation Unit',
      'Blanket Distribution Counter',
      'One-Way Return Exit Stairs',
    ],
    advice: 'Holy Darshan Sanctum. Maintain queue line; avoid pushing on stairs and descend carefully.',
  },
]

export function PilgrimRouteGuideAndSafety() {
  const { user } = useAuth()
  const { liveData } = useRealTimeCrowd()
  const { checkpoints: unifiedCps, averageSpeed, peakOccupancy, totalPilgrims } = useUnifiedCrowd()

  // Selected Waypoint on Map
  const [selectedCpIdx, setSelectedCpIdx] = useState(0)

  // Pilgrim Profile & Checkpoints
  const [pilgrim, setPilgrim] = useState<Pilgrim | null>(null)
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [activeAlerts, setActiveAlerts] = useState<PublicSafetyAlert[]>([])
  const [activeEmergency, setActiveEmergency] = useState<EmergencyIncident | null>(null)
  const [loading, setLoading] = useState(true)

  // Emergency Form Mode: 'NONE' | 'MEDICAL_SOS' | 'REPORT_HAZARD'
  const [emergencyMode, setEmergencyMode] = useState<'NONE' | 'MEDICAL_SOS' | 'REPORT_HAZARD'>('NONE')

  // GPS Location State
  const [gpsLocation, setGpsLocation] = useState<{
    lat: number | null
    lng: number | null
    accuracy: number | null
    source: LocationSource
  }>({
    lat: null,
    lng: null,
    accuracy: null,
    source: 'UNAVAILABLE',
  })
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState<string | null>(null)

  // Medical SOS Form Inputs
  const [sosType, setSosType] = useState<IncidentType>('MEDICAL')
  const [sosDescription, setSosDescription] = useState('')
  const [isSubmittingSos, setIsSubmittingSos] = useState(false)
  const [sosSuccessNotice, setSosSuccessNotice] = useState<EmergencyIncident | null>(null)

  // Public Hazard Report Inputs
  const [hazardType, setHazardType] = useState<IncidentType>('LANDSLIDE')
  const [hazardTitle, setHazardTitle] = useState('')
  const [hazardDesc, setHazardDesc] = useState('')
  const [hazardCheckpointId, setHazardCheckpointId] = useState<number | undefined>(undefined)
  const [isSubmittingHazard, setIsSubmittingHazard] = useState(false)
  const [hazardSuccessNotice, setHazardSuccessNotice] = useState<EmergencyIncident | null>(null)

  useEffect(() => {
    loadInitialData()
    acquireGpsLocation()
  }, [user])

  const loadInitialData = async () => {
    setLoading(true)
    try {
      const [pilData, cpData, alertData, myEmg] = await Promise.all([
        getPilgrims(),
        getCheckpoints(),
        getPublicSafetyAlerts(),
        getMyActiveEmergency(),
      ])

      setCheckpoints(cpData)
      setActiveAlerts(alertData)
      setActiveEmergency(myEmg)

      // Find matching pilgrim record
      let found = pilData.find(
        (p) =>
          p.name.trim().toLowerCase() === user?.name?.trim().toLowerCase() ||
          (user?.email && p.phoneNumber && user.email.includes(p.phoneNumber))
      )
      if (!found && pilData.length > 0) {
        found = pilData[0]
      }
      setPilgrim(found || null)
    } catch (err) {
      console.warn('Error loading pilgrim route guide data', err)
    } finally {
      setLoading(false)
    }
  }

  // Request browser Geolocation API
  const acquireGpsLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsLocation({
        lat: null,
        lng: null,
        accuracy: null,
        source: 'UNAVAILABLE',
      })
      setGpsError('Browser geolocation is not supported on this device.')
      return
    }

    setGpsLoading(true)
    setGpsError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          source: 'LIVE_GPS',
        })
        setGpsLoading(false)
      },
      (error) => {
        console.warn('Geolocation error:', error.message)
        setGpsError('GPS permission denied or timeout. Safe fallback to checkpoint location enabled.')
        setGpsLocation({
          lat: null,
          lng: null,
          accuracy: null,
          source: 'LAST_CHECKPOINT',
        })
        setGpsLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    )
  }

  // Handle Medical SOS Submission
  const handleSendSos = async () => {
    setIsSubmittingSos(true)
    try {
      const payload = {
        incidentType: sosType,
        description: sosDescription.trim() || undefined,
        latitude: gpsLocation.lat || undefined,
        longitude: gpsLocation.lng || undefined,
        locationAccuracy: gpsLocation.accuracy || undefined,
        locationSource: gpsLocation.source,
        routeId: pilgrim?.routeId || 1,
      }

      const res = await createPersonalSos(payload)
      setSosSuccessNotice(res)
      setActiveEmergency(res)
      setSosDescription('')
    } catch (err: any) {
      console.error('Failed to trigger SOS', err)
      alert(err.message || 'Failed to submit SOS. Please call Emergency Helpdesk immediately.')
    } finally {
      setIsSubmittingSos(false)
    }
  }

  // Handle Public Hazard Report Submission
  const handleReportHazard = async () => {
    if (!hazardTitle.trim()) {
      alert('Please provide a brief title describing the hazard.')
      return
    }

    setIsSubmittingHazard(true)
    try {
      const payload = {
        incidentType: hazardType,
        routeId: pilgrim?.routeId || 1,
        checkpointId: hazardCheckpointId,
        title: hazardTitle.trim(),
        description: hazardDesc.trim() || undefined,
        severity: 'WARNING' as EmergencySeverity,
        latitude: gpsLocation.lat || undefined,
        longitude: gpsLocation.lng || undefined,
      }

      const res = await reportPublicHazard(payload)
      setHazardSuccessNotice(res)
      setHazardTitle('')
      setHazardDesc('')
    } catch (err: any) {
      console.error('Failed to report hazard', err)
      alert(err.message || 'Failed to submit hazard report.')
    } finally {
      setIsSubmittingHazard(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#fffdfa] dark:bg-[#1f2220] border border-[#e5e1dc] dark:border-[#2f3532] p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Mountain className="w-4 h-4 text-[#c47735]" />
            <span className="text-[10px] font-bold font-mono tracking-widest text-[#7d7c76] uppercase">
              PILGRIM SAFETY & ROUTE GUIDANCE
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#252927] dark:text-[#f4f0ea]">
            Route Guide & Emergency Assistance
          </h2>
          <p className="text-xs text-[#5a5953] dark:text-[#a8a69e] mt-0.5">
            Active track conditions, shelter waypoints, public safety advisories, and instant 24/7 rescue SOS.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadInitialData}
            className="px-3 py-1.5 bg-[#f5f1ed] hover:bg-[#eae5df] dark:bg-[#252927] border border-[#e5e1dc] dark:border-[#2f3532] text-xs font-mono font-bold text-[#252927] dark:text-[#f4f0ea] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Alerts
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. ACTIVE PUBLIC SAFETY ALERTS BANNER (Broadcasted Hazards / Warnings)   */}
      {/* ========================================================================= */}
      {activeAlerts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#ad4037] dark:text-[#f87171] uppercase">
            <Radio className="w-4 h-4 animate-pulse" />
            <span>LIVE OFFICIAL ROUTE SAFETY ADVISORIES ({activeAlerts.length})</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeAlerts.map((alert) => {
              const isCritical = alert.severity === 'CRITICAL'
              const isWarning = alert.severity === 'WARNING'
              const isAdvisory = alert.severity === 'ADVISORY'

              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 border-l-4 shadow-xs ${
                    isCritical
                      ? 'bg-[#ad4037]/10 dark:bg-[#ad4037]/20 border-[#ad4037] text-[#252927] dark:text-[#f4f0ea]'
                      : isWarning
                      ? 'bg-[#c47735]/10 dark:bg-[#c47735]/20 border-[#c47735] text-[#252927] dark:text-[#f4f0ea]'
                      : 'bg-[#2d5a3b]/10 dark:bg-[#2d5a3b]/20 border-[#2d5a3b] text-[#252927] dark:text-[#f4f0ea]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-mono font-bold px-2 py-0.5 uppercase ${
                          isCritical
                            ? 'bg-[#ad4037] text-white'
                            : isWarning
                            ? 'bg-[#c47735] text-white'
                            : 'bg-[#2d5a3b] text-white'
                        }`}
                      >
                        {alert.severity}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-[#7d7c76]">
                        {alert.incidentType}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-[#7d7c76] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(alert.reportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-[#252927] dark:text-[#f4f0ea] mb-1">
                    {alert.title}
                  </h4>

                  {alert.description && (
                    <p className="text-xs text-[#5a5953] dark:text-[#b0ada5] mb-2">
                      {alert.description}
                    </p>
                  )}

                  {alert.safetyInstruction && (
                    <div className="mt-2 p-2 bg-white/70 dark:bg-[#1a1d1b]/70 border border-[#e5e1dc] dark:border-[#2f3532] text-xs">
                      <strong className="text-[10px] font-mono text-[#ad4037] dark:text-[#f87171] uppercase block mb-0.5">
                        OFFICIAL INSTRUCTION:
                      </strong>
                      <span className="text-[#252927] dark:text-[#f4f0ea]">
                        {alert.safetyInstruction}
                      </span>
                    </div>
                  )}

                  <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[10px] font-mono text-[#7d7c76]">
                    <span>Affected Area: {alert.checkpointName || alert.routeName || 'All Routes'}</span>
                    <span>Code: {alert.incidentCode}</span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PROMINENT EMERGENCY ASSISTANCE & SOS SECTION                          */}
      {/* ========================================================================= */}
      <div className="bg-[#ad4037]/10 dark:bg-[#ad4037]/20 border-2 border-[#ad4037] p-5 sm:p-6 shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#ad4037]/30 pb-4 mb-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-[#ad4037] text-white flex-shrink-0 animate-pulse shadow-sm">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#ad4037] dark:text-[#f87171] uppercase block">
                24/7 EMERGENCY COMMAND DISPATCH
              </span>
              <h3 className="text-lg font-bold text-[#252927] dark:text-[#f4f0ea]">
                Emergency Assistance & SOS Hotline
              </h3>
              <p className="text-xs text-[#5a5953] dark:text-[#a8a69e]">
                Need urgent medical rescue, mountain safety dispatch, or reporting a route hazard?
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setEmergencyMode(emergencyMode === 'MEDICAL_SOS' ? 'NONE' : 'MEDICAL_SOS')
                acquireGpsLocation()
              }}
              className={`px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
                emergencyMode === 'MEDICAL_SOS'
                  ? 'bg-[#ad4037] text-white ring-2 ring-[#ad4037] ring-offset-2'
                  : 'bg-[#ad4037] hover:bg-[#8f342d] text-white'
              }`}
            >
              <HeartPulse className="w-4 h-4" />
              MEDICAL / PERSONAL SOS
            </button>

            <button
              onClick={() => {
                setEmergencyMode(emergencyMode === 'REPORT_HAZARD' ? 'NONE' : 'REPORT_HAZARD')
                acquireGpsLocation()
              }}
              className={`px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer border ${
                emergencyMode === 'REPORT_HAZARD'
                  ? 'bg-[#c47735] text-white border-[#c47735]'
                  : 'bg-[#fffdfa] dark:bg-[#1a1d1b] hover:bg-[#f5f1ed] text-[#252927] dark:text-[#f4f0ea] border-[#e5e1dc] dark:border-[#2f3532]'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-[#c47735]" />
              REPORT ROUTE HAZARD
            </button>
          </div>
        </div>

        {/* ACTIVE PERSONAL SOS STATUS BANNER (If pilgrim already triggered SOS) */}
        {activeEmergency && (
          <div className="mb-4 p-4 bg-[#fffdfa] dark:bg-[#1a1d1b] border border-[#ad4037] shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#e5e1dc] dark:border-[#2f3532] pb-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ad4037] animate-ping" />
                <strong className="text-xs font-mono font-bold text-[#ad4037] dark:text-[#f87171] uppercase">
                  ACTIVE SOS REGISTERED IN CONTROL ROOM
                </strong>
              </div>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-[#ad4037]/10 text-[#ad4037] dark:text-[#f87171]">
                STATUS: {activeEmergency.status}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono mt-2">
              <div>
                <span className="text-[#7d7c76] block text-[10px]">EMERGENCY ID</span>
                <strong className="text-[#252927] dark:text-[#f4f0ea]">{activeEmergency.incidentCode}</strong>
              </div>
              <div>
                <span className="text-[#7d7c76] block text-[10px]">REPORTED AT</span>
                <span>{new Date(activeEmergency.reportedAt).toLocaleTimeString()}</span>
              </div>
              <div>
                <span className="text-[#7d7c76] block text-[10px]">ASSIGNED RESPONDER</span>
                <span className="text-[#2d5a3b] font-bold">{activeEmergency.assignedResponderName || 'Dispatched (Team Alpha)'}</span>
              </div>
            </div>

            <div className="mt-3 p-2.5 bg-[#fbf8f4] dark:bg-[#202422] border border-[#e5e1dc] dark:border-[#2f3532] text-xs">
              <p className="text-[#5a5953] dark:text-[#a8a69e]">
                <strong>Guidance:</strong> {activeEmergency.safetyInstruction || 'Stay where you are if it is safe to do so. Emergency team has received your GPS coordinates and is moving toward your position.'}
              </p>
            </div>
          </div>
        )}

        {/* SOS Confirmation Notice */}
        {sosSuccessNotice && !activeEmergency && (
          <div className="mb-4 p-4 bg-[#2d5a3b]/10 border border-[#2d5a3b] text-xs text-[#252927] dark:text-[#f4f0ea]">
            <div className="flex items-center gap-2 font-bold text-[#2d5a3b] mb-1">
              <CheckCircle2 className="w-4 h-4" />
              SOS SENT SUCCESSFULLY — EMERGENCY ID: {sosSuccessNotice.incidentCode}
            </div>
            <p className="text-[11px] opacity-90">
              Your location and medical profile have been securely routed to the on-duty Emergency Officer. Help is en route.
            </p>
          </div>
        )}

        {/* Hazard Confirmation Notice */}
        {hazardSuccessNotice && (
          <div className="mb-4 p-4 bg-[#c47735]/10 border border-[#c47735] text-xs text-[#252927] dark:text-[#f4f0ea]">
            <div className="flex items-center gap-2 font-bold text-[#c47735] mb-1">
              <CheckCircle2 className="w-4 h-4" />
              HAZARD REPORT SUBMITTED — ID: {hazardSuccessNotice.incidentCode}
            </div>
            <p className="text-[11px] opacity-90">
              Report registered as <strong>UNVERIFIED</strong>. Control Room officers are inspecting the section now.
            </p>
          </div>
        )}

        {/* ========================================================= */}
        {/* MEDICAL / PERSONAL SOS FORM EXPANSION                    */}
        {/* ========================================================= */}
        <AnimatePresence>
          {emergencyMode === 'MEDICAL_SOS' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-[#fffdfa] dark:bg-[#1a1d1b] border border-[#ad4037]/50 p-4 sm:p-5 mt-4"
            >
              <div className="flex items-center justify-between border-b border-[#e5e1dc] dark:border-[#2f3532] pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <HeartPulse className="w-5 h-5 text-[#ad4037]" />
                  <h4 className="text-sm font-bold text-[#252927] dark:text-[#f4f0ea] uppercase font-mono">
                    Trigger Urgent Personal / Medical SOS
                  </h4>
                </div>
                <span className="text-[10px] font-mono bg-[#ad4037]/10 text-[#ad4037] px-2 py-0.5 font-bold">
                  DIRECT RESCUE CHANNEL
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Emergency Category */}
                <div>
                  <label className="block text-[11px] font-mono font-bold text-[#252927] dark:text-[#f4f0ea] mb-1">
                    1. EMERGENCY CATEGORY <span className="text-[#ad4037]">*</span>
                  </label>
                  <select
                    value={sosType}
                    onChange={(e) => setSosType(e.target.value as IncidentType)}
                    className="w-full p-2.5 bg-[#fbf8f4] dark:bg-[#202422] border border-[#e5e1dc] dark:border-[#2f3532] text-xs font-mono text-[#252927] dark:text-[#f4f0ea]"
                  >
                    <option value="MEDICAL">Medical Emergency (Altitude Sickness / Injury / Breathlessness)</option>
                    <option value="PERSONAL_SAFETY">Personal Safety Threat / Harassment</option>
                    <option value="LOST_PILGRIM">Separated / Lost Family Member</option>
                    <option value="OTHER">Other Urgent Distress</option>
                  </select>
                </div>

                {/* Optional Message */}
                <div>
                  <label className="block text-[11px] font-mono font-bold text-[#252927] dark:text-[#f4f0ea] mb-1">
                    2. BRIEF DESCRIPTION / SYMPTOMS (OPTIONAL)
                  </label>
                  <input
                    type="text"
                    value={sosDescription}
                    onChange={(e) => setSosDescription(e.target.value)}
                    placeholder="e.g. Chest tightness, unable to walk, near km 8 marker"
                    className="w-full p-2 bg-[#fbf8f4] dark:bg-[#202422] border border-[#e5e1dc] dark:border-[#2f3532] text-xs text-[#252927] dark:text-[#f4f0ea]"
                  />
                </div>
              </div>

              {/* Location & Authenticated Identity Metadata Box */}
              <div className="mt-4 p-3 bg-[#f5f1ed] dark:bg-[#252927] border border-[#e5e1dc] dark:border-[#2f3532] text-xs font-mono">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold text-[#7d7c76] uppercase">
                    3. AUTOMATIC LOCATION & IDENTITY VERIFICATION:
                  </span>
                  <button
                    onClick={acquireGpsLocation}
                    disabled={gpsLoading}
                    className="text-[10px] text-[#2d5a3b] dark:text-[#52a36b] font-bold underline cursor-pointer"
                  >
                    {gpsLoading ? 'Detecting GPS...' : 'Re-check GPS Position'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[#7d7c76] block text-[9px]">YATRI NAME</span>
                    <strong>{pilgrim?.name || user?.name || 'Registered Pilgrim'}</strong>
                  </div>
                  <div>
                    <span className="text-[#7d7c76] block text-[9px]">PASS NUMBER</span>
                    <strong className="text-[#c47735]">{pilgrim?.pilgrimCode || 'YATRA-PASS'}</strong>
                  </div>
                  <div>
                    <span className="text-[#7d7c76] block text-[9px]">LOCATION STATUS</span>
                    {gpsLocation.lat && gpsLocation.lng ? (
                      <span className="text-[#2d5a3b] dark:text-[#52a36b] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Live GPS (±{Math.round(gpsLocation.accuracy || 10)}m)
                      </span>
                    ) : (
                      <span className="text-[#c47735] font-bold flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Last Checkpoint Fallback
                      </span>
                    )}
                  </div>
                </div>

                {gpsError && (
                  <p className="text-[10px] text-[#7d7c76] mt-2 italic">
                    ℹ {gpsError}
                  </p>
                )}
              </div>

              {/* Privacy Notice */}
              <div className="mt-3 text-[10px] font-mono text-[#7d7c76] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#2d5a3b]" />
                <span>
                  <strong>Strict Privacy:</strong> Your live GPS and health notes are transmitted only to the authorized Emergency Officer.
                </span>
              </div>

              {/* Submit Button */}
              <div className="mt-4 flex items-center justify-end gap-3">
                <button
                  onClick={() => setEmergencyMode('NONE')}
                  className="px-4 py-2 text-xs font-mono text-[#7d7c76] hover:text-[#252927] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendSos}
                  disabled={isSubmittingSos}
                  className="px-6 py-2.5 bg-[#ad4037] hover:bg-[#8f342d] text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
                >
                  <Send className={`w-3.5 h-3.5 ${isSubmittingSos ? 'animate-spin' : ''}`} />
                  {isSubmittingSos ? 'DISPATCHING SOS...' : 'TRANSMIT RESCUE SOS NOW'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ========================================================= */}
        {/* REPORT ROUTE HAZARD FORM EXPANSION                        */}
        {/* ========================================================= */}
        <AnimatePresence>
          {emergencyMode === 'REPORT_HAZARD' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-[#fffdfa] dark:bg-[#1a1d1b] border border-[#c47735]/50 p-4 sm:p-5 mt-4"
            >
              <div className="flex items-center justify-between border-b border-[#e5e1dc] dark:border-[#2f3532] pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-[#c47735]" />
                  <h4 className="text-sm font-bold text-[#252927] dark:text-[#f4f0ea] uppercase font-mono">
                    Report Route / Trail Safety Hazard
                  </h4>
                </div>
                <span className="text-[10px] font-mono bg-[#c47735]/10 text-[#c47735] px-2 py-0.5 font-bold">
                  CITIZEN INCIDENT REPORT
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-mono font-bold text-[#252927] dark:text-[#f4f0ea] mb-1">
                    HAZARD TYPE <span className="text-[#ad4037]">*</span>
                  </label>
                  <select
                    value={hazardType}
                    onChange={(e) => setHazardType(e.target.value as IncidentType)}
                    className="w-full p-2.5 bg-[#fbf8f4] dark:bg-[#202422] border border-[#e5e1dc] dark:border-[#2f3532] text-xs font-mono text-[#252927] dark:text-[#f4f0ea]"
                  >
                    <option value="LANDSLIDE">Landslide / Falling Rocks</option>
                    <option value="WEATHER">Cloudburst / Severe Storm</option>
                    <option value="ROUTE_BLOCKED">Track Blockage / Mudflow</option>
                    <option value="CROWD_DANGER">Crowd Crush / Bottleneck</option>
                    <option value="INFRASTRUCTURE_FAILURE">Bridge / Railing Damage</option>
                    <option value="FIRE">Campfire / Gas Cylinder Fire</option>
                    <option value="OTHER">Other Public Safety Threat</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold text-[#252927] dark:text-[#f4f0ea] mb-1">
                    NEAREST CHECKPOINT / ZONE
                  </label>
                  <select
                    value={hazardCheckpointId || ''}
                    onChange={(e) => setHazardCheckpointId(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full p-2.5 bg-[#fbf8f4] dark:bg-[#202422] border border-[#e5e1dc] dark:border-[#2f3532] text-xs font-mono text-[#252927] dark:text-[#f4f0ea]"
                  >
                    <option value="">Between Checkpoints / Open Trail</option>
                    {checkpoints.map((cp) => (
                      <option key={cp.id} value={cp.id}>
                        {cp.code} — {cp.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold text-[#252927] dark:text-[#f4f0ea] mb-1">
                    INCIDENT TITLE <span className="text-[#ad4037]">*</span>
                  </label>
                  <input
                    type="text"
                    value={hazardTitle}
                    onChange={(e) => setHazardTitle(e.target.value)}
                    placeholder="e.g. Loose boulders sliding near Sheshnag bend"
                    className="w-full p-2 bg-[#fbf8f4] dark:bg-[#202422] border border-[#e5e1dc] dark:border-[#2f3532] text-xs text-[#252927] dark:text-[#f4f0ea]"
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-[11px] font-mono font-bold text-[#252927] dark:text-[#f4f0ea] mb-1">
                  DETAILED OBSERVATION (OPTIONAL)
                </label>
                <textarea
                  value={hazardDesc}
                  onChange={(e) => setHazardDesc(e.target.value)}
                  rows={2}
                  placeholder="Describe severity, approximate distance from marker, and current pilgrim flow condition..."
                  className="w-full p-2 bg-[#fbf8f4] dark:bg-[#202422] border border-[#e5e1dc] dark:border-[#2f3532] text-xs text-[#252927] dark:text-[#f4f0ea]"
                />
              </div>

              <div className="mt-2 p-2 bg-[#f5f1ed] dark:bg-[#252927] border border-[#e5e1dc] dark:border-[#2f3532] text-[10px] font-mono text-[#7d7c76]">
                ℹ <strong>Verification Notice:</strong> Pilgrim reports are initially categorized as <em>UNVERIFIED REPORTS</em> and forwarded to Control Room officers for on-site inspection before public broadcast.
              </div>

              <div className="mt-4 flex items-center justify-end gap-3">
                <button
                  onClick={() => setEmergencyMode('NONE')}
                  className="px-4 py-2 text-xs font-mono text-[#7d7c76] hover:text-[#252927] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReportHazard}
                  disabled={isSubmittingHazard}
                  className="px-6 py-2.5 bg-[#c47735] hover:bg-[#a86228] text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
                >
                  <Send className={`w-3.5 h-3.5 ${isSubmittingHazard ? 'animate-spin' : ''}`} />
                  {isSubmittingHazard ? 'SUBMITTING...' : 'SUBMIT HAZARD REPORT'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ========================================================================= */}
      {/* 3. LIVE ROUTE MAP & TRAIL PROGRESSION WAYPOINTS (Interactive Corridor)    */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        {/* Section Header with live operational status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e5e1dc] dark:border-[#2f3532] pb-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="inline-block w-2 h-2 rounded-full bg-[#2d5a3b] animate-pulse" />
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#2d5a3b] dark:text-[#52a36b] uppercase">
                LIVE MOUNTAIN CORRIDOR & SATELLITE ELEVATION MAP
              </span>
            </div>
            <h3 className="text-lg font-bold text-[#252927] dark:text-[#f4f0ea]">
              Baltal – Holy Cave Mountain Trail (14 KM · Summit Elev. 3,888m)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold px-2.5 py-1 bg-[#2d5a3b]/10 text-[#2d5a3b] dark:text-[#52a36b] border border-[#2d5a3b]/20">
              AVERAGE WALKING PACE: {averageSpeed} KM/H
            </span>
            <span className="text-[11px] font-mono font-bold px-2.5 py-1 bg-[#c47735]/10 text-[#c47735] border border-[#c47735]/20">
              WEATHER: 11°C · CLEAR VISIBILITY
            </span>
          </div>
        </div>

        {/* Live Mountain Interactive Route Map & Waypoint Inspector Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7 Cols: Stylized Live Route Map */}
          <div className="lg:col-span-7 space-y-3">
            <div className="route-map shadow-sm relative rounded-none border border-[#3b5344] min-h-[460px] h-[460px] overflow-hidden">
              <div className="map-grid" />
              <div className="contour contour-a" />
              <div className="contour contour-b" />
              <div className="contour contour-c" />
              
              <div className="map-label label-north font-mono text-[9px] text-[#9eaf9f]">
                SUMMIT PEAK / ELEV. 3,888M (12,756 FT)
              </div>
              <div className="map-label label-demo font-mono text-[9px] text-[#9eaf9f]">
                LIVE GPS RADAR · BALTAL VALLEY CORRIDOR
              </div>

              {/* Main Mountain Trail SVG Vector */}
              <svg className="route-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path
                  className="route-shadow"
                  d="M 10 68 C 20 62, 20 56, 30 55 S 42 46, 50 43 S 61 37, 68 31 S 80 22, 88 20"
                />
                <path
                  className="route-line"
                  d="M 10 68 C 20 62, 20 56, 30 55 S 42 46, 50 43 S 61 37, 68 31 S 80 22, 88 20"
                />
                <path
                  className="route-alt"
                  d="M 30 55 C 35 70, 48 66, 57 58 S 75 43, 88 20"
                />
              </svg>

              {/* Live Animated Flow Particles representing traveling Yatris */}
              {[...Array(14)].map((_, i) => (
                <span
                  key={i}
                  className="flow-particle"
                  style={
                    {
                      '--delay': `${i * 0.38}s`,
                      '--x': `${11 + i * 5.8}%`,
                      '--y': `${66 - i * 3.4}%`,
                    } as React.CSSProperties
                  }
                />
              ))}

              {/* Interactive Checkpoint Nodes on Map */}
              {WAYPOINTS_METADATA.map((wp, i) => {
                const unifiedCp = unifiedCps.find((uc) => uc.id === wp.code) || unifiedCps[i]
                const occ = unifiedCp ? unifiedCp.occupancy : 54
                const isCritical = occ >= 85
                const isWatch = occ >= 70 && !isCritical
                const statusClass = isCritical ? 'critical' : isWatch ? 'watch' : 'normal'
                const isSelected = selectedCpIdx === i

                return (
                  <button
                    key={wp.code}
                    className={`checkpoint-node ${statusClass} ${isSelected ? 'selected' : ''}`}
                    style={{ left: `${wp.x}%`, top: `${wp.y}%` }}
                    onClick={() => setSelectedCpIdx(i)}
                    aria-label={`Select ${wp.name}`}
                  >
                    <span className="node-ring" />
                    <span className="node-core" />
                    <span className="node-label">
                      <b>{wp.code}</b>
                      <small>{wp.shortName}</small>
                      <em>{occ}% occ</em>
                    </span>
                  </button>
                )
              })}

              {/* Map Legend */}
              <div className="map-legend">
                <div>
                  <span className="legend-line" />
                  <span>PRIMARY TRACK</span>
                </div>
                <div>
                  <span className="legend-dot green" />
                  <span>CLEAR FLOW</span>
                </div>
                <div>
                  <span className="legend-dot amber" />
                  <span>MODERATE</span>
                </div>
                <div>
                  <span className="legend-dot red" />
                  <span>HIGH QUEUE</span>
                </div>
              </div>

              {/* Interactive Map Quick Controls */}
              <div className="map-controls">
                <button
                  onClick={() => setSelectedCpIdx((prev) => (prev > 0 ? prev - 1 : 0))}
                  title="Previous Waypoint"
                  aria-label="Previous Waypoint"
                >
                  ↑
                </button>
                <button
                  onClick={() =>
                    setSelectedCpIdx((prev) => (prev < WAYPOINTS_METADATA.length - 1 ? prev + 1 : prev))
                  }
                  title="Next Waypoint"
                  aria-label="Next Waypoint"
                >
                  ↓
                </button>
              </div>
            </div>

            {/* Map Caption Footer */}
            <div className="p-3 bg-[#f5f1ed] dark:bg-[#202422] border border-[#e5e1dc] dark:border-[#2f3532] flex flex-wrap items-center justify-between text-[11px] font-mono text-[#7d7c76]">
              <span className="flex items-center gap-1.5 text-[#2d5a3b] dark:text-[#52a36b] font-bold">
                <Navigation className="w-3.5 h-3.5" />
                Selected: {WAYPOINTS_METADATA[selectedCpIdx].name} ({WAYPOINTS_METADATA[selectedCpIdx].code})
              </span>
              <span>Click any node on the map to inspect elevation & station amenities</span>
            </div>
          </div>

          {/* Right 5 Cols: Selected Waypoint High-Detail Inspector */}
          <div className="lg:col-span-5 space-y-4">
            {(() => {
              const activeWp = WAYPOINTS_METADATA[selectedCpIdx]
              const unifiedCp = unifiedCps.find((uc) => uc.id === activeWp.code) || unifiedCps[selectedCpIdx]
              const occ = unifiedCp ? unifiedCp.occupancy : 54
              const currentCrowd = unifiedCp ? unifiedCp.current : Math.round((occ / 100) * activeWp.capacity)
              const isCritical = occ >= 85
              const isWatch = occ >= 70 && !isCritical

              return (
                <div className="bg-[#fffdfa] dark:bg-[#1f2220] border border-[#e5e1dc] dark:border-[#2f3532] p-5 shadow-xs flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center justify-between border-b border-[#e5e1dc] dark:border-[#2f3532] pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-[#2d5a3b] text-white font-mono text-xs font-bold flex items-center justify-center">
                          0{selectedCpIdx + 1}
                        </span>
                        <div>
                          <span className="text-[10px] font-mono text-[#c47735] font-bold block">
                            WAYPOINT {activeWp.code}
                          </span>
                          <h4 className="text-base font-bold text-[#252927] dark:text-[#f4f0ea]">
                            {activeWp.name}
                          </h4>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-mono font-bold px-2.5 py-1 ${
                          isCritical
                            ? 'bg-[#ad4037]/15 text-[#ad4037]'
                            : isWatch
                            ? 'bg-[#c47735]/15 text-[#c47735]'
                            : 'bg-[#2d5a3b]/15 text-[#2d5a3b]'
                        }`}
                      >
                        {isCritical ? 'CRITICAL CONGESTION' : isWatch ? 'MODERATE QUEUE' : 'CLEAR & MOVING'}
                      </span>
                    </div>

                    {/* Key Stats Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 font-mono text-xs">
                      <div className="p-2.5 bg-[#fbf8f4] dark:bg-[#1a1d1b] border border-[#e5e1dc] dark:border-[#2f3532]">
                        <span className="text-[9px] text-[#7d7c76] block">ALTITUDE</span>
                        <strong className="text-[#252927] dark:text-[#f4f0ea] flex items-center gap-1">
                          <Mountain className="w-3.5 h-3.5 text-[#c47735]" />
                          {activeWp.elevation}
                        </strong>
                      </div>
                      <div className="p-2.5 bg-[#fbf8f4] dark:bg-[#1a1d1b] border border-[#e5e1dc] dark:border-[#2f3532]">
                        <span className="text-[9px] text-[#7d7c76] block">DISTANCE FROM BASE</span>
                        <strong className="text-[#252927] dark:text-[#f4f0ea] flex items-center gap-1">
                          <Footprints className="w-3.5 h-3.5 text-[#2d5a3b]" />
                          {activeWp.distance}
                        </strong>
                      </div>
                      <div className="p-2.5 bg-[#fbf8f4] dark:bg-[#1a1d1b] border border-[#e5e1dc] dark:border-[#2f3532] col-span-2 sm:col-span-1">
                        <span className="text-[9px] text-[#7d7c76] block">LIVE OCCUPANCY</span>
                        <strong className="text-[#252927] dark:text-[#f4f0ea] flex items-center gap-1">
                          <Activity className="w-3.5 h-3.5 text-[#ad4037]" />
                          {occ}% ({currentCrowd.toLocaleString()} Yatris)
                        </strong>
                      </div>
                    </div>

                    {/* Station Facilities & Medical Support */}
                    <div className="mb-4">
                      <span className="text-[10px] font-mono font-bold text-[#7d7c76] uppercase block mb-2">
                        AVAILABLE ON-SITE AMENITIES & MEDICAL CAMPS:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {activeWp.facilities.map((fac, idx) => (
                          <div
                            key={idx}
                            className="p-2 bg-[#f5f1ed] dark:bg-[#252927] border border-[#e5e1dc] dark:border-[#2f3532] flex items-center gap-2 text-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#2d5a3b] shrink-0" />
                            <span className="text-[#252927] dark:text-[#f4f0ea] font-medium">{fac}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Terrain & Acclimatization Advisory */}
                    <div className="p-3 bg-[#c47735]/10 border border-[#c47735]/30 mb-4 text-xs">
                      <div className="flex items-center gap-1.5 font-bold font-mono text-[#c47735] mb-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>TERRAIN & ALTITUDE SAFETY ADVISORY:</span>
                      </div>
                      <p className="text-[#5a5953] dark:text-[#b0ada5] leading-relaxed">
                        {activeWp.advice}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#e5e1dc] dark:border-[#2f3532] flex items-center justify-between text-xs font-mono text-[#7d7c76]">
                    <span>Transit Estimate: {activeWp.eta}</span>
                    <button
                      onClick={() =>
                        setSelectedCpIdx((prev) => (prev < WAYPOINTS_METADATA.length - 1 ? prev + 1 : 0))
                      }
                      className="text-[#2d5a3b] dark:text-[#52a36b] font-bold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      Next Waypoint <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>

        {/* Interactive Step-by-Step Waypoint Timeline Strip */}
        <div className="bg-[#fffdfa] dark:bg-[#1f2220] border border-[#e5e1dc] dark:border-[#2f3532] p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#e5e1dc] dark:border-[#2f3532] pb-3 mb-4">
            <div>
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#7d7c76] uppercase block">
                WAYPOINT ELEVATION PROFILE & CHECKPOINT STAGES
              </span>
              <h4 className="text-sm font-bold text-[#252927] dark:text-[#f4f0ea]">
                Sequential Trail Progression (Click any stage to highlight on map)
              </h4>
            </div>
            <span className="text-xs font-mono text-[#7d7c76]">
              5 OFFICIAL VERIFICATION GATES
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {WAYPOINTS_METADATA.map((wp, idx) => {
              const unifiedCp = unifiedCps.find((uc) => uc.id === wp.code) || unifiedCps[idx]
              const occ = unifiedCp ? unifiedCp.occupancy : 54
              const isSelected = selectedCpIdx === idx
              const isWatch = occ >= 70

              return (
                <button
                  key={wp.code}
                  onClick={() => setSelectedCpIdx(idx)}
                  className={`p-3 text-left transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-[#2d5a3b]/10 border-[#2d5a3b] shadow-sm ring-1 ring-[#2d5a3b]'
                      : 'bg-[#fbf8f4] dark:bg-[#1a1d1b] border-[#e5e1dc] dark:border-[#2f3532] hover:border-[#2d5a3b]/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="w-5 h-5 bg-[#2d5a3b] text-white font-mono text-[10px] font-bold flex items-center justify-center">
                      0{idx + 1}
                    </span>
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 ${
                        isWatch
                          ? 'bg-[#c47735]/15 text-[#c47735]'
                          : 'bg-[#2d5a3b]/15 text-[#2d5a3b]'
                      }`}
                    >
                      {occ}%
                    </span>
                  </div>

                  <strong className="text-xs font-bold text-[#252927] dark:text-[#f4f0ea] block truncate">
                    {wp.name}
                  </strong>
                  <span className="text-[10px] font-mono text-[#c47735] block">
                    {wp.elevation}
                  </span>
                  <span className="text-[10px] font-mono text-[#7d7c76] block mt-1">
                    {wp.distance} · {wp.eta}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* High-Altitude Health & Emergency Hotline Directory */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-[#fffdfa] dark:bg-[#1f2220] border border-[#e5e1dc] dark:border-[#2f3532] p-5 shadow-xs">
            <span className="text-[10px] font-mono font-bold tracking-widest text-[#7d7c76] uppercase block mb-1">
              HEALTH & MOUNTAIN ACCLIMATIZATION GUIDELINES
            </span>
            <h3 className="text-base font-bold text-[#252927] dark:text-[#f4f0ea] mb-3">
              Altitude Sickness (AMS) Mandatory Safety Rules
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#5a5953] dark:text-[#b0ada5]">
              <div className="flex items-start gap-2 p-2.5 bg-[#fbf8f4] dark:bg-[#1a1d1b] border border-[#e5e1dc] dark:border-[#2f3532]">
                <CheckCircle2 className="w-4 h-4 text-[#2d5a3b] shrink-0 mt-0.5" />
                <span>
                  <strong>Hydrate Continuously:</strong> Drink 3–4 liters of warm water & electrolytes daily. Avoid caffeine and cold water.
                </span>
              </div>
              <div className="flex items-start gap-2 p-2.5 bg-[#fbf8f4] dark:bg-[#1a1d1b] border border-[#e5e1dc] dark:border-[#2f3532]">
                <CheckCircle2 className="w-4 h-4 text-[#2d5a3b] shrink-0 mt-0.5" />
                <span>
                  <strong>Listen to Warning Signs:</strong> Headache, nausea, or dizziness require immediate halt at nearest medical post.
                </span>
              </div>
              <div className="flex items-start gap-2 p-2.5 bg-[#fbf8f4] dark:bg-[#1a1d1b] border border-[#e5e1dc] dark:border-[#2f3532]">
                <CheckCircle2 className="w-4 h-4 text-[#2d5a3b] shrink-0 mt-0.5" />
                <span>
                  <strong>Pace On Inclines:</strong> Do not run or hurry on steep bends near Domel and Sangam. Keep breathing steady.
                </span>
              </div>
              <div className="flex items-start gap-2 p-2.5 bg-[#fbf8f4] dark:bg-[#1a1d1b] border border-[#e5e1dc] dark:border-[#2f3532]">
                <CheckCircle2 className="w-4 h-4 text-[#2d5a3b] shrink-0 mt-0.5" />
                <span>
                  <strong>Keep Pass & ID Ready:</strong> Keep your digital QR Pass readily scanned at each gate for quick medical tag access.
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-[#2d5a3b] text-[#fffdfa] p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <PhoneCall className="w-5 h-5 text-[#f1c18c]" />
                <h4 className="text-sm font-bold uppercase font-mono tracking-wider">
                  Emergency Helpdesk & Rescue Hotlines
                </h4>
              </div>

              <div className="space-y-2 text-xs font-mono mt-3">
                <div className="flex justify-between items-center border-b border-white/10 pb-1.5">
                  <span>Central Yatra Control Room</span>
                  <strong className="text-[#f1c18c]">14464 (Toll-Free)</strong>
                </div>
                <div className="flex justify-between items-center border-b border-white/10 pb-1.5">
                  <span>Baltal Base Camp Medical Base</span>
                  <strong className="text-[#f1c18c]">+91 194-2453882</strong>
                </div>
                <div className="flex justify-between items-center border-b border-white/10 pb-1.5">
                  <span>NDRF Mountain Rescue Dispatch</span>
                  <strong className="text-[#f1c18c]">1077 / 112</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span>Sheshnag High Altitude Post</span>
                  <strong className="text-[#f1c18c]">+91 1936-243220</strong>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 text-[10px] font-mono text-[#dbe6da] flex items-center justify-between">
              <span>All helplines manned 24x7</span>
              <span>Direct Police & Medical Relay</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
