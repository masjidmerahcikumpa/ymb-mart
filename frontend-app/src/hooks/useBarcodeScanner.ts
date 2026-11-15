import { useEffect, useRef } from 'react'

interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => void;
  maxIntervalMs?: number;
  minChars?: number;
}

export function useBarcodeScanner({
  onScan,
  maxIntervalMs = 50,
  minChars = 3,
}: UseBarcodeScannerOptions) {
  const bufferRef = useRef<string>('')
  const lastKeyTimeRef = useRef<number>(0)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore navigation / special function keys
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(e.key)) {
        return
      }

      const now = Date.now()
      const delta = now - lastKeyTimeRef.current

      // If key is Enter, evaluate buffer
      if (e.key === 'Enter') {
        if (bufferRef.current.length >= minChars && delta <= maxIntervalMs * 2) {
          e.preventDefault()
          const scannedCode = bufferRef.current.trim()
          bufferRef.current = ''
          onScan(scannedCode)
        } else {
          bufferRef.current = ''
        }
        return
      }

      // If characters are single printable character
      if (e.key.length === 1) {
        if (delta > maxIntervalMs) {
          // Slow typing: reset buffer to start fresh
          bufferRef.current = e.key
        } else {
          // Rapid typing (scanner)
          bufferRef.current += e.key
        }
        lastKeyTimeRef.current = now
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onScan, maxIntervalMs, minChars])
}

