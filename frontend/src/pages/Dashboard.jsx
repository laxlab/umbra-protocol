import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { createViemHandleClient } from '@iexec-nox/handle'
import { createWalletClient, custom } from 'viem'
import { arbitrumSepolia } from 'viem/chains'
import { useWallet } from '../context/WalletContext'
import { ADDRESSES, ABIS } from '../lib/contracts'
import { getGasOverrides, parseError } from '../lib/txHelpers'
import Footer from '../components/Footer'

function StatCard({ label, value, sub, valueClass }) {
  return (
    <div className="border border-[#1c1c1c] rounded-md p-5">
      <p className="text-xs text-[#666] mb-2">{label}</p>
      <p className={`text-xl font-medium ${valueClass || 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-[#444] mt-1">{sub}</p>}
    </div>
  )
}

function ActionCard({ title, subtitle, inputPlaceholder, value, onChange, onSubmit, loading, buttonLabel }) {
  return (
    <div className="border border-[#1c1c1c] rounded-md p-5">
      <p className="text-sm font-medium mb-1">{title}</p>
      <p className="text-xs text-[#555] mb-4 min-h-[1rem]">{subtitle || ''}</p>
      <div className="flex gap-2">
        <input
          type="number"
          min="0"
          placeholder={inputPlaceholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 bg-[#0d0d0d] border border-[#1c1c1c] rounded-md px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#4f6ef7] transition-colors"
        />
        <button
          onClick={onSubmit}
          disabled={loading || !value || Number(value) <= 0}
          className="px-4 py-2 bg-[#4f6ef7] text-white text-sm rounded-md hover:bg-[#3d5ce5] disabled:opacity-40 transition-colors whitespace-nowrap"
        >
          {loading ? 'Waiting...' : buttonLabel}
        </button>
      </div>
    </div>
  )
}

async function getNoxClient() {
  const viemWallet = createWalletClient({
    chain:     arbitrumSepolia,
    transport: custom(window.ethereum),
  })
  return createViemHandleClient(viemWallet)
}

export default function Dashboard() {
  const { address, signer, provider, connect } = useWallet()

  const [position,      setPosition]      = useState(null)
  const [healthFactor,  setHealthFactor]  = useState(null)
  const [encryptedDebt, setEncryptedDebt] = useState(null)
  const [decryptedDebt, setDecryptedDebt] = useState(null)
  const [decrypting,    setDecrypting]    = useState(false)
  const [loading,       setLoading]       = useState(false)
  const [txLoading,     setTxLoading]     = useState({
    deposit: false, borrow: false, repay: false, withdraw: false
  })
  const [error,   setError]   = useState(null)
  const [success, setSuccess] = useState(null)

  const [depositAmt,  setDepositAmt]  = useState('')
  const [borrowAmt,   setBorrowAmt]   = useState('')
  const [repayAmt,    setRepayAmt]    = useState('')
  const [withdrawAmt, setWithdrawAmt] = useState('')

  const loadPosition = useCallback(async () => {
    if (!address || !signer || !provider) return
    setLoading(true)
    setError(null)
    try {
      const vault     = new ethers.Contract(ADDRESSES.vault,     ABIS.vault,     signer)
      const oracle    = new ethers.Contract(ADDRESSES.oracle,    ABIS.oracle,    provider)
      const debtToken = new ethers.Contract(ADDRESSES.debtToken, ABIS.debtToken, provider)

      let collateral = 0n, debt = 0n, isLiquidatable = false
      try {
        const pos    = await vault.getPosition(address)
        collateral     = pos[0]
        debt           = pos[1]
        isLiquidatable = pos[3]
      } catch {
        // Fresh wallet — no position yet
      }

      setPosition({
        collateral,
        debt,
        isLiquidatable,
        collateralETH: parseFloat(ethers.formatEther(collateral)).toFixed(4),
        debtUSDC:      (Number(debt) / 1e6).toFixed(2),
      })

      if (debt === 0n) {
        setHealthFactor(null)
      } else {
        try {
          const hf = await oracle.getHealthFactor(collateral, debt)
          setHealthFactor(Number(hf))
        } catch {
          setHealthFactor(null)
        }
      }

      try {
        const hasDebt = await debtToken.hasDebt(address)
        if (hasDebt) {
          const handle = await debtToken.getEncryptedDebt(address)
          setEncryptedDebt(handle)
        } else {
          setEncryptedDebt(null)
          setDecryptedDebt(null)
        }
      } catch {
        setEncryptedDebt(null)
        setDecryptedDebt(null)
      }

    } catch (err) {
      setError(parseError(err))
    } finally {
      setLoading(false)
    }
  }, [address, signer, provider])

  useEffect(() => { loadPosition() }, [loadPosition])

  // Clear success/error after 6 seconds
  useEffect(() => {
    if (!success && !error) return
    const id = setTimeout(() => { setSuccess(null); setError(null) }, 6000)
    return () => clearTimeout(id)
  }, [success, error])

  // Reset decrypted value when handle changes
  useEffect(() => {
    setDecryptedDebt(null)
  }, [encryptedDebt])

  const handleDecryptNox = async () => {
    if (!encryptedDebt || !window.ethereum) return
    setDecrypting(true)
    setError(null)
    try {
      const handleClient = await getNoxClient()
      const { value } = await handleClient.decrypt(encryptedDebt)
      setDecryptedDebt((Number(value) / 1e6).toFixed(2))
    } catch (err) {
      setError('Nox decryption failed: ' + (err.message || 'unknown error'))
    } finally {
      setDecrypting(false)
    }
  }

  const withTx = async (key, fn) => {
    setTxLoading(prev => ({ ...prev, [key]: true }))
    setError(null)
    setSuccess(null)
    try {
      await fn()
      setSuccess('Transaction confirmed.')
      await loadPosition()
    } catch (err) {
      setError(parseError(err))
    } finally {
      setTxLoading(prev => ({ ...prev, [key]: false }))
    }
  }

  const handleDeposit = () => withTx('deposit', async () => {
    const vault     = new ethers.Contract(ADDRESSES.vault, ABIS.vault, signer)
    const overrides = await getGasOverrides(provider, 'deposit')
    const tx        = await vault.depositCollateral({
      value: ethers.parseEther(depositAmt),
      ...overrides,
    })
    await tx.wait()
    setDepositAmt('')
  })

  const handleBorrow = () => withTx('borrow', async () => {
    const vault       = new ethers.Contract(ADDRESSES.vault, ABIS.vault, signer)
    const plainAmount = BigInt(Math.floor(parseFloat(borrowAmt) * 1e6))
    const overrides   = await getGasOverrides(provider, 'borrow')
    const tx          = await vault.borrow(plainAmount, overrides)
    await tx.wait()
    setBorrowAmt('')
  })

  const handleRepay = () => withTx('repay', async () => {
    const usdc        = new ethers.Contract(ADDRESSES.usdc,  ABIS.erc20, signer)
    const vault       = new ethers.Contract(ADDRESSES.vault, ABIS.vault, signer)
    const plainAmount = BigInt(Math.floor(parseFloat(repayAmt) * 1e6))

    const allowance = await usdc.allowance(address, ADDRESSES.vault)
    if (allowance < plainAmount) {
      const approveOverrides = await getGasOverrides(provider, 'approve')
      const approveTx = await usdc.approve(ADDRESSES.vault, plainAmount, approveOverrides)
      await approveTx.wait()
    }

    const overrides = await getGasOverrides(provider, 'repay')
    const tx        = await vault.repay(plainAmount, overrides)
    await tx.wait()
    setRepayAmt('')
  })

  const handleWithdraw = () => withTx('withdraw', async () => {
    const vault     = new ethers.Contract(ADDRESSES.vault, ABIS.vault, signer)
    const overrides = await getGasOverrides(provider, 'withdraw')
    const tx        = await vault.withdrawCollateral(ethers.parseEther(withdrawAmt), overrides)
    await tx.wait()
    setWithdrawAmt('')
  })

  const hfDisplay = () => {
    if (healthFactor === null) return { text: '—', color: 'text-[#666]' }
    if (healthFactor >= 150)   return { text: `${healthFactor}`, color: 'text-green-400' }
    if (healthFactor >= 110)   return { text: `${healthFactor}`, color: 'text-yellow-400' }
    return { text: `${healthFactor}`, color: 'text-red-400' }
  }

  if (!address) {
    return (
      <div className="min-h-[calc(100vh-57px)] bg-[#080808] flex items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <p className="text-xs uppercase tracking-widest text-[#666] mb-6">Dashboard</p>
          <h2 className="text-xl font-semibold text-white mb-3">Connect your wallet</h2>
          <p className="text-[#666] text-sm leading-relaxed mb-8">
            Connect MetaMask on Arbitrum Sepolia to view your confidential position.
          </p>
          <button
            onClick={connect}
            className="px-6 py-3 bg-[#4f6ef7] text-white text-sm rounded-md hover:bg-[#3d5ce5] transition-colors"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    )
  }

  const hf = hfDisplay()
  const anyLoading = Object.values(txLoading).some(Boolean)

  return (
    <div className="min-h-[calc(100vh-57px)] bg-[#080808] text-white flex flex-col">
      <div className="flex-1 max-w-4xl w-full mx-auto px-4 md:px-6 py-10 md:py-12">

        <div className="mb-10">
          <p className="text-xs uppercase tracking-widest text-[#666] mb-2">Dashboard</p>
          <h1 className="text-2xl font-semibold">Your Position</h1>
          <p className="text-xs text-[#333] mt-1 font-mono break-all">{address}</p>
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

        {loading ? (
          <p className="text-[#666] text-sm">Loading position...</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <StatCard label="Collateral" value={`${position?.collateralETH || '0.0000'} ETH`} />
              <StatCard label="Debt" value={`${position?.debtUSDC || '0.00'} USDC`} sub="5% annual interest" />
              <StatCard
                label="Health Factor"
                value={hf.text}
                valueClass={hf.color}
                sub={
                  position?.isLiquidatable ? 'Flagged for liquidation'
                  : healthFactor !== null
                  ? healthFactor < 100 ? 'Liquidatable — repay now' : 'Healthy'
                  : 'No active debt'
                }
              />
            </div>

            {encryptedDebt && (
              <div className="mb-8 border border-[#4f6ef7]/20 bg-[#4f6ef7]/5 rounded-md p-5">
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-xs font-medium text-[#4f6ef7]">iExec Nox — Encrypted Debt Position</p>
                  <span className="text-[10px] text-[#4f6ef7] border border-[#4f6ef7]/30 px-1.5 py-0.5 rounded-full">ERC-7984</span>
                </div>
                <div className="mb-3">
                  <p className="text-xs text-[#555] mb-1">Encrypted handle (on-chain)</p>
                  <p className="text-xs font-mono text-[#444] break-all">{encryptedDebt}</p>
                </div>
                {decryptedDebt !== null ? (
                  <div className="mt-3 p-3 bg-[#080808] rounded border border-[#1c1c1c]">
                    <p className="text-xs text-[#555] mb-1">Decrypted by Nox JS SDK — only you can see this</p>
                    <p className="text-lg font-medium text-white">{decryptedDebt} USDC</p>
                    <p className="text-xs text-[#333] mt-1">Decrypted locally via EIP-712 signature — plaintext never leaves your browser</p>
                  </div>
                ) : (
                  <button
                    onClick={handleDecryptNox}
                    disabled={decrypting}
                    className="mt-2 text-sm px-4 py-2 border border-[#4f6ef7] text-[#4f6ef7] rounded-md hover:bg-[#4f6ef7] hover:text-white disabled:opacity-40 transition-colors"
                  >
                    {decrypting ? 'Decrypting via Nox...' : 'Decrypt My Balance — Nox JS SDK'}
                  </button>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ActionCard
                title="Deposit Collateral"
                subtitle="Send ETH to back your loan"
                inputPlaceholder="Amount in ETH"
                value={depositAmt}
                onChange={setDepositAmt}
                onSubmit={handleDeposit}
                loading={txLoading.deposit}
                buttonLabel="Deposit"
              />
              <ActionCard
                title="Borrow USDC"
                subtitle="Max 75% LTV — debt encrypted via iExec Nox ERC-7984"
                inputPlaceholder="Amount in USDC"
                value={borrowAmt}
                onChange={setBorrowAmt}
                onSubmit={handleBorrow}
                loading={txLoading.borrow}
                buttonLabel="Borrow"
              />
              <ActionCard
                title="Repay Debt"
                subtitle="Repays principal and accrued interest"
                inputPlaceholder="Amount in USDC"
                value={repayAmt}
                onChange={setRepayAmt}
                onSubmit={handleRepay}
                loading={txLoading.repay}
                buttonLabel="Repay"
              />
              <ActionCard
                title="Withdraw Collateral"
                subtitle="Position must stay healthy after"
                inputPlaceholder="Amount in ETH"
                value={withdrawAmt}
                onChange={setWithdrawAmt}
                onSubmit={handleWithdraw}
                loading={txLoading.withdraw}
                buttonLabel="Withdraw"
              />
            </div>

            <button
              onClick={loadPosition}
              disabled={anyLoading}
              className="mt-8 text-xs text-[#444] hover:text-[#666] disabled:opacity-40 transition-colors"
            >
              Refresh position
            </button>
          </>
        )}
      </div>
      <Footer />
    </div>
  )
}