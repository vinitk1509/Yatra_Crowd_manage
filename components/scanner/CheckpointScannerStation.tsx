'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ScanLine,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  QrCode as QrIcon,
  Mountain,
  MapPin,
  Clock,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Camera,
  CameraOff,
  Video,
} from 'lucide-react'
import {
  Checkpoint,
  Pilgrim,
  ScanEvent,
  ValidateQrResult,
  getCheckpoints,
  getPilgrims,
  validateQrCode,
  recordScanEvent,
  getCheckpointScans,
} from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'
import jsQR from 'jsqr'

export function CheckpointScannerStation() {
  const { user } = useAuth()
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<Checkpoint | null>(null)
  const [qrInput, setQrInput] = useState('')
  const [pilgrims, setPilgrims] = useState<Pilgrim[]>([])
  const [recentScans, setRecentScans] = useState<ScanEvent[]>([])
  const [validationResult, setValidationResult] = useState<ValidateQrResult | null>(null)
  
  const [isValidating, setIsValidating] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [scanMessage, setScanMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null)

  // Camera Scanning State
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameId = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Load checkpoints and registered pilgrims
  useEffect(() => {
    loadInitialData()
    return () => {
      stopCamera()
    }
  }, [])

  // Load scans when checkpoint changes
  useEffect(() => {
    if (selectedCheckpoint) {
      loadCheckpointScans(selectedCheckpoint.id)
    }
  }, [selectedCheckpoint])

  const loadInitialData = async () => {
    try {
      const [cpData, pilData] = await Promise.all([getCheckpoints(), getPilgrims()])
      setCheckpoints(cpData)
      if (cpData.length > 0 && !selectedCheckpoint) {
        setSelectedCheckpoint(cpData[0])
      }
      setPilgrims(pilData)
      if (pilData.length > 0 && pilData[0].qrCode) {
        setQrInput(pilData[0].qrCode.qrId)
      }
    } catch (err) {
      console.error('Error loading initial checkpoint scanner data', err)
    }
  }

  const loadCheckpointScans = async (cpId: number) => {
    try {
      const scans = await getCheckpointScans(cpId)
      setRecentScans(scans)
    } catch (err) {
      console.error('Error loading checkpoint scans', err)
    }
  }

  // Camera Lifecycle
  const startCamera = async () => {
    setCameraError(null)
    setIsCameraActive(true)
    try {
      const constraints: MediaStreamConstraints = {
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute('playsinline', 'true')
        await videoRef.current.play()
        requestAnimationFrame(tickScan)
      }
    } catch (err: any) {
      console.warn('Camera access issue:', err)
      setCameraError(err.message || 'Camera access not permitted or unavailable')
      setIsCameraActive(false)
    }
  }

  const stopCamera = () => {
    setIsCameraActive(false)
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current)
      animationFrameId.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const tickScan = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (canvas) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          })
          if (code && code.data) {
            setQrInput(code.data)
            handleValidateQr(code.data)
            // Stop camera once a valid code is acquired or keep scanning
            stopCamera()
            return
          }
        }
      }
    }
    animationFrameId.current = requestAnimationFrame(tickScan)
  }

  const handleValidateQr = async (qrToTest?: string) => {
    const code = qrToTest || qrInput
    if (!code.trim() || !selectedCheckpoint) return

    setIsValidating(true)
    setScanMessage(null)
    try {
      const res = await validateQrCode(code, selectedCheckpoint.id)
      setValidationResult(res)
    } catch (err: any) {
      setValidationResult({
        valid: false,
        status: 'ERROR',
        message: err.message || 'QR Validation failed',
        routeMatchesCheckpoint: false,
      })
    } finally {
      setIsValidating(false)
    }
  }

  const handleRecordScan = async () => {
    if (!qrInput.trim() || !selectedCheckpoint) return

    setIsScanning(true)
    setScanMessage(null)
    try {
      const scanEvent = await recordScanEvent({
        qrId: qrInput,
        checkpointId: selectedCheckpoint.id,
        scanType: 'TRANSIT',
      })

      setScanMessage({
        type: 'success',
        text: `Transit Verified: Pilgrim ${scanEvent.pilgrimName} logged at ${selectedCheckpoint.name}`,
      })
      // Refresh scan log
      loadCheckpointScans(selectedCheckpoint.id)
      // Re-validate to update last scan status
      handleValidateQr(qrInput)
    } catch (err: any) {
      setScanMessage({
        type: err.message?.includes('Duplicate') ? 'warning' : 'error',
        text: err.message || 'Failed to record movement event',
      })
      loadCheckpointScans(selectedCheckpoint.id)
    } finally {
      setIsScanning(false)
    }
  }

  const handleSelectPilgrimSample = (pilgrim: Pilgrim) => {
    if (pilgrim.qrCode) {
      setQrInput(pilgrim.qrCode.qrId)
      handleValidateQr(pilgrim.qrCode.qrId)
    }
  }

  return (
    <div className="space-y-6">
      {/* Station Control Header */}
      <div className="bg-[#fffdfa] dark:bg-[#242623] border border-[#e2ddd6] dark:border-[#ffffff1f] p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#2d5a3b] text-[#fffdfa] flex items-center justify-center font-bold">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-widest text-[#6f706b] dark:text-[#b7b8b1] uppercase">
                  CHECKPOINT OPERATOR STATION
                </span>
                <span className="px-2 py-0.5 bg-[#e7eee7] dark:bg-[#243628] text-[#2d5a3b] dark:text-[#91bd9b] text-[9px] font-bold tracking-wider">
                  ACTIVE
                </span>
              </div>
              <h2 className="text-xl font-bold text-[#252927] dark:text-[#f4f0ea]">
                {selectedCheckpoint ? `${selectedCheckpoint.name} (${selectedCheckpoint.code})` : 'Select Checkpoint Station'}
              </h2>
            </div>
          </div>

          {/* Checkpoint Station Dropdown */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-[#6f706b] dark:text-[#b7b8b1] uppercase tracking-wider">
              Assigned Checkpoint:
            </label>
            <select
              value={selectedCheckpoint?.id || ''}
              onChange={(e) => {
                const found = checkpoints.find((c) => c.id === Number(e.target.value))
                if (found) {
                  setSelectedCheckpoint(found)
                  setValidationResult(null)
                  setScanMessage(null)
                }
              }}
              className="bg-[#f5f1ed] dark:bg-[#1b1c1a] border border-[#e2ddd6] dark:border-[#ffffff1f] px-3 py-2 text-xs font-bold text-[#252927] dark:text-[#f4f0ea] outline-hidden cursor-pointer"
            >
              {checkpoints.map((cp) => (
                <option key={cp.id} value={cp.id}>
                  {cp.code} · {cp.name} ({cp.routeName})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Scanner Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: QR Ingestion & Validation HUD (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* QR Code Reader Input & Live Camera */}
          <div className="bg-[#fffdfa] dark:bg-[#242623] border border-[#e2ddd6] dark:border-[#ffffff1f] p-6 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-[#6f706b] dark:text-[#b7b8b1] uppercase block mb-0.5">
                  INGRESS / TRANSIT SCANNER
                </span>
                <h3 className="text-lg font-bold text-[#252927] dark:text-[#f4f0ea]">
                  Scan Pilgrim QR Pass
                </h3>
              </div>
              {/* Toggle Live Camera Button */}
              <button
                onClick={isCameraActive ? stopCamera : startCamera}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer border ${
                  isCameraActive
                    ? 'bg-[#ad4037] text-white border-transparent'
                    : 'bg-[#2d5a3b] text-white border-transparent hover:bg-[#23472e]'
                }`}
              >
                {isCameraActive ? (
                  <>
                    <CameraOff className="w-3.5 h-3.5" /> Stop Camera
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5" /> Open Camera Scan
                  </>
                )}
              </button>
            </div>

            {/* Live Camera Viewfinder Overlay */}
            {isCameraActive && (
              <div className="relative mb-4 bg-black border-2 border-[#2d5a3b] overflow-hidden aspect-4/3 max-w-sm mx-auto">
                <video ref={videoRef} className="w-full h-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />
                {/* Visual Viewfinder Target Frame */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-[#f1c18c] relative">
                    <span className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-[#e3a05b]" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-[#e3a05b]" />
                    <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-[#e3a05b]" />
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-[#e3a05b]" />
                    <div className="w-full h-0.5 bg-[#ad4037] shadow-[0_0_8px_#ad4037] animate-pulse my-24" />
                  </div>
                </div>
                <div className="absolute bottom-2 inset-x-0 text-center text-[10px] font-mono text-[#f1c18c] bg-black/60 py-1">
                  ALIGN QR CODE INSIDE BOX
                </div>
              </div>
            )}

            {cameraError && (
              <div className="mb-3 p-2 bg-[#f6dfdc] text-[#9e3c34] text-xs border border-[#ad4037]/30">
                Camera Notice: {cameraError} (Manual input or demo passes available below)
              </div>
            )}

            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <QrIcon className="absolute left-3 top-3 w-4 h-4 text-[#6f706b]" />
                  <input
                    type="text"
                    value={qrInput}
                    onChange={(e) => {
                      setQrInput(e.target.value)
                      setValidationResult(null)
                    }}
                    placeholder="Enter or scan QR ID (e.g. QR-YF-1-... or raw payload)"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#f5f1ed] dark:bg-[#1b1c1a] border border-[#e2ddd6] dark:border-[#ffffff1f] text-xs font-mono text-[#252927] dark:text-[#f4f0ea] focus:border-[#2d5a3b] outline-hidden"
                  />
                </div>
                <button
                  onClick={() => handleValidateQr()}
                  disabled={isValidating || !qrInput.trim()}
                  className="px-4 py-2.5 bg-[#f5f1ed] hover:bg-[#eae5df] dark:bg-[#1b1c1a] dark:hover:bg-[#303330] border border-[#e2ddd6] dark:border-[#ffffff1f] text-xs font-bold uppercase tracking-wider text-[#252927] dark:text-[#f4f0ea] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin' : ''}`} />
                  Verify
                </button>
              </div>

              {/* Quick Sample Selector for Field Operators */}
              <div>
                <span className="text-[10px] font-bold text-[#6f706b] dark:text-[#b7b8b1] uppercase tracking-wider block mb-1.5">
                  Quick Load Demo Passes:
                </span>
                <div className="flex flex-wrap gap-2">
                  {pilgrims.slice(0, 4).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSelectPilgrimSample(p)}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-[#f5f1ed] dark:bg-[#1b1c1a] hover:bg-[#e7eee7] dark:hover:bg-[#243628] border border-[#e2ddd6] dark:border-[#ffffff1f] text-[#252927] dark:text-[#f4f0ea] transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <UserCheck className="w-3 h-3 text-[#2d5a3b] dark:text-[#80a88b]" />
                      <span>{p.name}</span>
                      <span className="text-[9px] font-mono text-[#c47735]">({p.routeCode})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Validation Feedback & Movement Action */}
            {validationResult && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 border-t border-[#e2ddd6] dark:border-[#ffffff1f] pt-5"
              >
                {/* Result Card Header */}
                <div
                  className={`p-4 border flex items-start gap-3 ${
                    validationResult.valid
                      ? 'bg-[#e7eee7] dark:bg-[#243628] border-[#2d5a3b]/30 text-[#2d5a3b] dark:text-[#91bd9b]'
                      : validationResult.status === 'WRONG_ROUTE'
                      ? 'bg-[#f6eadc] dark:bg-[#3d2c1c] border-[#c47735]/40 text-[#a5632c] dark:text-[#e89d58]'
                      : 'bg-[#f6dfdc] dark:bg-[#4b302c] border-[#ad4037]/30 text-[#9e3c34] dark:text-[#ec9b70]'
                  }`}
                >
                  {validationResult.valid ? (
                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                  ) : validationResult.status === 'WRONG_ROUTE' ? (
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {validationResult.status}
                      </span>
                      <span className="text-[10px] font-mono">
                        {validationResult.qrCode?.qrId}
                      </span>
                    </div>
                    <p className="text-xs mt-1 leading-snug">{validationResult.message}</p>
                  </div>
                </div>

                {/* Pilgrim Info Details */}
                {validationResult.pilgrim && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4 p-3.5 bg-[#f5f1ed]/60 dark:bg-[#1b1c1a]/60 border border-[#e2ddd6] dark:border-[#ffffff1f]">
                    <div>
                      <span className="text-[9px] font-bold text-[#6f706b] dark:text-[#b7b8b1] uppercase block">
                        Pilgrim
                      </span>
                      <strong className="text-xs text-[#252927] dark:text-[#f4f0ea]">
                        {validationResult.pilgrim.name}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-[#6f706b] dark:text-[#b7b8b1] uppercase block">
                        Pilgrim ID
                      </span>
                      <strong className="text-xs font-mono text-[#252927] dark:text-[#f4f0ea]">
                        {validationResult.pilgrim.pilgrimCode}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-[#6f706b] dark:text-[#b7b8b1] uppercase block">
                        Registered Track
                      </span>
                      <strong className="text-xs text-[#c47735] dark:text-[#c88b50]">
                        {validationResult.pilgrim.routeName}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-[#6f706b] dark:text-[#b7b8b1] uppercase block">
                        Age / Gender
                      </span>
                      <strong className="text-xs text-[#252927] dark:text-[#f4f0ea]">
                        {validationResult.pilgrim.age}y · {validationResult.pilgrim.gender}
                      </strong>
                    </div>
                  </div>
                )}

                {/* Scan Execution Action */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    onClick={handleRecordScan}
                    disabled={isScanning || !validationResult.valid}
                    className="w-full sm:flex-1 py-3 px-4 bg-[#2d5a3b] hover:bg-[#23472e] text-[#fffdfa] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    {isScanning ? (
                      'Logging Scan Event to Server...'
                    ) : (
                      <>
                        <ScanLine className="w-4 h-4" />
                        Confirm & Record Movement Scan
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Scan Status Toast Banner */}
            {scanMessage && (
              <div
                className={`mt-4 p-3 text-xs flex items-center gap-2 border ${
                  scanMessage.type === 'success'
                    ? 'bg-[#e7eee7] border-[#2d5a3b]/40 text-[#2d5a3b] dark:bg-[#243628] dark:text-[#91bd9b]'
                    : scanMessage.type === 'warning'
                    ? 'bg-[#f6eadc] border-[#c47735]/40 text-[#a5632c] dark:bg-[#3d2c1c] dark:text-[#e89d58]'
                    : 'bg-[#f6dfdc] border-[#ad4037]/40 text-[#9e3c34] dark:bg-[#4b302c] dark:text-[#ec9b70]'
                }`}
              >
                {scanMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{scanMessage.text}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Checkpoint Scan Audit Feed (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#fffdfa] dark:bg-[#242623] border border-[#e2ddd6] dark:border-[#ffffff1f] p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2ddd6] dark:border-[#ffffff1f] mb-3">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-[#6f706b] dark:text-[#b7b8b1] uppercase block">
                  IMMUTABLE AUDIT LOG
                </span>
                <h4 className="text-sm font-bold text-[#252927] dark:text-[#f4f0ea]">
                  Recent Checkpoint Scans ({recentScans.length})
                </h4>
              </div>
              <button
                onClick={() => selectedCheckpoint && loadCheckpointScans(selectedCheckpoint.id)}
                className="p-1.5 text-[#6f706b] hover:text-[#252927] dark:text-[#b7b8b1] transition-colors"
                title="Refresh audit log"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentScans.length === 0 ? (
              <div className="py-12 text-center text-[#6f706b] dark:text-[#b7b8b1]">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#c47735]" />
                <p className="text-xs">No scan events recorded at this gate yet.</p>
                <p className="text-[10px] opacity-75 mt-1">
                  Perform a scan using the camera or scanner panel on the left.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {recentScans.map((scan) => (
                  <div
                    key={scan.id}
                    className="p-3 bg-[#f5f1ed]/50 dark:bg-[#1b1c1a]/50 border border-[#e2ddd6] dark:border-[#ffffff1f] text-xs flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-[#252927] dark:text-[#f4f0ea]">
                          {scan.pilgrimName}
                        </strong>
                        <span
                          className={`text-[8px] font-bold px-1.5 py-0.5 ${
                            scan.validationStatus === 'VALID'
                              ? 'bg-[#e7eee7] text-[#2d5a3b] dark:bg-[#243628] dark:text-[#91bd9b]'
                              : scan.validationStatus === 'DUPLICATE_SCAN'
                              ? 'bg-[#f6dfdc] text-[#9e3c34]'
                              : 'bg-[#f6eadc] text-[#a5632c]'
                          }`}
                        >
                          {scan.validationStatus}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#6f706b] dark:text-[#b7b8b1] font-mono mt-0.5">
                        {scan.pilgrimCode} · {scan.routeCode}
                      </div>
                      {scan.failureReason && (
                        <div className="text-[10px] text-[#ad4037] mt-0.5">
                          {scan.failureReason}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-mono text-[#6f706b] dark:text-[#b7b8b1] block">
                        {new Date(scan.scanTimestamp).toLocaleTimeString()}
                      </span>
                      <span className="text-[9px] text-[#c47735] font-mono block">
                        {scan.scanType}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
