"use client";

import type { TTSVoice, TTSSpeed } from "@/lib/use-tts";

interface TTSControlsProps {
  enabled: boolean;
  speaking: boolean;
  paused: boolean;
  speed: TTSSpeed;
  voices: TTSVoice[];
  selectedVoice: string;
  onToggle: () => void;
  onSetSpeed: (s: TTSSpeed) => void;
  onSetVoice: (name: string) => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
}

export default function TTSControls({
  enabled, speaking, paused, speed, voices, selectedVoice,
  onToggle, onSetSpeed, onSetVoice, onStop, onPause, onResume,
}: TTSControlsProps) {
  return (
    <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
      <button
        onClick={onToggle}
        className="flex items-center gap-1 rounded-lg px-2 py-1 font-medium transition-all"
        style={{
          background: enabled ? "var(--accent-bg)" : "var(--bg-hover)",
          color: enabled ? "var(--accent)" : "var(--text-tertiary)",
        }}
        title={enabled ? "Disable TTS" : "Enable TTS"}
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
        </svg>
        <span>{enabled ? "TTS On" : "TTS Off"}</span>
      </button>

      {enabled && (
        <>
          <div className="flex items-center gap-1">
            {speaking && !paused ? (
              <button onClick={onPause} className="flex items-center gap-1 rounded px-1.5 py-1 transition-colors hover:opacity-70" style={{ background: "var(--bg-hover)" }} title="Pause">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                </svg>
              </button>
            ) : paused ? (
              <button onClick={onResume} className="flex items-center gap-1 rounded px-1.5 py-1 transition-colors hover:opacity-70" style={{ background: "var(--bg-hover)" }} title="Resume">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                </svg>
              </button>
            ) : null}
            {(speaking || paused) && (
              <button onClick={onStop} className="flex items-center gap-1 rounded px-1.5 py-1 transition-colors hover:opacity-70" style={{ background: "var(--bg-hover)" }} title="Stop">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9A2.25 2.25 0 015.25 16.5v-9z" />
                </svg>
              </button>
            )}
          </div>

          {voices.length > 1 && (
            <select
              value={selectedVoice}
              onChange={(e) => onSetVoice(e.target.value)}
              className="rounded-lg px-1.5 py-1 text-[10px] max-w-[100px]"
              style={{ background: "var(--bg-hover)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
            >
              {voices.map((v) => (
                <option key={v.name} value={v.name}>{v.name.replace(/ \([^)]+\)/, "")}</option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-0.5">
            {([0.5, 1, 1.5, 2] as TTSSpeed[]).map((s) => (
              <button
                key={s}
                onClick={() => onSetSpeed(s)}
                className="rounded px-1.5 py-0.5 text-[10px] font-medium transition-all"
                style={{
                  background: speed === s ? "var(--accent-bg)" : "transparent",
                  color: speed === s ? "var(--accent)" : "var(--text-muted)",
                }}
              >
                {s}x
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
