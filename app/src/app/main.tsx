import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import '@/index.css'
import { initNativeApp } from '@/utils/nativeApp'

// Initialize native status bar and styling when running inside Capacitor
void initNativeApp()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
