import { Suspense } from "react";
import type { Metadata } from "next";
import AnalysePage from "@/components/viz/analyse-page";

export const metadata: Metadata = {
  title: "Analyse — step-by-step visualizer",
  description: "Watch a Python solution run step by step, live in your browser",
};

export default function Page() {
  return (
    <main style={{ height: "100dvh", background: "#0d1117" }}>
      <Suspense
        fallback={
          <div className="viz-dark flex h-full items-center justify-center" style={{ background: "#0d1117" }}>
            <div className="viz-spinner" />
          </div>
        }
      >
        <AnalysePage />
      </Suspense>
    </main>
  );
}