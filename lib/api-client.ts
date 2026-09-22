const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

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

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  const json = await response.json()

  if (!response.ok) {
    const error: ApiError = {
      timestamp: json.timestamp || new Date().toISOString(),
      status: response.status,
      error: json.error || response.statusText,
      message: json.message || 'An unexpected error occurred',
      fieldErrors: json.fieldErrors,
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
  const res = await apiRequest<HistoricalAnalyticsResponse>(`/api/analytics/crowd${queryString}`)
  return res.data
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
  const res = await apiRequest<HistoricalAnalyticsResponse>(`/api/analytics/checkpoints/${checkpointId}${queryString}`)
  return res.data
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
  const res = await apiRequest<MlTrainingSequence[]>(`/api/analytics/ml-dataset${queryString}`)
  return res.data
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
  const res = await apiRequest<LivePredictionsResponse>('/api/predictions/live')
  return res.data
}

export async function getCheckpointPrediction(checkpointId: number): Promise<CheckpointPrediction> {
  const res = await apiRequest<CheckpointPrediction>(`/api/predictions/checkpoints/${checkpointId}`)
  return res.data
}

export async function getRoutePredictions(routeId: number): Promise<CheckpointPrediction[]> {
  const res = await apiRequest<CheckpointPrediction[]>(`/api/predictions/route/${routeId}`)
  return res.data
}



