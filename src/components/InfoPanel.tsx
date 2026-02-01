import { useState } from "react"

function InfoPanel() {
  const [count, setCount] = useState(0)

  return (
    <div style={{ fontFamily: "sans-serif" }}>
      <h3>CDH-120</h3>
      <p>Estado: Activo</p>

      <button onClick={() => setCount(c => c + 1)}>
        contador: {count}
      </button>
    </div>
  )
}
export default InfoPanel