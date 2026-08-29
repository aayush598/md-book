"use client";

import type { Scene } from "@/lib/viz/layout";
import { ArrayBars, DequeViz, HeatGrid, StackViz } from "./primitives";

export default function VizScene({ scenes, tall }: { scenes: Scene[]; tall?: boolean }) {
  if (!scenes.length) {
    return (
      <div className="viz-scene-empty">
        <div className="viz-empty">Nothing interesting to draw on this step.</div>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-start gap-3">
      {scenes.map((scene) => {
        switch (scene.role) {
          case "bars":
            return <ArrayBars key={scene.name} scene={scene} tall={tall} />;
          case "grid":
            return <HeatGrid key={scene.name} scene={scene} tall={tall} />;
          case "stack":
            return <StackViz key={scene.name} scene={scene} />;
          case "deque":
            return <DequeViz key={scene.name} scene={scene} />;
          default:
            return null;
        }
      })}
    </div>
  );
}