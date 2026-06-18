import { useState, useEffect } from 'react'
import { onSyncChange, getPendingCount } from '../lib/sync'

export function useSyncStatus() {
  const [syncStatus, setSyncStatus] = useState('idle')
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const refresh = async () => {
      const count = await getPendingCount()
      setPendingCount(count)
    }
    refresh()
    const interval = setInterval(refresh, 10000)

    const unsubscribe = onSyncChange((status) => {
      setSyncStatus(status)
      if (status === 'synced') refresh()
    })

    return () => {
      clearInterval(interval)
      unsubscribe()
    }
  }, [])

  return { syncStatus, pendingCount }
}
