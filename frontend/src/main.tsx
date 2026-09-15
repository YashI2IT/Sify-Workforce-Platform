import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store'
import { env } from './config/env'
import { DevUserProvider } from './context/DevUserContext'
import { ToastProvider } from './context/ToastContext'
import './index.css'
import App from './App.tsx'

const AppWrapper = env.VITE_DEV_AUTH_BYPASS ? (
  <DevUserProvider>
    <App />
  </DevUserProvider>
) : (
  <App />
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <ToastProvider>
        {AppWrapper}
      </ToastProvider>
    </Provider>
  </StrictMode>,
)
