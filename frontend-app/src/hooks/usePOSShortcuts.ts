import { useEffect } from 'react'

interface POSShortcutsHandlers {
  onSearchFocus?: () => void;
  onETransModal?: () => void;
  onMemberModal?: () => void;
  onHoldModal?: () => void;
  onPaymentModal?: () => void;
  onEscape?: () => void;
}

export function usePOSShortcuts(handlers: POSShortcutsHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault()
        handlers.onSearchFocus?.()
      } else if (e.key === 'F3') {
        e.preventDefault()
        handlers.onETransModal?.()
      } else if (e.key === 'F4') {
        e.preventDefault()
        handlers.onMemberModal?.()
      } else if (e.key === 'F8') {
        e.preventDefault()
        handlers.onHoldModal?.()
      } else if (e.key === 'F9') {
        e.preventDefault()
        handlers.onPaymentModal?.()
      } else if (e.key === 'Escape') {
        handlers.onEscape?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlers])
}

