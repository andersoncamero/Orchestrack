import { Badge } from '../atoms/Badge'
import { Button } from '../atoms/Button'
import { useLanguage } from '../../contexts/LanguageContext'
import type { Instance } from '../../types'

interface InstanceRowProps {
  instance: Instance
  onView: (instance: Instance) => void
}

export function InstanceRow({ instance, onView }: InstanceRowProps) {
  const { t } = useLanguage()

  return (
    <tr className="hover:bg-(--color-bg-surface-hover)/60 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <Badge state={instance.status} />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-(--color-text-main) font-medium">{instance.hostname}</td>
      <td className="px-6 py-4 whitespace-nowrap text-(--color-text-muted) font-mono text-sm">{instance.service_id}</td>
      <td className="px-6 py-4 whitespace-nowrap text-(--color-text-secondary)">{new Date(instance.last_seen * 1000).toLocaleTimeString()}</td>
      <td className="px-6 py-4 whitespace-nowrap">
        <Button variant="secondary" onClick={() => onView(instance)}>
          {t('viewDetails')}
        </Button>
      </td>
    </tr>
  )
}
