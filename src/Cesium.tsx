import { useEffect, useRef, useState, useMemo } from "react"
import {
  Cartesian2,
  Cartesian3,
  ClockRange,
  ExtrapolationType,
  HeightReference,
  JulianDate,
  LinearApproximation,
  SampledPositionProperty,
} from "cesium"
import { Viewer, Entity, Clock, CameraFlyTo } from "resium"
import { io } from "socket.io-client"

function CesiumLive() {
  const [nodeKeys, setNodeKeys] = useState<string[]>([])
  const positionsRef = useRef<Record<string, SampledPositionProperty>>({})
  const knownIdsRef = useRef<Set<string>>(new Set())
  const firstTimestampRef = useRef<number | null>(null)
  
  const startTime = useMemo(() => JulianDate.now(), [])

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL, {
      transports: ["websocket"],
    })

    socket.on("NAHT", (payload) => {
      const data: any[] = payload.data

      for (const node of data) {
        const id = node.MQ_DSC as string
        // Parsear "2026-03-11 14:41:15" → milisegundos epoch
        const timestamp = new Date(node.TIMESTAMP.replace(" ", "T")).getTime()

        // Guardar el primer timestamp como referencia
        if (firstTimestampRef.current === null) {
          firstTimestampRef.current = timestamp
        }

        // Calcular el offset en segundos respecto al primer timestamp
        const offsetSeconds = (timestamp - firstTimestampRef.current) / 1000

        // Mapear al timeline de Cesium: startTime + offset
        const sampleTime = JulianDate.addSeconds(startTime, offsetSeconds, new JulianDate())

        if (!positionsRef.current[id]) {
          const prop = new SampledPositionProperty()
          prop.setInterpolationOptions({
            interpolationDegree: 1,
            interpolationAlgorithm: LinearApproximation,
          })
          prop.forwardExtrapolationType = ExtrapolationType.HOLD
          prop.backwardExtrapolationType = ExtrapolationType.HOLD
          positionsRef.current[id] = prop
        }

        const position = Cartesian3.fromDegrees(node.LNG, node.LAT, 0)
        positionsRef.current[id].addSample(sampleTime, position)
      }

      const newIds = data.map((n: any) => n.MQ_DSC as string).filter((id: string) => !knownIdsRef.current.has(id))
      if (newIds.length > 0) {
        newIds.forEach((id: string) => knownIdsRef.current.add(id))
        setNodeKeys(Array.from(knownIdsRef.current))
      }
    })

    return () => { socket.disconnect() }
  }, [])

  return (
    <Viewer full shouldAnimate>
      <Clock
        startTime={startTime}
        currentTime={startTime} 
        clockRange={ClockRange.UNBOUNDED}
        multiplier={1}
      />

      {/* <CameraFlyTo destination={Cartesian3.fromDegrees(-70.286, -33.143, 8000)} /> */}

      {nodeKeys.map((id) => (
        <Entity
          key={id}
          position={positionsRef.current[id]}
          name={id}
          billboard={{
            image: "/green.png",
            width: 60,
            height: 42,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          }}
          label={{
            show: true,
            text: id,
            font: "bold 14px sans-serif",
            pixelOffset: new Cartesian2(0, -25),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          }}
        />
      ))}
    </Viewer>
  )
}

export default CesiumLive


