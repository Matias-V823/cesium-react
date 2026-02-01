import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Ion } from 'cesium'
import { RouterProvider } from 'react-router'
import { router } from './router'

Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_KEY

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
