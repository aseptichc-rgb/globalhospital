'use client';
import { useEffect, useState } from 'react';
import { getClientAuth } from '@/lib/firebase-client';
import { onIdTokenChanged } from '@firebase/auth';
type Status = { isActive: boolean; isLifetime?: boolean; verifiedUntil?: number };
export default function MembershipPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [message, setMessage] = useState('계정을 확인하고 있습니다.');
  useEffect(() => {
    let disposed = false, revision = 0;
    let getToken: (() => Promise<string | null>) | null = null;
    let unsubscribe = () => {};
    const reset = (next: (() => Promise<string | null>) | null) => {
      revision++; getToken = next; setStatus(null);
      if (!next) setMessage('이 앱의 기존 계정으로 로그인한 뒤 다시 확인해 주세요.');
      else void refresh();
    };
    async function refresh() {
      const attempt = ++revision;
      if (!getToken) return;
      try {
        const token = await getToken(); if (!token) throw Error('No account');
        const response = await fetch('/api/membership', { headers: { Authorization: 'Bearer ' + token }, cache: 'no-store', signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw Error('Unavailable');
        const value = await response.json();
        if (disposed || attempt !== revision) return;
        const fresh = Number.isFinite(value.verifiedUntil) && value.verifiedUntil > Date.now();
        setStatus({ isActive: value.isActive === true && fresh, isLifetime: value.isLifetime, verifiedUntil: value.verifiedUntil });
        setMessage(value.isActive === true && fresh ? '통합 이용권을 확인했습니다.' : '연결된 이용권이 없습니다. 현재 판매 준비 중입니다.');
      } catch { if (!disposed && attempt === revision) { setStatus(null); setMessage('계정을 확인하지 못했습니다. 앱의 로그인을 확인한 뒤 다시 시도해 주세요.'); } }
    }
    try {
      const client = getClientAuth();
      if (!client) throw Error('Not configured');
      unsubscribe = onIdTokenChanged(client, user => reset(user && !user.isAnonymous ? async () =>
        client.currentUser?.uid === user.uid ? user.getIdToken() : null : null));
    } catch { setMessage('현재 이 앱의 계정 연결을 준비하고 있습니다.'); }
    const visible = () => { if (document.visibilityState === 'visible') { setStatus(null); void refresh(); } };
    const timer = setInterval(() => { setStatus(null); void refresh(); }, 30000);
    document.addEventListener('visibilitychange', visible);
    return () => { disposed = true; revision++; unsubscribe(); clearInterval(timer); document.removeEventListener('visibilitychange', visible); };
  }, []);
  return <main style={{ maxWidth: 640, margin: '48px auto', padding: 24 }}>
    <a href="/">← 앱으로 돌아가기</a><h1>Aseptic 통합 이용권</h1>
    <p style={{ fontSize: 28, fontWeight: 700 }}>US$19.90 · 평생 · 1회 결제</p>
    <p>현재 앱과 앞으로 참여하는 앱을 같은 계정으로 이용하는 통합 멤버십입니다. 자동 갱신은 없습니다. 앱별 사용량과 기술 한도는 적용됩니다.</p>
    <p role="status">{message}</p>
    {status?.isActive && <p>{status.isLifetime ? '평생 통합 이용권 보유' : '기존 통합 이용권 이용 중'}</p>}
    <button type="button" disabled>판매 준비 중 · 결제 불가</button>
    <p><a href="https://aseptic-membership.vercel.app" target="_blank" rel="noopener noreferrer">중앙 계정 화면 열기 ↗</a></p>
    <small>기존 앱 구매는 원래 앱에서 복원할 수 있습니다. 같은 이메일만으로 서로 다른 계정을 합치지 않습니다.</small>
  </main>;
}
