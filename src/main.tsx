import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import CloudOpsModulePage from './pages/CloudOpsModulePage'
import { CloudOpsProvider } from './context/CloudOpsContext'
import './styles/cloudops-theme.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <CloudOpsProvider>
        <div className="cloudops-root min-h-screen">
          <CloudOpsModulePage />
        </div>
      </CloudOpsProvider>
    </BrowserRouter>
  </React.StrictMode>,
)