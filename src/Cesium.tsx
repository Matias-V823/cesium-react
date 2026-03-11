import { useEffect, useRef, useState, useCallback } from "react"
import {
  Cartesian3,
  ClockRange,
  ExtrapolationType,
  HeightReference,
  JulianDate,
  LinearApproximation,
  SampledPositionProperty,
} from "cesium"
import type { Viewer as CesiumViewer } from "cesium"
import { Viewer, Entity, Clock } from "resium"
import type { CesiumComponentRef } from "resium"
import { io } from "socket.io-client"

interface FleetEvent {
  interval: number
  equipos: any[]
  receivedAt: number
}

function CesiumLive() {
  const viewerRef = useRef<CesiumComponentRef<CesiumViewer>>(null)
  const [nodeKeys, setNodeKeys] = useState<string[]>([])
  const [lastFleetEvent, setLastFleetEvent] = useState<FleetEvent | null>(null)
  const positionsRef = useRef<Record<string, SampledPositionProperty>>({})

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL, {
      transports: ["websocket"],
    })

    socket.on("NAHT", (payload) => {
      setLastFleetEvent({
        interval: payload?.interval,
        equipos: payload.data,
        receivedAt: Date.now(),
      })
    })

    return () => {
      socket.disconnect()
    }
  }, [])


  const actualizarMapa = useCallback(
    (interval: number, equipos: any[]) => {
      if (!viewerRef.current?.cesiumElement?.clock) return
      const intervalSeconds = interval / 1000

      const now = viewerRef.current.cesiumElement.clock.currentTime
      const nextTime = JulianDate.addSeconds(now, intervalSeconds, new JulianDate())

      const keys = new Set<string>()

      for (const node of equipos) {
        const id = node.MQ_DSC as string
        keys.add(id)

        const lng = Number.parseFloat(node.LNG)
        const lat = Number.parseFloat(node.LAT)

        if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
          console.warn("Coordenadas inválidas, se ignora equipo:", node)
          continue
        }

        const newPos = Cartesian3.fromDegrees(lng, lat, node.ALT ?? 0)

        let prop = positionsRef.current[id]
        if (!prop) {
          prop = new SampledPositionProperty()
          prop.setInterpolationOptions({
            interpolationDegree: 1,
            interpolationAlgorithm: LinearApproximation,
          })
          prop.backwardExtrapolationType = ExtrapolationType.HOLD
          prop.forwardExtrapolationType = ExtrapolationType.HOLD
          prop.addSample(now, newPos)
          positionsRef.current[id] = prop
        }

        prop.addSample(nextTime, newPos)
      }

      setNodeKeys((prev) => {
        const next = Array.from(keys)
        if (prev.length === next.length && prev.every((k, i) => k === next[i])) {
          return prev
        }
        return next
      })
    },
    [],
  )

  useEffect(() => {
    if (!lastFleetEvent || !Array.isArray(lastFleetEvent.equipos)) return
    const intervalMs = Number(lastFleetEvent.interval)
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) return
    actualizarMapa(intervalMs, lastFleetEvent.equipos)
  }, [lastFleetEvent, actualizarMapa])

  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement
    if (!viewer) return
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(-70.286, -33.143, 8000),
    })
  }, [])

  console.log(positionsRef.current)

  return (
    <Viewer ref={viewerRef} full shouldAnimate infoBox={false}>
      <Clock
        clockRange={ClockRange.UNBOUNDED}
        multiplier={1}
      />

      {nodeKeys.map((id) => (
        <Entity
          key={id}
          position={positionsRef.current[id]}
          name={id}
          billboard={{
            image: "/green.png",
            width: 60,
            height: 42,
            heightReference: HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          }}
          label={{
            show: true,
            text: id,
            font: "bold 14px sans-serif",
            pixelOffset: new Cartesian3(0, -25),
            heightReference: HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          }}
        />
      ))}
    </Viewer>
  )
}

export default CesiumLive
