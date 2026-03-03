import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#161d2a',
            color: '#e2e8f0',
            border: '1px solid #1f2a3c',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '0.875rem',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#0d1017' } },
          error: { iconTheme: { primary: '#f87171', secondary: '#0d1017' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
