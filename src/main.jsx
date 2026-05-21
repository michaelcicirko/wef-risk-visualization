import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

const rootElement = document.getElementById('app')
if (!rootElement) {
  console.error('Root element #app not found')
} else {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}
