import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Footer from '../components/Footer'

function ParticleCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    let animId
    let W = canvas.offsetWidth
    let H = canvas.offsetHeight
    canvas.width  = W
    canvas.height = H

    const COUNT = Math.floor((W * H) / 10000)
    const dots  = Array.from({ length: COUNT }, () => ({
      x:       Math.random() * W,
      y:       Math.random() * H,
      vx:      (Math.random() - 0.5) * 0.18,
      vy:      (Math.random() - 0.5) * 0.18,
      r:       Math.random() * 2 + 1,
      opacity: Math.random() * 0.4 + 0.2,
    }))

    const CONNECT_DIST = 140

    const draw = () => {
      ctx.clearRect(0, 0, W, H)

      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx   = dots[i].x - dots[j].x
          const dy   = dots[i].y - dots[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < CONNECT_DIST) {
            const alpha = 0.15 * (1 - dist / CONNECT_DIST)
            ctx.beginPath()
            ctx.moveTo(dots[i].x, dots[i].y)
            ctx.lineTo(dots[j].x, dots[j].y)
            ctx.strokeStyle = `rgba(79,110,247,${alpha})`
            ctx.lineWidth   = 0.8
            ctx.stroke()
          }
        }
      }

      for (const d of dots) {
        d.x += d.vx
        d.y += d.vy
        if (d.x < 0 || d.x > W) d.vx *= -1
        if (d.y < 0 || d.y > H) d.vy *= -1

        ctx.beginPath()
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(79,110,247,${d.opacity})`
        ctx.fill()

        if (d.r > 1.8) {
          ctx.beginPath()
          ctx.arc(d.x, d.y, d.r * 2.5, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(79,110,247,0.04)'
          ctx.fill()
        }
      }

      animId = requestAnimationFrame(draw)
    }

    draw()

    const handleResize = () => {
      W = canvas.offsetWidth
      H = canvas.offsetHeight
      canvas.width  = W
      canvas.height = H
    }
    window.addEventListener('resize', handleResize)
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  )
}

const TECH = [
  'iExec Nox', 'ERC-7984', 'Arbitrum Sepolia',
  'Chainlink Price Feeds', 'Solidity 0.8.28',
  'OpenZeppelin', 'React', 'ethers.js', 'ChainGPT',
  'Hardhat v3', 'Tailwind CSS', 'Vite',
]

function Marquee() {
  const items = [...TECH, ...TECH]
  return (
    <div className="overflow-hidden py-8 border-t border-b border-[#1c1c1c]">
      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track {
          display: flex;
          width: max-content;
          animation: marquee 28s linear infinite;
        }
        .marquee-track:hover { animation-play-state: paused; }
      `}</style>
      <div className="marquee-track">
        {items.map((t, i) => (
          <span
            key={i}
            className="text-xs text-[#444] border border-[#1c1c1c] px-3 py-1.5 rounded-full mx-2 whitespace-nowrap"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}

function MobileModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
      <div className="bg-[#0d0d0d] border border-[#1c1c1c] rounded-md p-8 max-w-sm w-full text-center">
        <p className="text-sm font-medium mb-3">Desktop recommended</p>
        <p className="text-sm text-[#666] leading-relaxed mb-6">
          Umbra Protocol is optimised for desktop. On mobile you may experience layout issues when signing transactions in MetaMask.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 text-sm px-4 py-2.5 border border-[#1c1c1c] text-[#666] rounded-md hover:border-[#333] transition-colors"
          >
            Go back
          </button>
          <button
            onClick={() => { onClose(); window.location.href = '/app' }}
            className="flex-1 text-sm px-4 py-2.5 bg-[#4f6ef7] text-white rounded-md hover:bg-[#3d5ce5] transition-colors"
          >
            Continue anyway
          </button>
        </div>
      </div>
    </div>
  )
}

const STEPS = [
  {
    n: '01', title: 'Deposit',
    desc: 'Lock ETH as collateral. Your collateral backs your loan and powers the health factor calculation via live Chainlink price feeds.',
  },
  {
    n: '02', title: 'Borrow',
    desc: 'Borrow USDC against your collateral at up to 75% LTV. Your debt amount is stored as an encrypted euint256 handle via iExec Nox ERC-7984. Only you can decrypt it using the Nox JS SDK.',
  },
  {
    n: '03', title: 'Monitor',
    desc: 'A backend Node.js service checks position health every 2 minutes using Chainlink price feeds and flags unhealthy positions for liquidation automatically.',
  },
  {
    n: '04', title: 'Liquidate',
    desc: 'Unhealthy positions trigger 1-hour sealed-bid auctions. Liquidators submit encrypted bids. No gas wars. No front-running. Fair price for the borrower.',
  },
]

const PROBLEMS = [
  {
    title: 'Transparent positions',
    desc: 'Every debt balance on Aave, Compound, and Spark is readable by anyone on-chain. Sophisticated actors monitor liquidatable positions and extract value before honest liquidators can act.',
    link: { label: 'Flash Boys 2.0 — Daian et al.', href: 'https://arxiv.org/abs/1904.05234' },
  },
  {
    title: 'Liquidation gas wars',
    desc: 'When a position becomes undercollateralized, bots race to liquidate it. Borrowers receive worse prices. Gas spikes. The network congests. The borrower pays the cost of everyone else\'s competition.',
    link: { label: 'Quantifying Blockchain Extractable Value', href: 'https://arxiv.org/abs/2101.05511' },
  },
  {
    title: 'MEV front-running',
    desc: 'Searchers scan the public mempool, identify profitable transactions, and insert their own ahead — extracting value from users without providing any economic benefit to the network.',
    link: { label: 'Ethereum Docs — MEV', href: 'https://ethereum.org/en/developers/docs/mev/' },
  },
]

export default function Landing() {
  const navigate = useNavigate()
  const [showMobileModal, setShowMobileModal] = useState(false)

  const handleLaunch = () => {
    if (window.innerWidth < 768) {
      setShowMobileModal(true)
    } else {
      navigate('/app')
    }
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white font-sans">

      {showMobileModal && (
        <MobileModal onClose={() => setShowMobileModal(false)} />
      )}

      <nav className="border-b border-[#1c1c1c] px-4 md:px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-sm font-medium tracking-tight">Umbra Protocol</span>
          <button
            onClick={handleLaunch}
            className="text-sm px-4 py-2 bg-[#4f6ef7] text-white rounded-md hover:bg-[#3d5ce5] transition-colors"
          >
            Launch App
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative max-w-6xl mx-auto px-4 md:px-6 pt-24 md:pt-32 pb-24 md:pb-28 overflow-hidden">
        <ParticleCanvas />
        <div className="relative z-10 max-w-3xl">
          <p className="text-xs uppercase tracking-widest text-[#4f6ef7] mb-6 font-medium">
            iExec Vibe Coding Challenge 2026
          </p>
          <h1
            className="text-3xl md:text-5xl font-semibold tracking-tight leading-tight mb-6"
            style={{ animation: 'fadeSlideUp 0.8s ease forwards', opacity: 0 }}
          >
            Confidential lending.<br />No one sees your position.
          </h1>
          <p className="text-[#666] text-base md:text-lg leading-relaxed mb-10 max-w-2xl">
            Umbra Protocol encrypts debt positions on-chain using iExec Nox ERC-7984 confidential tokens.
            Your debt balance is invisible to everyone except you — decryptable only with your wallet signature.
            Liquidations settle through sealed-bid auctions, eliminating MEV, front-running, and gas wars.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={handleLaunch}
              className="px-6 py-3 bg-[#4f6ef7] text-white text-sm font-medium rounded-md hover:bg-[#3d5ce5] transition-colors"
            >
              Launch App
            </button>
            <a
              href="https://github.com/laxonaunt/umbra-protocol"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 text-sm text-[#666] border border-[#1c1c1c] rounded-md hover:border-[#333] hover:text-[#999] transition-colors"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="border-t border-[#1c1c1c]">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-16 md:py-24">
          <p className="text-xs uppercase tracking-widest text-[#666] mb-12 font-medium">
            The Problem
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-14">
            {PROBLEMS.map(({ title, desc, link }) => (
              <div key={title}>
                <h3 className="text-sm font-medium mb-3">{title}</h3>
                <p className="text-[#666] text-sm leading-relaxed mb-4">{desc}</p>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#4f6ef7] hover:underline"
                >
                  {link.label}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-[#1c1c1c]">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-16 md:py-24">
          <p className="text-xs uppercase tracking-widest text-[#666] mb-12 font-medium">
            How it works
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            {STEPS.map(({ n, title, desc }) => (
              <div key={n} className="border-t border-[#1c1c1c] pt-6">
                <p className="text-xs text-[#333] mb-5 font-mono">{n}</p>
                <h3 className="text-sm font-medium mb-3">{title}</h3>
                <p className="text-[#666] text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Marquee />
      <Footer />
    </div>
  )
}