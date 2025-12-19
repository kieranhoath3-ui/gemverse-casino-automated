import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatGems(gems: bigint | number): string {
  const num = typeof gems === 'bigint' ? Number(gems) : gems
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B'
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toLocaleString()
}

export function generateServerSeed(): string {
  return crypto.getRandomValues(new Uint8Array(32)).toString()
}

export function generateClientNonce(): string {
  return Math.random().toString(36).substring(2, 15)
}

export function verifyFairness(serverSeed: string, clientNonce: string, result: number, maxValue: number): boolean {
  // Simple HMAC-based fairness verification
  const crypto = window.crypto || (window as any).msCrypto
  const encoder = new TextEncoder()
  
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(serverSeed),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  ).then(key => {
    return crypto.subtle.sign('HMAC', key, encoder.encode(clientNonce))
  }).then(signature => {
    const hash = new Uint8Array(signature)
    const hex = Array.from(hash).map(b => b.toString(16).padStart(2, '0')).join('')
    const hashInt = parseInt(hex.substring(0, 8), 16)
    const expected = hashInt % maxValue
    return expected === result
  })
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}