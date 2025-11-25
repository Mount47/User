export type NormalizedError = {
  status?: number
  message: string
  code?: string
  details?: any
}

const DEFAULT_ERROR: NormalizedError = {
  message: '系统出现错误，请稍后重试'
}

export function normalizeError(error: any): NormalizedError {
  if (!error) return { ...DEFAULT_ERROR }

  if (typeof error === 'string') {
    return { message: error }
  }

  if (error?.isAxiosError && error.response) {
    const status = error.response.status
    const data = error.response.data
    return {
      status,
      message: data?.message || data?.error || error.message || DEFAULT_ERROR.message,
      code: data?.code,
      details: data
    }
  }

  if (error instanceof Error) {
    return { message: error.message }
  }

  return {
    status: error?.status,
    message: error?.message || DEFAULT_ERROR.message,
    code: error?.code,
    details: error
  }
}
