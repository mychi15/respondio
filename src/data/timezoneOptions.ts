import rawTimezoneOptions from './timezoneOptions.json'

export interface TimezoneOption {
  zone: string
  offsetLabel: string
  label: string
}

/**
 * Every IANA zone, labeled with its UTC offset, sorted west-to-east.
 * Precomputed offline rather than at runtime — constructing ~400
 * Intl.DateTimeFormat instances to derive each zone's offset blocked the
 * main thread for seconds on first use. Regenerate timezoneOptions.json with:
 *
 *   node -e "
 *   function label(zone, date) {
 *     const part = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'longOffset' })
 *       .formatToParts(date).find((p) => p.type === 'timeZoneName')
 *     return \`UTC\${(part?.value.replace('GMT', '')) || '+00:00'}\`
 *   }
 *   function minutes(offset) {
 *     const m = offset.match(/UTC([+-])(\d{2}):(\d{2})/)
 *     return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0
 *   }
 *   const date = new Date()
 *   const options = Intl.supportedValuesOf('timeZone').map((zone) => {
 *     const offsetLabel = label(zone, date)
 *     return { zone, offsetLabel, label: \`\${offsetLabel} — \${zone}\` }
 *   }).sort((a, b) => minutes(a.offsetLabel) - minutes(b.offsetLabel) || a.zone.localeCompare(b.zone))
 *   console.log(JSON.stringify(options, null, 2))
 *   " > src/data/timezoneOptions.json
 */
export const TIMEZONE_OPTIONS: TimezoneOption[] = rawTimezoneOptions
