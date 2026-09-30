import { createContext } from 'react'

// Separado de AuthContext.jsx para que ese archivo solo exporte componentes (recarga en caliente de Vite)
export const AuthContext = createContext(null)
