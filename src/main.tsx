import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
// screens.css loads first so Tailwind utilities (from index.css) can win
// cascade ties against the legacy component classes still used alongside them.
import './styles/screens.css'
import './index.css'
import { Root } from './Root.tsx'

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
