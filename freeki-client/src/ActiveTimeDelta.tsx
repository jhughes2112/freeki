import React from 'react'

export function defaultFormatter(timestamp: number, now: number): string {
  let diff = Math.max(0, Math.floor(now - timestamp))
  const d = Math.floor(diff / 86400)
  diff -= d * 86400
  const h = Math.floor(diff / 3600)
  diff -= h * 3600
  const m = Math.floor(diff / 60)
  const s = diff - m * 60
  const units: Array<{val: number, label: string}> = [
    { val: d, label: 'd' },
    { val: h, label: 'h' },
    { val: m, label: 'm' },
    { val: s, label: 's' }
  ].filter(u => u.val > 0)
  if (units.length === 0) return 'now'
  if (units.length === 1) return `${units[0].val}${units[0].label} ago`
  return `${units[0].val}${units[0].label} ${units[1].val}${units[1].label} ago`
}

interface ActiveTimeDeltaProps {
  timestamp: number // seconds since epoch
  now: number      // required
  formatter: (timestamp: number, now: number) => string
  intervalMs: number // required
}

export const ActiveTimeDelta: React.FC<ActiveTimeDeltaProps> = ({ timestamp, now, formatter, intervalMs }) => {
  const [current, setCurrent] = React.useState(now)
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrent(Date.now() / 1000)
    }, intervalMs)
    return () => clearInterval(interval)
  }, [intervalMs])
  return <>{formatter(timestamp, current)}</>
}
