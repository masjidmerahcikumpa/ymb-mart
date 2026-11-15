import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { PortalScreen } from '@/pages/portal/PortalScreen'
import { POSScreen } from '@/pages/pos/POSScreen'
import { AdminScreen } from '@/pages/admin/AdminScreen'
import { CustomerScreen } from '@/pages/customer/CustomerScreen'
import { PresensiScreen } from '@/pages/presensi/PresensiScreen'
import { ReceiptScreen } from '@/pages/receipt/ReceiptScreen'
import { LoginScreen } from '@/pages/auth/LoginScreen'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 30, // 30 seconds
    },
  },
})

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PortalScreen />} />
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/admin-login" element={<LoginScreen />} />
          <Route
            path="/kasir"
            element={
              <ProtectedRoute>
                <POSScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminScreen />
              </ProtectedRoute>
            }
          />
          <Route path="/customer" element={<CustomerScreen />} />
          <Route path="/presensi" element={<PresensiScreen />} />
          <Route path="/receipt/:id" element={<ReceiptScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
