import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { useWallet } from '../context/WalletContext'
import { ADDRESSES, ABIS, RPC_URL } from '../lib/contracts'
import { getGasOverrides, parseError } from '../lib/txHelpers'
import Footer from '../components/Footer'

function Countdown({ endTime }) {
  const [label, setLabel] = useState('')

  useEffect(() => {
    const tick = () => {
      const now  = Math.floor(Date.now() / 1000)
      const diff = Number(endTime) - now
      if (diff <= 0) { setLabel('Ended'); return }
      const m = Math.floor(diff / 60)
      const s = diff % 60
      setLabel(`${m}m ${s.toString().padStart(2, '0')}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endTime])

  return <span>{label}</span>
}

export default function LiquidationBoard() {
  const { address, signer, provider, connect } = useWallet()

  const [auctions,   setAuctions]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [bidAmounts, setBidAmounts] = useState({})
  const [txLoading,  setTxLoading]  = useState(null)
  const [error,      setError]      = useState(null)
  const [success,    setSuccess]    = useState(null)

  useEffect(() => {
    if (!error && !success) return
    const id = setTimeout(() => { setError(null); setSuccess(null) }, 6000)
    return () => clearTimeout(id)
  }, [error, success])

  const loadAuctions = useCallback(async () => {
    try {
      const rpcProvider = new ethers.JsonRpcProvider(RPC_URL)
      const vault       = new ethers.Contract(ADDRESSES.vault,      ABIS.vault,      rpcProvider)
      const liquidator  = new ethers.Contract(ADDRESSES.liquidator, ABIS.liquidator, rpcProvider)

      let events = []
      try {
        const latest = await rpcProvider.getBlockNumber()
        const from   = Math.max(0, latest - 50000)
        events = await vault.queryFilter(vault.filters.LiquidationFlagged(), from, latest)
      } catch {
        events = []
      }

      const seen = new Set()
      const borrowers = []
      for (const ev of events) {
        const b = ev.args[0]
        if (!seen.has(b)) { seen.add(b); borrowers.push(b) }
      }

      const results = []
      for (const borrower of borrowers) {
        try {
          const a = await liquidator.getAuction(borrower)
          if (Number(a.startTime) > 0) {
            results.push({
              borrower,
              startTime:  a.startTime,
              endTime:    a.endTime,
              settled:    a.settled,
              winner:     a.winner,
              winningBid: a.winningBid,
              bidCount:   Number(a.bidCount),
            })
          }
        } catch { /* no auction yet */ }
      }

      setAuctions(results)
    } catch (err) {
      console.error('Error loading auctions:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAuctions()
    const id = setInterval(loadAuctions, 30000)
    return () => clearInterval(id)
  }, [loadAuctions])

  const handleBid = async (borrower) => {
    if (!signer) { connect(); return }
    const raw = bidAmounts[borrower]
    if (!raw || Number(raw) <= 0) return

    setTxLoading(borrower)
    setError(null)
    setSuccess(null)
    try {
      const liquidator = new ethers.Contract(ADDRESSES.liquidator, ABIS.liquidator, signer)
      const amount     = BigInt(Math.floor(parseFloat(raw) * 1e6))
      const overrides  = await getGasOverrides(provider, 'bid')
      const tx         = await liquidator.submitBid(borrower, amount, overrides)
      await tx.wait()
      setSuccess('Bid submitted successfully.')
      setBidAmounts(prev => ({ ...prev, [borrower]: '' }))
      await loadAuctions()
    } catch (err) {
      setError(parseError(err))
    } finally {
      setTxLoading(null)
    }
  }

  const handleSettle = async (borrower) => {
    if (!signer) { connect(); return }
    setTxLoading(`${borrower}-settle`)
    setError(null)
    setSuccess(null)
    try {
      const liquidator = new ethers.Contract(ADDRESSES.liquidator, ABIS.liquidator, signer)
      const overrides  = await getGasOverrides(provider, 'settle')
      const tx         = await liquidator.settleAuction(borrower, overrides)
      await tx.wait()
      setSuccess('Auction settled.')
      await loadAuctions()
    } catch (err) {
      setError(parseError(err))
    } finally {
      setTxLoading(null)
    }
  }

  return (
    <div className="min-h-[calc(100vh-57px)] bg-[#080808] text-white flex flex-col">
      <div className="flex-1 max-w-4xl w-full mx-auto px-4 md:px-6 py-10 md:py-12">

        <div className="mb-10">
          <p className="text-xs uppercase tracking-widest text-[#666] mb-2">Liquidations</p>
          <h1 className="text-2xl font-semibold">Active Auctions</h1>
          <p className="text-sm text-[#666] mt-1">
            Sealed bids. No front-running. No gas wars. Fair price for the borrower.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 border border-red-900 bg-red-950/20 rounded-md">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 border border-green-900 bg-green-950/20 rounded-md">
            <p className="text-green-400 text-sm">{success}</p>
          </div>
        )}

        {!address && (
          <div className="mb-6 p-4 border border-[#1c1c1c] rounded-md flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <p className="text-sm text-[#666]">Connect your wallet to submit bids</p>
            <button
              onClick={connect}
              className="text-sm px-4 py-2 bg-[#4f6ef7] text-white rounded-md hover:bg-[#3d5ce5] transition-colors"
            >
              Connect
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-[#666] text-sm">Loading auctions...</p>
        ) : auctions.length === 0 ? (
          <div className="border border-[#1c1c1c] rounded-md p-16 text-center">
            <p className="text-[#555] text-sm">No active auctions</p>
            <p className="text-xs text-[#333] mt-2">
              Auctions appear when positions fall below the liquidation threshold
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {auctions.map((auction) => {
              const now     = Math.floor(Date.now() / 1000)
              const isEnded = Number(auction.endTime) < now

              return (
                <div key={auction.borrower} className="border border-[#1c1c1c] rounded-md p-5 md:p-6">

                  <div className="flex flex-col md:flex-row items-start justify-between gap-3 mb-5">
                    <div>
                      <p className="text-xs text-[#666] mb-1">Borrower</p>
                      <p className="text-xs md:text-sm font-mono break-all">{auction.borrower}</p>
                    </div>
                    <div className="shrink-0">
                      {auction.settled ? (
                        <span className="text-xs border border-[#1c1c1c] text-[#555] px-2.5 py-1 rounded-full">Settled</span>
                      ) : isEnded ? (
                        <span className="text-xs border border-yellow-900/60 text-yellow-600 px-2.5 py-1 rounded-full">Ended</span>
                      ) : (
                        <span className="text-xs border border-green-900/60 text-green-600 px-2.5 py-1 rounded-full">Active</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-5">
                    <div>
                      <p className="text-xs text-[#666] mb-1">Bids submitted</p>
                      <p className="text-sm">{auction.bidCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#666] mb-1">
                        {auction.settled ? 'Status' : 'Time remaining'}
                      </p>
                      <p className="text-sm">
                        {auction.settled ? 'Complete' : <Countdown endTime={auction.endTime} />}
                      </p>
                    </div>
                    {auction.settled && auction.winner !== ethers.ZeroAddress && (
                      <div>
                        <p className="text-xs text-[#666] mb-1">Winning bid</p>
                        <p className="text-sm">{(Number(auction.winningBid) / 1e6).toFixed(2)} USDC</p>
                      </div>
                    )}
                  </div>

                  {!auction.settled && !isEnded && (
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        placeholder="Your bid in USDC"
                        value={bidAmounts[auction.borrower] || ''}
                        onChange={e => setBidAmounts(prev => ({ ...prev, [auction.borrower]: e.target.value }))}
                        className="flex-1 bg-[#0d0d0d] border border-[#1c1c1c] rounded-md px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#4f6ef7] transition-colors"
                      />
                      <button
                        onClick={() => handleBid(auction.borrower)}
                        disabled={txLoading === auction.borrower}
                        className="px-4 py-2 bg-[#4f6ef7] text-white text-sm rounded-md hover:bg-[#3d5ce5] disabled:opacity-40 transition-colors whitespace-nowrap"
                      >
                        {txLoading === auction.borrower ? '...' : 'Submit Bid'}
                      </button>
                    </div>
                  )}

                  {!auction.settled && isEnded && (
                    <button
                      onClick={() => handleSettle(auction.borrower)}
                      disabled={txLoading === `${auction.borrower}-settle`}
                      className="px-4 py-2 border border-[#4f6ef7] text-[#4f6ef7] text-sm rounded-md hover:bg-[#4f6ef7] hover:text-white disabled:opacity-40 transition-colors"
                    >
                      {txLoading === `${auction.borrower}-settle` ? 'Settling...' : 'Settle Auction'}
                    </button>
                  )}

                </div>
              )
            })}
          </div>
        )}

        <button
          onClick={loadAuctions}
          className="mt-8 text-xs text-[#444] hover:text-[#666] transition-colors"
        >
          Refresh
        </button>

      </div>
      <Footer />
    </div>
  )
}