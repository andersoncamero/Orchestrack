import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../services/api'
import type { ListPackagesResponse, RefreshPackagesResponse, RemovePackagesResponse, SystemInfo, UpgradePackagesResponse } from '../types'

interface UseSystemPackagesState {
  info: SystemInfo | null
  packagesResponse: ListPackagesResponse | null
  loading: boolean
  actionLoading: boolean
  error: string | null
  actionError: string | null
  actionResult: RefreshPackagesResponse | UpgradePackagesResponse | RemovePackagesResponse | null
}

export function useSystemPackages(identifier: string | null) {
  const [state, setState] = useState<UseSystemPackagesState>({
    info: null,
    packagesResponse: null,
    loading: identifier !== null,
    actionLoading: false,
    error: null,
    actionError: null,
    actionResult: null,
  })

  const loadingCount = useRef(0)

  const startLoading = () => {
    loadingCount.current += 1
    setState((s) => ({ ...s, loading: true, error: null }))
  }

  const stopLoading = () => {
    loadingCount.current = Math.max(0, loadingCount.current - 1)
    if (loadingCount.current === 0) {
      setState((s) => ({ ...s, loading: false }))
    }
  }

  const fetchInfo = useCallback(async () => {
    if (!identifier) return
    startLoading()
    try {
      const { info } = await api.getSystemInfo(identifier)
      setState((s) => ({ ...s, info }))
    } catch (err) {
      setState((s) => ({
        ...s,
        error: err instanceof Error ? err.message : 'Failed to fetch system info',
      }))
    } finally {
      stopLoading()
    }
  }, [identifier])

  const fetchPackages = useCallback(
    async (query?: string, upgradableOnly = false) => {
      if (!identifier) return
      startLoading()
      try {
        const packagesResponse = await api.getPackages(identifier, query, upgradableOnly)
        setState((s) => ({ ...s, packagesResponse }))
      } catch (err) {
        setState((s) => ({
          ...s,
          error: err instanceof Error ? err.message : 'Failed to fetch packages',
        }))
      } finally {
        stopLoading()
      }
    },
    [identifier]
  )

  const refreshPackages = useCallback(
    async (dryRun = false) => {
      if (!identifier) return null
      setState((s) => ({ ...s, actionLoading: true, actionError: null, actionResult: null }))
      try {
        const actionResult = await api.refreshPackages(identifier, dryRun)
        setState((s) => ({ ...s, actionLoading: false, actionResult }))
        return actionResult
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to refresh packages'
        setState((s) => ({ ...s, actionLoading: false, actionError: message }))
        return null
      }
    },
    [identifier]
  )

  const upgradePackages = useCallback(
    async (dryRun = false, autoConfirm = true, packages: string[] = []) => {
      if (!identifier) return null
      setState((s) => ({ ...s, actionLoading: true, actionError: null, actionResult: null }))
      try {
        const actionResult = await api.upgradePackages(identifier, dryRun, autoConfirm, packages)
        setState((s) => ({ ...s, actionLoading: false, actionResult }))
        return actionResult
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to upgrade packages'
        setState((s) => ({ ...s, actionLoading: false, actionError: message }))
        return null
      }
    },
    [identifier]
  )

  const removePackages = useCallback(
    async (packages: string[], purge = false, autoConfirm = true, dryRun = false) => {
      if (!identifier) return null
      setState((s) => ({ ...s, actionLoading: true, actionError: null, actionResult: null }))
      try {
        const actionResult = await api.removePackages(identifier, packages, purge, autoConfirm, dryRun)
        setState((s) => ({ ...s, actionLoading: false, actionResult }))
        return actionResult
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove packages'
        setState((s) => ({ ...s, actionLoading: false, actionError: message }))
        return null
      }
    },
    [identifier]
  )

  useEffect(() => {
    loadingCount.current = 0
    setState({
      info: null,
      packagesResponse: null,
      loading: identifier !== null,
      actionLoading: false,
      error: null,
      actionError: null,
      actionResult: null,
    })
  }, [identifier])

  useEffect(() => {
    if (!identifier) return
    fetchInfo()
    fetchPackages()
  }, [identifier, fetchInfo, fetchPackages])

  return {
    ...state,
    fetchInfo,
    fetchPackages,
    refreshPackages,
    upgradePackages,
    removePackages,
  }
}
