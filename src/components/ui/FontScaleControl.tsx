"use client";

import { useCallback, useEffect, useState } from "react";

const SCALES = [1, 1.15, 1.3, 1.45] as const;
const SCALE_LABELS = ["보통", "크게", "더 크게", "아주 크게"] as const;
const STORAGE_KEY = "gh-font-scale";
const DEFAULT_INDEX = 0;

const readStoredIndex = (): number => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_INDEX;
    const n = parseInt(raw, 10);
    if (Number.isNaN(n) || n < 0 || n >= SCALES.length) return DEFAULT_INDEX;
    return n;
  } catch {
    return DEFAULT_INDEX;
  }
};

const applyScale = (idx: number) => {
  try {
    document.documentElement.style.fontSize = `${SCALES[idx] * 100}%`;
  } catch {
    /* ignore — non-DOM environments */
  }
};

export default function FontScaleControl() {
  const [idx, setIdx] = useState<number>(DEFAULT_INDEX);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = readStoredIndex();
    setIdx(saved);
    applyScale(saved);
    setHydrated(true);
  }, []);

  const update = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(SCALES.length - 1, next));
    setIdx(clamped);
    applyScale(clamped);
    try {
      localStorage.setItem(STORAGE_KEY, String(clamped));
    } catch {
      /* localStorage unavailable — silent */
    }
  }, []);

  const decrease = () => update(idx - 1);
  const increase = () => update(idx + 1);

  const atMin = idx <= 0;
  const atMax = idx >= SCALES.length - 1;
  const currentLabel = hydrated ? SCALE_LABELS[idx] : SCALE_LABELS[DEFAULT_INDEX];

  return (
    <div
      className="inline-flex items-center h-9 rounded-full overflow-hidden shrink-0"
      style={{
        background: "var(--gh-white)",
        border: "1px solid var(--gh-cloud)",
      }}
      role="group"
      aria-label={`글자 크기 조절 · Text size (현재 ${currentLabel})`}
    >
      <button
        type="button"
        onClick={decrease}
        disabled={atMin}
        aria-label={`글자 작게 · Smaller text (현재 ${currentLabel})`}
        title="글자 작게"
        className="inline-flex items-center justify-center w-9 h-9 transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
        style={{ color: "var(--gh-steel)" }}
      >
        <span aria-hidden style={{ fontSize: 12, fontWeight: 700, lineHeight: 1 }}>
          가-
        </span>
      </button>
      <span
        aria-hidden
        className="block h-5 w-px"
        style={{ background: "var(--gh-cloud)" }}
      />
      <button
        type="button"
        onClick={increase}
        disabled={atMax}
        aria-label={`글자 크게 · Larger text (현재 ${currentLabel})`}
        title="글자 크게"
        className="inline-flex items-center justify-center w-9 h-9 transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
        style={{ color: "var(--gh-blue)" }}
      >
        <span aria-hidden style={{ fontSize: 18, fontWeight: 800, lineHeight: 1 }}>
          가+
        </span>
      </button>
    </div>
  );
}
