"use client";

import { useCallback, useMemo } from "react";
import { useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  analyseExternalStore,
  analyseServerStore,
  storeAnalysePayload,
  type AnalysePayload,
} from "@/lib/viz/analyse-session";
import VizStudio from "./viz-studio";

const emptySubscribe = () => () => {};

export default function AnalysePage() {
  const router = useRouter();
  const params = useSearchParams();
  const src = params.get("src");
  const titleParam = params.get("title");

  const store = useSyncExternalStore(emptySubscribe, analyseExternalStore, analyseServerStore);

  const payload: AnalysePayload | null = useMemo(() => {
    if (src) {
      return {
        source: src,
        title: titleParam || undefined,
        path: !store.loading ? store.payload?.path : undefined,
        // Enrich with sibling questions when the session still knows them.
        questions: !store.loading ? store.payload?.questions : undefined,
        active: !store.loading && store.payload?.questions
          ? Math.max(0, store.payload.questions.findIndex((q) => q.source === src))
          : undefined,
      };
    }
    if (store.loading) return null;
    return store.payload;
  }, [src, titleParam, store]);

  const replaceUrl = useCallback(
    (nextSource: string, nextTitle?: string) => {
      const sp = new URLSearchParams();
      sp.set("src", nextSource);
      if (nextTitle) sp.set("title", nextTitle);
      router.replace(`/analyse?${sp.toString()}`);
    },
    [router]
  );

  const handleNavigate = useCallback(
    (index: number) => {
      const sheetPath = !store.loading ? store.payload?.path : undefined;
      const questions = !store.loading ? store.payload?.questions : undefined;
      if (!questions || !questions[index]) return;
      const q = questions[index];
      storeAnalysePayload({ source: q.source, title: q.title, path: sheetPath, questions, active: index });
      replaceUrl(q.source, q.title);
    },
    [store, replaceUrl]
  );

  const handleSourceChange = useCallback(
    (nextSource: string, nextTitle?: string) => {
      const sheetPath = !store.loading ? store.payload?.path : undefined;
      const questions = !store.loading ? store.payload?.questions : undefined;
      const active = questions ? Math.max(0, questions.findIndex((q) => q.source === nextSource)) : undefined;
      storeAnalysePayload({
        source: nextSource,
        title: nextTitle || titleParam || undefined,
        path: sheetPath,
        questions,
        active,
      });
      replaceUrl(nextSource, nextTitle || titleParam || undefined);
    },
    [store, replaceUrl, titleParam]
  );

  if (!payload) {
    return (
      <div className="viz-dark flex h-full min-h-[60vh] items-center justify-center" style={{ background: "#0d1117", color: "#e6edf3" }}>
        <div className="viz-spinner" />
      </div>
    );
  }

  if (!payload.source) {
    return (
      <div className="viz-dark flex h-full min-h-[60vh] items-center justify-center p-6" style={{ background: "#0d1117", color: "#e6edf3" }}>
        <div className="w-full max-w-md text-center">
          <p className="text-sm font-medium">Nothing to analyse yet</p>
          <p className="mt-1 text-xs" style={{ color: "#8b949e" }}>
            Open a problem with a Python solution and press <span className="font-semibold">Analyse this solution</span> — it lands here.
          </p>
          <button
            onClick={() => router.push("/")}
            className="viz-ctrl mt-4 px-3 py-1.5 text-xs font-semibold"
            style={{ background: "rgba(88,166,255,0.15)", color: "#58a6ff", border: "1px solid rgba(88,166,255,0.35)" }}
          >
            Go to problems
          </button>
        </div>
      </div>
    );
  }

  return (
    <VizStudio
      source={payload.source}
      title={payload.title}
      path={payload.path}
      questions={payload.questions}
      active={payload.active}
      onBack={() => router.back()}
      onNavigate={payload.questions ? handleNavigate : undefined}
      onSourceChange={handleSourceChange}
    />
  );
}