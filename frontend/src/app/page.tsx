"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthButton } from "@/components/AuthButton";
import { Page } from "@/components/PageLayout";
import clsx from "clsx";

export default function Home() {
  const searchParams = useSearchParams();
  type Particle = {
    x: number;
    y: number;
    size: number;
    speed: number;
    opacity: number;
  };
  const [particles, setParticles] = useState<Particle[]>([]);
  const [showButton, setShowButton] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Play intro sound
  useEffect(() => {
    audioRef.current = new Audio("/sounds/intro.wav");
    audioRef.current.volume = 0.3;

    const playAudio = () => {
      if (audioRef.current) {
        audioRef.current.play().catch((err) => {
          console.warn("Autoplay blocked:", err);
        });
      }
      document.removeEventListener("click", playAudio);
    };

    document.addEventListener("click", playAudio);

    return () => {
      document.removeEventListener("click", playAudio);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Handle invite code
  useEffect(() => {
    const invite = searchParams.get("invite");
    if (invite) {
      localStorage.setItem("inviteCode", invite);
    }
  }, [searchParams]);

  // Show button after animations complete
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowButton(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Initialize particles
  useEffect(() => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 30; i++) {
      newParticles.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        speed: Math.random() * 0.5 + 0.2,
        opacity: Math.random() * 0.5 + 0.1,
      });
    }
    setParticles(newParticles);
  }, []);

  // Animate particles
  useEffect(() => {
    if (particles.length === 0) return;

    const interval = setInterval(() => {
      setParticles((prev) =>
        prev.map((p) => ({
          ...p,
          y: (p.y - p.speed) % 100,
          x: (p.x + (Math.random() - 0.5) * 0.5) % 100,
        }))
      );
    }, 50);

    return () => clearInterval(interval);
  }, [particles.length]);

  return (
    <Page>
      <Page.Main className="flex flex-col items-center justify-center min-h-screen p-0">
        <div className="relative w-screen h-screen bg-white dark:bg-black overflow-hidden flex flex-col items-center justify-center">
          {/* Animated background elements */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-black dark:from-white to-transparent opacity-5"></div>
            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black dark:from-white to-transparent opacity-5"></div>
          </div>

          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.1) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(0,0,0,0.1) 1px, transparent 1px)`,
              backgroundSize: "50px 50px",
            }}
          ></div>

          {/* Animated particles */}
          {particles.map((particle, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-black dark:bg-white"
              style={{
                top: `${particle.y}%`,
                left: `${particle.x}%`,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                opacity: particle.opacity,
              }}
            />
          ))}

          {/* Pulsing circles */}
          <div className="absolute w-80 h-80 rounded-full border border-black dark:border-white opacity-5 animate-ping-slow"></div>
          <div className="absolute w-96 h-96 rounded-full border border-black dark:border-white opacity-3 animate-ping-slower"></div>

          {/* Main content */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center px-6">
            <h1 className="text-black dark:text-white text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-[0.2em] mb-8 animate-fade-in">
              WATCH REVIEW EARN
            </h1>
            <div className="w-40 h-0.5 bg-gradient-to-r from-transparent via-black to-transparent dark:via-white opacity-70 mb-8 animate-expand"></div>

            <p className="uppercase text-black dark:text-white text-base md:text-xl font-medium tracking-[0.3em] opacity-90 mb-3 animate-fade-in-delay">
              Where Movies Meet Web3
            </p>
            <p className="text-black dark:text-white text-sm md:text-lg italic font-light tracking-wide opacity-70 animate-fade-in-delay-2">
              Own your reviews. Share your voice.
            </p>

            {/* Auth Button */}
            <div
              className={clsx(
                "mt-12 transition-all duration-1000",
                showButton
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              )}
            >
              <AuthButton />
            </div>
          </div>
        </div>
      </Page.Main>
    </Page>
  );
}