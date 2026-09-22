'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Client, IMessage } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { LiveCrowdResponse, CheckpointMetrics, BottleneckSignal, getLiveCrowd } from './api-client'

export type ConnectionStatus = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'RECONNECTING'

export interface RealTimeEvent<T = any> {
  eventType: 'SCAN_RECEIVED' | 'CROWD_UPDATED' | 'CHECKPOINT_STATUS_CHANGED' | 'BOTTLENECK_DETECTED' | 'DATA_STALE' | 'EMERGENCY_CREATED'
  timestamp: string
  topic: string
  dataFreshness: 'FRESH' | 'DELAYED' | 'STALE' | 'SIMULATED'
  payload: T
  message?: string
}

export interface LiveScanNotice {
  qrId: string
  pilgrimName: string
  pilgrimCode: string
  checkpointName: string
  checkpointCode: string
  validationStatus: string
  scanTimestamp: string
}

const WS_BACKEND_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8080/ws-yatra'

export function useRealTimeCrowd() {
  const [liveData, setLiveData] = useState<LiveCrowdResponse | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('CONNECTING')
  const [lastEventTime, setLastEventTime] = useState<Date | null>(null)
  const [lastScanNotice, setLastScanNotice] = useState<LiveScanNotice | null>(null)
  const [dataFreshness, setDataFreshness] = useState<'LIVE' | 'STALE' | 'ESTIMATED' | 'SIMULATED'>('LIVE')

  const stompClientRef = useRef<Client | null>(null)
  const isMountedRef = useRef(true)

  const fetchInitialData = useCallback(async () => {
    try {
      const data = await getLiveCrowd()
      if (isMountedRef.current) {
        setLiveData(data)
        setLastEventTime(new Date())
        setDataFreshness('LIVE')
      }
    } catch (err) {
      console.warn('Fallback HTTP fetch error:', err)
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    fetchInitialData()

    // Setup STOMP WebSocket Client
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_BACKEND_URL),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: (str) => {
        // Only log in dev if needed
        // console.debug('[STOMP]', str)
      },
      onConnect: () => {
        if (!isMountedRef.current) return
        setConnectionStatus('CONNECTED')
        setDataFreshness('LIVE')

        // 1. Subscribe to Global operational snapshot
        client.subscribe('/topic/global', (message: IMessage) => {
          try {
            const event: RealTimeEvent<LiveCrowdResponse> = JSON.parse(message.body)
            if (isMountedRef.current && event.payload) {
              setLiveData(event.payload)
              setLastEventTime(new Date(event.timestamp || Date.now()))
              setDataFreshness(event.dataFreshness === 'STALE' ? 'STALE' : 'LIVE')
            }
          } catch (e) {
            console.error('Error parsing /topic/global event:', e)
          }
        })

        // 2. Subscribe to Checkpoints list updates
        client.subscribe('/topic/checkpoints', (message: IMessage) => {
          try {
            const event: RealTimeEvent<CheckpointMetrics[]> = JSON.parse(message.body)
            if (isMountedRef.current && event.payload) {
              setLiveData((prev) => {
                if (!prev) return null
                return {
                  ...prev,
                  checkpoints: event.payload,
                }
              })
              setLastEventTime(new Date(event.timestamp || Date.now()))
            }
          } catch (e) {
            console.error('Error parsing /topic/checkpoints event:', e)
          }
        })

        // 3. Subscribe to Bottleneck & Incident Alerts
        client.subscribe('/topic/alerts', (message: IMessage) => {
          try {
            const event: RealTimeEvent<BottleneckSignal> = JSON.parse(message.body)
            if (isMountedRef.current && event.payload) {
              setLiveData((prev) => {
                if (!prev) return null
                const existing = prev.bottlenecks || []
                const filtered = existing.filter(b => b.segmentCode !== event.payload.segmentCode)
                return {
                  ...prev,
                  bottlenecks: [event.payload, ...filtered],
                  activeAlertsCount: filtered.length + 1,
                }
              })
              setLastEventTime(new Date(event.timestamp || Date.now()))
            }
          } catch (e) {
            console.error('Error parsing /topic/alerts event:', e)
          }
        })

        // 4. Subscribe to Live Scan Notice stream
        client.subscribe('/topic/scans', (message: IMessage) => {
          try {
            const event: RealTimeEvent<any> = JSON.parse(message.body)
            if (isMountedRef.current && event.payload) {
              setLastScanNotice({
                qrId: event.payload.qrId,
                pilgrimName: event.payload.pilgrimName,
                pilgrimCode: event.payload.pilgrimCode,
                checkpointName: event.payload.checkpointName,
                checkpointCode: event.payload.checkpointCode,
                validationStatus: event.payload.validationStatus,
                scanTimestamp: event.payload.scanTimestamp,
              })
              setLastEventTime(new Date(event.timestamp || Date.now()))
            }
          } catch (e) {
            console.error('Error parsing /topic/scans event:', e)
          }
        })
      },
      onDisconnect: () => {
        if (isMountedRef.current) {
          setConnectionStatus('DISCONNECTED')
        }
      },
      onStompError: (frame) => {
        console.warn('STOMP protocol error:', frame.headers['message'])
        if (isMountedRef.current) {
          setConnectionStatus('DISCONNECTED')
        }
      },
      onWebSocketClose: () => {
        if (isMountedRef.current) {
          setConnectionStatus('RECONNECTING')
        }
      },
    })

    client.activate()
    stompClientRef.current = client

    // Resilient Fallback Polling (polls every 10s if WebSocket disconnected or to ensure sync)
    const interval = setInterval(() => {
      if (stompClientRef.current && !stompClientRef.current.connected) {
        fetchInitialData()
      }
    }, 10000)

    return () => {
      isMountedRef.current = false
      clearInterval(interval)
      if (stompClientRef.current) {
        stompClientRef.current.deactivate()
      }
    }
  }, [fetchInitialData])

  return {
    liveData,
    connectionStatus,
    lastEventTime,
    lastScanNotice,
    dataFreshness,
    refresh: fetchInitialData,
  }
}
