import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'

export default function Navbar() {
  const { address, connect, disconnect } = useWallet()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const links = [
    { to: '/app',          label: 'Dashboard'    },
    { to: '/markets',      label: 'Markets'      },
    { to: '/liquidations', label: 'Liquidations' },
  ]

  return (
    <nav className="border-b border-[#1c1c1c] bg-[#080808] sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6 md:gap-8">
          <span onClick={() => navigate('/')} className="text-sm font-medium cursor-pointer tracking-tight">
            Umbra
          </span>
          <div className="hidden md:flex items-center gap-6">
            {links.map(({ to, label }) => (
              <NavLink key={to} to={to}
                className={({ isActive }) =>
                  `text-sm transition-colors ${isActive ? 'text-white' : 'text-[#666] hover:text-[#999]'}`
                }
              >{label}</NavLink>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {address ? (
            <>
              <span className="hidden md:inline text-xs text-[#666] font-mono">
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
              <button onClick={disconnect}
                className="text-xs text-[#666] border border-[#1c1c1c] px-3 py-1.5 rounded-md hover:border-[#333] transition-colors">
                Disconnect
              </button>
            </>
          ) : (
            <button onClick={connect}
              className="text-sm px-4 py-2 bg-[#4f6ef7] text-white rounded-md hover:bg-[#3d5ce5] transition-colors">
              Connect
            </button>
          )}
          <button onClick={() => setMenuOpen(o => !o)}
            className="md:hidden flex flex-col gap-1.5 p-1">
            <span className={`block w-5 h-px bg-[#666] transition-transform ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-5 h-px bg-[#666] transition-opacity ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-5 h-px bg-[#666] transition-transform ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="md:hidden border-t border-[#1c1c1c] px-4 py-4 flex flex-col gap-4">
          {links.map(({ to, label }) => (
            <NavLink key={to} to={to} onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `text-sm transition-colors ${isActive ? 'text-white' : 'text-[#666]'}`
              }>{label}</NavLink>
          ))}
          {address && (
            <p className="text-xs text-[#444] font-mono pt-2 border-t border-[#1c1c1c]">
              {address.slice(0, 10)}...{address.slice(-6)}
            </p>
          )}
        </div>
      )}
    </nav>
  )
}