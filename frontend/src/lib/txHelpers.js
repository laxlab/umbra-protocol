const GAS_LIMITS = {
  deposit:  150000n,
  borrow:   1500000n,
  repay:    1500000n,
  withdraw: 200000n,
  approve:  100000n,
  bid:      150000n,
  settle:   300000n,
  flag:     200000n,
}

export async function getGasOverrides(provider, fn = 'deposit') {
  const gasLimit = GAS_LIMITS[fn] || 300000n
  try {
    const gasPriceHex = await provider.send('eth_gasPrice', [])
    const gasPrice    = BigInt(gasPriceHex)
    const MIN         = 100000000n
    const buffered    = gasPrice * 140n / 100n
    const finalGasPrice = buffered > MIN ? buffered : MIN
    return { gasPrice: finalGasPrice, gasLimit }
  } catch {
    return { gasPrice: 200000000n, gasLimit }
  }
}

export function parseError(err) {
  if (
    err.code === 4001 ||
    err.code === 'ACTION_REJECTED' ||
    err.message?.includes('user rejected') ||
    err.message?.includes('User denied')
  ) return 'Transaction cancelled.'

  const customErrorName = (
    err.revert?.name || err.errorName || err.error?.revert?.name || ''
  ).toLowerCase()

  if (customErrorName) {
    if (customErrorName === 'staleprice')          return 'Price feed temporarily unavailable. Try again in a few minutes.'
    if (customErrorName === 'positionunhealthy')   return 'This would make your position unhealthy. Reduce the amount.'
    if (customErrorName === 'insufficientreserve') return 'The lending pool does not have enough USDC. Try a smaller amount.'
    if (customErrorName === 'insufficientcollateral') return 'Not enough collateral for this withdrawal.'
    if (customErrorName === 'zeroamount')          return 'Amount must be greater than zero.'
    if (customErrorName === 'notliquidatable')     return 'This position is not yet liquidatable.'
    if (customErrorName === 'notpositionholder')   return 'You can only view your own position.'
    if (customErrorName === 'auctionnotactive')    return 'This auction is no longer active.'
    if (customErrorName === 'auctionnotended')     return 'The auction has not ended yet.'
    if (customErrorName === 'auctionalreadysettled') return 'This auction has already been settled.'
    return `Contract error: ${err.revert?.name || err.errorName}`
  }

  const text = [
    err.reason, err.shortMessage, err.data?.message,
    err.info?.error?.message, err.error?.message, err.message,
  ].filter(Boolean).join(' ').toLowerCase()

  if (text.includes('staleprice'))           return 'Price feed temporarily unavailable. Try again in a few minutes.'
  if (text.includes('positionunhealthy'))    return 'This would make your position unhealthy. Reduce the amount.'
  if (text.includes('insufficientreserve'))  return 'The lending pool does not have enough USDC.'
  if (text.includes('insufficientcollateral')) return 'Not enough collateral for this withdrawal.'
  if (text.includes('zeroamount'))           return 'Amount must be greater than zero.'
  if (text.includes('insufficient funds'))   return "Your wallet doesn't have enough ETH."
  if (text.includes('nonce'))                return 'Transaction conflict — wait for previous transaction to confirm.'
  if (text.includes('missing revert data'))  return 'Transaction could not be sent. Check you are on Arbitrum Sepolia.'
  if (err.shortMessage?.length < 120)        return err.shortMessage
  if (err.reason?.length < 120)              return err.reason
  return 'Transaction failed. Please try again.'
}