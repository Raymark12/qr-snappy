'use client'

// QueryClient: clase principal de React Query que gestiona el cache y las queries
// Es el contenedor central que almacena todas las queries y su estado
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
// ReactQueryDevtools: componente de desarrollo que muestra el estado de las queries
// Solo funciona en desarrollo y permite inspeccionar el cache
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import type {} from '@mui/material/styles'
// useState: hook de React para manejar estado en componentes funcionales
// useEffect: hook de React para ejecutar efectos secundarios (como inicialización)
import { useState, useEffect } from 'react'
// Importa el store de Zustand para inicializar la autenticación
import { useAuthStore } from '@/stores/authStore'
import ToastContainer from '@/components/global/ToastContainer'

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#60a5fa',
      light: '#93c5fd',
      dark: '#3b82f6',
    },
    secondary: {
      main: '#a78bfa',
      light: '#c4b5fd',
      dark: '#8b5cf6',
    },
    success: {
      main: '#10b981',
    },
    error: {
      main: '#ef4444',
    },
    approve: {
      main: '#047857',
      light: '#059669',
      dark: '#065f46',
      contrastText: '#ffffff',
    },
    reject: {
      main: '#b91c1c',
      light: '#dc2626',
      dark: '#991b1b',
      contrastText: '#ffffff',
    },
    background: {
      default: '#0f172a',
      paper: '#1e293b',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
        },
      },
    },
  },
})

export default function Providers({ children }: { children: React.ReactNode }) {
  // useState: hook que crea un estado que persiste entre renders
  // [queryClient]: el estado (una instancia de QueryClient)
  // useState(() => ...): función inicializadora que solo se ejecuta una vez
  // Esto asegura que QueryClient se cree solo una vez, no en cada render
  const [queryClient] = useState(
    // () => new QueryClient(...): función arrow que crea una nueva instancia
    () =>
      // new QueryClient: constructor que crea una instancia del cliente de queries
      new QueryClient({
        // defaultOptions: opciones por defecto para todas las queries y mutaciones
        defaultOptions: {
          // queries: opciones por defecto para todas las queries (useQuery)
          queries: {
            // staleTime: tiempo en milisegundos durante el cual los datos se consideran "frescos"
            // 60 * 1000: 60 segundos (60 milisegundos * 1000)
            // Durante este tiempo, React Query no refetch automáticamente
            staleTime: 60 * 1000,
            // retry: número de veces que React Query reintenta automáticamente si una query falla
            // 1: solo reintenta una vez después del primer fallo
            retry: 1,
            // refetchOnWindowFocus: si debe refetch automáticamente cuando la ventana recupera el foco
            // false: no refetch cuando el usuario vuelve a la pestaña
            refetchOnWindowFocus: false,
          },
          // mutations: opciones por defecto para todas las mutaciones (useMutation)
          mutations: {
            // retry: número de veces que React Query reintenta si una mutación falla
            // 1: solo reintenta una vez después del primer fallo
            retry: 1,
          },
        },
      })
  )

  // useEffect: hook que ejecuta efectos secundarios después del render
  // (): array vacío significa que solo se ejecuta una vez, al montar el componente
  useEffect(() => {
    // useAuthStore.getState(): método de Zustand que obtiene el estado actual sin suscribirse
    // A diferencia de useAuthStore(), getState() no causa re-renders
    // .initialize(): llama a la acción initialize del store
    // Esto verifica si hay una sesión activa al cargar la aplicación
    useAuthStore.getState().initialize()
  }, []) // []: array de dependencias vacío = solo se ejecuta al montar

  return (
    // QueryClientProvider: componente que proporciona el QueryClient a toda la app
    // client={queryClient}: prop que pasa la instancia del QueryClient
    // Todos los componentes hijos pueden usar useQuery, useMutation, etc.
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {/* children: prop que contiene los componentes hijos a renderizar */}
        {children}
        {/* ToastContainer: renderiza las notificaciones toast usando Zustand */}
        <ToastContainer />
        {/* ReactQueryDevtools: herramienta de desarrollo para inspeccionar queries */}
        {/* initialIsOpen={false}: no se abre automáticamente, el usuario debe hacer clic */}
        <ReactQueryDevtools initialIsOpen={false} />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
