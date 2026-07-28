import { useEffect, useRef } from 'react'
import { Copy, Download, RefreshCw, ScrollText } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'

interface LogViewerProps {
  logs: string[]
  loading: boolean
  autoScroll: boolean
  onToggleAutoScroll: () => void
  onCopy: () => void
  onDownload: () => void
  showTimestamps: boolean
  onToggleTimestamps: () => void
  tailLines: number
  onChangeTailLines: (value: number) => void
  onRefresh: () => void
}

function isStderrLine(line: string): boolean {
  const lower = line.toLowerCase()
  return (
    lower.includes('stderr') ||
    lower.includes(' error ') ||
    lower.includes('error:') ||
    lower.includes('failed') ||
    lower.includes('fatal') ||
    lower.includes('panic') ||
    lower.includes('exception') ||
    /^\s*err\b/i.test(line)
  )
}

export function LogViewer({
  logs,
  loading,
  autoScroll,
  onToggleAutoScroll,
  onCopy,
  onDownload,
  showTimestamps,
  onToggleTimestamps,
  tailLines,
  onChangeTailLines,
  onRefresh,
}: LogViewerProps) {
  const { t } = useLanguage()
  const scrollRef = useRef<HTMLDivElement>(null)

  const safeLogs = Array.isArray(logs) ? logs : []

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [safeLogs, autoScroll])

  return (
    <div className="flex flex-col h-full rounded-lg overflow-hidden border border-(--color-border)">
      <div className="flex items-center justify-between px-3 py-2 bg-(--color-bg-surface) border-b border-(--color-border)">
        <div className="flex items-center gap-2">
          <button
            onClick={onCopy}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-(--color-text-secondary) hover:text-(--color-text-main) hover:bg-(--color-bg-surface-hover) rounded-md transition-colors"
            title={t('copyLogs')}
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('copy')}</span>
          </button>
          <button
            onClick={onDownload}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-(--color-text-secondary) hover:text-(--color-text-main) hover:bg-(--color-bg-surface-hover) rounded-md transition-colors"
            title={t('downloadLogs')}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('download')}</span>
          </button>
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-(--color-text-secondary) hover:text-(--color-text-main) hover:bg-(--color-bg-surface-hover) rounded-md transition-colors"
            title={t('refresh')}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <label htmlFor="tailLines" className="text-xs text-(--color-text-muted)">
              {t('lines')}:
            </label>
            <select
              id="tailLines"
              value={tailLines}
              onChange={(e) => onChangeTailLines(Number(e.target.value))}
              className="bg-(--color-bg-base) border border-(--color-border) text-(--color-text-main) text-xs rounded-md px-2 py-1 focus:outline-none focus:border-(--color-primary)"
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
            </select>
          </div>
          <button
            onClick={onToggleTimestamps}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${showTimestamps ? 'text-(--color-primary) bg-(--color-primary-subtle)' : 'text-(--color-text-secondary) hover:text-(--color-text-main) hover:bg-(--color-bg-surface-hover)'}`}
            title={t('showTimestamps')}
          >
            <ScrollText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('showTimestamps')}</span>
          </button>
          <button
            onClick={onToggleAutoScroll}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${autoScroll ? 'text-(--color-primary) bg-(--color-primary-subtle)' : 'text-(--color-text-secondary) hover:text-(--color-text-main) hover:bg-(--color-bg-surface-hover)'}`}
            title={t('autoScroll')}
          >
            <span className="hidden sm:inline">{t('autoScroll')}</span>
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-auto bg-gray-900 p-3 font-mono text-sm"
      >
        {safeLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-xs">
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              t('noLogs')
            )}
          </div>
        ) : (
          <div className="space-y-0.5">
            {safeLogs.map((line, index) => {
              const isError = isStderrLine(line)
              return (
                <div
                  key={index}
                  className={`whitespace-pre-wrap break-all ${isError ? 'text-red-400' : 'text-gray-100'}`}
                >
                  {line}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
