const API_BASE_URL = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080')

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
  timestamp?: string
}

export interface ApiError {
  timestamp: string
  status: number
  error: string
  message: string
  path?: string
  fieldErrors?: Record<string, string>
}

export interface Route {
  id: number
  name: string
  code: string
  description?: string
  active: boolean
}

export interface Checkpoint {
  id: number
  name: string
  code: string
  routeId: number
  routeName: string
  routeCode: string
  capacity: number
  latitude: number
  longitude: number
  active: boolean
}

export interface QrCodeData {
  id: number
  qrId: string
  pilgrimId: number
  pilgrimCode: string
  pilgrimName: string
  routeId: number
  routeName: string
  routeCode: string
  version: string
  active: boolean
  payload: string
  createdAt?: string
}

export interface Pilgrim {
  id: number
  pilgrimCode: string
  name: string
  age: number
  gender: string
  phoneNumber?: string
  emergencyContact?: string
  routeId: number
  routeName: string
  routeCode: string
  status: 'REGISTERED' | 'IN_TRANSIT' | 'COMPLETED' | 'DEACTIVATED'
  qrCode?: QrCodeData
  createdAt?: string
}

export interface ScanEvent {
  id: number
  qrId: string
  pilgrimId: number
  pilgrimCode: string
  pilgrimName: string
  checkpointId: number
  checkpointName: string
  checkpointCode: string
  routeId: number
  routeName: string
  routeCode: string
  scanTimestamp: string
  scanType: 'ENTRY' | 'EXIT' | 'TRANSIT' | 'EMERGENCY_VERIFICATION'
  operatorEmail: string
  validationStatus: 'VALID' | 'DUPLICATE_SCAN' | 'WRONG_ROUTE' | 'INACTIVE_QR' | 'INVALID_SEQUENCE'
  failureReason?: string
  createdAt?: string
}

export interface ValidateQrResult {
  valid: boolean
  status: string
  message: string
  qrCode?: QrCodeData
  pilgrim?: Pilgrim
  route?: Route
  lastScan?: ScanEvent
  routeMatchesCheckpoint: boolean
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('yatra_token') : null

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })
  } catch (netErr: any) {
    throw {
      timestamp: new Date().toISOString(),
      status: 0,
      error: 'NetworkError',
      message: netErr?.message || 'Backend connection failed. Make sure Spring Boot is running on port 8080.',
    } as ApiError
  }

  const rawText = await response.text()
  let json: any = null
  try {
    json = rawText ? JSON.parse(rawText) : null
  } catch {
    json = { message: rawText || response.statusText }
  }

  if (!response.ok) {
    const error: ApiError = {
      timestamp: json?.timestamp || new Date().toISOString(),
      status: response.status,
      error: json?.error || response.statusText,
      message: json?.message || rawText || 'An unexpected error occurred',
      fieldErrors: json?.fieldErrors,
    }
    throw error
  }

  return json as ApiResponse<T>
}

// API Helper Methods
export async function getRoutes(): Promise<Route[]> {
  const res = await apiRequest<Route[]>('/api/routes')
  return res.data
}

export async function getCheckpoints(): Promise<Checkpoint[]> {
  const res = await apiRequest<Checkpoint[]>('/api/checkpoints')
  return res.data
}

export async function registerPilgrim(data: {
  name: string
  age: number
  gender: string
  phoneNumber?: string
  emergencyContact?: string
  routeId: number
}): Promise<Pilgrim> {
  const res = await apiRequest<Pilgrim>('/api/pilgrims', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return res.data
}

export async function getPilgrims(): Promise<Pilgrim[]> {
  const res = await apiRequest<Pilgrim[]>('/api/pilgrims')
  return res.data
}

export async function validateQrCode(qrId: string, checkpointId?: number): Promise<ValidateQrResult> {
  const res = await apiRequest<ValidateQrResult>('/api/qr/validate', {
    method: 'POST',
    body: JSON.stringify({ qrId, checkpointId }),
  })
  return res.data
}

export async function recordScanEvent(data: {
  qrId: string
  checkpointId: number
  scanType?: 'ENTRY' | 'EXIT' | 'TRANSIT' | 'EMERGENCY_VERIFICATION'
}): Promise<ScanEvent> {
  const res = await apiRequest<ScanEvent>('/api/scans', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return res.data
}

export async function getPilgrimScans(pilgrimId: number): Promise<ScanEvent[]> {
  const res = await apiRequest<ScanEvent[]>(`/api/scans/${pilgrimId}`)
  return res.data
}

export async function getCheckpointScans(checkpointId: number): Promise<ScanEvent[]> {
  const res = await apiRequest<ScanEvent[]>(`/api/checkpoints/${checkpointId}/scans`)
  return res.data
}

// Crowd Intelligence Interfaces
export interface CheckpointMetrics {
  checkpointId: number
  checkpointCode: string
  checkpointName: string
  routeId: number
  routeCode: string
  routeName: string
  sequenceOrder: number
  distanceFromStartKm: number
  distanceFromPrevKm: number
  currentCrowd: number
  capacity: number
  occupancyPercentage: number
  inflow: number
  outflow: number
  netFlow: number
  averageSpeedKmH: number
  averageTransitTimeMinutes: number
  inTransitCount: number
  lastScanTimestamp: string
  operationalStatus: 'NORMAL' | 'WATCH' | 'HIGH' | 'CRITICAL'
  dataFreshnessStatus: 'FRESH' | 'DELAYED' | 'STALE'
}

export interface BottleneckSignal {
  segmentCode: string
  fromCheckpoint: string
  toCheckpoint: string
  routeCode: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  currentOccupancyPercentage: number
  netAccumulationRate: number
  observedSpeedKmH: number
  normalSpeedKmH: number
  speedDropPercentage: number
  transitTimeMinutes: number
  diagnosis: string
  detectedAt: string
}

export interface LiveCrowdResponse {
  totalActivePilgrims: number
  totalInTransit: number
  totalCapacity: number
  overallOccupancyPercentage: number
  averageWalkingSpeedKmH: number
  averageNetFlowPerMinute: number
  activeAlertsCount: number
  generatedAt: string
  checkpoints: CheckpointMetrics[]
  bottlenecks: BottleneckSignal[]
}

export interface RouteCrowdMetrics {
  routeId: number
  routeCode: string
  routeName: string
  totalActivePilgrims: number
  totalCapacity: number
  overallOccupancyPercentage: number
  totalInTransit: number
  averageRouteSpeedKmH: number
  checkpoints: CheckpointMetrics[]
}

export interface SpeedMetric {
  segment: string
  fromCheckpoint: string
  toCheckpoint: string
  segmentDistanceKm: number
  observedAverageSpeedKmH: number
  benchmarkSpeedKmH: number
  speedCategory: string
  sampleScanCount: number
}

// Crowd Intelligence API Methods
export async function getLiveCrowd(): Promise<LiveCrowdResponse> {
  const res = await apiRequest<LiveCrowdResponse>('/api/crowd/live')
  return res.data
}

export async function getCheckpointCrowdMetrics(checkpointId: number): Promise<CheckpointMetrics> {
  const res = await apiRequest<CheckpointMetrics>(`/api/crowd/checkpoints/${checkpointId}`)
  return res.data
}

export async function getRouteCrowdMetrics(routeId: number): Promise<RouteCrowdMetrics> {
  const res = await apiRequest<RouteCrowdMetrics>(`/api/crowd/routes/${routeId}`)
  return res.data
}

export async function getBottlenecks(): Promise<BottleneckSignal[]> {
  const res = await apiRequest<BottleneckSignal[]>('/api/crowd/bottlenecks')
  return res.data
}

export async function getSpeedMetrics(): Promise<SpeedMetric[]> {
  const res = await apiRequest<SpeedMetric[]>('/api/metrics/speed')
  return res.data
}

// Historical Analytics Interfaces
export interface HistoricalTimeSeriesPoint {
  timestamp: string
  timeLabel: string
  checkpointId?: number
  checkpointCode?: string
  checkpointName?: string
  routeId?: number
  routeCode?: string
  crowdCount: number
  capacity: number
  occupancyPercentage: number
  inflow: number
  outflow: number
  netFlow: number
  averageSpeedKmH: number
  averageTransitTimeMinutes: number
  inTransitCount: number
  operationalStatus: 'NORMAL' | 'WATCH' | 'HIGH' | 'CRITICAL'
  dataStatus: 'FRESH' | 'DELAYED' | 'STALE' | 'SIMULATED'
  isBottleneck: boolean
}

export interface HistoricalAnalyticsSummary {
  peakCrowd: number
  peakOccupancyPercentage: number
  averageOccupancyPercentage: number
  averageInflow: number
  averageOutflow: number
  maximumNetInflow: number
  averageWalkingSpeedKmH: number
  averageTransitTimeMinutes: number
  minutesAboveWatchThreshold: number
  minutesAboveCriticalThreshold: number
  bottleneckDurationMinutes: number
  totalDataPointsEvaluated: number
}

export interface MlTrainingSequence {
  timestamp: string
  checkpointCode: string
  routeCode?: string
  crowd_t_minus_4: number
  crowd_t_minus_3: number
  crowd_t_minus_2: number
  crowd_t_minus_1: number
  current_crowd: number
  inflow: number
  outflow: number
  netFlow: number
  speed: number
  transitTimeMinutes: number
  occupancyPercentage: number
  capacity: number
  timeOfDayHour: number
  dayOfWeek: number
  isWeekend: boolean
}

export interface HistoricalAnalyticsResponse {
  startTime: string
  endTime: string
  interval: string
  checkpointId?: number
  checkpointCode?: string
  routeId?: number
  routeCode?: string
  summary: HistoricalAnalyticsSummary
  timeSeries: HistoricalTimeSeriesPoint[]
  mlSequences?: MlTrainingSequence[]
}

export async function getHistoricalAnalytics(params?: {
  checkpointId?: number
  checkpointCode?: string
  routeId?: number
  start?: string
  end?: string
  interval?: string
}): Promise<HistoricalAnalyticsResponse> {
  const query = new URLSearchParams()
  if (params?.checkpointId) query.set('checkpointId', String(params.checkpointId))
  if (params?.checkpointCode) query.set('checkpointCode', params.checkpointCode)
  if (params?.routeId) query.set('routeId', String(params.routeId))
  if (params?.start) query.set('start', params.start)
  if (params?.end) query.set('end', params.end)
  if (params?.interval) query.set('interval', params.interval)

  const queryString = query.toString() ? `?${query.toString()}` : ''
  const res: any = await apiRequest<HistoricalAnalyticsResponse>(`/api/analytics/crowd${queryString}`)
  return res && res.data !== undefined ? res.data : res
}

export async function getCheckpointHistoricalAnalytics(
  checkpointId: number,
  params?: { start?: string; end?: string; interval?: string }
): Promise<HistoricalAnalyticsResponse> {
  const query = new URLSearchParams()
  if (params?.start) query.set('start', params.start)
  if (params?.end) query.set('end', params.end)
  if (params?.interval) query.set('interval', params.interval)

  const queryString = query.toString() ? `?${query.toString()}` : ''
  const res: any = await apiRequest<HistoricalAnalyticsResponse>(`/api/analytics/checkpoints/${checkpointId}${queryString}`)
  return res && res.data !== undefined ? res.data : res
}

export async function getMlDataset(params?: {
  checkpointCode?: string
  start?: string
  end?: string
  interval?: string
}): Promise<MlTrainingSequence[]> {
  const query = new URLSearchParams()
  if (params?.checkpointCode) query.set('checkpointCode', params.checkpointCode)
  if (params?.start) query.set('start', params.start)
  if (params?.end) query.set('end', params.end)
  if (params?.interval) query.set('interval', params.interval)

  const queryString = query.toString() ? `?${query.toString()}` : ''
  const res: any = await apiRequest<MlTrainingSequence[]>(`/api/analytics/ml-dataset${queryString}`)
  if (Array.isArray(res)) return res
  if (Array.isArray(res?.data)) return res.data
  return []
}

// Phase 6 Multi-Horizon Prediction Interfaces
export interface ForecastHorizon {
  horizonMinutes: number
  horizonLabel: string
  targetTimestamp: string
  predictedCrowd: number
  lowerCrowdBound: number
  upperCrowdBound: number
  predictedOccupancyPct: number
  riskStatus: 'NORMAL' | 'PROJECTED_WATCH' | 'PROJECTED_HIGH' | 'PROJECTED_CRITICAL'
  predictedSpeedKmH: number
  expectedInflow: number
}

export interface PredictionSignal {
  signalName: string
  impact: string
  direction: 'up' | 'down' | 'flat'
  description: string
}

export interface CheckpointPrediction {
  checkpointId: number
  checkpointCode: string
  checkpointName: string
  routeId: number
  routeCode: string
  currentCrowd: number
  capacity: number
  currentOccupancy: number
  forecast15m: ForecastHorizon
  forecast30m: ForecastHorizon
  forecast60m: ForecastHorizon
  signals: PredictionSignal[]
  generatedAt: string
  dataStatus: string
  modelVersion: string
}

export interface LivePredictionsResponse {
  generatedAt: string
  totalActivePilgrims: number
  totalPredictedCrowd30m: number
  overallCurrentOccupancy: number
  overallPredictedOccupancy30m: number
  criticalCheckpointsCount30m: number
  checkpointPredictions: CheckpointPrediction[]
  dataStatus: string
  modelVersion: string
}

export async function getLivePredictions(): Promise<LivePredictionsResponse> {
  const res: any = await apiRequest<LivePredictionsResponse>('/api/predictions/live')
  return res && res.data !== undefined ? res.data : res
}

export async function getCheckpointPrediction(checkpointId: number): Promise<CheckpointPrediction> {
  const res: any = await apiRequest<CheckpointPrediction>(`/api/predictions/checkpoints/${checkpointId}`)
  return res && res.data !== undefined ? res.data : res
}

export async function getRoutePredictions(routeId: number): Promise<CheckpointPrediction[]> {
  const res: any = await apiRequest<CheckpointPrediction[]>(`/api/predictions/route/${routeId}`)
  if (Array.isArray(res)) return res
  if (Array.isArray(res?.data)) return res.data
  return []
}

export async function triggerSimulationPulse(): Promise<void> {
  await apiRequest('/api/simulation/pulse', { method: 'POST' })
}

export async function toggleSimulation(active?: boolean): Promise<{ active: boolean }> {
  const url = active !== undefined ? `/api/simulation/toggle?active=${active}` : '/api/simulation/toggle'
  const res: any = await apiRequest(url, { method: 'POST' })
  return res && res.data !== undefined ? res.data : res
}

// ==========================================
// Digital Twin & RL Sandbox API Interfaces
// ==========================================

export interface InterventionConfig {
  type: 'TRAIL_CLOSURE' | 'GATE_THROTTLE' | 'WEATHER_DISRUPTION' | 'EMERGENCY_EVENT' | 'COMBINED'
  targetCheckpointCode?: string
  targetSegmentCode?: string
  startMinute: number
  durationMinutes: number
  throttlePercentage?: number
  weatherSeverity?: 'CLEAR' | 'RAIN' | 'STORM' | 'FOG'
  enableRerouting?: boolean
  emergencyType?: string
  description?: string
}

export interface SimulationRunRequest {
  routeCode: string
  simulationDurationMinutes: number
  virtualPilgrimCount: number
  crowdDistributionPreset: 'MORNING_RUSH' | 'BALANCED' | 'BASE_SURGE' | 'MID_GRIDLOCK'
  policyType: 'POLICY_A_THRESHOLD' | 'POLICY_B_PPO' | 'POLICY_C_DQN' | 'ALL_COMPARISON'
  weatherCondition: 'CLEAR' | 'RAIN' | 'STORM' | 'FOG'
  baseWalkingSpeedKmH?: number
  randomSeed?: number
  interventions?: InterventionConfig[]
}

export interface SimulationStepData {
  minute: number
  timeLabel: string
  totalCorridorCrowd: number
  totalQueued: number
  throughputCumulative: number
  averageSpeedKmH: number
  checkpointCrowds: Record<string, number>
  checkpointOccupancies: Record<string, number>
  gateReleaseRates: Record<string, number>
  segmentQueues: Record<string, number>
}

export interface SimulatedCheckpointSummary {
  checkpointCode: string
  checkpointName: string
  capacity: number
  peakCrowd: number
  peakOccupancy: number
  averageOccupancy: number
  totalEntered: number
  totalExited: number
  peakQueueLength: number
  averageWaitTimeMinutes: number
  safetyViolationMinutes: number
}

export interface SimulationRunResponse {
  runId: string
  scenarioName: string
  routeCode: string
  policyType: string
  policyLabel: string
  randomSeed: number
  durationMinutes: number
  totalPilgrimsSimulated: number
  executionTimestamp: string
  deterministic: boolean
  peakOccupancyPercentage: number
  averageOccupancyPercentage: number
  estimatedAverageWaitMinutes: number
  totalQueueLength: number
  congestionEventsCount: number
  netPilgrimThroughput: number
  averageGateReleaseRate: number
  estimatedEvacuationMinutes: number
  safetyThresholdViolations: number
  operationalPerformanceScore: number
  timeline: SimulationStepData[]
  checkpointSummaries: SimulatedCheckpointSummary[]
  activeInterventions: InterventionConfig[]
  strategicDiagnosis: string
}

export interface PolicyComparisonResponse {
  comparisonId: string
  scenarioName: string
  routeCode: string
  commonRandomSeed: number
  durationMinutes: number
  virtualPilgrims: number
  weatherCondition: string
  executionTimestamp: string
  policyAThreshold: SimulationRunResponse
  policyBPPO: SimulationRunResponse
  policyCDQN: SimulationRunResponse
  comparisonMatrix: {
    peakOccupancies: Record<string, number>
    averageWaitMinutes: Record<string, number>
    throughputs: Record<string, number>
    safetyViolations: Record<string, number>
    operationalScores: Record<string, number>
    evacuationTimes: Record<string, number>
  }
  comparativeAnalysis: string
  recommendedPolicy: string
}

export interface SimulationPreset {
  id: string
  name: string
  routeCode: string
  description: string
  pilgrims: number
  weather: 'CLEAR' | 'RAIN' | 'STORM' | 'FOG'
  policy: string
}

export async function getSimulationPresets(): Promise<SimulationPreset[]> {
  try {
    const res: any = await apiRequest<SimulationPreset[]>('/api/simulation/sandbox/presets')
    if (Array.isArray(res)) return res
    if (Array.isArray(res?.data)) return res.data
    return []
  } catch {
    return []
  }
}

export async function runDigitalTwinSimulation(request: SimulationRunRequest): Promise<SimulationRunResponse> {
  const res: any = await apiRequest<SimulationRunResponse>('/api/simulation/sandbox/run', {
    method: 'POST',
    body: JSON.stringify(request),
  })
  return res && res.data !== undefined ? res.data : res
}

export async function compareDigitalTwinPolicies(request: SimulationRunRequest): Promise<PolicyComparisonResponse> {
  const res: any = await apiRequest<PolicyComparisonResponse>('/api/simulation/sandbox/compare', {
    method: 'POST',
    body: JSON.stringify(request),
  })
  return res && res.data !== undefined ? res.data : res
}

// ==========================================
// Emergency & Public Safety API Functions
// ==========================================

export type IncidentType =
  | 'MEDICAL'
  | 'PERSONAL_SAFETY'
  | 'LOST_PILGRIM'
  | 'LANDSLIDE'
  | 'WEATHER'
  | 'ROUTE_BLOCKED'
  | 'CROWD_DANGER'
  | 'FIRE'
  | 'INFRASTRUCTURE_FAILURE'
  | 'OTHER'

export type EmergencyScope = 'PERSONAL' | 'CHECKPOINT' | 'ROUTE' | 'GLOBAL'
export type EmergencySeverity = 'INFO' | 'ADVISORY' | 'WARNING' | 'CRITICAL'
export type EmergencyStatus =
  | 'UNVERIFIED_REPORT'
  | 'OPEN'
  | 'ACKNOWLEDGED'
  | 'RESPONDER_ASSIGNED'
  | 'TEAM_DISPATCHED'
  | 'RESOLVED'
  | 'FALSE_ALARM'

export type LocationSource = 'LIVE_GPS' | 'LAST_KNOWN_GPS' | 'LAST_CHECKPOINT' | 'MANUAL' | 'UNAVAILABLE'

export interface EmergencyIncident {
  id: number
  incidentCode: string
  incidentType: IncidentType
  scope: EmergencyScope
  severity: EmergencySeverity
  status: EmergencyStatus
  pilgrimId?: number
  pilgrimName?: string
  pilgrimRegistrationNumber?: string
  pilgrimPhone?: string
  pilgrimEmergencyContact?: string
  pilgrimBloodGroup?: string
  pilgrimAge?: number
  pilgrimGender?: string
  routeId?: number
  routeName?: string
  routeCode?: string
  checkpointId?: number
  checkpointName?: string
  checkpointCode?: string
  latitude?: number
  longitude?: number
  locationAccuracy?: number
  locationSource: LocationSource
  title: string
  description?: string
  safetyInstruction?: string
  verified: boolean
  reportedAt: string
  acknowledgedAt?: string
  dispatchedAt?: string
  resolvedAt?: string
  reportedByUserName?: string
  reportedByUserEmail?: string
  assignedResponderName?: string
  responderNotes?: string
}

export interface PublicSafetyAlert {
  id: number
  incidentCode: string
  incidentType: IncidentType
  scope: EmergencyScope
  severity: EmergencySeverity
  status: EmergencyStatus
  routeId?: number
  routeName?: string
  routeCode?: string
  checkpointId?: number
  checkpointName?: string
  checkpointCode?: string
  title: string
  description?: string
  safetyInstruction?: string
  reportedAt: string
  updatedAt?: string
}

export interface CreatePersonalSosPayload {
  incidentType: IncidentType
  description?: string
  latitude?: number
  longitude?: number
  locationAccuracy?: number
  locationSource?: LocationSource
  checkpointId?: number
  routeId?: number
}

export interface ReportPublicHazardPayload {
  incidentType: IncidentType
  routeId: number
  checkpointId?: number
  title: string
  description?: string
  severity?: EmergencySeverity
  latitude?: number
  longitude?: number
}

export interface VerifyHazardPayload {
  status: EmergencyStatus
  severity: EmergencySeverity
  scope: EmergencyScope
  safetyInstruction: string
  responderNotes?: string
}

export interface UpdateIncidentStatusPayload {
  status: EmergencyStatus
  assignedResponderId?: number
  responderNotes?: string
  safetyInstruction?: string
}

export async function createPersonalSos(payload: CreatePersonalSosPayload): Promise<EmergencyIncident> {
  const res: any = await apiRequest<EmergencyIncident>('/api/emergency/sos', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return res && res.data !== undefined ? res.data : res
}

export async function reportPublicHazard(payload: ReportPublicHazardPayload): Promise<EmergencyIncident> {
  const res: any = await apiRequest<EmergencyIncident>('/api/emergency/hazard', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return res && res.data !== undefined ? res.data : res
}

export async function getMyActiveEmergency(): Promise<EmergencyIncident | null> {
  try {
    const res: any = await apiRequest<EmergencyIncident>('/api/emergency/my-active')
    return res && res.data !== undefined ? res.data : res
  } catch {
    return null
  }
}

export async function getPublicSafetyAlerts(params?: {
  routeId?: number
  checkpointId?: number
}): Promise<PublicSafetyAlert[]> {
  try {
    const query = new URLSearchParams()
    if (params?.routeId) query.set('routeId', params.routeId.toString())
    if (params?.checkpointId) query.set('checkpointId', params.checkpointId.toString())

    const url = query.toString() ? `/api/emergency/public-alerts?${query.toString()}` : '/api/emergency/public-alerts'
    const res: any = await apiRequest<PublicSafetyAlert[]>(url)
    if (Array.isArray(res)) return res
    if (Array.isArray(res?.data)) return res.data
    return []
  } catch {
    return []
  }
}

export async function getEmergencyIncidents(params?: {
  scope?: string
  status?: string
}): Promise<EmergencyIncident[]> {
  try {
    const query = new URLSearchParams()
    if (params?.scope) query.set('scope', params.scope)
    if (params?.status) query.set('status', params.status)

    const url = query.toString() ? `/api/emergency/incidents?${query.toString()}` : '/api/emergency/incidents'
    const res: any = await apiRequest<EmergencyIncident[]>(url)
    if (Array.isArray(res)) return res
    if (Array.isArray(res?.data)) return res.data
    return []
  } catch {
    return []
  }
}

export async function verifyHazardIncident(
  id: number,
  payload: VerifyHazardPayload
): Promise<EmergencyIncident> {
  const res: any = await apiRequest<EmergencyIncident>(`/api/emergency/incidents/${id}/verify`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  return res && res.data !== undefined ? res.data : res
}

export async function updateIncidentStatus(
  id: number,
  payload: UpdateIncidentStatusPayload
): Promise<EmergencyIncident> {
  const res: any = await apiRequest<EmergencyIncident>(`/api/emergency/incidents/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  return res && res.data !== undefined ? res.data : res
}






