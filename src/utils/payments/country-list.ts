/**
 * Country and currency names from the browser's Intl data.
 */
export class CountryList {
  private static cache?: { value: string; label: string }[]

  static name (code: string): string {
    try {
      return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code
    } catch {
      return code
    }
  }

  /** Every country as a select option, by name. */
  static options (): { value: string; label: string }[] {
    if (CountryList.cache) return CountryList.cache

    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
    const names = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' })
    const list: { value: string; label: string }[] = []

    for (const first of letters) {
      for (const second of letters) {
        const code = first + second
        const label = names.of(code)

        if (label && label !== code && !label.startsWith('Unknown')) list.push({ value: code, label })
      }
    }

    CountryList.cache = list.sort((a, b) => a.label.localeCompare(b.label))

    return CountryList.cache
  }

  static currencies (): string[] {
    const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] }

    return intl.supportedValuesOf?.('currency') ?? ['NGN', 'GHS', 'KES', 'ZAR', 'UGX', 'TZS', 'RWF', 'XOF', 'XAF', 'USD', 'EUR', 'GBP']
  }
}
