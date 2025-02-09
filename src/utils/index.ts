import { getAddress } from '@ethersproject/address'
import { ChainId } from 'hypherin-sdk'

export function isAddress(value: string | undefined): string | false {
  try {
    return getAddress(value || '')
  } catch {
    return false
  }
}

// 获取hashkey链上数据链接
export function getEtherscanLink(chainId: ChainId, data: string, type: 'transaction' | 'token' | 'address'): string {
  const prefix = `https://explorer.hsk.xyz`
  
  switch (type) {
    case 'transaction': {
      return `${prefix}/tx/${data}`
    }
    case 'token': {
      return `${prefix}/token/${data}`
    }
    case 'address':
    default: {
      return `${prefix}/address/${data}`
    }
  }
}