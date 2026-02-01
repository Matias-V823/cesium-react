import { useEffect, useRef } from "react"
import { Cartesian3, JulianDate, SampledPositionProperty, ClockRange } from "cesium"
import { Viewer, Entity, Clock, CameraFlyTo } from "resium"
import { EntityDescription } from "resium"
import InfoPanel from "./components/InfoPanel"



function CesiumLive() {
  const positionRef = useRef(new SampledPositionProperty())

  useEffect(() => {
    const ws = new WebSocket(import.meta.env.VITE_WS_URL)
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      const time = JulianDate.now()
      const pos = Cartesian3.fromDegrees(
        data.lon,
        data.lat,
        data.alt ?? 0
      )
      positionRef.current.addSample(time, pos)
    }
    return () => ws.close()
  }, [])

  const date = JulianDate.now()

  return (
    <Viewer full shouldAnimate>
      <Clock
        startTime={date}
        currentTime={date}
        clockRange={ClockRange.UNBOUNDED}
        multiplier={1}
      />

      <CameraFlyTo
        destination={Cartesian3.fromDegrees(-70.286, -33.143, 8000)}
      />

      <Entity
        position={Cartesian3.fromDegrees(-70.286, -33.143, 0)}
        name="CDH-120"
        billboard={{
          image: "marker.png",
          width: 60,
          height: 42,
        }}
        label={{
          show: true,
          text: "CDH-120",
          font: "bold 14px sans-serif",
          pixelOffset: new Cartesian3(0, -25)
        }}
      >
        <EntityDescription>
          <InfoPanel />
        </EntityDescription>
      </Entity>
    </Viewer>
  )
}

export default CesiumLive
