// APP_ID is replaced by the installer. Existing feature access is unchanged.
const APP_ID = 'globalhospital';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  const respond = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers });
  const authorization = request.headers.get('authorization');
  if (!authorization?.match(/^Bearer [A-Za-z0-9._~-]+$/)) return respond({ error: 'Authentication required.' }, 401);
  const base = (process.env.MEMBERSHIP_URL || 'https://aseptic-membership.vercel.app').replace(/\/$/, '');
  if (!base.startsWith('https://')) return respond({ error: 'Membership unavailable.' }, 503);
  try {
    const sessionResponse = await fetch(base + '/v1/session/exchange', { method: 'POST',
      headers: { Authorization: authorization, 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId: APP_ID }), cache: 'no-store', signal: AbortSignal.timeout(8000), redirect: 'error' });
    if (!sessionResponse.ok) return respond({ error: 'Membership authentication unavailable.' }, sessionResponse.status === 401 ? 401 : 503);
    const session = await sessionResponse.json();
    const response = await fetch(base + '/v1/me/membership?appId=' + APP_ID, { headers: { Authorization: 'Bearer ' + session.accessToken },
      cache: 'no-store', signal: AbortSignal.timeout(8000), redirect: 'error' });
    if (!response.ok) return respond({ error: 'Membership unavailable.' }, 503);
    const data = await response.json();
    const expected = process.env.NODE_ENV !== 'production' && process.env.MEMBERSHIP_SANDBOX === 'true' ? 'sandbox' : 'production';
    const expiresAt = typeof data.validUntil === 'string' ? Date.parse(data.validUntil) : NaN;
    const isLifetime = data.accessType === 'lifetime' && data.validUntil === null;
    const checkedAt = Date.parse(data.checkedAt);
    const verifiedUntil = Math.min(Date.now() + 60000, checkedAt + 60000);
    return respond({ available: true, memberId: data.memberId, appId: APP_ID,
      isActive: data.environment === expected && data.lookup === 'ok' && data.appId === APP_ID &&
        data.hasSharedMembership === true && data.hasAccess === true &&
        (isLifetime ? Number.isFinite(checkedAt) && checkedAt <= Date.now() + 5000 && verifiedUntil > Date.now() : Number.isFinite(expiresAt) && expiresAt > Date.now()),
      isLifetime, verifiedUntil: Number.isFinite(verifiedUntil) ? verifiedUntil : Date.now() + 60000,
      expiresAt: Number.isFinite(expiresAt) ? expiresAt : null });
  } catch { return respond({ available: false, isActive: false }, 503); }
}
