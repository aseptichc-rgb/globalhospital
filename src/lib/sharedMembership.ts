export interface SharedMembershipStatus { available: boolean; isActive: boolean; memberId?: string; expiresAt?: number | null; isLifetime?: boolean; verifiedUntil?: number }
export async function getSharedMembership(user: { uid: string; getIdToken(): Promise<string> } | null): Promise<SharedMembershipStatus> {
  if (!user) return { available: true, isActive: false };
  try {
    const response = await fetch('/api/membership', { headers: { Authorization: 'Bearer ' + await user.getIdToken() },
      cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('Unavailable');
    return await response.json();
  } catch { return { available: false, isActive: false }; }
}
