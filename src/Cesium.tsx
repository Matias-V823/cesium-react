import { useEffect, useRef, useState } from "react"
import {
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

const CLOCK_DELAY_SECONDS = 2

function CesiumLive() {
  const [nodeKeys, setNodeKeys] = useState<string[]>([])
  const positionsRef = useRef<Record<string, SampledPositionProperty>>({})

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL, {
      transports: ["websocket"],
    })

    socket.on("NAHT", (payload) => {
      const data: any[] = payload.data
      const keys = new Set<string>()

      for (const node of data) {
        const id = node.MQ_DSC as string
        keys.add(id)

        if (!positionsRef.current[id]) {
          const prop = new SampledPositionProperty()
          prop.setInterpolationOptions({
            interpolationDegree: 1,
            interpolationAlgorithm: LinearApproximation,
          })
          prop.backwardExtrapolationType = ExtrapolationType.HOLD
          prop.forwardExtrapolationType = ExtrapolationType.HOLD
          positionsRef.current[id] = prop
        }

        const position = Cartesian3.fromDegrees(
          node.LNG,
          node.LAT,
          node.ALT ?? 0,
        )
        positionsRef.current[id].addSample(JulianDate.now(), position)
      }

      setNodeKeys((prev) => {
        const next = Array.from(keys)
        if (prev.length === next.length && prev.every((k, i) => k === next[i])) {
          return prev
        }
        return next
      })
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  const clockStart = JulianDate.addSeconds(
    JulianDate.now(),
    -CLOCK_DELAY_SECONDS,
    new JulianDate(),
  )

  return (
    <Viewer full shouldAnimate infoBox={false}>
      <Clock
        clockRange={ClockRange.UNBOUNDED}
        multiplier={1}
        currentTime={clockStart}
      />

      <CameraFlyTo
        destination={Cartesian3.fromDegrees(-70.286, -33.143, 8000)}
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


