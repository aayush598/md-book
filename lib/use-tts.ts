"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import toast from "react-hot-toast";

export interface TTSVoice {
  name: string;
  lang: string;
}

export type TTSSpeed = 0.5 | 1 | 1.5 | 2;

function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function useTTS() {
  const [enabled, setEnabled] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState<TTSSpeed>(1);
  const [voices, setVoices] = useState<TTSVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voiceLoaded = useRef(false);

  const blockedToastShown = useRef(false);

  useEffect(() => {
    if (!isSpeechSupported()) return;
    const load = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length === 0) return;
      voiceLoaded.current = true;
      setVoices(v.map((v) => ({ name: v.name, lang: v.lang })));
      setSelectedVoice((prev) => {
        if (prev) return prev;
        const en = v.find((v) => v.lang.startsWith("en"));
        return en?.name || v[0].name;
      });
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    if (!voiceLoaded.current) {
      const interval = setInterval(load, 200);
      setTimeout(() => {
        clearInterval(interval);
        if (!voiceLoaded.current && !blockedToastShown.current) {
          blockedToastShown.current = true;
          toast("TTS blocked by browser. In Brave, click the lion icon → turn off \"Prevent fingerprinting\" for this site.", { duration: 6000 });
        }
      }, 3000);
      return () => { clearInterval(interval); window.speechSynthesis.onvoiceschanged = null; };
    }
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  const stop = useCallback(() => {
    if (!isSpeechSupported()) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setPaused(false);
  }, []);

  const speak = useCallback((text: string) => {
    if (!text || !isSpeechSupported()) return;
    if (!voiceLoaded.current && !blockedToastShown.current) {
      blockedToastShown.current = true;
      toast("TTS blocked by browser. In Brave, click the lion icon → turn off \"Prevent fingerprinting\" for this site.", { duration: 6000 });
    }
    if (!enabled) setEnabled(true);
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = speed;
    if (selectedVoice) {
      const found = window.speechSynthesis.getVoices().find((v) => v.name === selectedVoice);
      if (found) u.voice = found;
    }
    u.onstart = () => { setSpeaking(true); setPaused(false); };
    u.onend = () => { setSpeaking(false); setPaused(false); };
    u.onerror = (e) => {
      setSpeaking(false);
      setPaused(false);
      if (e.error !== "canceled") toast.error("TTS error: " + e.error);
    };
    utteranceRef.current = u;
    try {
      window.speechSynthesis.speak(u);
    } catch (e) {
      toast.error("Speech not supported on this browser");
      setSpeaking(false);
    }
  }, [enabled, speed, selectedVoice]);

  const pause = useCallback(() => {
    if (!isSpeechSupported()) return;
    window.speechSynthesis.pause();
    setPaused(true);
  }, []);

  const resume = useCallback(() => {
    if (!isSpeechSupported()) return;
    window.speechSynthesis.resume();
    setPaused(false);
  }, []);

  const toggleEnabled = useCallback(() => {
    if (!isSpeechSupported()) {
      toast.error("Speech not supported on this browser");
      return;
    }
    if (enabled) stop();
    setEnabled((p) => !p);
  }, [enabled, stop]);

  return {
    enabled,
    speaking,
    paused,
    speed,
    voices,
    selectedVoice,
    setEnabled,
    setSpeed,
    setSelectedVoice,
    speak,
    stop,
    pause,
    resume,
    toggleEnabled,
  };
}
