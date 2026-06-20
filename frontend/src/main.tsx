import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/global.css'
import { loadServerConfig } from './api/config'
import { MainWindow } from './ui/MainWindow'

loadServerConfig().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <MainWindow />
    </React.StrictMode>
  )
})
