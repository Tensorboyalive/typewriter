import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Self-hosted editorial font families. Only weights actually used on-surface.
// Instrument Serif carries H1/H2/pullquotes/italic accents.
// Inter carries body prose + default sans.
// JetBrains Mono carries eyebrows, labels, tabular numerals, and timestamps.
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'

import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
