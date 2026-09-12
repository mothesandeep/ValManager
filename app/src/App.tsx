import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { MonthProvider } from './context/MonthContext'
import Layout from './components/layout/Layout'
import Dashboard  from './pages/Dashboard'
import Parties    from './pages/Parties'
import Receiving  from './pages/Receiving'
import Dispatch   from './pages/Dispatch'
import Rola       from './pages/Rola'
import Payments   from './pages/Payments'
import Expenses   from './pages/Expenses'
import Gapcha     from './pages/Gapcha'
import Reports    from './pages/Reports'
import Settings   from './pages/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <MonthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index                  element={<Dashboard />}  />
            <Route path="parties"         element={<Parties />}    />
            <Route path="receiving"       element={<Receiving />}  />
            <Route path="dispatch"        element={<Dispatch />}   />
            <Route path="gapcha"          element={<Gapcha />}     />
            <Route path="rola"            element={<Rola />}       />
            <Route path="payments"        element={<Payments />}   />
            <Route path="expenses"        element={<Expenses />}   />
            <Route path="reports"         element={<Reports />}    />
            <Route path="settings"        element={<Settings />}   />
          </Route>
        </Routes>
      </MonthProvider>
    </BrowserRouter>
  )
}
