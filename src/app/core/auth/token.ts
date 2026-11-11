export function tokenExpired(token: string, now = Date.now()): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as {exp?: unknown};
    return typeof payload.exp !== 'number' || payload.exp * 1000 <= now + 1000;
  } catch {
    return true;
  }
}

export function safeReturnUrl(value: string | null): string {
  return value?.startsWith('/') && !value.startsWith('//') && !value.includes('\\')
    && !/^\/(login|register)([/?#]|$)/.test(value) ? value : '/dashboard';
}
