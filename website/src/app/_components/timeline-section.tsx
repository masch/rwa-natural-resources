"use client";

import { VerticalTimeline } from "./timeline/vertical-timeline";
import { ImpactText } from "./timeline/impact-text";

export function TimelineSection() {
  return (
    <section className="relative z-10 min-h-screen w-full bg-gradient-to-b from-transparent via-bosque/80 to-bosque">
      <div className="container mx-auto px-6 py-20">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-16 lg:gap-24">
          {/* Columna izquierda - Timeline */}
          <div className="flex items-center">
            <VerticalTimeline />
          </div>

          {/* Columna derecha - Texto de impacto */}
          <div className="flex items-center">
            <ImpactText />
          </div>
        </div>
      </div>
    </section>
  );
}
