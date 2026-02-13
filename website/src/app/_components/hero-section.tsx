"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";

gsap.registerPlugin(ScrollTrigger);

export function HeroSection() {
  const heroRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const impactTextRef = useRef<HTMLDivElement>(null);
  const ctaButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Animación profesional del título - fade in con movimiento sutil
      const title = titleRef.current;
      if (!title) return;

      const letters = title.querySelectorAll(".letter");

      letters.forEach((letter, letterIndex) => {
        // El logo no se anima
        const isLogo = letter === logoRef.current;

        if (!isLogo) {
          gsap.from(letter, {
            y: 30,
            opacity: 0,
            duration: 0.8,
            ease: "power3.out",
            delay: 0.2 + letterIndex * 0.03,
          });
        }
      });

      // Animación del subtítulo - fade in suave
      gsap.from(subtitleRef.current, {
        y: 20,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        delay: 1.2,
      });

      // Animación del botón CTA
      gsap.from(ctaButtonRef.current, {
        y: 20,
        opacity: 0,
        scale: 0.9,
        duration: 1,
        ease: "power3.out",
        delay: 1.5,
      });

      // Animación del video - fade in profesional
      gsap.from(videoRef.current, {
        x: 50,
        opacity: 0,
        scale: 0.95,
        duration: 1.2,
        ease: "power3.out",
        delay: 0.8,
      });

      // Animaciones del Timeline
      if (timelineRef.current) {
        const timelineItems =
          timelineRef.current.querySelectorAll(".timeline-item");
        timelineItems.forEach((item) => {
          const year = item.querySelector(".timeline-year");
          const stats = item.querySelectorAll(".timeline-stat");

          gsap.from(year, {
            scrollTrigger: {
              trigger: item,
              start: "top 80%",
              end: "top 50%",
              scrub: 1,
            },
            x: -50,
            opacity: 0,
          });

          gsap.from(stats, {
            scrollTrigger: {
              trigger: item,
              start: "top 75%",
              end: "top 45%",
              scrub: 1,
            },
            x: -30,
            opacity: 0,
            stagger: 0.1,
          });
        });
      }

      // Animaciones del texto de impacto
      if (impactTextRef.current) {
        const paragraphs = impactTextRef.current.querySelectorAll("p");
        paragraphs.forEach((paragraph, index) => {
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
      }
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="hero"
      ref={heroRef}
      className="relative flex min-h-screen w-screen flex-col items-start justify-center"
    >
      {/* Background image with overlay - FIXED */}
      <div className="fixed inset-0 z-0">
        <div
          className="h-full w-full bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/gente.png')",
          }}
        />
        <div className="absolute inset-0 bg-linear-to-b from-black/60 via-black/40 to-black/70" />
      </div>

      {/* Content - Two columns layout */}
      <div className="relative z-10 grid h-auto w-full grid-cols-1 px-6 py-8 md:grid-cols-2">
        {/* Columna izquierda - Título */}
        <div className="flex h-full w-full cursor-default flex-col items-center justify-start pt-16 md:pt-20 lg:pt-24">
          {/* Wrapper centrado con contenido alineado a la izquierda */}
          <div className="flex flex-col items-start">
            {/* Título animado por palabras */}
            <div
              ref={titleRef}
              className="flex flex-wrap items-center justify-start gap-2 text-3xl font-bold md:gap-3 md:text-4xl lg:text-5xl xl:text-6xl"
            >
              {/* Palabra BOSQUES con logo como O */}
              <div className="word flex items-center">
                {"B".split("").map((letter, i) => (
                  <span
                    key={`b-${letter}-${i}`}
                    className="letter text-crema inline-block drop-shadow-lg"
                  >
                    {letter}
                  </span>
                ))}
                {/* Logo reemplazando la O */}
                <div
                  ref={logoRef}
                  className="letter inline-flex items-start justify-center"
                  style={{
                    width: "0.9em",
                    height: "0.9em",
                    marginTop: "-0.1em",
                  }}
                >
                  <Image
                    src="/lgoo.webp"
                    alt="O"
                    width={100}
                    height={100}
                    className="h-full w-full object-contain drop-shadow-2xl"
                    priority
                  />
                </div>
                {"SQUES".split("").map((letter, i) => (
                  <span
                    key={`sques-${letter}-${i}`}
                    className="letter text-crema inline-block drop-shadow-lg"
                  >
                    {letter}
                  </span>
                ))}
              </div>

              {/* Palabra DE */}
              <div className="word flex items-center">
                {"DE".split("").map((letter, i) => (
                  <span
                    key={`de-${letter}-${i}`}
                    className="letter text-crema inline-block drop-shadow-lg"
                  >
                    {letter}
                  </span>
                ))}
              </div>

              {/* Palabra AGUA */}
              <div className="word flex items-center">
                {"AGUA".split("").map((letter, i) => (
                  <span
                    key={`agua-${letter}-${i}`}
                    className="letter text-crema inline-block drop-shadow-lg"
                  >
                    {letter}
                  </span>
                ))}
              </div>
            </div>
            {/* Subtítulo */}
            <p
              ref={subtitleRef}
              className="text-crema mt-6 text-left text-lg md:text-2xl"
            >
              Restauramos las Sierras Grandes de Córdoba, Argentina.
              <br />
              Por el agua de la humanidad.
            </p>

            {/* Botón CTA */}
            <button
              ref={ctaButtonRef}
              className="group bg-musgo text-bosque hover:bg-musgo-light hover:shadow-musgo/50 relative mt-8 cursor-pointer overflow-hidden rounded-full px-8 py-4 font-semibold transition-all duration-300 hover:scale-105 hover:shadow-2xl"
            >
              <span className="relative z-10 flex items-center gap-2">
                Quiero contactarme
                <svg
                  className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </span>
              {/* Efecto de brillo al hover */}
              <div className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            </button>
          </div>
        </div>

        {/* Columna derecha - Video de YouTube */}
        <div className="flex h-full w-full items-start justify-center pt-16">
          <div ref={videoRef} className="relative w-full max-w-2xl">
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl shadow-2xl">
              <iframe
                src="https://www.youtube.com/embed/KcrHSzbTXis?autoplay=1&mute=1&rel=0&loop=1&playlist=KcrHSzbTXis"
                // src="https://www.youtube.com/embed/KcrHSzbTXis?autoplay=1&mute=1&rel=0&loop=1&playlist=KcrHSzbTXis"
                title="Bosques De Agua - Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Timeline + Impact Text Section */}
      <div className="relative z-10 w-full px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-16 lg:gap-24">
            {/* Columna izquierda - Timeline */}
            <div ref={timelineRef} className="flex flex-col justify-center">
              {/* Timeline Item 2022 */}
              <div className="timeline-item relative flex items-start gap-6">
                {/* Línea vertical y punto */}
                <div className="flex flex-col items-center">
                  <div className="bg-musgo ring-bosque/50 z-10 h-4 w-4 rounded-full shadow-lg ring-4" />
                  <div className="bg-musgo/40 mt-2 h-full min-h-[200px] w-0.5" />
                </div>

                {/* Contenido */}
                <div className="flex-1 pb-16">
                  <div className="timeline-year text-musgo mb-6 text-5xl font-bold md:text-6xl">
                    2022
                  </div>
                  <div className="space-y-4">
                    <div className="timeline-stat">
                      <div className="text-crema text-3xl font-bold md:text-4xl">
                        100.000
                      </div>
                      <div className="text-crema/80 text-lg md:text-xl">
                        Árboles plantados
                      </div>
                    </div>
                    <div className="timeline-stat">
                      <div className="text-crema text-3xl font-bold md:text-4xl">
                        70
                      </div>
                      <div className="text-crema/80 text-lg md:text-xl">
                        Hectáreas protegidas
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline Item 2023 */}
              <div className="timeline-item relative flex items-start gap-6">
                {/* Línea vertical y punto */}
                <div className="flex flex-col items-center">
                  <div className="bg-musgo ring-bosque/50 z-10 h-4 w-4 rounded-full shadow-lg ring-4" />
                </div>

                {/* Contenido */}
                <div className="flex-1">
                  <div className="timeline-year text-musgo mb-6 text-5xl font-bold md:text-6xl">
                    2023
                  </div>
                  <div className="space-y-4">
                    <div className="timeline-stat">
                      <div className="text-crema text-3xl font-bold md:text-4xl">
                        300.000
                      </div>
                      <div className="text-crema/80 text-lg md:text-xl">
                        Árboles plantando
                      </div>
                    </div>
                    <div className="timeline-stat">
                      <div className="text-crema text-3xl font-bold md:text-4xl">
                        5,000
                      </div>
                      <div className="text-crema/80 text-lg md:text-xl">
                        Hectáreas protegiendo
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna derecha - Texto de impacto */}
            <div
              ref={impactTextRef}
              className="flex flex-col justify-center space-y-8"
            >
              <p className="border-musgo text-crema border-l-4 pl-6 text-xl leading-relaxed md:text-2xl md:leading-relaxed">
                El 80% del agua de Córdoba nace en la cuenca hídrica de las
                Sierras Grandes.
              </p>
              <p className="border-musgo text-crema border-l-4 pl-6 text-xl leading-relaxed md:text-2xl md:leading-relaxed">
                La existencia y salud de esta cuenca, depende directamente de
                los bosques de altura de Tabaquillo.
              </p>
              <p className="border-musgo text-crema border-l-4 pl-6 text-xl leading-relaxed md:text-2xl md:leading-relaxed">
                Hace 300 años, gran parte de las Sierras era bosque, hoy queda
                menos del 3%.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
