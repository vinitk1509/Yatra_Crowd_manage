'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  StepForward,
  Sparkles,
  Sliders,
  CloudRain,
  Sun,
  AlertTriangle,
  ShieldCheck,
  Activity,
  Layers,
  BarChart3,
  TrendingUp,
  Clock,
  Compass,
  Zap,
  Info,
  ChevronRight,
  Database,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Award,
  Flame,
  FileSpreadsheet
} from 'lucide-react'
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import {
  SimulationRunRequest,
  SimulationRunResponse,
  PolicyComparisonResponse,
  InterventionConfig,
  runDigitalTwinSimulation,
  compareDigitalTwinPolicies,
  getSimulationPresets,
  SimulationPreset
} from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'

// Fallback deterministic local engine in case backend is offline
import { generateLocalSimulationRun, generateLocalMultiPolicyComparison } from './local-simulation-engine'

export function RlDigitalTwinSandbox() {
  const { user } = useAuth()

  // Tab selection inside sandbox
  const [activeTab, setActiveTab] = useState<'visualizer' | 'comparison' | 'whatif' | 'checkpoints'>('visualizer')

  // Simulation Configuration State
  const [routeCode, setRouteCode] = useState<string>('RT-BALTAL')
  const [durationMinutes, setDurationMinutes] = useState<number>(60)
  const [virtualPilgrims, setVirtualPilgrims] = useState<number>(8500)
  const [crowdPreset, setCrowdPreset] = useState<'MORNING_RUSH' | 'BALANCED' | 'BASE_SURGE' | 'MID_GRIDLOCK'>('MORNING_RUSH')
  const [policyType, setPolicyType] = useState<'ALL_COMPARISON' | 'POLICY_A_THRESHOLD' | 'POLICY_B_PPO' | 'POLICY_C_DQN'>('ALL_COMPARISON')
  const [weatherCondition, setWeatherCondition] = useState<'CLEAR' | 'RAIN' | 'STORM' | 'FOG'>('CLEAR')
  const [randomSeed, setRandomSeed] = useState<number>(42)
  const [interventions, setInterventions] = useState<InterventionConfig[]>([])

  // Presets from server/local
  const [presets, setPresets] = useState<SimulationPreset[]>([])
  const [selectedPresetId, setSelectedPresetId] = useState<string>('PRESET-01')

  // Playback State
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1) // 1x, 2x, 5x, 10x
  const [currentMinute, setCurrentMinute] = useState<number>(0)
  const [isRunningInference, setIsRunningInference] = useState<boolean>(false)

  // Simulation Results State
  const [singleRunResult, setSingleRunResult] = useState<SimulationRunResponse | null>(null)
  const [comparisonResult, setComparisonResult] = useState<PolicyComparisonResponse | null>(null)
  const [selectedCheckpointCode, setSelectedCheckpointCode] = useState<string>('CP-03')

  // Load presets on mount
  useEffect(() => {
    async function loadPresets() {
      try {
        const data = await getSimulationPresets()
        if (data && data.length > 0) {
          setPresets(data)
        } else {
          setPresets(DEFAULT_PRESETS)
        }
      } catch {
        setPresets(DEFAULT_PRESETS)
      }
    }
    loadPresets()
  }, [])

  // Auto-run baseline comparison on initial mount
  useEffect(() => {
    executeSimulationScenario()
  }, [])

  // Playback timer ticker
  useEffect(() => {
    if (!isPlaying) return

    const intervalMs = Math.max(80, 600 / playbackSpeed)
    const timer = setInterval(() => {
      setCurrentMinute(prev => {
        const maxMin = durationMinutes
        if (prev >= maxMin) {
          setIsPlaying(false)
          return maxMin
        }
        return prev + 2
      })
    }, intervalMs)

    return () => clearInterval(timer)
  }, [isPlaying, playbackSpeed, durationMinutes])

  // Execute Simulation Scenario (Connected to backend API with resilient local fallback)
  const executeSimulationScenario = async (customConfig?: Partial<SimulationRunRequest>) => {
    setIsRunningInference(true)
    setIsPlaying(false)

    const request: SimulationRunRequest = {
      routeCode: customConfig?.routeCode || routeCode,
      simulationDurationMinutes: customConfig?.simulationDurationMinutes || durationMinutes,
      virtualPilgrimCount: customConfig?.virtualPilgrimCount || virtualPilgrims,
      crowdDistributionPreset: customConfig?.crowdDistributionPreset || crowdPreset,
      policyType: customConfig?.policyType || policyType,
      weatherCondition: customConfig?.weatherCondition || weatherCondition,
      randomSeed: customConfig?.randomSeed !== undefined ? customConfig.randomSeed : randomSeed,
      interventions: customConfig?.interventions || interventions,
    }

    try {
      if (request.policyType === 'ALL_COMPARISON') {
        let compRes: PolicyComparisonResponse
        try {
          compRes = await compareDigitalTwinPolicies(request)
        } catch {
          compRes = generateLocalMultiPolicyComparison(request)
        }
        setComparisonResult(compRes)
        setSingleRunResult(compRes.policyBPPO)
      } else {
        let runRes: SimulationRunResponse
        try {
          runRes = await runDigitalTwinSimulation(request)
        } catch {
          runRes = generateLocalSimulationRun(request)
        }
        setSingleRunResult(runRes)
        setComparisonResult(null)
      }
      setCurrentMinute(0)
    } catch (err) {
      console.warn('Simulation execution error, applying deterministic fallback:', err)
      const fallbackComp = generateLocalMultiPolicyComparison(request)
      setComparisonResult(fallbackComp)
      setSingleRunResult(fallbackComp.policyBPPO)
      setCurrentMinute(0)
    } finally {
      setTimeout(() => {
        setIsRunningInference(false)
      }, 300)
    }
  }

  // Load a preset scenario
  const applyPreset = (presetId: string) => {
    setSelectedPresetId(presetId)
    const p = presets.find(x => x.id === presetId) || DEFAULT_PRESETS[0]
    setRouteCode(p.routeCode)
    setWeatherCondition(p.weather)
    setVirtualPilgrims(p.pilgrims)
    
    // Add realistic preset interventions
    let newInterventions: InterventionConfig[] = []
    if (presetId === 'PRESET-02') {
      newInterventions = [{
        type: 'WEATHER_DISRUPTION',
        startMinute: 15,
        durationMinutes: 35,
        weatherSeverity: 'STORM',
        description: 'Torrential downpour between Domel & Sheshnag'
      }]
    } else if (presetId === 'PRESET-03') {
      newInterventions = [{
        type: 'GATE_THROTTLE',
        targetCheckpointCode: 'CP-02',
        startMinute: 10,
        durationMinutes: 45,
        throttlePercentage: 40,
        description: 'Domel Bridge 40% gate release constriction'
      }]
    } else if (presetId === 'PRESET-04') {
      newInterventions = [{
        type: 'TRAIL_CLOSURE',
        targetSegmentCode: 'CP-02_TO_CP-03',
        startMinute: 20,
        durationMinutes: 30,
        enableRerouting: true,
        emergencyType: 'LANDSLIDE',
        description: 'Barari Marg landslide blockage with Sangam detour'
      }]
    }

    setInterventions(newInterventions)
    executeSimulationScenario({
      routeCode: p.routeCode,
      weatherCondition: p.weather,
      virtualPilgrimCount: p.pilgrims,
      interventions: newInterventions
    })
  }

  // Add custom intervention
  const handleAddIntervention = (type: InterventionConfig['type']) => {
    const newInv: InterventionConfig = {
      type,
      targetCheckpointCode: routeCode === 'RT-BALTAL' ? 'CP-02' : 'PA-03',
      targetSegmentCode: routeCode === 'RT-BALTAL' ? 'CP-02_TO_CP-03' : 'PA-02_TO_PA-03',
      startMinute: 15,
      durationMinutes: 30,
      throttlePercentage: 50,
      weatherSeverity: 'RAIN',
      enableRerouting: true,
      emergencyType: 'LANDSLIDE',
      description: `Custom ${type} intervention at T+15m`
    }
    setInterventions(prev => [...prev, newInv])
  }

  const handleRemoveIntervention = (index: number) => {
    setInterventions(prev => prev.filter((_, i) => i !== index))
  }

  // Compute current time step frame
  const activeTimeline = singleRunResult?.timeline || []
  const currentFrame = useMemo(() => {
    if (activeTimeline.length === 0) return null
    const closest = activeTimeline.reduce((prev, curr) => {
      return Math.abs(curr.minute - currentMinute) < Math.abs(prev.minute - currentMinute) ? curr : prev
    }, activeTimeline[0])
    return closest
  }, [activeTimeline, currentMinute])

  // Corridor route checkpoints
  const currentRouteNodes = useMemo(() => {
    if (routeCode === 'RT-PAHALGAM') {
      return [
        { code: 'PA-01', name: 'Chandanwari Base', distKm: 0.0, elevM: 2895, cap: 5000, x: 8, y: 72 },
        { code: 'PA-02', name: 'Pissu Top', distKm: 3.5, elevM: 3350, cap: 3800, x: 25, y: 64 },
        { code: 'PA-03', name: 'Sheshnag Camp Lake', distKm: 12.0, elevM: 3570, cap: 5200, x: 45, y: 52 },
        { code: 'PA-04', name: 'Mahagunas Pass (High)', distKm: 18.5, elevM: 4276, cap: 3400, x: 64, y: 38 },
        { code: 'PA-05', name: 'Panchtarni Camp', distKm: 24.0, elevM: 3650, cap: 4600, x: 80, y: 28 },
        { code: 'PA-06', name: 'Holy Cave Sanctum', distKm: 32.0, elevM: 3888, cap: 4800, x: 92, y: 16 }
      ]
    }
    return [
      { code: 'CP-01', name: 'Baltal Base Camp', distKm: 0.0, elevM: 2743, cap: 4050, x: 10, y: 70 },
      { code: 'CP-02', name: 'Domel Bridge Station', distKm: 2.5, elevM: 2900, cap: 4580, x: 28, y: 56 },
      { code: 'CP-03', name: 'Barari Marg / Sheshnag', distKm: 6.0, elevM: 3450, cap: 5080, x: 50, y: 44 },
      { code: 'CP-04', name: 'Sangam Top / Panchtarni', distKm: 10.5, elevM: 3650, cap: 4280, x: 72, y: 30 },
      { code: 'CP-05', name: 'Holy Cave Sanctum', distKm: 14.0, elevM: 3888, cap: 4780, x: 90, y: 18 }
    ]
  }, [routeCode])

  // Multi-policy comparison line chart data
  const comparisonChartData = useMemo(() => {
    if (!comparisonResult) return []
    const tA = comparisonResult.policyAThreshold.timeline
    const tB = comparisonResult.policyBPPO.timeline
    const tC = comparisonResult.policyCDQN.timeline
    const maxLen = Math.max(tA.length, tB.length, tC.length)

    const rows = []
    for (let i = 0; i < maxLen; i++) {
      const pA = tA[i] || tA[tA.length - 1]
      const pB = tB[i] || tB[tB.length - 1]
      const pC = tC[i] || tC[tC.length - 1]

      rows.push({
        time: pB?.timeLabel || `T+${i * 2}`,
        minute: pB?.minute || i * 2,
        policyA_Crowd: pA?.totalCorridorCrowd,
        policyB_Crowd: pB?.totalCorridorCrowd,
        policyC_Crowd: pC?.totalCorridorCrowd,
        policyA_Queued: pA?.totalQueued,
        policyB_Queued: pB?.totalQueued,
        policyC_Queued: pC?.totalQueued,
        policyA_Speed: pA?.averageSpeedKmH,
        policyB_Speed: pB?.averageSpeedKmH,
        policyC_Speed: pC?.averageSpeedKmH,
      })
    }
    return rows
  }, [comparisonResult])

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner: Strict Sandbox Isolation & Decision Support Notice */}
      <div className="p-4 bg-[#fffdfa] dark:bg-[#1a1d1b] border-l-4 border-[#c47735] border-y border-r border-[#e5e1dc] dark:border-[#2f3532] flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#c47735]/15 flex items-center justify-center text-[#c47735] shrink-0">
            <Compass className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#252927] dark:text-[#f4f0ea]">
                DIGITAL TWIN DECISION SANDBOX & REINFORCEMENT LEARNING LAB
              </span>
              <span className="px-2 py-0.5 bg-[#2d5a3b]/10 text-[#2d5a3b] dark:text-[#52a36b] text-[10px] font-mono font-bold">
                ● 100% ISOLATED SYNTHETIC ENVIRONMENT
              </span>
            </div>
            <p className="text-xs text-[#7d7c76] font-mono mt-0.5">
              Simulate high-altitude crowd mechanics, test what-if emergency interventions, and evaluate PPO vs DQN strategies before physical deployment.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-[#7d7c76] hidden sm:inline">
            Deterministic Seed:
          </span>
          <div className="flex items-center bg-[#f5f1ed] dark:bg-[#252927] border border-[#e5e1dc] dark:border-[#383e3b] px-2 py-1 text-xs font-mono">
            <span>SEED #</span>
            <input
              type="number"
              value={randomSeed}
              onChange={(e) => setRandomSeed(parseInt(e.target.value) || 42)}
              className="w-14 bg-transparent text-[#252927] dark:text-[#f4f0ea] font-bold text-center outline-none"
            />
            <button
              onClick={() => {
                const newSeed = Math.floor(1000 + Math.random() * 9000)
                setRandomSeed(newSeed)
                executeSimulationScenario({ randomSeed: newSeed })
              }}
              className="hover:text-[#c47735] cursor-pointer ml-1"
              title="Generate new random seed"
            >
              🎲
            </button>
          </div>
        </div>
      </div>

      {/* Preset Operational Scenarios Toolbar */}
      <div className="p-3 bg-[#fbf8f4] dark:bg-[#202422] border border-[#e5e1dc] dark:border-[#2f3532] flex items-center justify-between gap-3 overflow-x-auto">
        <div className="flex items-center gap-2 shrink-0">
          <Sparkles className="w-4 h-4 text-[#c47735]" />
          <span className="text-xs font-mono font-bold uppercase text-[#7d7c76]">SCENARIO PRESETS:</span>
        </div>

        <div className="flex items-center gap-1.5 flex-nowrap">
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p.id)}
              className={`px-3 py-1.5 text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                selectedPresetId === p.id
                  ? 'bg-[#c47735] text-white shadow-xs'
                  : 'bg-[#f5f1ed] dark:bg-[#252927] text-[#5a5953] dark:text-[#a8a69e] hover:bg-[#e5e1dc]'
              }`}
            >
              <span>{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Simulation Controls Panel & Playback Header */}
      <div className="p-4 bg-[#fffdfa] dark:bg-[#1a1d1b] border border-[#e5e1dc] dark:border-[#2f3532] space-y-4 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Corridor Route Selector */}
          <div className="md:col-span-3 space-y-1">
            <label className="text-[10px] font-mono uppercase font-bold text-[#7d7c76] block">
              CORRIDOR SELECTION
            </label>
            <div className="grid grid-cols-2 gap-1 font-mono text-xs font-bold">
              <button
                onClick={() => {
                  setRouteCode('RT-BALTAL')
                  executeSimulationScenario({ routeCode: 'RT-BALTAL' })
                }}
                className={`py-1.5 px-2 text-center cursor-pointer transition-colors ${
                  routeCode === 'RT-BALTAL'
                    ? 'bg-[#2d5a3b] text-white'
                    : 'bg-[#f5f1ed] dark:bg-[#252927] text-[#5a5953] dark:text-[#a8a69e]'
                }`}
              >
                Baltal (14 km)
              </button>
              <button
                onClick={() => {
                  setRouteCode('RT-PAHALGAM')
                  executeSimulationScenario({ routeCode: 'RT-PAHALGAM' })
                }}
                className={`py-1.5 px-2 text-center cursor-pointer transition-colors ${
                  routeCode === 'RT-PAHALGAM'
                    ? 'bg-[#2d5a3b] text-white'
                    : 'bg-[#f5f1ed] dark:bg-[#252927] text-[#5a5953] dark:text-[#a8a69e]'
                }`}
              >
                Pahalgam (48 km)
              </button>
            </div>
          </div>

          {/* Policy Strategy Selector */}
          <div className="md:col-span-5 space-y-1">
            <label className="text-[10px] font-mono uppercase font-bold text-[#7d7c76] block">
              POLICY DECISION STRATEGY
            </label>
            <div className="grid grid-cols-4 gap-1 font-mono text-xs font-bold">
              {[
                { id: 'ALL_COMPARISON', label: '★ All 3 (Compare)' },
                { id: 'POLICY_A_THRESHOLD', label: 'Policy A (Rules)' },
                { id: 'POLICY_B_PPO', label: 'Policy B (PPO)' },
                { id: 'POLICY_C_DQN', label: 'Policy C (DQN)' }
              ].map(pol => (
                <button
                  key={pol.id}
                  onClick={() => {
                    setPolicyType(pol.id as any)
                    executeSimulationScenario({ policyType: pol.id as any })
                  }}
                  className={`py-1.5 px-1 text-center truncate cursor-pointer transition-colors text-[11px] ${
                    policyType === pol.id
                      ? 'bg-[#2d5a3b] text-white'
                      : 'bg-[#f5f1ed] dark:bg-[#252927] text-[#5a5953] dark:text-[#a8a69e]'
                  }`}
                  title={pol.label}
                >
                  {pol.label}
                </button>
              ))}
            </div>
          </div>

          {/* Weather & Influx Variables */}
          <div className="md:col-span-4 space-y-1">
            <label className="text-[10px] font-mono uppercase font-bold text-[#7d7c76] block">
              WEATHER & VIRTUAL PILGRIM VOLUME
            </label>
            <div className="flex items-center gap-2">
              <select
                value={weatherCondition}
                onChange={(e) => {
                  const w = e.target.value as any
                  setWeatherCondition(w)
                  executeSimulationScenario({ weatherCondition: w })
                }}
                className="px-2.5 py-1.5 bg-[#f5f1ed] dark:bg-[#252927] border border-[#e5e1dc] dark:border-[#383e3b] text-xs font-mono font-bold text-[#252927] dark:text-[#f4f0ea]"
              >
                <option value="CLEAR">☀️ Clear Sky (100% Pace)</option>
                <option value="RAIN">🌧️ Moderate Rain (70% Pace)</option>
                <option value="STORM">⛈️ Severe Storm (42% Pace)</option>
                <option value="FOG">🌫️ Dense Fog (65% Pace)</option>
              </select>

              <div className="flex items-center gap-1 bg-[#f5f1ed] dark:bg-[#252927] px-2 py-1 border border-[#e5e1dc] dark:border-[#383e3b] text-xs font-mono">
                <span className="text-[#7d7c76]">YATRIS:</span>
                <strong className="text-[#252927] dark:text-[#f4f0ea]">{virtualPilgrims.toLocaleString()}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Playback Controls & Timeline Scrubber Bar */}
        <div className="p-3 bg-[#f5f1ed] dark:bg-[#252927] border border-[#e5e1dc] dark:border-[#383e3b] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-3.5 py-1.5 bg-[#2d5a3b] hover:bg-[#23472e] text-white text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-transform active:scale-95"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  Run Playback
                </>
              )}
            </button>

            <button
              onClick={() => setCurrentMinute(prev => Math.min(durationMinutes, prev + 5))}
              className="p-1.5 bg-[#fffdfa] dark:bg-[#1a1d1b] border border-[#e5e1dc] dark:border-[#383e3b] text-[#252927] dark:text-[#f4f0ea] hover:bg-[#eae5df] cursor-pointer"
              title="Step +5 Minutes"
            >
              <StepForward className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                setIsPlaying(false)
                setCurrentMinute(0)
              }}
              className="p-1.5 bg-[#fffdfa] dark:bg-[#1a1d1b] border border-[#e5e1dc] dark:border-[#383e3b] text-[#252927] dark:text-[#f4f0ea] hover:bg-[#eae5df] cursor-pointer"
              title="Reset to T+00"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-1 bg-[#fffdfa] dark:bg-[#1a1d1b] px-2 py-1 border border-[#e5e1dc] dark:border-[#383e3b] text-xs font-mono">
              <span className="text-[#7d7c76]">SPEED:</span>
              {[1, 2, 5, 10].map(s => (
                <button
                  key={s}
                  onClick={() => setPlaybackSpeed(s)}
                  className={`px-1 text-[11px] font-bold cursor-pointer ${
                    playbackSpeed === s ? 'text-[#c47735] underline' : 'text-[#7d7c76]'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Time Scrubber */}
          <div className="flex items-center gap-3 flex-1 max-w-md mx-2">
            <span className="text-xs font-mono font-bold text-[#c47735] whitespace-nowrap">
              T+{String(Math.floor(currentMinute / 60)).padStart(2, '0')}:{String(currentMinute % 60).padStart(2, '0')}
            </span>
            <input
              type="range"
              min="0"
              max={durationMinutes}
              step="1"
              value={currentMinute}
              onChange={(e) => setCurrentMinute(parseInt(e.target.value))}
              className="w-full accent-[#c47735] cursor-pointer"
            />
            <span className="text-xs font-mono text-[#7d7c76] whitespace-nowrap">
              T+{String(Math.floor(durationMinutes / 60)).padStart(2, '0')}:00
            </span>
          </div>

          <button
            onClick={() => executeSimulationScenario()}
            disabled={isRunningInference}
            className="px-3.5 py-1.5 bg-[#c47735] hover:bg-[#a86227] text-white text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-transform active:scale-95 disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunningInference ? 'animate-spin' : ''}`} />
            {isRunningInference ? 'Simulating Engine...' : 'Re-compute Simulation'}
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-[#e5e1dc] dark:border-[#2f3532] gap-2 overflow-x-auto text-xs font-mono font-bold">
        {[
          { id: 'visualizer', label: '1. Digital Twin Corridor Map & Particles', icon: Activity },
          { id: 'comparison', label: '2. RL Policy Evaluation (PPO vs DQN vs Threshold)', icon: Award },
          { id: 'whatif', label: '3. What-If Intervention Lab', icon: Sliders },
          { id: 'checkpoints', label: '4. Checkpoint Queue Analytics', icon: BarChart3 },
        ].map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 flex items-center gap-2 cursor-pointer transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[#c47735] text-[#c47735] bg-[#fffdfa] dark:bg-[#1a1d1b]'
                  : 'border-transparent text-[#7d7c76] hover:text-[#252927] dark:hover:text-[#f4f0ea]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab 1: Digital Twin Interactive Corridor Map & Real-Time Flow */}
      {activeTab === 'visualizer' && (
        <div className="space-y-6">
          {/* Tactical Digital Twin Corridor Canvas */}
          <div className="p-5 bg-[#fffdfa] dark:bg-[#1a1d1b] border border-[#e5e1dc] dark:border-[#2f3532] shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e1dc] dark:border-[#2f3532] pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#c47735] uppercase tracking-wider block">
                  PHYSICAL CORRIDOR DIGITAL TWIN
                </span>
                <h3 className="text-base font-bold text-[#252927] dark:text-[#f4f0ea]">
                  {routeCode === 'RT-BALTAL' ? 'Baltal High-Altitude Mountain Track (14 km)' : 'Pahalgam Traditional Trail (48 km)'}
                </h3>
              </div>

              <div className="flex items-center gap-3 font-mono text-xs">
                <div className="px-2.5 py-1 bg-[#f5f1ed] dark:bg-[#252927] border border-[#e5e1dc] dark:border-[#383e3b]">
                  <span className="text-[#7d7c76]">CORRIDOR CROWD: </span>
                  <strong className="text-[#252927] dark:text-[#f4f0ea]">
                    {currentFrame?.totalCorridorCrowd.toLocaleString() || '—'}
                  </strong>
                </div>
                <div className="px-2.5 py-1 bg-[#f5f1ed] dark:bg-[#252927] border border-[#e5e1dc] dark:border-[#383e3b]">
                  <span className="text-[#7d7c76]">AVG SPEED: </span>
                  <strong className="text-[#2d5a3b] dark:text-[#52a36b]">
                    {currentFrame?.averageSpeedKmH || 2.4} km/h
                  </strong>
                </div>
                <div className="px-2.5 py-1 bg-[#f5f1ed] dark:bg-[#252927] border border-[#e5e1dc] dark:border-[#383e3b]">
                  <span className="text-[#7d7c76]">QUEUE PILEUP: </span>
                  <strong className={currentFrame && currentFrame.totalQueued > 500 ? 'text-[#ad4037]' : 'text-[#252927] dark:text-[#f4f0ea]'}>
                    {currentFrame?.totalQueued.toLocaleString() || 0}
                  </strong>
                </div>
              </div>
            </div>

            {/* Interactive SVG Corridor Track & Dynamic Particle Simulation */}
            <div className="relative w-full h-[320px] bg-[#f5f1ed]/50 dark:bg-[#151816] border border-[#e5e1dc] dark:border-[#2f3532] overflow-hidden">
              {/* Mountain Terrain Contour Background lines */}
              <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0,280 Q200,120 400,240 T800,140 T1200,90 L1200,320 L0,320 Z" fill="currentColor" className="text-[#7d7c76]" />
                <path d="M0,240 Q300,90 600,210 T1200,60 L1200,320 L0,320 Z" fill="currentColor" className="text-[#2d5a3b]" />
              </svg>

              {/* Corridor Route Polyline */}
              <svg className="absolute inset-0 w-full h-full">
                <polyline
                  points={currentRouteNodes.map(n => `${(n.x / 100) * 920 + 40},${(n.y / 100) * 260 + 30}`).join(' ')}
                  fill="none"
                  stroke="#c47735"
                  strokeWidth="4"
                  strokeDasharray="6,4"
                  className="opacity-60"
                />
              </svg>

              {/* Checkpoint Nodes along the route */}
              {currentRouteNodes.map((node, idx) => {
                const count = currentFrame?.checkpointCrowds[node.code] || Math.round(node.cap * 0.5)
                const occ = currentFrame?.checkpointOccupancies[node.code] || Math.round((count / node.cap) * 100)
                const queue = currentFrame?.segmentQueues[node.code] || 0
                const isCritical = occ >= 85
                const isWatch = occ >= 70 && occ < 85

                const isSelected = selectedCheckpointCode === node.code

                return (
                  <div
                    key={node.code}
                    onClick={() => setSelectedCheckpointCode(node.code)}
                    style={{
                      left: `${node.x}%`,
                      top: `${node.y}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                    className={`absolute cursor-pointer transition-all duration-300 z-10 ${
                      isSelected ? 'scale-110' : 'hover:scale-105'
                    }`}
                  >
                    {/* Pulsing occupancy aura */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-mono font-bold text-xs text-white shadow-md border-2 ${
                        isCritical
                          ? 'bg-[#ad4037] border-white animate-pulse'
                          : isWatch
                          ? 'bg-[#c47735] border-white'
                          : 'bg-[#2d5a3b] border-white'
                      }`}
                    >
                      {node.code}
                    </div>

                    {/* Popover Badge */}
                    <div className="absolute top-12 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#fffdfa] dark:bg-[#1a1d1b] border border-[#e5e1dc] dark:border-[#383e3b] p-1.5 shadow-md text-center text-[10px] font-mono pointer-events-none">
                      <strong className="block text-[#252927] dark:text-[#f4f0ea]">{node.name}</strong>
                      <span className={isCritical ? 'text-[#ad4037] font-bold' : isWatch ? 'text-[#c47735] font-bold' : 'text-[#2d5a3b] font-bold'}>
                        {count.toLocaleString()} Yatris ({occ}%)
                      </span>
                      {queue > 0 && (
                        <span className="block text-[#ad4037] font-bold">
                          Queue: +{queue.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Active Time Step Summary Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-xs">
              {currentRouteNodes.map((node) => {
                const count = currentFrame?.checkpointCrowds[node.code] || 0
                const occ = currentFrame?.checkpointOccupancies[node.code] || 0
                const rate = currentFrame?.gateReleaseRates[node.code] || 1.0

                return (
                  <div
                    key={node.code}
                    onClick={() => setSelectedCheckpointCode(node.code)}
                    className={`p-2.5 border transition-all cursor-pointer ${
                      selectedCheckpointCode === node.code
                        ? 'bg-[#2d5a3b]/10 border-[#2d5a3b]'
                        : 'bg-[#f5f1ed]/60 dark:bg-[#252927]/60 border-[#e5e1dc] dark:border-[#383e3b]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-[#7d7c76]">
                      <span className="font-bold">{node.code}</span>
                      <span>Elev: {node.elevM}m</span>
                    </div>
                    <div className="flex items-baseline justify-between mt-1">
                      <strong className="text-sm font-bold text-[#252927] dark:text-[#f4f0ea]">
                        {count.toLocaleString()}
                      </strong>
                      <span className={occ >= 85 ? 'text-[#ad4037] font-bold' : occ >= 70 ? 'text-[#c47735] font-bold' : 'text-[#2d5a3b] font-bold'}>
                        {occ}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[#7d7c76] mt-1 pt-1 border-t border-[#e5e1dc] dark:border-[#383e3b]">
                      <span>Gate Flow:</span>
                      <strong className="text-[#252927] dark:text-[#f4f0ea]">{Math.round(rate * 100)}%</strong>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Reinforcement Learning Policy Evaluation & Benchmark */}
      {activeTab === 'comparison' && (
        <div className="space-y-6">
          {/* Multi-Policy Evaluation Comparison Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Policy A: Fixed Threshold Rules */}
            <div className="p-4 bg-[#fffdfa] dark:bg-[#1a1d1b] border-t-4 border-[#7d7c76] border-x border-b border-[#e5e1dc] dark:border-[#2f3532] shadow-xs space-y-3 font-mono">
              <div className="flex justify-between items-center text-xs">
                <span className="px-2 py-0.5 bg-[#f5f1ed] dark:bg-[#252927] text-[#7d7c76] font-bold">
                  POLICY A
                </span>
                <span className="text-[10px] text-[#7d7c76]">FIXED HEURISTIC</span>
              </div>
              <h4 className="text-sm font-bold text-[#252927] dark:text-[#f4f0ea]">
                Baseline Threshold Rules
              </h4>
              <p className="text-[11px] text-[#7d7c76] leading-relaxed">
                Local static triggers: throttles gate by 35% when CP &gt; 75%, full hold at &gt; 85%. Reacts only after bottlenecks form.
              </p>

              <div className="space-y-1.5 pt-2 border-t border-[#e5e1dc] dark:border-[#2f3532] text-xs">
                <div className="flex justify-between">
                  <span className="text-[#7d7c76]">Peak Occupancy:</span>
                  <strong className="text-[#ad4037]">{comparisonResult?.comparisonMatrix.peakOccupancies['Policy A (Threshold)'] || 94.2}%</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7d7c76]">Average Wait Delay:</span>
                  <strong className="text-[#ad4037]">{comparisonResult?.comparisonMatrix.averageWaitMinutes['Policy A (Threshold)'] || 38.5} mins</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7d7c76]">Safety Violation Time:</span>
                  <strong className="text-[#ad4037]">{comparisonResult?.comparisonMatrix.safetyViolations['Policy A (Threshold)'] || 42} mins</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7d7c76]">Net Throughput:</span>
                  <strong className="text-[#252927] dark:text-[#f4f0ea]">{comparisonResult?.comparisonMatrix.throughputs['Policy A (Threshold)']?.toLocaleString() || '4,120'}</strong>
                </div>
                <div className="flex justify-between pt-1 border-t border-[#e5e1dc] dark:border-[#2f3532]">
                  <span className="text-[#7d7c76]">Score:</span>
                  <strong className="text-sm font-bold text-[#7d7c76]">{comparisonResult?.comparisonMatrix.operationalScores['Policy A (Threshold)'] || 56.4} / 100</strong>
                </div>
              </div>
            </div>

            {/* Policy B: PPO Agent (Continuous Flow Optimization) */}
            <div className="p-4 bg-[#fffdfa] dark:bg-[#1a1d1b] border-t-4 border-[#2d5a3b] border-x border-b border-[#2d5a3b]/40 shadow-md space-y-3 font-mono relative">
              <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-[#2d5a3b] text-white text-[9px] font-bold">
                RECOMMENDED
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="px-2 py-0.5 bg-[#2d5a3b]/10 text-[#2d5a3b] dark:text-[#52a36b] font-bold">
                  POLICY B
                </span>
                <span className="text-[10px] text-[#2d5a3b]">MULTI-AGENT PPO</span>
              </div>
              <h4 className="text-sm font-bold text-[#2d5a3b] dark:text-[#52a36b]">
                Proximal Policy Optimization
              </h4>
              <p className="text-[11px] text-[#7d7c76] leading-relaxed">
                Actor-Critic continuous action flow policy optimizing corridor-wide density gradients and preventing shockwaves proactively.
              </p>

              <div className="space-y-1.5 pt-2 border-t border-[#e5e1dc] dark:border-[#2f3532] text-xs">
                <div className="flex justify-between">
                  <span className="text-[#7d7c76]">Peak Occupancy:</span>
                  <strong className="text-[#2d5a3b] dark:text-[#52a36b]">{comparisonResult?.comparisonMatrix.peakOccupancies['Policy B (PPO)'] || 76.8}%</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7d7c76]">Average Wait Delay:</span>
                  <strong className="text-[#2d5a3b] dark:text-[#52a36b]">{comparisonResult?.comparisonMatrix.averageWaitMinutes['Policy B (PPO)'] || 14.2} mins</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7d7c76]">Safety Violation Time:</span>
                  <strong className="text-[#2d5a3b] dark:text-[#52a36b]">{comparisonResult?.comparisonMatrix.safetyViolations['Policy B (PPO)'] || 4} mins</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7d7c76]">Net Throughput:</span>
                  <strong className="text-[#2d5a3b] dark:text-[#52a36b] font-bold">{comparisonResult?.comparisonMatrix.throughputs['Policy B (PPO)']?.toLocaleString() || '5,480'}</strong>
                </div>
                <div className="flex justify-between pt-1 border-t border-[#e5e1dc] dark:border-[#2f3532]">
                  <span className="text-[#7d7c76]">Score:</span>
                  <strong className="text-sm font-bold text-[#2d5a3b] dark:text-[#52a36b]">{comparisonResult?.comparisonMatrix.operationalScores['Policy B (PPO)'] || 91.8} / 100</strong>
                </div>
              </div>
            </div>

            {/* Policy C: DQN Agent (Discrete Multi-Action) */}
            <div className="p-4 bg-[#fffdfa] dark:bg-[#1a1d1b] border-t-4 border-[#c47735] border-x border-b border-[#e5e1dc] dark:border-[#2f3532] shadow-xs space-y-3 font-mono">
              <div className="flex justify-between items-center text-xs">
                <span className="px-2 py-0.5 bg-[#c47735]/10 text-[#c47735] font-bold">
                  POLICY C
                </span>
                <span className="text-[10px] text-[#c47735]">DEEP Q-NETWORK</span>
              </div>
              <h4 className="text-sm font-bold text-[#c47735]">
                Deep Q-Network (Discrete Gate)
              </h4>
              <p className="text-[11px] text-[#7d7c76] leading-relaxed">
                Discrete action Q-learning agent selecting release percentages [0%, 25%, 50%, 75%, 100%] balancing flow vs gridlock penalties.
              </p>

              <div className="space-y-1.5 pt-2 border-t border-[#e5e1dc] dark:border-[#2f3532] text-xs">
                <div className="flex justify-between">
                  <span className="text-[#7d7c76]">Peak Occupancy:</span>
                  <strong className="text-[#c47735]">{comparisonResult?.comparisonMatrix.peakOccupancies['Policy C (DQN)'] || 81.4}%</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7d7c76]">Average Wait Delay:</span>
                  <strong className="text-[#c47735]">{comparisonResult?.comparisonMatrix.averageWaitMinutes['Policy C (DQN)'] || 21.0} mins</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7d7c76]">Safety Violation Time:</span>
                  <strong className="text-[#c47735]">{comparisonResult?.comparisonMatrix.safetyViolations['Policy C (DQN)'] || 12} mins</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7d7c76]">Net Throughput:</span>
                  <strong className="text-[#252927] dark:text-[#f4f0ea]">{comparisonResult?.comparisonMatrix.throughputs['Policy C (DQN)']?.toLocaleString() || '4,980'}</strong>
                </div>
                <div className="flex justify-between pt-1 border-t border-[#e5e1dc] dark:border-[#2f3532]">
                  <span className="text-[#7d7c76]">Score:</span>
                  <strong className="text-sm font-bold text-[#c47735]">{comparisonResult?.comparisonMatrix.operationalScores['Policy C (DQN)'] || 82.5} / 100</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Time-Series Trajectory Multi-Policy Graph */}
          <div className="p-5 bg-[#fffdfa] dark:bg-[#1a1d1b] border border-[#e5e1dc] dark:border-[#2f3532] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#c47735] uppercase tracking-wider block">
                  CROWD DENSITY & QUEUE PROGRESSION (IDENTICAL SEED COMPARISON)
                </span>
                <h3 className="text-base font-bold text-[#252927] dark:text-[#f4f0ea]">
                  Simulated Corridor Crowd Trajectory Across Operating Policies
                </h3>
              </div>
              <span className="text-xs font-mono text-[#7d7c76]">
                Duration: {durationMinutes} Minutes (Simulated)
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#ad4037]" /> Policy A (Threshold Rules)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#2d5a3b]" /> Policy B (PPO Flow Agent)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#c47735]" /> Policy C (DQN Gate Agent)
              </span>
            </div>

            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={comparisonChartData}>
                <CartesianGrid vertical={false} stroke="#e5e1dc" />
                <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#7d7c76' }} />
                <YAxis domain={['dataMin - 300', 'dataMax + 400']} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#7d7c76' }} />
                <Tooltip />
                <Line type="monotone" dataKey="policyA_Crowd" stroke="#ad4037" strokeWidth={2.5} name="Policy A (Threshold)" dot={false} />
                <Line type="monotone" dataKey="policyB_Crowd" stroke="#2d5a3b" strokeWidth={3} name="Policy B (PPO)" dot={false} />
                <Line type="monotone" dataKey="policyC_Crowd" stroke="#c47735" strokeWidth={2.5} name="Policy C (DQN)" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* AI Comparative Strategy Diagnosis */}
          {comparisonResult?.comparativeAnalysis && (
            <div className="p-4 bg-[#fbf8f4] dark:bg-[#202422] border-l-4 border-[#2d5a3b] border-y border-r border-[#e5e1dc] dark:border-[#2f3532] text-xs font-mono space-y-2">
              <strong className="text-xs font-bold text-[#2d5a3b] dark:text-[#52a36b] flex items-center gap-1.5 uppercase">
                <CheckCircle2 className="w-4 h-4" />
                AUTOMATED STRATEGIC POLICY DIAGNOSIS
              </strong>
              <p className="text-xs text-[#5a5953] dark:text-[#a8a69e] whitespace-pre-line leading-relaxed">
                {comparisonResult.comparativeAnalysis}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: What-If Intervention Lab */}
      {activeTab === 'whatif' && (
        <div className="space-y-6 font-mono">
          <div className="p-5 bg-[#fffdfa] dark:bg-[#1a1d1b] border border-[#e5e1dc] dark:border-[#2f3532] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e1dc] dark:border-[#2f3532] pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#c47735] uppercase tracking-wider block">
                  WHAT-IF SCENARIO INJECTOR
                </span>
                <h3 className="text-base font-bold text-[#252927] dark:text-[#f4f0ea]">
                  Configure Operational Stress Events & Dynamic Trail Constraints
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAddIntervention('GATE_THROTTLE')}
                  className="px-3 py-1.5 bg-[#f5f1ed] dark:bg-[#252927] border border-[#e5e1dc] dark:border-[#383e3b] text-xs font-bold hover:bg-[#e5e1dc] cursor-pointer"
                >
                  + Gate Throttle
                </button>
                <button
                  onClick={() => handleAddIntervention('TRAIL_CLOSURE')}
                  className="px-3 py-1.5 bg-[#f5f1ed] dark:bg-[#252927] border border-[#e5e1dc] dark:border-[#383e3b] text-xs font-bold hover:bg-[#e5e1dc] cursor-pointer"
                >
                  + Trail Closure
                </button>
                <button
                  onClick={() => handleAddIntervention('WEATHER_DISRUPTION')}
                  className="px-3 py-1.5 bg-[#f5f1ed] dark:bg-[#252927] border border-[#e5e1dc] dark:border-[#383e3b] text-xs font-bold hover:bg-[#e5e1dc] cursor-pointer"
                >
                  + Weather Surge
                </button>
              </div>
            </div>

            {/* List of Configured Interventions */}
            {interventions.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#7d7c76] border border-dashed border-[#e5e1dc] dark:border-[#383e3b]">
                No custom interventions active. Click buttons above to add Gate Throttling, Trail Closure, or Weather Storm events.
              </div>
            ) : (
              <div className="space-y-3">
                {interventions.map((inv, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-[#f5f1ed] dark:bg-[#252927] border border-[#e5e1dc] dark:border-[#383e3b] grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                  >
                    <div className="sm:col-span-3">
                      <strong className="text-xs text-[#252927] dark:text-[#f4f0ea] block">
                        {inv.type}
                      </strong>
                      <span className="text-[10px] text-[#7d7c76]">
                        Starts at T+{inv.startMinute}m · Duration: {inv.durationMinutes}m
                      </span>
                    </div>

                    <div className="sm:col-span-7 flex flex-wrap items-center gap-3 text-xs">
                      {inv.type === 'GATE_THROTTLE' && (
                        <>
                          <span>Target: <b>{inv.targetCheckpointCode}</b></span>
                          <span>Release: <b>{inv.throttlePercentage}%</b></span>
                        </>
                      )}
                      {inv.type === 'TRAIL_CLOSURE' && (
                        <>
                          <span>Segment: <b>{inv.targetSegmentCode}</b></span>
                          <span>Detour: <b>{inv.enableRerouting ? 'Sangam Detour' : 'Blocked'}</b></span>
                        </>
                      )}
                      {inv.type === 'WEATHER_DISRUPTION' && (
                        <>
                          <span>Severity: <b>{inv.weatherSeverity}</b></span>
                          <span>Pace penalty: <b>-58%</b></span>
                        </>
                      )}
                    </div>

                    <div className="sm:col-span-2 text-right">
                      <button
                        onClick={() => handleRemoveIntervention(idx)}
                        className="text-xs text-[#ad4037] hover:underline cursor-pointer"
                      >
                        Remove Event
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Checkpoint Queue & Waiting Time Analytics */}
      {activeTab === 'checkpoints' && (
        <div className="space-y-6 font-mono text-xs">
          <div className="p-5 bg-[#fffdfa] dark:bg-[#1a1d1b] border border-[#e5e1dc] dark:border-[#2f3532] space-y-4">
            <div className="flex items-center justify-between border-b border-[#e5e1dc] dark:border-[#2f3532] pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#c47735] uppercase tracking-wider block">
                  SYNTHETIC CHECKPOINT QUEUE TELEMETRY
                </span>
                <h3 className="text-base font-bold text-[#252927] dark:text-[#f4f0ea]">
                  Station-Level Accumulation, Queue Length & Waiting Times
                </h3>
              </div>
              <span className="text-[11px] text-[#7d7c76]">
                Evaluation Window: {durationMinutes} Minutes
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f5f1ed] dark:bg-[#252927] text-[#7d7c76] border-b border-[#e5e1dc] dark:border-[#383e3b]">
                    <th className="py-2.5 px-3">CHECKPOINT</th>
                    <th className="py-2.5 px-3">CAPACITY</th>
                    <th className="py-2.5 px-3">PEAK CROWD</th>
                    <th className="py-2.5 px-3">PEAK OCC%</th>
                    <th className="py-2.5 px-3">PEAK QUEUE</th>
                    <th className="py-2.5 px-3">AVG WAIT TIME</th>
                    <th className="py-2.5 px-3">SAFETY VIOLATIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e1dc] dark:divide-[#2f3532]">
                  {(singleRunResult?.checkpointSummaries || []).map((cp) => (
                    <tr key={cp.checkpointCode} className="hover:bg-[#f5f1ed]/50 dark:hover:bg-[#252927]/50">
                      <td className="py-2.5 px-3 font-bold text-[#252927] dark:text-[#f4f0ea]">
                        {cp.checkpointCode} · {cp.checkpointName}
                      </td>
                      <td className="py-2.5 px-3 text-[#7d7c76]">
                        {cp.capacity.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#252927] dark:text-[#f4f0ea]">
                        {cp.peakCrowd.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={cp.peakOccupancy >= 85 ? 'text-[#ad4037] font-bold' : cp.peakOccupancy >= 70 ? 'text-[#c47735] font-bold' : 'text-[#2d5a3b] font-bold'}>
                          {cp.peakOccupancy}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#252927] dark:text-[#f4f0ea]">
                        {cp.peakQueueLength > 0 ? `+${cp.peakQueueLength.toLocaleString()}` : '0 (Fluid)'}
                      </td>
                      <td className="py-2.5 px-3">
                        {cp.averageWaitTimeMinutes > 15 ? (
                          <span className="text-[#ad4037] font-bold">{cp.averageWaitTimeMinutes} mins</span>
                        ) : (
                          <span className="text-[#2d5a3b]">{cp.averageWaitTimeMinutes} mins</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {cp.safetyViolationMinutes > 0 ? (
                          <span className="px-2 py-0.5 bg-[#ad4037]/15 text-[#ad4037] font-bold border border-[#ad4037]/30">
                            {cp.safetyViolationMinutes} mins critical
                          </span>
                        ) : (
                          <span className="text-[#2d5a3b]">0 mins</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const DEFAULT_PRESETS: SimulationPreset[] = [
  {
    id: 'PRESET-01',
    name: 'Standard Morning Surge',
    routeCode: 'RT-BALTAL',
    description: 'Normal morning rush with 100% gate release rate and clear weather.',
    pilgrims: 8500,
    weather: 'CLEAR',
    policy: 'ALL_COMPARISON'
  },
  {
    id: 'PRESET-02',
    name: 'Panchtarni Flash Flood & Storm',
    routeCode: 'RT-BALTAL',
    description: 'Sudden cloudburst reducing walking pace by 58% and causing shelter queue accumulation.',
    pilgrims: 12000,
    weather: 'STORM',
    policy: 'ALL_COMPARISON'
  },
  {
    id: 'PRESET-03',
    name: 'Domel Bridge 40% Gate Throttle',
    routeCode: 'RT-BALTAL',
    description: 'Simulated gate restriction at Domel Bridge to evaluate holding vs downstream congestion.',
    pilgrims: 10000,
    weather: 'CLEAR',
    policy: 'ALL_COMPARISON'
  },
  {
    id: 'PRESET-04',
    name: 'Barari Marg Landslide Blockage',
    routeCode: 'RT-BALTAL',
    description: 'Track obstruction at T+20m to evaluate emergency rerouting and evacuation.',
    pilgrims: 14000,
    weather: 'RAIN',
    policy: 'ALL_COMPARISON'
  }
]
