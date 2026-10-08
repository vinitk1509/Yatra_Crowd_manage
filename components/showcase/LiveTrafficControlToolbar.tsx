'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ScanLine, 
  Send, 
  RefreshCw, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  Smartphone, 
  Users, 
  Sparkles,
  Layers,
  Activity,
  CheckCircle2,
  Sliders
} from 'lucide-react'
import { useUnifiedCrowd } from '@/lib/unified-crowd-state'
import { useAuth } from '@/lib/auth-context'

export function LiveTrafficControlToolbar() {
  const { user } = useAuth()
  const { 
    checkpoints, 
    pushBatchCrowd, 
    addSingleScan, 
    resetToBaseline, 
    totalValidScans, 
    lastInjectedAction,
    calculateMlPredictions,
    isForecasting
  } = useUnifiedCrowd()

  // STRICT PRIVACY & ROLE GUARD: Completely hidden and disabled for normal pilgrims
  if (!user || user.role === 'PILGRIM' || (user.role !== 'ADMIN' && user.role !== 'CONTROL_ROOM_OPERATOR')) {
    return null
  }

  const [selectedCp, setSelectedCp] = useState<string>('CP-02')
  const [batchCount, setBatchCount] = useState<number>(150)
  const [isExpanded, setIsExpanded] = useState<boolean>(true)
  const [justPushed, setJustPushed] = useState<boolean>(false)

  const handleBatchPush = (countToPush: number) => {
    pushBatchCrowd(selectedCp, countToPush)
    setJustPushed(true)
    setTimeout(() => setJustPushed(false), 2000)
  }

  const handleSingleScan = () => {
    addSingleScan(selectedCp)
    setJustPushed(true)
    setTimeout(() => setJustPushed(false), 2000)
  }

  const currentSelectedCp = checkpoints.find(c => c.id === selectedCp) || checkpoints[0]

  return (
    <div className="border border-[#c47735]/40 bg-[#fffdfa] dark:bg-[#1a1d1b] shadow-sm mb-6 transition-all">
      {/* Header bar */}
      <div className="px-4 py-2.5 bg-[#fbf8f4] dark:bg-[#202422] border-b border-[#e5e1dc] dark:border-[#2f3532] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2d5a3b] animate-pulse" />
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#252927] dark:text-[#f4f0ea] flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-[#c47735]" />
            LIVE YATRA SHOWCASE & TRAFFIC INJECTOR
          </span>
          <span className="hidden sm:inline-flex text-[10px] font-mono bg-[#2d5a3b]/10 text-[#2d5a3b] dark:text-[#52a36b] px-2 py-0.5 font-bold">
            SYNCHRONIZED REAL-TIME
          </span>
        </div>

        <div className="flex items-center gap-3">
          {lastInjectedAction && (
            <span className="hidden md:inline-flex text-[11px] font-mono text-[#7d7c76] items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2d5a3b]" />
              {lastInjectedAction.text} ({lastInjectedAction.time})
            </span>
          )}
          <div className="flex items-center gap-1.5 bg-[#f0ece6] dark:bg-[#282d2a] px-2.5 py-1 text-[11px] font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-[#2d5a3b]" />
            <span className="text-[#7d7c76]">VALID ENTRIES:</span>
            <strong className="text-[#252927] dark:text-[#f4f0ea]">{totalValidScans.toLocaleString()}</strong>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-[#e5e1dc] dark:hover:bg-[#333936] text-[#7d7c76] cursor-pointer"
            aria-label="Toggle Injection Panel"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Control Body */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="p-3.5 sm:p-4 overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              {/* Checkpoint Target Selector */}
              <div className="md:col-span-4 space-y-1">
                <label className="text-[10px] font-mono uppercase font-bold text-[#7d7c76] block">
                  TARGET CHECKPOINT
                </label>
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {checkpoints.map((cp) => (
                    <button
                      key={cp.id}
                      onClick={() => setSelectedCp(cp.id)}
                      className={`px-2.5 py-1.5 text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap flex flex-col items-start ${
                        selectedCp === cp.id
                          ? 'bg-[#2d5a3b] text-[#fffdfa] ring-1 ring-[#2d5a3b]'
                          : 'bg-[#f5f1ed] dark:bg-[#252927] text-[#5a5953] dark:text-[#a8a69e] hover:bg-[#eae5df]'
                      }`}
                    >
                      <span className="leading-tight">{cp.id}</span>
                      <span className="text-[10px] font-normal opacity-80 leading-tight">{cp.short}</span>
                    </button>
                  ))}
                </div>
                <div className="text-[11px] font-mono text-[#7d7c76] pt-0.5">
                  Current: <strong className="text-[#252927] dark:text-[#f4f0ea]">{currentSelectedCp.current.toLocaleString()}</strong> / {currentSelectedCp.capacity.toLocaleString()} ({currentSelectedCp.occupancy}%)
                </div>
              </div>

              {/* Action 1: Single Mobile-Style Scanner Simulator */}
              <div className="md:col-span-3 border-l md:border-r border-[#e5e1dc] dark:border-[#2f3532] md:px-3 space-y-1">
                <label className="text-[10px] font-mono uppercase font-bold text-[#7d7c76] block">
                  PHONE / SCANNER ENTRY
                </label>
                <button
                  onClick={handleSingleScan}
                  className="w-full py-2 px-3 bg-[#2d5a3b] hover:bg-[#23472e] text-[#fffdfa] text-xs font-mono font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-transform active:scale-95"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  +1 Yatri Scan (Phone Pass)
                </button>
                <span className="text-[10px] font-mono text-[#7d7c76] block text-center">
                  Instantly logs 1 verified QR entry
                </span>
              </div>

              {/* Action 2: Batch Push Injection */}
              <div className="md:col-span-5 space-y-1">
                <label className="text-[10px] font-mono uppercase font-bold text-[#7d7c76] block">
                  BATCH YATRI INFLOW INJECTION
                </label>
                <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center gap-1">
                    {[50, 150, 300, 500].map((num) => (
                      <button
                        key={num}
                        onClick={() => setBatchCount(num)}
                        className={`px-2 py-1 text-[11px] font-mono font-bold cursor-pointer transition-colors ${
                          batchCount === num
                            ? 'bg-[#c47735] text-white'
                            : 'bg-[#f5f1ed] dark:bg-[#252927] text-[#5a5953] dark:text-[#a8a69e] hover:bg-[#e5e1dc]'
                        }`}
                      >
                        +{num}
                      </button>
                    ))}
                  </div>

                  <input
                    type="number"
                    value={batchCount}
                    onChange={(e) => setBatchCount(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-20 px-2 py-1.5 text-xs font-mono border border-[#e5e1dc] dark:border-[#383e3b] bg-[#fffdfa] dark:bg-[#1a1d1b] text-[#252927] dark:text-[#f4f0ea]"
                    min="1"
                    max="5000"
                  />

                  <button
                    onClick={() => handleBatchPush(batchCount)}
                    className="py-1.5 px-3 bg-[#c47735] hover:bg-[#a86227] text-white text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-transform active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Push to {selectedCp}
                  </button>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-[#7d7c76] pt-1">
                  <span>Syncs Overview, Map, Checkpoints & ML</span>
                  <button
                    onClick={resetToBaseline}
                    className="text-[#ad4037] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Reset Baseline
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
