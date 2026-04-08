import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initSecurityMiddleware } from './utils/securityMiddleware'

import { registerSW } from 'virtual:pwa-register'

initSecurityMiddleware();

const updateSW = registerSW({
    onRegisteredSW(swUrl, r) {
        r && setInterval(() => {
            r.update()
        }, 60 * 60 * 1000) 
    },
    onNeedRefresh() {
        updateSW(true)
    },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
