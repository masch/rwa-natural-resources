"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const IMPACT_PARAGRAPHS = [
  "El 80% del agua de Córdoba nace en la cuenca hídrica de las Sierras Grandes.",
  "La existencia y salud de esta cuenca, depende directamente de los bosques de altura de Tabaquillo.",
  "Hace 300 años, gran parte de las Sierras era bosque, hoy queda menos del 3%.",
];

export function ImpactText() {
  const containerRef = useRef<HTMLDivElement>(null);
  const paragraphsRef = useRef<HTMLParagraphElement[]>([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      paragraphsRef.current.forEach((paragraph, index) => {
        gsap.from(paragraph, {
          scrollTrigger: {
            trigger: paragraph,
            start: "top 80%",
            end: "top 50%",
            scrub: 1,
          },
          x: 50,
          opacity: 0,
          delay: index * 0.1,
        });
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex h-full flex-col justify-center py-12"
    >
      <div className="space-y-8">
        {IMPACT_PARAGRAPHS.map((text, index) => (
          <p
            key={index}
            ref={(el) => {
              if (el) paragraphsRef.current[index] = el;
            }}
            className="border-musgo text-crema border-l-4 pl-6 text-xl leading-relaxed md:text-2xl md:leading-relaxed"
          >
            {text}
          </p>
        ))}
      </div>
    </div>
  );
}
