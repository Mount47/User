const isBrowser = typeof window !== 'undefined'

const formatTimestamp = () => {
  try {
    return new Date().toISOString()
  } catch {
    return ''
  }
}

export const debugLog = (scope: string, message: string, payload?: any) => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV !== false) {
    const prefix = `[${formatTimestamp()}][${scope}] ${message}`
    if (payload !== undefined) {
      // eslint-disable-next-line no-console
      console.info(prefix, payload)
    } else {
      // eslint-disable-next-line no-console
      console.info(prefix)
    }
  } else if (!isBrowser) {
    const prefix = `[${formatTimestamp()}][${scope}] ${message}`
    if (payload !== undefined) {
      console.info(prefix, payload)
    } else {
      console.info(prefix)
    }
  }
}

export default debugLog
