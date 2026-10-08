import {
  HistoricalAnalyticsResponse,
  HistoricalTimeSeriesPoint,
  HistoricalAnalyticsSummary,
  CheckpointMetrics,
  BottleneckSignal,
  MlTrainingSequence,
} from './api-client'

export interface CrowdScenario {
  id: number
  title: string
  subtitle: string
  category: string
  isCommotion?: boolean
  commotionSeverity?: 'HIGH' | 'CRITICAL' | 'EXTREME'
  commotionMessage?: string
  evacuationAction?: string
  summary: HistoricalAnalyticsSummary
  timeSeries: HistoricalTimeSeriesPoint[]
  checkpoints: CheckpointMetrics[]
  bottleneck: BottleneckSignal | null
  mlDataset: MlTrainingSequence[]
}

// ============================================================================
// 8 NORMAL REALISTIC SCENARIOS (Crowd strictly calibrated between 5,000 - 6,000)
// Total Corridor Capacity benchmark = 8,000 Yatris
// ============================================================================
export const NORMAL_CROWD_SCENARIOS: CrowdScenario[] = [
  // 1. Early Morning Ingress Flow (05:00 - 08:00) - ~5,100
  {
    id: 1,
    title: 'Early Morning Ingress Wave (05:00 - 08:00)',
    subtitle: 'Baltal Base departures active, steady distributed movement across all 5 gates.',
    category: 'NORMAL FLOW',
    isCommotion: false,
    summary: {
      peakCrowd: 5240,
      peakOccupancyPercentage: 65.5,
      averageOccupancyPercentage: 58.2,
      averageInflow: 110,
      averageOutflow: 85,
      maximumNetInflow: 25,
      averageWalkingSpeedKmH: 3.1,
      averageTransitTimeMinutes: 46.0,
      minutesAboveWatchThreshold: 0,
      minutesAboveCriticalThreshold: 0,
      bottleneckDurationMinutes: 0,
      totalDataPointsEvaluated: 120,
    },
    timeSeries: [
      { timestamp: '05:30', timeLabel: '05:30', crowdCount: 4820, capacity: 8000, occupancyPercentage: 60.2, inflow: 95, outflow: 75, netFlow: 20, averageSpeedKmH: 3.3, averageTransitTimeMinutes: 42, inTransitCount: 920, operationalStatus: 'NORMAL', dataStatus: 'FRESH', isBottleneck: false },
      { timestamp: '06:00', timeLabel: '06:00', crowdCount: 4980, capacity: 8000, occupancyPercentage: 62.2, inflow: 105, outflow: 80, netFlow: 25, averageSpeedKmH: 3.2, averageTransitTimeMinutes: 44, inTransitCount: 980, operationalStatus: 'NORMAL', dataStatus: 'FRESH', isBottleneck: false },
      { timestamp: '06:30', timeLabel: '06:30', crowdCount: 5120, capacity: 8000, occupancyPercentage: 64.0, inflow: 115, outflow: 88, netFlow: 27, averageSpeedKmH: 3.1, averageTransitTimeMinutes: 45, inTransitCount: 1040, operationalStatus: 'NORMAL', dataStatus: 'FRESH', isBottleneck: false },
      { timestamp: '07:00', timeLabel: '07:00', crowdCount: 5240, capacity: 8000, occupancyPercentage: 65.5, inflow: 120, outflow: 95, netFlow: 25, averageSpeedKmH: 3.0, averageTransitTimeMinutes: 47, inTransitCount: 1090, operationalStatus: 'NORMAL', dataStatus: 'FRESH', isBottleneck: false },
      { timestamp: '07:30', timeLabel: '07:30', crowdCount: 5180, capacity: 8000, occupancyPercentage: 64.7, inflow: 110, outflow: 98, netFlow: 12, averageSpeedKmH: 3.1, averageTransitTimeMinutes: 46, inTransitCount: 1030, operationalStatus: 'NORMAL', dataStatus: 'FRESH', isBottleneck: false },
      { timestamp: '08:00', timeLabel: '08:00', crowdCount: 5090, capacity: 8000, occupancyPercentage: 63.6, inflow: 100, outflow: 102, netFlow: -2, averageSpeedKmH: 3.2, averageTransitTimeMinutes: 45, inTransitCount: 970, operationalStatus: 'NORMAL', dataStatus: 'FRESH', isBottleneck: false },
    ],
    checkpoints: [
      { checkpointId: 1, checkpointCode: 'CP-01', checkpointName: 'Baltal Base', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 1, distanceFromStartKm: 0, distanceFromPrevKm: 0, currentCrowd: 1350, capacity: 1800, occupancyPercentage: 75.0, inflow: 34, outflow: 26, netFlow: 8, averageSpeedKmH: 3.1, averageTransitTimeMinutes: 45, inTransitCount: 380, lastScanTimestamp: 'Just now', operationalStatus: 'WATCH', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 2, checkpointCode: 'CP-02', checkpointName: 'Domel Bridge', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 2, distanceFromStartKm: 2.8, distanceFromPrevKm: 2.8, currentCrowd: 1120, capacity: 1700, occupancyPercentage: 65.8, inflow: 26, outflow: 22, netFlow: 4, averageSpeedKmH: 3.2, averageTransitTimeMinutes: 42, inTransitCount: 260, lastScanTimestamp: 'Just now', operationalStatus: 'NORMAL', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 3, checkpointCode: 'CP-03', checkpointName: 'Sheshnag Camp', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 3, distanceFromStartKm: 6.2, distanceFromPrevKm: 3.4, currentCrowd: 1210, capacity: 2000, occupancyPercentage: 60.5, inflow: 20, outflow: 18, netFlow: 2, averageSpeedKmH: 3.0, averageTransitTimeMinutes: 48, inTransitCount: 220, lastScanTimestamp: '1m ago', operationalStatus: 'NORMAL', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 4, checkpointCode: 'CP-04', checkpointName: 'Panchtarni', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 4, distanceFromStartKm: 11.5, distanceFromPrevKm: 5.3, currentCrowd: 820, capacity: 1600, occupancyPercentage: 51.2, inflow: 14, outflow: 12, netFlow: 2, averageSpeedKmH: 3.3, averageTransitTimeMinutes: 40, inTransitCount: 110, lastScanTimestamp: '2m ago', operationalStatus: 'NORMAL', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 5, checkpointCode: 'CP-05', checkpointName: 'Holy Cave', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 5, distanceFromStartKm: 14.5, distanceFromPrevKm: 3.0, currentCrowd: 680, capacity: 1800, occupancyPercentage: 37.7, inflow: 10, outflow: 12, netFlow: -2, averageSpeedKmH: 2.9, averageTransitTimeMinutes: 48, inTransitCount: 60, lastScanTimestamp: 'Just now', operationalStatus: 'NORMAL', dataFreshnessStatus: 'FRESH' },
    ],
    bottleneck: null,
    mlDataset: [
      { timestamp: '2026-07-15T07:30:00Z', checkpointCode: 'CP-01', crowd_t_minus_4: 1050, crowd_t_minus_3: 1150, crowd_t_minus_2: 1240, crowd_t_minus_1: 1300, current_crowd: 1350, inflow: 34, outflow: 26, netFlow: 8, speed: 3.1, transitTimeMinutes: 45, occupancyPercentage: 75.0, capacity: 1800, timeOfDayHour: 7, dayOfWeek: 3, isWeekend: false },
      { timestamp: '2026-07-15T07:30:00Z', checkpointCode: 'CP-02', crowd_t_minus_4: 890, crowd_t_minus_3: 970, crowd_t_minus_2: 1040, crowd_t_minus_1: 1080, current_crowd: 1120, inflow: 26, outflow: 22, netFlow: 4, speed: 3.2, transitTimeMinutes: 42, occupancyPercentage: 65.8, capacity: 1700, timeOfDayHour: 7, dayOfWeek: 3, isWeekend: false },
    ],
  },

  // 2. Mid-Morning Bridge Transition (08:00 - 10:30) - ~5,450
  {
    id: 2,
    title: 'Mid-Morning Funnel & Domel Transition (08:00 - 10:30)',
    subtitle: 'Moderate wave traversing Domel Bridge crossing; speeds well within safety norms.',
    category: 'NORMAL FLOW',
    isCommotion: false,
    summary: {
      peakCrowd: 5580,
      peakOccupancyPercentage: 69.7,
      averageOccupancyPercentage: 63.4,
      averageInflow: 135,
      averageOutflow: 115,
      maximumNetInflow: 20,
      averageWalkingSpeedKmH: 2.7,
      averageTransitTimeMinutes: 52.0,
      minutesAboveWatchThreshold: 15,
      minutesAboveCriticalThreshold: 0,
      bottleneckDurationMinutes: 0,
      totalDataPointsEvaluated: 120,
    },
    timeSeries: [
      { timestamp: '08:00', timeLabel: '08:00', crowdCount: 5090, capacity: 8000, occupancyPercentage: 63.6, inflow: 115, outflow: 95, netFlow: 20, averageSpeedKmH: 3.0, averageTransitTimeMinutes: 48, inTransitCount: 980, operationalStatus: 'NORMAL', dataStatus: 'FRESH', isBottleneck: false },
      { timestamp: '08:30', timeLabel: '08:30', crowdCount: 5240, capacity: 8000, occupancyPercentage: 65.5, inflow: 125, outflow: 105, netFlow: 20, averageSpeedKmH: 2.8, averageTransitTimeMinutes: 50, inTransitCount: 1040, operationalStatus: 'NORMAL', dataStatus: 'FRESH', isBottleneck: false },
      { timestamp: '09:00', timeLabel: '09:00', crowdCount: 5420, capacity: 8000, occupancyPercentage: 67.7, inflow: 138, outflow: 112, netFlow: 26, averageSpeedKmH: 2.7, averageTransitTimeMinutes: 52, inTransitCount: 1120, operationalStatus: 'NORMAL', dataStatus: 'FRESH', isBottleneck: false },
      { timestamp: '09:30', timeLabel: '09:30', crowdCount: 5580, capacity: 8000, occupancyPercentage: 69.7, inflow: 142, outflow: 118, netFlow: 24, averageSpeedKmH: 2.6, averageTransitTimeMinutes: 54, inTransitCount: 1180, operationalStatus: 'WATCH', dataStatus: 'FRESH', isBottleneck: false },
      { timestamp: '10:00', timeLabel: '10:00', crowdCount: 5510, capacity: 8000, occupancyPercentage: 68.8, inflow: 130, outflow: 122, netFlow: 8, averageSpeedKmH: 2.7, averageTransitTimeMinutes: 53, inTransitCount: 1140, operationalStatus: 'NORMAL', dataStatus: 'FRESH', isBottleneck: false },
      { timestamp: '10:30', timeLabel: '10:30', crowdCount: 5390, capacity: 8000, occupancyPercentage: 67.3, inflow: 120, outflow: 124, netFlow: -4, averageSpeedKmH: 2.8, averageTransitTimeMinutes: 51, inTransitCount: 1080, operationalStatus: 'NORMAL', dataStatus: 'FRESH', isBottleneck: false },
    ],
    checkpoints: [
      { checkpointId: 1, checkpointCode: 'CP-01', checkpointName: 'Baltal Base', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 1, distanceFromStartKm: 0, distanceFromPrevKm: 0, currentCrowd: 1180, capacity: 1800, occupancyPercentage: 65.5, inflow: 28, outflow: 32, netFlow: -4, averageSpeedKmH: 2.9, averageTransitTimeMinutes: 47, inTransitCount: 310, lastScanTimestamp: 'Just now', operationalStatus: 'NORMAL', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 2, checkpointCode: 'CP-02', checkpointName: 'Domel Bridge', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 2, distanceFromStartKm: 2.8, distanceFromPrevKm: 2.8, currentCrowd: 1320, capacity: 1700, occupancyPercentage: 77.6, inflow: 36, outflow: 28, netFlow: 8, averageSpeedKmH: 2.4, averageTransitTimeMinutes: 56, inTransitCount: 350, lastScanTimestamp: 'Just now', operationalStatus: 'WATCH', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 3, checkpointCode: 'CP-03', checkpointName: 'Sheshnag Camp', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 3, distanceFromStartKm: 6.2, distanceFromPrevKm: 3.4, currentCrowd: 1390, capacity: 2000, occupancyPercentage: 69.5, inflow: 26, outflow: 22, netFlow: 4, averageSpeedKmH: 2.6, averageTransitTimeMinutes: 53, inTransitCount: 290, lastScanTimestamp: 'Just now', operationalStatus: 'NORMAL', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 4, checkpointCode: 'CP-04', checkpointName: 'Panchtarni', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 4, distanceFromStartKm: 11.5, distanceFromPrevKm: 5.3, currentCrowd: 980, capacity: 1600, occupancyPercentage: 61.2, inflow: 18, outflow: 16, netFlow: 2, averageSpeedKmH: 2.9, averageTransitTimeMinutes: 48, inTransitCount: 140, lastScanTimestamp: '1m ago', operationalStatus: 'NORMAL', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 5, checkpointCode: 'CP-05', checkpointName: 'Holy Cave', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 5, distanceFromStartKm: 14.5, distanceFromPrevKm: 3.0, currentCrowd: 710, capacity: 1800, occupancyPercentage: 39.4, inflow: 12, outflow: 14, netFlow: -2, averageSpeedKmH: 2.8, averageTransitTimeMinutes: 50, inTransitCount: 90, lastScanTimestamp: 'Just now', operationalStatus: 'NORMAL', dataFreshnessStatus: 'FRESH' },
    ],
    bottleneck: null,
    mlDataset: [
      { timestamp: '2026-07-15T10:00:00Z', checkpointCode: 'CP-02', crowd_t_minus_4: 1020, crowd_t_minus_3: 1140, crowd_t_minus_2: 1220, crowd_t_minus_1: 1280, current_crowd: 1320, inflow: 36, outflow: 28, netFlow: 8, speed: 2.4, transitTimeMinutes: 56, occupancyPercentage: 77.6, capacity: 1700, timeOfDayHour: 10, dayOfWeek: 3, isWeekend: false },
    ],
  },

  // 3. Regulated Midday Trek (10:30 - 13:00) - ~5,880
  {
    id: 3,
    title: 'Regulated Midday Operations (10:30 - 13:00)',
    subtitle: 'Peak daytime pilgrimage window, well-managed gate queues along Baltal trail.',
    category: 'NORMAL FLOW',
    isCommotion: false,
    summary: {
      peakCrowd: 5920,
      peakOccupancyPercentage: 74.0,
      averageOccupancyPercentage: 68.5,
      averageInflow: 155,
      averageOutflow: 140,
      maximumNetInflow: 18,
      averageWalkingSpeedKmH: 2.5,
      averageTransitTimeMinutes: 58.0,
      minutesAboveWatchThreshold: 45,
      minutesAboveCriticalThreshold: 0,
      bottleneckDurationMinutes: 10,
      totalDataPointsEvaluated: 120,
    },
    timeSeries: [
      { timestamp: '11:00', timeLabel: '11:00', crowdCount: 5480, capacity: 8000, occupancyPercentage: 68.5, inflow: 145, outflow: 128, netFlow: 17, averageSpeedKmH: 2.6, averageTransitTimeMinutes: 55, inTransitCount: 1160, operationalStatus: 'NORMAL', dataStatus: 'FRESH', isBottleneck: false },
      { timestamp: '11:30', timeLabel: '11:30', crowdCount: 5690, capacity: 8000, occupancyPercentage: 71.1, inflow: 155, outflow: 134, netFlow: 21, averageSpeedKmH: 2.5, averageTransitTimeMinutes: 57, inTransitCount: 1240, operationalStatus: 'WATCH', dataStatus: 'FRESH', isBottleneck: false },
      { timestamp: '12:00', timeLabel: '12:00', crowdCount: 5880, capacity: 8000, occupancyPercentage: 73.5, inflow: 160, outflow: 142, netFlow: 18, averageSpeedKmH: 2.4, averageTransitTimeMinutes: 59, inTransitCount: 1310, operationalStatus: 'WATCH', dataStatus: 'FRESH', isBottleneck: false },
      { timestamp: '12:30', timeLabel: '12:30', crowdCount: 5920, capacity: 8000, occupancyPercentage: 74.0, inflow: 152, outflow: 148, netFlow: 4, averageSpeedKmH: 2.5, averageTransitTimeMinutes: 58, inTransitCount: 1290, operationalStatus: 'WATCH', dataStatus: 'FRESH', isBottleneck: false },
      { timestamp: '13:00', timeLabel: '13:00', crowdCount: 5790, capacity: 8000, occupancyPercentage: 72.3, inflow: 142, outflow: 152, netFlow: -10, averageSpeedKmH: 2.6, averageTransitTimeMinutes: 56, inTransitCount: 1220, operationalStatus: 'WATCH', dataStatus: 'FRESH', isBottleneck: false },
    ],
    checkpoints: [
      { checkpointId: 1, checkpointCode: 'CP-01', checkpointName: 'Baltal Base', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 1, distanceFromStartKm: 0, distanceFromPrevKm: 0, currentCrowd: 1120, capacity: 1800, occupancyPercentage: 62.2, inflow: 26, outflow: 30, netFlow: -4, averageSpeedKmH: 2.8, averageTransitTimeMinutes: 48, inTransitCount: 290, lastScanTimestamp: 'Just now', operationalStatus: 'NORMAL', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 2, checkpointCode: 'CP-02', checkpointName: 'Domel Bridge', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 2, distanceFromStartKm: 2.8, distanceFromPrevKm: 2.8, currentCrowd: 1260, capacity: 1700, occupancyPercentage: 74.1, inflow: 32, outflow: 28, netFlow: 4, averageSpeedKmH: 2.5, averageTransitTimeMinutes: 54, inTransitCount: 320, lastScanTimestamp: 'Just now', operationalStatus: 'WATCH', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 3, checkpointCode: 'CP-03', checkpointName: 'Sheshnag Camp', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 3, distanceFromStartKm: 6.2, distanceFromPrevKm: 3.4, currentCrowd: 1540, capacity: 2000, occupancyPercentage: 77.0, inflow: 38, outflow: 30, netFlow: 8, averageSpeedKmH: 2.2, averageTransitTimeMinutes: 64, inTransitCount: 390, lastScanTimestamp: 'Just now', operationalStatus: 'WATCH', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 4, checkpointCode: 'CP-04', checkpointName: 'Panchtarni', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 4, distanceFromStartKm: 11.5, distanceFromPrevKm: 5.3, currentCrowd: 1180, capacity: 1600, occupancyPercentage: 73.7, inflow: 24, outflow: 20, netFlow: 4, averageSpeedKmH: 2.6, averageTransitTimeMinutes: 52, inTransitCount: 240, lastScanTimestamp: 'Just now', operationalStatus: 'WATCH', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 5, checkpointCode: 'CP-05', checkpointName: 'Holy Cave', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 5, distanceFromStartKm: 14.5, distanceFromPrevKm: 3.0, currentCrowd: 820, capacity: 1800, occupancyPercentage: 45.5, inflow: 16, outflow: 18, netFlow: -2, averageSpeedKmH: 2.7, averageTransitTimeMinutes: 50, inTransitCount: 110, lastScanTimestamp: 'Just now', operationalStatus: 'NORMAL', dataFreshnessStatus: 'FRESH' },
    ],
    bottleneck: null,
    mlDataset: [
      { timestamp: '2026-07-15T12:30:00Z', checkpointCode: 'CP-03', crowd_t_minus_4: 1280, crowd_t_minus_3: 1390, crowd_t_minus_2: 1460, crowd_t_minus_1: 1510, current_crowd: 1540, inflow: 38, outflow: 30, netFlow: 8, speed: 2.2, transitTimeMinutes: 64, occupancyPercentage: 77.0, capacity: 2000, timeOfDayHour: 12, dayOfWeek: 3, isWeekend: false },
    ],
  },

  // 4. Afternoon Darshan Batch (13:00 - 15:30) - ~5,620
  {
    id: 4,
    title: 'Afternoon Darshan Batch Influx (13:00 - 15:30)',
    subtitle: 'Crowd shift towards Holy Cave sanctum stairs; controlled batch releases.',
    category: 'NORMAL FLOW',
    isCommotion: false,
    summary: {
      peakCrowd: 5710,
      peakOccupancyPercentage: 71.4,
      averageOccupancyPercentage: 66.8,
      averageInflow: 130,
      averageOutflow: 142,
      maximumNetInflow: 12,
      averageWalkingSpeedKmH: 2.6,
      averageTransitTimeMinutes: 54.0,
      minutesAboveWatchThreshold: 30,
      minutesAboveCriticalThreshold: 0,
      bottleneckDurationMinutes: 0,
      totalDataPointsEvaluated: 120,
    },
    timeSeries: [
      { timestamp: '13:30', timeLabel: '13:30', crowdCount: 5710, capacity: 8000, occupancyPercentage: 71.4, inflow: 138, outflow: 132, netFlow: 6, averageSpeedKmH: 2.5, averageTransitTimeMinutes: 56, inTransitCount: 1220, operationalStatus: 'WATCH', dataStatus: 'FRESH', isBottleneck: false },
      { timestamp: '14:00', timeLabel: '14:00', crowdCount: 5640, capacity: 8000, occupancyPercentage: 70.5, inflow: 130, outflow: 144, netFlow: -14, averageSpeedKmH: 2.6, averageTransitTimeMinutes: 54, inTransitCount: 1180, operationalStatus: 'WATCH', dataStatus: 'FRESH', isBottleneck: false },
      { timestamp: '14:30', timeLabel: '14:30', crowdCount: 5520, capacity: 8000, occupancyPercentage: 69.0, inflow: 122, outflow: 146, netFlow: -24, averageSpeedKmH: 2.7, averageTransitTimeMinutes: 52, inTransitCount: 1120, operationalStatus: 'NORMAL', dataStatus: 'FRESH', isBottleneck: false },
      { timestamp: '15:00', timeLabel: '15:00', crowdCount: 5380, capacity: 8000, occupancyPercentage: 67.2, inflow: 115, outflow: 145, netFlow: -30, averageSpeedKmH: 2.8, averageTransitTimeMinutes: 50, inTransitCount: 1060, operationalStatus: 'NORMAL', dataStatus: 'FRESH', isBottleneck: false },
    ],
    checkpoints: [
      { checkpointId: 1, checkpointCode: 'CP-01', checkpointName: 'Baltal Base', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 1, distanceFromStartKm: 0, distanceFromPrevKm: 0, currentCrowd: 850, capacity: 1800, occupancyPercentage: 47.2, inflow: 16, outflow: 34, netFlow: -18, averageSpeedKmH: 3.1, averageTransitTimeMinutes: 44, inTransitCount: 190, lastScanTimestamp: 'Just now', operationalStatus: 'NORMAL', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 2, checkpointCode: 'CP-02', checkpointName: 'Domel Bridge', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 2, distanceFromStartKm: 2.8, distanceFromPrevKm: 2.8, currentCrowd: 1040, capacity: 1700, occupancyPercentage: 61.2, inflow: 22, outflow: 30, netFlow: -8, averageSpeedKmH: 2.8, averageTransitTimeMinutes: 49, inTransitCount: 240, lastScanTimestamp: 'Just now', operationalStatus: 'NORMAL', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 3, checkpointCode: 'CP-03', checkpointName: 'Sheshnag Camp', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 3, distanceFromStartKm: 6.2, distanceFromPrevKm: 3.4, currentCrowd: 1350, capacity: 2000, occupancyPercentage: 67.5, inflow: 28, outflow: 32, netFlow: -4, averageSpeedKmH: 2.6, averageTransitTimeMinutes: 55, inTransitCount: 310, lastScanTimestamp: 'Just now', operationalStatus: 'NORMAL', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 4, checkpointCode: 'CP-04', checkpointName: 'Panchtarni', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 4, distanceFromStartKm: 11.5, distanceFromPrevKm: 5.3, currentCrowd: 1220, capacity: 1600, occupancyPercentage: 76.2, inflow: 32, outflow: 26, netFlow: 6, averageSpeedKmH: 2.4, averageTransitTimeMinutes: 58, inTransitCount: 280, lastScanTimestamp: 'Just now', operationalStatus: 'WATCH', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 5, checkpointCode: 'CP-05', checkpointName: 'Holy Cave', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 5, distanceFromStartKm: 14.5, distanceFromPrevKm: 3.0, currentCrowd: 1160, capacity: 1800, occupancyPercentage: 64.4, inflow: 28, outflow: 24, netFlow: 4, averageSpeedKmH: 2.5, averageTransitTimeMinutes: 56, inTransitCount: 240, lastScanTimestamp: 'Just now', operationalStatus: 'NORMAL', dataFreshnessStatus: 'FRESH' },
    ],
    bottleneck: null,
    mlDataset: [
      { timestamp: '2026-07-15T14:30:00Z', checkpointCode: 'CP-04', crowd_t_minus_4: 1060, crowd_t_minus_3: 1120, crowd_t_minus_2: 1170, crowd_t_minus_1: 1200, current_crowd: 1220, inflow: 32, outflow: 26, netFlow: 6, speed: 2.4, transitTimeMinutes: 58, occupancyPercentage: 76.2, capacity: 1600, timeOfDayHour: 14, dayOfWeek: 3, isWeekend: false },
    ],
  },

  // 5. Inclement Mist & Slight Weather Drag (Simulated) - ~5,350
  {
    id: 5,
    title: 'High-Altitude Mist & Pace Advisory (Simulated)',
    subtitle: 'Light rain on pass trails; walking speed mildly slowed to 1.8 km/h, stable network.',
    category: 'WEATHER ADVISORY',
    isCommotion: false,
    summary: {
      peakCrowd: 5490,
      peakOccupancyPercentage: 68.6,
      averageOccupancyPercentage: 64.2,
      averageInflow: 85,
      averageOutflow: 78,
      maximumNetInflow: 10,
      averageWalkingSpeedKmH: 1.8,
      averageTransitTimeMinutes: 72.0,
      minutesAboveWatchThreshold: 20,
      minutesAboveCriticalThreshold: 0,
      bottleneckDurationMinutes: 0,
      totalDataPointsEvaluated: 120,
    },
    timeSeries: [
      { timestamp: '12:30', timeLabel: '12:30', crowdCount: 5490, capacity: 8000, occupancyPercentage: 68.6, inflow: 90, outflow: 80, netFlow: 10, averageSpeedKmH: 1.8, averageTransitTimeMinutes: 72, inTransitCount: 1120, operationalStatus: 'NORMAL', dataStatus: 'SIMULATED', isBottleneck: false },
      { timestamp: '13:00', timeLabel: '13:00', crowdCount: 5410, capacity: 8000, occupancyPercentage: 67.6, inflow: 82, outflow: 88, netFlow: -6, averageSpeedKmH: 1.8, averageTransitTimeMinutes: 73, inTransitCount: 1090, operationalStatus: 'NORMAL', dataStatus: 'SIMULATED', isBottleneck: false },
      { timestamp: '13:30', timeLabel: '13:30', crowdCount: 5350, capacity: 8000, occupancyPercentage: 66.9, inflow: 78, outflow: 84, netFlow: -6, averageSpeedKmH: 1.9, averageTransitTimeMinutes: 70, inTransitCount: 1060, operationalStatus: 'NORMAL', dataStatus: 'SIMULATED', isBottleneck: false },
    ],
    checkpoints: [
      { checkpointId: 1, checkpointCode: 'CP-01', checkpointName: 'Baltal Base', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 1, distanceFromStartKm: 0, distanceFromPrevKm: 0, currentCrowd: 1120, capacity: 1800, occupancyPercentage: 62.2, inflow: 16, outflow: 20, netFlow: -4, averageSpeedKmH: 2.2, averageTransitTimeMinutes: 60, inTransitCount: 230, lastScanTimestamp: 'Just now', operationalStatus: 'NORMAL', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 2, checkpointCode: 'CP-02', checkpointName: 'Domel Bridge', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 2, distanceFromStartKm: 2.8, distanceFromPrevKm: 2.8, currentCrowd: 1220, capacity: 1700, occupancyPercentage: 71.8, inflow: 20, outflow: 18, netFlow: 2, averageSpeedKmH: 1.9, averageTransitTimeMinutes: 68, inTransitCount: 260, lastScanTimestamp: 'Just now', operationalStatus: 'WATCH', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 3, checkpointCode: 'CP-03', checkpointName: 'Sheshnag Camp', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 3, distanceFromStartKm: 6.2, distanceFromPrevKm: 3.4, currentCrowd: 1450, capacity: 2000, occupancyPercentage: 72.5, inflow: 22, outflow: 20, netFlow: 2, averageSpeedKmH: 1.7, averageTransitTimeMinutes: 78, inTransitCount: 320, lastScanTimestamp: 'Just now', operationalStatus: 'WATCH', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 4, checkpointCode: 'CP-04', checkpointName: 'Panchtarni', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 4, distanceFromStartKm: 11.5, distanceFromPrevKm: 5.3, currentCrowd: 980, capacity: 1600, occupancyPercentage: 61.2, inflow: 18, outflow: 18, netFlow: 0, averageSpeedKmH: 1.8, averageTransitTimeMinutes: 72, inTransitCount: 190, lastScanTimestamp: 'Just now', operationalStatus: 'NORMAL', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 5, checkpointCode: 'CP-05', checkpointName: 'Holy Cave', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 5, distanceFromStartKm: 14.5, distanceFromPrevKm: 3.0, currentCrowd: 580, capacity: 1800, occupancyPercentage: 32.2, inflow: 10, outflow: 12, netFlow: -2, averageSpeedKmH: 1.9, averageTransitTimeMinutes: 70, inTransitCount: 80, lastScanTimestamp: 'Just now', operationalStatus: 'NORMAL', dataFreshnessStatus: 'FRESH' },
    ],
    bottleneck: null,
    mlDataset: [
      { timestamp: '2026-07-15T13:30:00Z', checkpointCode: 'CP-03', crowd_t_minus_4: 1390, crowd_t_minus_3: 1420, crowd_t_minus_2: 1440, crowd_t_minus_1: 1450, current_crowd: 1450, inflow: 22, outflow: 20, netFlow: 2, speed: 1.7, transitTimeMinutes: 78, occupancyPercentage: 72.5, capacity: 2000, timeOfDayHour: 13, dayOfWeek: 3, isWeekend: false },
    ],
  },

  // 6. Afternoon Downward Egress (15:30 - 18:00) - ~5,280
  {
    id: 6,
    title: 'Afternoon Downward Egress Flow (15:30 - 18:00)',
    subtitle: 'Returning Yatris descending towards base camps; fast downhill pace, negative net flow.',
    category: 'EGRESS FLOW',
    isCommotion: false,
    summary: {
      peakCrowd: 5410,
      peakOccupancyPercentage: 67.6,
      averageOccupancyPercentage: 58.4,
      averageInflow: 90,
      averageOutflow: 165,
      maximumNetInflow: -15,
      averageWalkingSpeedKmH: 3.4,
      averageTransitTimeMinutes: 42.0,
      minutesAboveWatchThreshold: 0,
      minutesAboveCriticalThreshold: 0,
      bottleneckDurationMinutes: 0,
      totalDataPointsEvaluated: 120,
    },
    timeSeries: [
      { timestamp: '15:30', timeLabel: '15:30', crowdCount: 5410, capacity: 8000, occupancyPercentage: 67.6, inflow: 95, outflow: 155, netFlow: -60, averageSpeedKmH: 3.2, averageTransitTimeMinutes: 44, inTransitCount: 1080, operationalStatus: 'NORMAL', dataStatus: 'FRESH', isBottleneck: false },
      { timestamp: '16:00', timeLabel: '16:00', crowdCount: 5240, capacity: 8000, occupancyPercentage: 65.5, inflow: 88, outflow: 168, netFlow: -80, averageSpeedKmH: 3.4, averageTransitTimeMinutes: 42, inTransitCount: 990, operationalStatus: 'NORMAL', dataStatus: 'FRESH', isBottleneck: false },
      { timestamp: '16:30', timeLabel: '16:30', crowdCount: 5080, capacity: 8000, occupancyPercentage: 63.5, inflow: 80, outflow: 172, netFlow: -92, averageSpeedKmH: 3.5, averageTransitTimeMinutes: 40, inTransitCount: 920, operationalStatus: 'NORMAL', dataStatus: 'FRESH', isBottleneck: false },
    ],
    checkpoints: [
      { checkpointId: 1, checkpointCode: 'CP-01', checkpointName: 'Baltal Base', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 1, distanceFromStartKm: 0, distanceFromPrevKm: 0, currentCrowd: 1380, capacity: 1800, occupancyPercentage: 76.7, inflow: 12, outflow: 48, netFlow: -36, averageSpeedKmH: 3.6, averageTransitTimeMinutes: 38, inTransitCount: 340, lastScanTimestamp: 'Just now', operationalStatus: 'WATCH', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 2, checkpointCode: 'CP-02', checkpointName: 'Domel Bridge', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 2, distanceFromStartKm: 2.8, distanceFromPrevKm: 2.8, currentCrowd: 1140, capacity: 1700, occupancyPercentage: 67.1, inflow: 16, outflow: 38, netFlow: -22, averageSpeedKmH: 3.5, averageTransitTimeMinutes: 40, inTransitCount: 260, lastScanTimestamp: 'Just now', operationalStatus: 'NORMAL', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 3, checkpointCode: 'CP-03', checkpointName: 'Sheshnag Camp', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 3, distanceFromStartKm: 6.2, distanceFromPrevKm: 3.4, currentCrowd: 1220, capacity: 2000, occupancyPercentage: 61.0, inflow: 18, outflow: 34, netFlow: -16, averageSpeedKmH: 3.3, averageTransitTimeMinutes: 44, inTransitCount: 280, lastScanTimestamp: 'Just now', operationalStatus: 'NORMAL', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 4, checkpointCode: 'CP-04', checkpointName: 'Panchtarni', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 4, distanceFromStartKm: 11.5, distanceFromPrevKm: 5.3, currentCrowd: 910, capacity: 1600, occupancyPercentage: 56.9, inflow: 14, outflow: 28, netFlow: -14, averageSpeedKmH: 3.4, averageTransitTimeMinutes: 42, inTransitCount: 180, lastScanTimestamp: 'Just now', operationalStatus: 'NORMAL', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 5, checkpointCode: 'CP-05', checkpointName: 'Holy Cave', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 5, distanceFromStartKm: 14.5, distanceFromPrevKm: 3.0, currentCrowd: 430, capacity: 1800, occupancyPercentage: 23.9, inflow: 8, outflow: 24, netFlow: -16, averageSpeedKmH: 3.5, averageTransitTimeMinutes: 40, inTransitCount: 60, lastScanTimestamp: 'Just now', operationalStatus: 'NORMAL', dataFreshnessStatus: 'FRESH' },
    ],
    bottleneck: null,
    mlDataset: [
      { timestamp: '2026-07-15T16:30:00Z', checkpointCode: 'CP-01', crowd_t_minus_4: 1540, crowd_t_minus_3: 1490, crowd_t_minus_2: 1440, crowd_t_minus_1: 1410, current_crowd: 1380, inflow: 12, outflow: 48, netFlow: -36, speed: 3.6, transitTimeMinutes: 38, occupancyPercentage: 76.7, capacity: 1800, timeOfDayHour: 16, dayOfWeek: 3, isWeekend: false },
    ],
  },

  // 7. Twilight Camp Consolidation (18:00 - 21:00) - ~5,650
  {
    id: 7,
    title: 'Twilight Camp Rest & Night Settlement (18:00 - 21:00)',
    subtitle: 'Zero base ingress; pilgrims settled peacefully at Sheshnag and Panchtarni night camps.',
    category: 'NIGHT HOLDING',
    isCommotion: false,
    summary: {
      peakCrowd: 5740,
      peakOccupancyPercentage: 71.8,
      averageOccupancyPercentage: 66.5,
      averageInflow: 25,
      averageOutflow: 35,
      maximumNetInflow: 5,
      averageWalkingSpeedKmH: 2.2,
      averageTransitTimeMinutes: 58.0,
      minutesAboveWatchThreshold: 25,
      minutesAboveCriticalThreshold: 0,
      bottleneckDurationMinutes: 0,
      totalDataPointsEvaluated: 120,
    },
    timeSeries: [
      { timestamp: '18:30', timeLabel: '18:30', crowdCount: 5740, capacity: 8000, occupancyPercentage: 71.8, inflow: 35, outflow: 45, netFlow: -10, averageSpeedKmH: 2.3, averageTransitTimeMinutes: 56, inTransitCount: 680, operationalStatus: 'WATCH', dataStatus: 'FRESH', isBottleneck: false },
      { timestamp: '19:00', timeLabel: '19:00', crowdCount: 5680, capacity: 8000, occupancyPercentage: 71.0, inflow: 25, outflow: 35, netFlow: -10, averageSpeedKmH: 2.2, averageTransitTimeMinutes: 58, inTransitCount: 520, operationalStatus: 'WATCH', dataStatus: 'FRESH', isBottleneck: false },
      { timestamp: '19:30', timeLabel: '19:30', crowdCount: 5620, capacity: 8000, occupancyPercentage: 70.3, inflow: 15, outflow: 25, netFlow: -10, averageSpeedKmH: 2.1, averageTransitTimeMinutes: 60, inTransitCount: 380, operationalStatus: 'NORMAL', dataStatus: 'FRESH', isBottleneck: false },
    ],
    checkpoints: [
      { checkpointId: 1, checkpointCode: 'CP-01', checkpointName: 'Baltal Base', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 1, distanceFromStartKm: 0, distanceFromPrevKm: 0, currentCrowd: 1390, capacity: 1800, occupancyPercentage: 77.2, inflow: 4, outflow: 10, netFlow: -6, averageSpeedKmH: 2.4, averageTransitTimeMinutes: 50, inTransitCount: 120, lastScanTimestamp: 'Just now', operationalStatus: 'WATCH', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 2, checkpointCode: 'CP-02', checkpointName: 'Domel Bridge', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 2, distanceFromStartKm: 2.8, distanceFromPrevKm: 2.8, currentCrowd: 820, capacity: 1700, occupancyPercentage: 48.2, inflow: 4, outflow: 8, netFlow: -4, averageSpeedKmH: 2.3, averageTransitTimeMinutes: 55, inTransitCount: 80, lastScanTimestamp: 'Just now', operationalStatus: 'NORMAL', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 3, checkpointCode: 'CP-03', checkpointName: 'Sheshnag Camp', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 3, distanceFromStartKm: 6.2, distanceFromPrevKm: 3.4, currentCrowd: 1610, capacity: 2000, occupancyPercentage: 80.5, inflow: 8, outflow: 4, netFlow: 4, averageSpeedKmH: 2.0, averageTransitTimeMinutes: 64, inTransitCount: 190, lastScanTimestamp: 'Just now', operationalStatus: 'WATCH', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 4, checkpointCode: 'CP-04', checkpointName: 'Panchtarni', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 4, distanceFromStartKm: 11.5, distanceFromPrevKm: 5.3, currentCrowd: 1340, capacity: 1600, occupancyPercentage: 83.8, inflow: 6, outflow: 4, netFlow: 2, averageSpeedKmH: 2.1, averageTransitTimeMinutes: 60, inTransitCount: 150, lastScanTimestamp: 'Just now', operationalStatus: 'WATCH', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 5, checkpointCode: 'CP-05', checkpointName: 'Holy Cave', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 5, distanceFromStartKm: 14.5, distanceFromPrevKm: 3.0, currentCrowd: 460, capacity: 1800, occupancyPercentage: 25.6, inflow: 0, outflow: 4, netFlow: -4, averageSpeedKmH: 2.5, averageTransitTimeMinutes: 48, inTransitCount: 40, lastScanTimestamp: 'Just now', operationalStatus: 'NORMAL', dataFreshnessStatus: 'FRESH' },
    ],
    bottleneck: null,
    mlDataset: [
      { timestamp: '2026-07-15T19:00:00Z', checkpointCode: 'CP-03', crowd_t_minus_4: 1560, crowd_t_minus_3: 1580, crowd_t_minus_2: 1590, crowd_t_minus_1: 1600, current_crowd: 1610, inflow: 8, outflow: 4, netFlow: 4, speed: 2.0, transitTimeMinutes: 64, occupancyPercentage: 80.5, capacity: 2000, timeOfDayHour: 19, dayOfWeek: 3, isWeekend: false },
    ],
  },

  // 8. Optimal Green Wave Equilibrium - ~5,300
  {
    id: 8,
    title: 'Optimal Green Wave Equilibrium (Regulated Flow)',
    subtitle: 'Golden standard operations; rate-metered gates, speed 2.9 km/h, zero choke points.',
    category: 'STABLE EQUILIBRIUM',
    isCommotion: false,
    summary: {
      peakCrowd: 5380,
      peakOccupancyPercentage: 67.3,
      averageOccupancyPercentage: 62.0,
      averageInflow: 120,
      averageOutflow: 118,
      maximumNetInflow: 8,
      averageWalkingSpeedKmH: 2.9,
      averageTransitTimeMinutes: 50.0,
      minutesAboveWatchThreshold: 0,
      minutesAboveCriticalThreshold: 0,
      bottleneckDurationMinutes: 0,
      totalDataPointsEvaluated: 120,
    },
    timeSeries: [
      { timestamp: '09:30', timeLabel: '09:30', crowdCount: 5190, capacity: 8000, occupancyPercentage: 64.9, inflow: 115, outflow: 110, netFlow: 5, averageSpeedKmH: 2.9, averageTransitTimeMinutes: 49, inTransitCount: 940, operationalStatus: 'NORMAL', dataStatus: 'FRESH', isBottleneck: false },
      { timestamp: '10:00', timeLabel: '10:00', crowdCount: 5280, capacity: 8000, occupancyPercentage: 66.0, inflow: 122, outflow: 115, netFlow: 7, averageSpeedKmH: 2.9, averageTransitTimeMinutes: 50, inTransitCount: 980, operationalStatus: 'NORMAL', dataStatus: 'FRESH', isBottleneck: false },
      { timestamp: '10:30', timeLabel: '10:30', crowdCount: 5380, capacity: 8000, occupancyPercentage: 67.3, inflow: 125, outflow: 122, netFlow: 3, averageSpeedKmH: 2.85, averageTransitTimeMinutes: 51, inTransitCount: 1010, operationalStatus: 'NORMAL', dataStatus: 'FRESH', isBottleneck: false },
      { timestamp: '11:00', timeLabel: '11:00', crowdCount: 5320, capacity: 8000, occupancyPercentage: 66.5, inflow: 118, outflow: 124, netFlow: -6, averageSpeedKmH: 2.9, averageTransitTimeMinutes: 50, inTransitCount: 970, operationalStatus: 'NORMAL', dataStatus: 'FRESH', isBottleneck: false },
    ],
    checkpoints: [
      { checkpointId: 1, checkpointCode: 'CP-01', checkpointName: 'Baltal Base', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 1, distanceFromStartKm: 0, distanceFromPrevKm: 0, currentCrowd: 1140, capacity: 1800, occupancyPercentage: 63.3, inflow: 26, outflow: 24, netFlow: 2, averageSpeedKmH: 2.9, averageTransitTimeMinutes: 48, inTransitCount: 280, lastScanTimestamp: 'Just now', operationalStatus: 'NORMAL', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 2, checkpointCode: 'CP-02', checkpointName: 'Domel Bridge', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 2, distanceFromStartKm: 2.8, distanceFromPrevKm: 2.8, currentCrowd: 1180, capacity: 1700, occupancyPercentage: 69.4, inflow: 28, outflow: 26, netFlow: 2, averageSpeedKmH: 2.8, averageTransitTimeMinutes: 52, inTransitCount: 290, lastScanTimestamp: 'Just now', operationalStatus: 'NORMAL', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 3, checkpointCode: 'CP-03', checkpointName: 'Sheshnag Camp', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 3, distanceFromStartKm: 6.2, distanceFromPrevKm: 3.4, currentCrowd: 1380, capacity: 2000, occupancyPercentage: 69.0, inflow: 30, outflow: 28, netFlow: 2, averageSpeedKmH: 2.8, averageTransitTimeMinutes: 54, inTransitCount: 330, lastScanTimestamp: 'Just now', operationalStatus: 'NORMAL', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 4, checkpointCode: 'CP-04', checkpointName: 'Panchtarni', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 4, distanceFromStartKm: 11.5, distanceFromPrevKm: 5.3, currentCrowd: 960, capacity: 1600, occupancyPercentage: 60.0, inflow: 22, outflow: 22, netFlow: 0, averageSpeedKmH: 2.9, averageTransitTimeMinutes: 50, inTransitCount: 210, lastScanTimestamp: 'Just now', operationalStatus: 'NORMAL', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 5, checkpointCode: 'CP-05', checkpointName: 'Holy Cave', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 5, distanceFromStartKm: 14.5, distanceFromPrevKm: 3.0, currentCrowd: 660, capacity: 1800, occupancyPercentage: 36.7, inflow: 14, outflow: 14, netFlow: 0, averageSpeedKmH: 2.9, averageTransitTimeMinutes: 50, inTransitCount: 100, lastScanTimestamp: 'Just now', operationalStatus: 'NORMAL', dataFreshnessStatus: 'FRESH' },
    ],
    bottleneck: null,
    mlDataset: [
      { timestamp: '2026-07-15T10:30:00Z', checkpointCode: 'CP-03', crowd_t_minus_4: 1320, crowd_t_minus_3: 1350, crowd_t_minus_2: 1370, crowd_t_minus_1: 1380, current_crowd: 1380, inflow: 30, outflow: 28, netFlow: 2, speed: 2.8, transitTimeMinutes: 54, occupancyPercentage: 69.0, capacity: 2000, timeOfDayHour: 10, dayOfWeek: 3, isWeekend: false },
    ],
  },
]

// ============================================================================
// 3 DUMMY COMMOTION / SURGE ANOMALIES (Absurd Crowd Readings: 10,000 - 14,000)
// Flash Warning Alert & Severe Chokepoints
// ============================================================================
export const COMMOTION_SCENARIOS: CrowdScenario[] = [
  // COMMOTION 1: Domel Bridge Chokepoint Panic & Barrier Breach (~11,850 Yatris)
  {
    id: 101,
    title: 'COMMOTION: Severe Chokepoint Surge & Barrier Overrun at Domel Bridge',
    subtitle: 'Flash surge at CP-02 narrow pass; unmetered batch accumulation, speed crashes to 0.4 km/h.',
    category: 'COMMOTION ANOMALY',
    isCommotion: true,
    commotionSeverity: 'HIGH',
    commotionMessage: 'CRITICAL OVER-CONCENTRATION AT CP-02 (DOMEL BRIDGE). DENSITY REACHED 148.1% OF SAFE CAPACITY. RAPID INGRESS HALT ENFORCED.',
    evacuationAction: 'ENGAGE TRAIL DIVERSION CORRIDOR & HALT BALTAL BASE DISPATCH IMMEDIATELY',
    summary: {
      peakCrowd: 11850,
      peakOccupancyPercentage: 148.1,
      averageOccupancyPercentage: 128.4,
      averageInflow: 340,
      averageOutflow: 92,
      maximumNetInflow: 82,
      averageWalkingSpeedKmH: 0.4,
      averageTransitTimeMinutes: 168.0,
      minutesAboveWatchThreshold: 180,
      minutesAboveCriticalThreshold: 120,
      bottleneckDurationMinutes: 95,
      totalDataPointsEvaluated: 120,
    },
    timeSeries: [
      { timestamp: '10:00', timeLabel: '10:00', crowdCount: 6800, capacity: 8000, occupancyPercentage: 85.0, inflow: 180, outflow: 110, netFlow: 70, averageSpeedKmH: 2.0, averageTransitTimeMinutes: 75, inTransitCount: 1600, operationalStatus: 'HIGH', dataStatus: 'FRESH', isBottleneck: true },
      { timestamp: '10:30', timeLabel: '10:30', crowdCount: 8900, capacity: 8000, occupancyPercentage: 111.3, inflow: 260, outflow: 98, netFlow: 162, averageSpeedKmH: 1.2, averageTransitTimeMinutes: 110, inTransitCount: 2300, operationalStatus: 'CRITICAL', dataStatus: 'FRESH', isBottleneck: true },
      { timestamp: '11:00', timeLabel: '11:00', crowdCount: 10750, capacity: 8000, occupancyPercentage: 134.4, inflow: 320, outflow: 90, netFlow: 230, averageSpeedKmH: 0.6, averageTransitTimeMinutes: 145, inTransitCount: 2950, operationalStatus: 'CRITICAL', dataStatus: 'FRESH', isBottleneck: true },
      { timestamp: '11:30', timeLabel: '11:30', crowdCount: 11850, capacity: 8000, occupancyPercentage: 148.1, inflow: 340, outflow: 92, netFlow: 248, averageSpeedKmH: 0.4, averageTransitTimeMinutes: 168, inTransitCount: 3400, operationalStatus: 'CRITICAL', dataStatus: 'FRESH', isBottleneck: true },
      { timestamp: '12:00', timeLabel: '12:00', crowdCount: 11400, capacity: 8000, occupancyPercentage: 142.5, inflow: 290, outflow: 105, netFlow: 185, averageSpeedKmH: 0.5, averageTransitTimeMinutes: 158, inTransitCount: 3100, operationalStatus: 'CRITICAL', dataStatus: 'FRESH', isBottleneck: true },
    ],
    checkpoints: [
      { checkpointId: 1, checkpointCode: 'CP-01', checkpointName: 'Baltal Base', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 1, distanceFromStartKm: 0, distanceFromPrevKm: 0, currentCrowd: 2850, capacity: 1800, occupancyPercentage: 158.3, inflow: 92, outflow: 24, netFlow: 68, averageSpeedKmH: 0.9, averageTransitTimeMinutes: 98, inTransitCount: 850, lastScanTimestamp: 'Just now', operationalStatus: 'CRITICAL', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 2, checkpointCode: 'CP-02', checkpointName: 'Domel Bridge', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 2, distanceFromStartKm: 2.8, distanceFromPrevKm: 2.8, currentCrowd: 3820, capacity: 1700, occupancyPercentage: 224.7, inflow: 112, outflow: 20, netFlow: 92, averageSpeedKmH: 0.4, averageTransitTimeMinutes: 195, inTransitCount: 1250, lastScanTimestamp: 'Just now', operationalStatus: 'CRITICAL', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 3, checkpointCode: 'CP-03', checkpointName: 'Sheshnag Camp', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 3, distanceFromStartKm: 6.2, distanceFromPrevKm: 3.4, currentCrowd: 2680, capacity: 2000, occupancyPercentage: 134.0, inflow: 42, outflow: 22, netFlow: 20, averageSpeedKmH: 0.8, averageTransitTimeMinutes: 130, inTransitCount: 680, lastScanTimestamp: 'Just now', operationalStatus: 'CRITICAL', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 4, checkpointCode: 'CP-04', checkpointName: 'Panchtarni', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 4, distanceFromStartKm: 11.5, distanceFromPrevKm: 5.3, currentCrowd: 1450, capacity: 1600, occupancyPercentage: 90.6, inflow: 24, outflow: 18, netFlow: 6, averageSpeedKmH: 1.5, averageTransitTimeMinutes: 88, inTransitCount: 380, lastScanTimestamp: 'Just now', operationalStatus: 'HIGH', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 5, checkpointCode: 'CP-05', checkpointName: 'Holy Cave', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 5, distanceFromStartKm: 14.5, distanceFromPrevKm: 3.0, currentCrowd: 1050, capacity: 1800, occupancyPercentage: 58.3, inflow: 16, outflow: 18, netFlow: -2, averageSpeedKmH: 2.2, averageTransitTimeMinutes: 62, inTransitCount: 240, lastScanTimestamp: 'Just now', operationalStatus: 'NORMAL', dataFreshnessStatus: 'FRESH' },
    ],
    bottleneck: {
      segmentCode: 'CP01-CP02',
      fromCheckpoint: 'CP-01 Baltal Base',
      toCheckpoint: 'CP-02 Domel Bridge',
      routeCode: 'BALTAL-NORTH',
      severity: 'CRITICAL',
      currentOccupancyPercentage: 224.7,
      netAccumulationRate: 92,
      observedSpeedKmH: 0.4,
      normalSpeedKmH: 3.0,
      speedDropPercentage: 86.7,
      transitTimeMinutes: 195,
      diagnosis: 'CATASTROPHIC ENTRY FUNNEL OVERFLOW. Flow exceeding capacity by +92 Yatris/min. Human crowd compression alert.',
      detectedAt: '11:28 AM',
    },
    mlDataset: [
      { timestamp: '2026-07-15T11:30:00Z', checkpointCode: 'CP-02', crowd_t_minus_4: 1750, crowd_t_minus_3: 2350, crowd_t_minus_2: 3050, crowd_t_minus_1: 3500, current_crowd: 3820, inflow: 112, outflow: 20, netFlow: 92, speed: 0.4, transitTimeMinutes: 195, occupancyPercentage: 224.7, capacity: 1700, timeOfDayHour: 11, dayOfWeek: 3, isWeekend: false },
    ],
  },

  // COMMOTION 2: Critical Stampede Risk at Sheshnag Ridge Incline (~13,420 Yatris)
  {
    id: 102,
    title: 'COMMOTION: Catastrophic Gridlock & Crushing Threat at Sheshnag Ridge',
    subtitle: 'Steep incline frozen by massive backlog; 13,420 yatris on trail, speed down to 0.25 km/h.',
    category: 'COMMOTION ANOMALY',
    isCommotion: true,
    commotionSeverity: 'CRITICAL',
    commotionMessage: 'STAMPEDE HAZARD DETECTED ON SHESHNAG ASCENT TRACK (CP-03). CAPACITY SATURATION: 167.8%. CRUSH PRESSURE EXPONENTIAL.',
    evacuationAction: 'SOUND AUDIBLE ALARM · DEPLOY DISPATCH RESCUE UNITS & ENGAGE EMERGENCY HOLDING ZONES',
    summary: {
      peakCrowd: 13420,
      peakOccupancyPercentage: 167.8,
      averageOccupancyPercentage: 145.2,
      averageInflow: 410,
      averageOutflow: 78,
      maximumNetInflow: 110,
      averageWalkingSpeedKmH: 0.25,
      averageTransitTimeMinutes: 215.0,
      minutesAboveWatchThreshold: 220,
      minutesAboveCriticalThreshold: 160,
      bottleneckDurationMinutes: 120,
      totalDataPointsEvaluated: 120,
    },
    timeSeries: [
      { timestamp: '11:00', timeLabel: '11:00', crowdCount: 8200, capacity: 8000, occupancyPercentage: 102.5, inflow: 250, outflow: 110, netFlow: 140, averageSpeedKmH: 1.4, averageTransitTimeMinutes: 105, inTransitCount: 2200, operationalStatus: 'CRITICAL', dataStatus: 'FRESH', isBottleneck: true },
      { timestamp: '11:30', timeLabel: '11:30', crowdCount: 10500, capacity: 8000, occupancyPercentage: 131.3, inflow: 340, outflow: 95, netFlow: 245, averageSpeedKmH: 0.8, averageTransitTimeMinutes: 140, inTransitCount: 2850, operationalStatus: 'CRITICAL', dataStatus: 'FRESH', isBottleneck: true },
      { timestamp: '12:00', timeLabel: '12:00', crowdCount: 12400, capacity: 8000, occupancyPercentage: 155.0, inflow: 390, outflow: 85, netFlow: 305, averageSpeedKmH: 0.4, averageTransitTimeMinutes: 180, inTransitCount: 3500, operationalStatus: 'CRITICAL', dataStatus: 'FRESH', isBottleneck: true },
      { timestamp: '12:30', timeLabel: '12:30', crowdCount: 13420, capacity: 8000, occupancyPercentage: 167.8, inflow: 410, outflow: 78, netFlow: 332, averageSpeedKmH: 0.25, averageTransitTimeMinutes: 215, inTransitCount: 4100, operationalStatus: 'CRITICAL', dataStatus: 'FRESH', isBottleneck: true },
      { timestamp: '13:00', timeLabel: '13:00', crowdCount: 13100, capacity: 8000, occupancyPercentage: 163.8, inflow: 360, outflow: 88, netFlow: 272, averageSpeedKmH: 0.3, averageTransitTimeMinutes: 200, inTransitCount: 3900, operationalStatus: 'CRITICAL', dataStatus: 'FRESH', isBottleneck: true },
    ],
    checkpoints: [
      { checkpointId: 1, checkpointCode: 'CP-01', checkpointName: 'Baltal Base', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 1, distanceFromStartKm: 0, distanceFromPrevKm: 0, currentCrowd: 3100, capacity: 1800, occupancyPercentage: 172.2, inflow: 98, outflow: 20, netFlow: 78, averageSpeedKmH: 0.6, averageTransitTimeMinutes: 120, inTransitCount: 950, lastScanTimestamp: 'Just now', operationalStatus: 'CRITICAL', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 2, checkpointCode: 'CP-02', checkpointName: 'Domel Bridge', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 2, distanceFromStartKm: 2.8, distanceFromPrevKm: 2.8, currentCrowd: 3450, capacity: 1700, occupancyPercentage: 202.9, inflow: 110, outflow: 18, netFlow: 92, averageSpeedKmH: 0.35, averageTransitTimeMinutes: 205, inTransitCount: 1150, lastScanTimestamp: 'Just now', operationalStatus: 'CRITICAL', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 3, checkpointCode: 'CP-03', checkpointName: 'Sheshnag Camp', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 3, distanceFromStartKm: 6.2, distanceFromPrevKm: 3.4, currentCrowd: 4320, capacity: 2000, occupancyPercentage: 216.0, inflow: 125, outflow: 15, netFlow: 110, averageSpeedKmH: 0.25, averageTransitTimeMinutes: 240, inTransitCount: 1450, lastScanTimestamp: 'Just now', operationalStatus: 'CRITICAL', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 4, checkpointCode: 'CP-04', checkpointName: 'Panchtarni', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 4, distanceFromStartKm: 11.5, distanceFromPrevKm: 5.3, currentCrowd: 1550, capacity: 1600, occupancyPercentage: 96.9, inflow: 28, outflow: 16, netFlow: 12, averageSpeedKmH: 1.2, averageTransitTimeMinutes: 110, inTransitCount: 380, lastScanTimestamp: 'Just now', operationalStatus: 'CRITICAL', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 5, checkpointCode: 'CP-05', checkpointName: 'Holy Cave', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 5, distanceFromStartKm: 14.5, distanceFromPrevKm: 3.0, currentCrowd: 1000, capacity: 1800, occupancyPercentage: 55.6, inflow: 14, outflow: 16, netFlow: -2, averageSpeedKmH: 2.0, averageTransitTimeMinutes: 70, inTransitCount: 170, lastScanTimestamp: 'Just now', operationalStatus: 'NORMAL', dataFreshnessStatus: 'FRESH' },
    ],
    bottleneck: {
      segmentCode: 'CP02-CP03',
      fromCheckpoint: 'CP-02 Domel Bridge',
      toCheckpoint: 'CP-03 Sheshnag Camp',
      routeCode: 'BALTAL-NORTH',
      severity: 'CRITICAL',
      currentOccupancyPercentage: 216.0,
      netAccumulationRate: 110,
      observedSpeedKmH: 0.25,
      normalSpeedKmH: 2.5,
      speedDropPercentage: 90.0,
      transitTimeMinutes: 240,
      diagnosis: 'ACUTE TRAIL OVERCROWDING & IMMINENT CRUSH EVENT. Walking velocity collapsed to 0.25 km/h. Accumulation +110 Yatris/min.',
      detectedAt: '12:32 PM',
    },
    mlDataset: [
      { timestamp: '2026-07-15T12:30:00Z', checkpointCode: 'CP-03', crowd_t_minus_4: 2100, crowd_t_minus_3: 2850, crowd_t_minus_2: 3600, crowd_t_minus_1: 4050, current_crowd: 4320, inflow: 125, outflow: 15, netFlow: 110, speed: 0.25, transitTimeMinutes: 240, occupancyPercentage: 216.0, capacity: 2000, timeOfDayHour: 12, dayOfWeek: 3, isWeekend: false },
    ],
  },

  // COMMOTION 3: Extreme Sanctum Stampede & Darshan Barrier Crush (~14,250 Yatris)
  {
    id: 103,
    title: 'COMMOTION: Extreme Sanctum Stampede & Darshan Barrier Crush at Holy Cave',
    subtitle: '14,250 Yatris surging into Holy Cave stairs; extreme safety threat, physical gridlock.',
    category: 'COMMOTION ANOMALY',
    isCommotion: true,
    commotionSeverity: 'EXTREME',
    commotionMessage: 'EXTREME EMERGENCE: HOLY CAVE STAIRS & SANCTUM CRUSH THREAT. OCCUPANCY AT 178.1%. PROTOCOL RED ACTIVE.',
    evacuationAction: 'ACTIVATE MILITARY ESCORT REVERSE-FLOW CORRIDOR & IMMEDIATE DISPERSION PROTOCOLS',
    summary: {
      peakCrowd: 14250,
      peakOccupancyPercentage: 178.1,
      averageOccupancyPercentage: 156.4,
      averageInflow: 460,
      averageOutflow: 65,
      maximumNetInflow: 125,
      averageWalkingSpeedKmH: 0.2,
      averageTransitTimeMinutes: 240.0,
      minutesAboveWatchThreshold: 240,
      minutesAboveCriticalThreshold: 180,
      bottleneckDurationMinutes: 135,
      totalDataPointsEvaluated: 120,
    },
    timeSeries: [
      { timestamp: '12:30', timeLabel: '12:30', crowdCount: 9500, capacity: 8000, occupancyPercentage: 118.8, inflow: 290, outflow: 95, netFlow: 195, averageSpeedKmH: 1.1, averageTransitTimeMinutes: 125, inTransitCount: 2600, operationalStatus: 'CRITICAL', dataStatus: 'FRESH', isBottleneck: true },
      { timestamp: '13:00', timeLabel: '13:00', crowdCount: 11800, capacity: 8000, occupancyPercentage: 147.5, inflow: 370, outflow: 80, netFlow: 290, averageSpeedKmH: 0.6, averageTransitTimeMinutes: 165, inTransitCount: 3400, operationalStatus: 'CRITICAL', dataStatus: 'FRESH', isBottleneck: true },
      { timestamp: '13:30', timeLabel: '13:30', crowdCount: 13400, capacity: 8000, occupancyPercentage: 167.5, inflow: 430, outflow: 70, netFlow: 360, averageSpeedKmH: 0.3, averageTransitTimeMinutes: 210, inTransitCount: 4200, operationalStatus: 'CRITICAL', dataStatus: 'FRESH', isBottleneck: true },
      { timestamp: '14:00', timeLabel: '14:00', crowdCount: 14250, capacity: 8000, occupancyPercentage: 178.1, inflow: 460, outflow: 65, netFlow: 395, averageSpeedKmH: 0.2, averageTransitTimeMinutes: 240, inTransitCount: 4800, operationalStatus: 'CRITICAL', dataStatus: 'FRESH', isBottleneck: true },
      { timestamp: '14:30', timeLabel: '14:30', crowdCount: 13800, capacity: 8000, occupancyPercentage: 172.5, inflow: 390, outflow: 75, netFlow: 315, averageSpeedKmH: 0.25, averageTransitTimeMinutes: 230, inTransitCount: 4500, operationalStatus: 'CRITICAL', dataStatus: 'FRESH', isBottleneck: true },
    ],
    checkpoints: [
      { checkpointId: 1, checkpointCode: 'CP-01', checkpointName: 'Baltal Base', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 1, distanceFromStartKm: 0, distanceFromPrevKm: 0, currentCrowd: 2900, capacity: 1800, occupancyPercentage: 161.1, inflow: 88, outflow: 16, netFlow: 72, averageSpeedKmH: 0.7, averageTransitTimeMinutes: 110, inTransitCount: 880, lastScanTimestamp: 'Just now', operationalStatus: 'CRITICAL', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 2, checkpointCode: 'CP-02', checkpointName: 'Domel Bridge', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 2, distanceFromStartKm: 2.8, distanceFromPrevKm: 2.8, currentCrowd: 3200, capacity: 1700, occupancyPercentage: 188.2, inflow: 96, outflow: 14, netFlow: 82, averageSpeedKmH: 0.5, averageTransitTimeMinutes: 160, inTransitCount: 1050, lastScanTimestamp: 'Just now', operationalStatus: 'CRITICAL', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 3, checkpointCode: 'CP-03', checkpointName: 'Sheshnag Camp', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 3, distanceFromStartKm: 6.2, distanceFromPrevKm: 3.4, currentCrowd: 3650, capacity: 2000, occupancyPercentage: 182.5, inflow: 110, outflow: 16, netFlow: 94, averageSpeedKmH: 0.4, averageTransitTimeMinutes: 195, inTransitCount: 1200, lastScanTimestamp: 'Just now', operationalStatus: 'CRITICAL', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 4, checkpointCode: 'CP-04', checkpointName: 'Panchtarni', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 4, distanceFromStartKm: 11.5, distanceFromPrevKm: 5.3, currentCrowd: 2150, capacity: 1600, occupancyPercentage: 134.4, inflow: 68, outflow: 14, netFlow: 54, averageSpeedKmH: 0.6, averageTransitTimeMinutes: 150, inTransitCount: 650, lastScanTimestamp: 'Just now', operationalStatus: 'CRITICAL', dataFreshnessStatus: 'FRESH' },
      { checkpointId: 5, checkpointCode: 'CP-05', checkpointName: 'Holy Cave', routeId: 1, routeCode: 'BALTAL-NORTH', routeName: 'Baltal Route', sequenceOrder: 5, distanceFromStartKm: 14.5, distanceFromPrevKm: 3.0, currentCrowd: 4350, capacity: 1800, occupancyPercentage: 241.7, inflow: 140, outflow: 15, netFlow: 125, averageSpeedKmH: 0.2, averageTransitTimeMinutes: 260, inTransitCount: 1800, lastScanTimestamp: 'Just now', operationalStatus: 'CRITICAL', dataFreshnessStatus: 'FRESH' },
    ],
    bottleneck: {
      segmentCode: 'CP04-CP05',
      fromCheckpoint: 'CP-04 Panchtarni Camp',
      toCheckpoint: 'CP-05 Holy Cave Sanctum',
      routeCode: 'BALTAL-NORTH',
      severity: 'CRITICAL',
      currentOccupancyPercentage: 241.7,
      netAccumulationRate: 125,
      observedSpeedKmH: 0.2,
      normalSpeedKmH: 2.5,
      speedDropPercentage: 92.0,
      transitTimeMinutes: 260,
      diagnosis: 'CRITICAL MASS CRUSH EVENT AT HOLY CAVE STAIRS. Inflow +125/min, pedestrian movement frozen at 0.2 km/h. Urgent intervention required.',
      detectedAt: '02:04 PM',
    },
    mlDataset: [
      { timestamp: '2026-07-15T14:00:00Z', checkpointCode: 'CP-05', crowd_t_minus_4: 1950, crowd_t_minus_3: 2750, crowd_t_minus_2: 3600, crowd_t_minus_1: 4100, current_crowd: 4350, inflow: 140, outflow: 15, netFlow: 125, speed: 0.2, transitTimeMinutes: 260, occupancyPercentage: 241.7, capacity: 1800, timeOfDayHour: 14, dayOfWeek: 3, isWeekend: false },
    ],
  },
]

// All scenarios indexed
export const ALL_CROWD_SCENARIOS: CrowdScenario[] = [
  ...NORMAL_CROWD_SCENARIOS,
  ...COMMOTION_SCENARIOS,
]
