"use client";

import { useEffect, useMemo, useRef } from "react";

interface Token {
  start: number;
  end: number;
  text: string;
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    tokens.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
  }
  return tokens;
}

// Renders speakable text as individual words and highlights the word currently
// being spoken (charIndex comes from the utterance's boundary events).
export default function SpokenText({ text, charIndex }: { text: string; charIndex: number }) {
  const tokens = useMemo(() => tokenize(text), [text]);
  const activeRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    // Keep the spoken word visible inside scrollable containers ("nearest"
    // is a no-op while the word is already on screen).
    if (charIndex >= 0) activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [charIndex]);

  return (
    <span>
      {tokens.map((t, i) => {
        const active = charIndex >= 0 && t.start <= charIndex && charIndex < t.end;
        return (
          <span key={i}>
            <span ref={active ? activeRef : undefined} className={active ? "tts-word-active" : undefined}>{t.text}</span>
            {i < tokens.length - 1 ? " " : null}
          </span>
        );
      })}
    </span>
  );
}
