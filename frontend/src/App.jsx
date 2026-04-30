import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { WalletProvider } from './context/WalletContext'
import Navbar from './components/Navbar'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Markets from './pages/Markets'
import LiquidationBoard from './pages/LiquidationBoard'

function AppLayout({ children }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  )
}

export default function App() {
  return (
    <WalletProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"             element={<Landing />} />
          <Route path="/app"          element={<AppLayout><Dashboard /></AppLayout>} />
          <Route path="/markets"      element={<AppLayout><Markets /></AppLayout>} />
          <Route path="/liquidations" element={<AppLayout><LiquidationBoard /></AppLayout>} />
        </Routes>
      </BrowserRouter>
    </WalletProvider>
  )
}