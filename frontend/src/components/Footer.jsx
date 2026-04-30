import { ADDRESSES } from '../lib/contracts'

export default function Footer() {
  return (
    <footer className="border-t border-[#1c1c1c] mt-auto">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <span className="text-xs text-[#333]">Umbra Protocol — A Lax Lab product</span>
        <div className="flex items-center gap-6">
          <a href="https://docs.iex.ec/nox-protocol/getting-started/welcome" target="_blank" rel="noopener noreferrer"
            className="text-xs text-[#333] hover:text-[#666] transition-colors">iExec Nox Docs</a>
          <a href={`https://sepolia.arbiscan.io/address/${ADDRESSES.vault}`} target="_blank" rel="noopener noreferrer"
            className="text-xs text-[#333] hover:text-[#666] transition-colors">Contract on Arbiscan</a>
          <a href="https://github.com/laxonaunt/umbra-protocol" target="_blank" rel="noopener noreferrer"
            className="text-xs text-[#333] hover:text-[#666] transition-colors">GitHub</a>
        </div>
      </div>
    </footer>
  )
}