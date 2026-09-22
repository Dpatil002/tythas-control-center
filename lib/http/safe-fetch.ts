export interface SafeFetchResult<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  error?: {
    code?: string;
    message?: string;
  };
}

export async function safeFetch<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<{ ok: true; data: T; status: number } | { ok: false; error: string; status: number }> {
  try {
    const res = await fetch(input, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.headers || {}),
      },
    });

    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();

    let json: any = null;
    if (text && contentType.includes('application/json')) {
      try {
        json = JSON.parse(text);
      } catch {
        // Fallback to text parsing below
      }
    } else if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        // Not a JSON response (e.g., HTML error page from server / proxy)
      }
    }

    if (!res.ok) {
      const errorMessage =
        json?.error?.message ||
        json?.message ||
        (res.status === 401
          ? 'Invalid credentials. Please check your details and try again.'
          : res.status === 404
          ? 'Resource not found. Please try again.'
          : res.status === 429
          ? 'Too many attempts. Please wait a minute and try again.'
          : res.status >= 500
          ? 'Server error occurred. Please check backend database connection or try again.'
          : `Request failed with status ${res.status}`);

      return {
        ok: false,
        error: errorMessage,
        status: res.status,
      };
    }

    return {
      ok: true,
      data: (json?.data !== undefined ? json.data : json) as T,
      status: res.status,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Network error. Please check your connection.';
    return {
      ok: false,
      error: message,
      status: 0,
    };
  }
}
