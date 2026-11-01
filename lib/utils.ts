// JSON response helpers

export function jsonOk(data: any, status: number = 200) {
  return Response.json(data, { status });
}

export function jsonError(reason: string, status: number = 400) {
  return Response.json({ ok: false, status: false, reason }, { status });
}

export function formatDate(ts: number): string {
  const d = new Date(ts * 1000);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} - ${months[d.getMonth()]} - ${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

export function getClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || request.headers.get('cf-connecting-ip')
    || '127.0.0.1';
}
