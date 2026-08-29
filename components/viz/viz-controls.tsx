"use client";

interface VizControlsProps {
  step: number;
  total: number;
  playing: boolean;
  speaking: boolean;
  beginner: boolean;
  mult: number;
  onPrev: () => void;
  onPlay: () => void;
  onNext: () => void;
  onScrub: (i: number) => void;
  onToggleSpeak: () => void;
  onToggleBeginner: () => void;
  onSpeed: (m: number) => void;
  onRestart: () => void;
}

function IconBtn({
  onClick, title, children, active,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="viz-ctrl"
      style={{
        background: active ? "rgba(88,166,255,0.18)" : "var(--bg-hover)",
        color: active ? "#58a6ff" : "var(--text-secondary)",
        border: "1px solid",
        borderColor: active ? "rgba(88,166,255,0.4)" : "var(--border-subtle)",
      }}
    >
      {children}
    </button>
  );
}

export default function VizControls({
  step, total, playing, speaking, beginner, mult,
  onPrev, onPlay, onNext, onScrub, onToggleSpeak, onToggleBeginner, onSpeed, onRestart,
}: VizControlsProps) {
  const speeds = [1, 2, 4];
  return (
    <div className="flex flex-col gap-2 select-none">
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={Math.max(total - 1, 0)}
          value={step}
          onChange={(e) => onScrub(Number(e.target.value))}
          className="viz-slider flex-1"
          aria-label="Step"
        />
        <span className="viz-step-count">
          {step + 1}/{total}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <IconBtn onClick={onRestart} title="Restart from step 1">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        </IconBtn>
        <IconBtn onClick={onPrev} title="Previous step">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </IconBtn>
        <IconBtn onClick={onPlay} title={playing ? "Pause" : "Play"} active={playing}>
          {playing ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h0A2.25 2.25 0 019.75 7.5v9a2.25 2.25 0 01-2.25 2.25h0a2.25 2.25 0 01-2.25-2.25v-9zM15.75 7.5A2.25 2.25 0 0118 5.25h0A2.25 2.25 0 0120.25 7.5v9a2.25 2.25 0 01-2.25 2.25h0a2.25 2.25 0 01-2.25-2.25v-9z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
            </svg>
          )}
        </IconBtn>
        <IconBtn onClick={onNext} title="Next step">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </IconBtn>
        <div className="mx-1 h-5 w-px" style={{ background: "var(--border-subtle)" }} />
        <IconBtn onClick={onToggleSpeak} title="Speak the caption" active={speaking}>
          {speaking ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
            </svg>
          )}
        </IconBtn>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="flex items-center gap-0.5 rounded-lg p-0.5" style={{ background: "var(--bg-hover)", border: "1px solid var(--border-subtle)" }}>
            {speeds.map((m) => (
              <button
                key={m}
                onClick={() => onSpeed(m)}
                title={`Playback speed ${m}×`}
                className="viz-ctrl text-[11px] font-semibold"
                style={{
                  background: mult === m ? "rgba(88,166,255,0.18)" : "transparent",
                  color: mult === m ? "#58a6ff" : "var(--text-secondary)",
                  border: "none",
                }}
              >
                {m}×
              </button>
            ))}
          </div>
          <button
            onClick={onToggleBeginner}
            title="Beginner mode hides the code and only shows plain words"
            className="viz-ctrl text-[11px] font-semibold"
            style={{
              background: beginner ? "rgba(46,160,67,0.15)" : "var(--bg-hover)",
              color: beginner ? "#3fb950" : "var(--text-secondary)",
              border: "1px solid",
              borderColor: beginner ? "rgba(46,160,67,0.4)" : "var(--border-subtle)",
            }}
          >
            {beginner ? "Easy mode ✓" : "Easy mode"}
          </button>
        </div>
      </div>
    </div>
  );
}