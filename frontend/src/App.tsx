import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { WebSocketProvider } from './contexts/WebSocketContext'
import { NotificationProvider } from './contexts/NotificationContext'
import DashboardPage from './components/pages/DashboardPage'
import LandingPage from './components/pages/LandingPage'
import InstancesPage from './components/pages/InstancesPage'
import InstanceDetailPage from './components/pages/InstanceDetailPage'
import ContainersOverviewPage from './components/pages/ContainersOverviewPage'
import ContainersPage from './components/pages/ContainersPage'
import ContainerDetailPage from './components/pages/ContainerDetailPage'
import ImagesPage from './components/pages/ImagesPage'
import AlertsPage from './components/pages/AlertsPage'
import ProcessesPage from './components/pages/ProcessesPage'
import PackagesPage from './components/pages/PackagesPage'
import SettingsPage from './components/pages/SettingsPage'
import TopologyPage from './components/pages/TopologyPage'
import LoginPage from './components/pages/LoginPage'
import SignupPage from './components/pages/SignupPage'
import ForgotPasswordPage from './components/pages/ForgotPasswordPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth()



  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (token) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <SignupPage />
          </PublicRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <ForgotPasswordPage />
          </PublicRoute>
        }
      />
      <Route
        path="/"
        element={<LandingPage />}
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/instances"
        element={
          <ProtectedRoute>
            <InstancesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/instances/:service_id"
        element={
          <ProtectedRoute>
            <InstanceDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/containers"
        element={
          <ProtectedRoute>
            <ContainersOverviewPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/containers/docker"
        element={
          <ProtectedRoute>
            <ContainersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/containers/docker/:serviceId/:id"
        element={
          <ProtectedRoute>
            <ContainerDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/containers/docker/images"
        element={
          <ProtectedRoute>
            <ImagesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/alerts"
        element={
          <ProtectedRoute>
            <AlertsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/processes"
        element={
          <ProtectedRoute>
            <ProcessesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/packages"
        element={
          <ProtectedRoute>
            <PackagesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/topology"
        element={
          <ProtectedRoute>
            <TopologyPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WebSocketProvider>
          <NotificationProvider>
            <AppRoutes />
          </NotificationProvider>
        </WebSocketProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App

