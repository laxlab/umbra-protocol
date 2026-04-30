import { createContext, useContext, useState, useCallback } from 'react'
import { ethers } from 'ethers'

const WalletContext = createContext(null)

const ARBITRUM_SEPOLIA_CHAIN_ID = '0x66eee'

const ARBITRUM_SEPOLIA_PARAMS = {
  chainId: ARBITRUM_SEPOLIA_CHAIN_ID,
  chainName: 'Arbitrum Sepolia',
  rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  blockExplorerUrls: ['https://sepolia.arbiscan.io'],
}

export function WalletProvider({ children }) {
  const [address,  setAddress]  = useState(null)
  const [provider, setProvider] = useState(null)
  const [signer,   setSigner]   = useState(null)
  const [error,    setError]    = useState(null)

  const connect = useCallback(async () => {
    setError(null)
    try {
      if (!window.ethereum) {
        setError('MetaMask is not installed.')
        return
      }
      await window.ethereum.request({ method: 'eth_requestAccounts' })
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: ARBITRUM_SEPOLIA_CHAIN_ID }],
        })
      } catch (switchErr) {
        if (switchErr.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [ARBITRUM_SEPOLIA_PARAMS],
          })
        } else throw switchErr
      }
      const web3Provider = new ethers.BrowserProvider(window.ethereum)
      const web3Signer   = await web3Provider.getSigner()
      const userAddress  = await web3Signer.getAddress()
      setProvider(web3Provider)
      setSigner(web3Signer)
      setAddress(userAddress)
      window.ethereum.on('accountsChanged', () => window.location.reload())
      window.ethereum.on('chainChanged',    () => window.location.reload())
    } catch (err) {
      setError(err.message || 'Failed to connect wallet')
    }
  }, [])

  const disconnect = useCallback(() => {
    setAddress(null)
    setProvider(null)
    setSigner(null)
  }, [])

  return (
    <WalletContext.Provider value={{ address, provider, signer, error, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  return useContext(WalletContext)
}