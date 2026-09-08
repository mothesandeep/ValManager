import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard  from './pages/Dashboard'
import Parties    from './pages/Parties'
import Receiving  from './pages/Receiving'
import Production from './pages/Production'
import Dispatch   from './pages/Dispatch'
import Rola       from './pages/Rola'
import Payments   from './pages/Payments'
import Expenses   from './pages/Expenses'
import Reports    from './pages/Reports'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index                  element={<Dashboard />}  />
          <Route path="parties"         element={<Parties />}    />
          <Route path="receiving"       element={<Receiving />}  />
          <Route path="production"      element={<Production />} />
          <Route path="dispatch"        element={<Dispatch />}   />
          <Route path="rola"            element={<Rola />}       />
          <Route path="payments"        element={<Payments />}   />
          <Route path="expenses"        element={<Expenses />}   />
          <Route path="reports"         element={<Reports />}    />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
