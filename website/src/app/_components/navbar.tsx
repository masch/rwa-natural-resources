"use client";

import { useEffect, useState, useCallback } from "react";

const NAV_LINKS = [
  { id: "impacto", label: "Nuestro Impacto" },
  { id: "mision", label: "¿Por qué?" },
  { id: "trabajo", label: "Nuestro Trabajo" },
  { id: "contacto", label: "Contacto" },
] as const;

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Entrada animada con delay
    const timer = setTimeout(() => setVisible(true), 500);

    // Detectar scroll para cambiar background
    const handleScroll = () => {
      setScrolled(window.scrollY > 100);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const scrollToSection = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const elementPosition = element.offsetTop - offset;
      window.scrollTo({
        top: elementPosition,
        behavior: "smooth",
      });
      setIsOpen(false);
    }
  }, []);

  return (
    <nav
      style={{
        zIndex: 9999,
        ...(scrolled && { backgroundColor: "rgba(0, 0, 0, 0.15)" }),
      }}
      className={`fixed top-0 right-0 left-0 transition-all duration-500 ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
      } ${scrolled ? "shadow-lg backdrop-blur-md" : "bg-transparent"}`}
    >
      <div className="relative container mx-auto py-3">
        {/* Border bottom verde que llega hasta 1/4 desde la izquierda */}
        <div
          className="bg-musgo absolute right-0 bottom-0 h-px w-1/3"
          style={{
            boxShadow: "0 0 8px rgba(143, 188, 143, 0.5)",
          }}
        />

        <div className="flex items-center justify-end">
          {/* Desktop Menu */}
          <div className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) =>
              link.id === "contacto" ? (
                <button
                  key={link.id}
                  onClick={() => scrollToSection(link.id)}
                  className="bg-bosque text-crema hover:bg-bosque-dark rounded-full px-6 py-2 text-sm font-medium transition-all hover:scale-105"
                >
                  {link.label}
                </button>
              ) : (
                <button
                  key={link.id}
                  onClick={() => scrollToSection(link.id)}
                  className="text-crema/90 hover:text-musgo text-sm font-medium transition-colors"
                >
                  {link.label}
                </button>
              ),
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-crema md:hidden"
            aria-label="Toggle menu"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="bg-bosque/95 mt-4 flex flex-col gap-4 rounded-lg p-6 backdrop-blur-lg md:hidden">
            {NAV_LINKS.map((link) =>
              link.id === "contacto" ? (
                <button
                  key={link.id}
                  onClick={() => scrollToSection(link.id)}
                  className="bg-musgo text-bosque hover:bg-musgo-dark rounded-full px-6 py-3 text-center transition-all"
                >
                  {link.label}
                </button>
              ) : (
                <button
                  key={link.id}
                  onClick={() => scrollToSection(link.id)}
                  className="text-crema hover:text-musgo text-left transition-colors"
                >
                  {link.label}
                </button>
              ),
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
