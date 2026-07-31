export function bytes(value: number): string {
  if (value === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const k = 1024
  const i = Math.floor(Math.log(value) / Math.log(k))
  return `${parseFloat((value / Math.pow(k, i)).toFixed(2))} ${units[i]}`
}
