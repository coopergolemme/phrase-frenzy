import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import './styles/screens.css'
import App from './App.tsx'
import { AdminScreen } from './components/AdminScreen.tsx'

registerSW({ immediate: true })

const isAdminRoute = window.location.hash === '#admin'

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isAdminRoute ? <AdminScreen /> : <App />}</StrictMode>,
)
