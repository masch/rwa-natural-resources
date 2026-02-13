"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface TimelineItemProps {
  year: string;
  stats: {
    value: string;
    label: string;
  }[];
}

export function TimelineItem({ year, stats }: TimelineItemProps) {
  const itemRef = useRef<HTMLDivElement>(null);
  const yearRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Animación del año
      gsap.from(yearRef.current, {
        scrollTrigger: {
          trigger: itemRef.current,
          start: "top 80%",
          end: "top 50%",
          scrub: 1,
        },
        x: -50,
        opacity: 0,
      });

      // Animación de las estadísticas
      gsap.from(statsRef.current?.children || [], {
        scrollTrigger: {
          trigger: itemRef.current,
          start: "top 75%",
          end: "top 45%",
          scrub: 1,
        },
        x: -30,
        opacity: 0,
        stagger: 0.1,
      });
    }, itemRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={itemRef} className="relative flex items-start gap-6">
      {/* Línea vertical y punto */}
      <div className="flex flex-col items-center">
        {/* Punto del timeline */}
        <div className="bg-musgo ring-bosque z-10 h-4 w-4 rounded-full shadow-lg ring-4" />
        {/* Línea vertical */}
        <div className="bg-musgo/40 mt-2 h-full min-h-[200px] w-0.5" />
      </div>

      {/* Contenido */}
      <div className="flex-1 pb-16">
        {/* Año */}
        <div
          ref={yearRef}
          className="text-musgo mb-6 text-5xl font-bold md:text-6xl"
        >
          {year}
        </div>

        {/* Estadísticas */}
        <div ref={statsRef} className="space-y-4">
          {stats.map((stat, index) => (
            <div key={index} className="group">
              <div className="text-crema text-3xl font-bold md:text-4xl">
                {stat.value}
              </div>
              <div className="text-crema/80 text-lg md:text-xl">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
