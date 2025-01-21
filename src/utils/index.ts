import { getAddress } from '@ethersproject/address'

export function isAddress(value: string | undefined): string | false {
  try {
    return getAddress(value || '')
  } catch {
    return false
  }
}
