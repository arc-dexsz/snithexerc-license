import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { getSetting } from './db';

const SESSION_NAME = 'panxcz_session';

// Get session secret from env or settings
async function getSessionSecret(): Promise<Uint8Array> {
  // The value is seeded from SESSION_SECRET on first initialization and then
  // read from the database so the Settings page can rotate it consistently.
  const secret = await getSetting('session_secret');
  if (!secret) {
    throw new Error('SESSION_SECRET is not configured. Initialize the database or set SESSION_SECRET.');
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(userId: string, role: string = 'admin'): Promise<string> {
  const secret = await getSessionSecret();
  const token = await new SignJWT({ userId, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);
  return token;
}

export async function getSession(): Promise<{ userId: string; role: string } | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_NAME)?.value;
    if (!sessionToken) return null;

    const secret = await getSessionSecret();
    const { payload } = await jwtVerify(sessionToken, secret);
    return { userId: payload.userId as string, role: payload.role as string };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 86400, // 24 hours
    path: '/',
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_NAME);
}

// Bearer token auth for API
export async function verifyBearerToken(request: Request): Promise<boolean> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;

  const token = authHeader.slice(7);
  const apiToken = await getSetting('api_token');
  return token === apiToken;
}

// Extract client IP from request
export function getClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || request.headers.get('cf-connecting-ip')
    || '127.0.0.1';
}
