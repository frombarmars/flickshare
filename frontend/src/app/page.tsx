"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  type Particle = {
    x: number;
    y: number;
    size: number;
    speed: number;
    opacity: number;
  };
  const [particles, setParticles] = useState<Particle[]>([]);
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
      document.removeEventListener('click', playAudio);
    };

    document.addEventListener('click', playAudio);

    return () => {
      document.removeEventListener('click', playAudio);
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

  // Redirect after delay
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/wallet-login");
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  // Initialize particles
  useEffect(() => {
    const initParticles = () => {
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
    };

    initParticles();
  }, []);

  // Animate particles
  useEffect(() => {
    if (particles.length === 0) return;

    const interval = setInterval(() => {
      setParticles(prev =>
        prev.map(p => ({
          ...p,
          y: (p.y - p.speed) % 100,
          x: (p.x + (Math.random() - 0.5) * 0.5) % 100
        }))
      );
    }, 50);

    return () => clearInterval(interval);
  }, [particles.length]);

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden flex flex-col items-center justify-center">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white to-transparent opacity-5"></div>
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-white to-transparent opacity-5"></div>
      </div>

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                          linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
        backgroundSize: '50px 50px'
      }}></div>

      {/* Animated particles */}
      {particles.map((particle, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
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
      <div className="absolute w-80 h-80 rounded-full border border-white opacity-5 animate-ping-slow"></div>
      <div className="absolute w-96 h-96 rounded-full border border-white opacity-3 animate-ping-slower"></div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6">
        <h1 className="bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-white 
                 text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-[0.2em] mb-8 animate-fade-in">
          WATCH  REVIEW  EARN
        </h1>

        <div className="w-40 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent opacity-70 mb-8 animate-expand"></div>

        <p className="uppercase text-white text-base md:text-xl font-medium tracking-[0.3em] opacity-90 mb-3 animate-fade-in-delay">
          Where Movies Meet Web3
        </p>
        <p className="text-white text-sm md:text-lg italic font-light tracking-wide opacity-70 animate-fade-in-delay-2">
          Own your reviews. Share your voice.
        </p>
      </div>

      {/* Loading indicator */}
      <div className="absolute bottom-12 w-40 h-1 bg-white/20 rounded overflow-hidden">
        <div className="h-full bg-white/70 rounded animate-loading-bar"></div>
      </div>

      <style>{`
        @keyframes fade-in {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 2s ease-out forwards;
        }
        .animate-fade-in-delay {
          animation: fade-in 2s ease-out 0.5s forwards;
          opacity: 0;
        }
        .animate-fade-in-delay-2 {
          animation: fade-in 2s ease-out 1s forwards;
          opacity: 0;
        }
        
        @keyframes expand {
          0% {
            transform: scaleX(0);
          }
          100% {
            transform: scaleX(1);
          }
        }
        .animate-expand {
          animation: expand 2s ease-out forwards;
          transform-origin: left;
        }
        
        @keyframes ping-slow {
          0% {
            transform: scale(0.8);
            opacity: 0.1;
          }
          50% {
            opacity: 0.05;
          }
          100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }
        .animate-ping-slow {
          animation: ping-slow 4s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        .animate-ping-slower {
          animation: ping-slow 6s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        
        @keyframes loading-bar {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(0%);
          }
        }
        .animate-loading-bar {
          animation: loading-bar 5s linear forwards;
          transform-origin: left;
        }
      `}</style>
    </div>
  );
}