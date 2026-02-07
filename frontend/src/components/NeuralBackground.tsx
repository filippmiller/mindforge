import { useEffect, useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NeuralBackgroundProps {
  state: 'idle' | 'thinking' | 'processing';
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  /** 0-1 opacity multiplier for individual particle */
  alpha: number;
  /** Used during processing convergence / scatter */
  phase: 'normal' | 'converging' | 'scattering';
  /** Lifetime tick counter — used for scatter timing */
  tick: number;
}

interface PulseWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

// ---------------------------------------------------------------------------
// Constants per state
// ---------------------------------------------------------------------------

const STATE_CONFIG = {
  idle: {
    targetCount: 45,
    speed: 0.25,
    connectionDistance: 140,
    connectionOpacity: 0.08,
    particleOpacity: 0.55,
    glowBlur: 4,
    pulseInterval: 0, // no pulses
  },
  thinking: {
    targetCount: 90,
    speed: 0.7,
    connectionDistance: 190,
    connectionOpacity: 0.18,
    particleOpacity: 0.9,
    glowBlur: 10,
    pulseInterval: 60, // frames between pulses (~2s at 30fps)
  },
  processing: {
    targetCount: 70,
    speed: 0.5,
    connectionDistance: 160,
    connectionOpacity: 0.14,
    particleOpacity: 0.75,
    glowBlur: 7,
    pulseInterval: 0,
  },
} as const;

const CYAN = '#00f0ff';
const LINE_COLOR_R = 0;
const LINE_COLOR_G = 80;
const LINE_COLOR_B = 180;

// Target ~30 fps
const FRAME_INTERVAL = 1000 / 30;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function createParticle(width: number, height: number, speed: number): Particle {
  const angle = Math.random() * Math.PI * 2;
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: Math.cos(angle) * speed * randomBetween(0.5, 1.5),
    vy: Math.sin(angle) * speed * randomBetween(0.5, 1.5),
    radius: randomBetween(1.2, 2.8),
    alpha: randomBetween(0.5, 1),
    phase: 'normal',
    tick: 0,
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NeuralBackground({ state }: NeuralBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const pulsesRef = useRef<PulseWave[]>([]);
  const animFrameRef = useRef<number>(0);
  const lastFrameTime = useRef<number>(0);
  const pulseTimer = useRef<number>(0);
  const prevStateRef = useRef<typeof state>(state);
  const processingPhaseRef = useRef<'idle' | 'converge' | 'scatter'>('idle');
  const processingTickRef = useRef(0);

  // -----------------------------------------------------------------------
  // Resize handler — keeps canvas dimensions matched to viewport
  // -----------------------------------------------------------------------
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }, []);

  // -----------------------------------------------------------------------
  // Ensure correct particle count — add or remove smoothly
  // -----------------------------------------------------------------------
  const reconcileParticles = useCallback(
    (target: number, speed: number) => {
      const particles = particlesRef.current;
      const canvas = canvasRef.current;
      if (!canvas) return;

      while (particles.length < target) {
        particles.push(createParticle(canvas.width, canvas.height, speed));
      }
      // Remove excess particles gradually (pop from end)
      if (particles.length > target) {
        // Remove up to 2 per frame for a smooth fade-out effect
        const removeCount = Math.min(2, particles.length - target);
        particles.splice(particles.length - removeCount, removeCount);
      }
    },
    [],
  );

  // -----------------------------------------------------------------------
  // Main animation loop
  // -----------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Initial sizing
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    window.addEventListener('resize', handleResize);

    // Seed initial particles
    const initialCfg = STATE_CONFIG[state];
    for (let i = 0; i < initialCfg.targetCount; i++) {
      particlesRef.current.push(
        createParticle(canvas.width, canvas.height, initialCfg.speed),
      );
    }

    // ----- frame function -----
    const frame = (timestamp: number) => {
      // Throttle to ~30fps
      if (timestamp - lastFrameTime.current < FRAME_INTERVAL) {
        animFrameRef.current = requestAnimationFrame(frame);
        return;
      }
      lastFrameTime.current = timestamp;

      const cfg = STATE_CONFIG[state];
      const particles = particlesRef.current;
      const pulses = pulsesRef.current;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      // --- Handle state transitions ---
      if (prevStateRef.current !== state) {
        if (state === 'processing') {
          processingPhaseRef.current = 'converge';
          processingTickRef.current = 0;
          particles.forEach((p) => {
            p.phase = 'converging';
            p.tick = 0;
          });
        } else {
          processingPhaseRef.current = 'idle';
          particles.forEach((p) => {
            p.phase = 'normal';
          });
        }
        prevStateRef.current = state;
      }

      // Reconcile particle count
      reconcileParticles(cfg.targetCount, cfg.speed);

      // --- Clear ---
      ctx.clearRect(0, 0, w, h);

      // --- Processing phase management ---
      if (state === 'processing') {
        processingTickRef.current++;
        // After 60 ticks (~2s) switch to scatter
        if (
          processingPhaseRef.current === 'converge' &&
          processingTickRef.current > 60
        ) {
          processingPhaseRef.current = 'scatter';
          particles.forEach((p) => {
            p.phase = 'scattering';
            p.tick = 0;
            // Give outward velocity from center
            const dx = p.x - cx;
            const dy = p.y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            p.vx = (dx / dist) * cfg.speed * 3;
            p.vy = (dy / dist) * cfg.speed * 3;
          });
        }
        // After scatter settles (~4s total), return to normal drift
        if (
          processingPhaseRef.current === 'scatter' &&
          processingTickRef.current > 120
        ) {
          processingPhaseRef.current = 'idle';
          particles.forEach((p) => {
            p.phase = 'normal';
            const angle = Math.random() * Math.PI * 2;
            p.vx = Math.cos(angle) * cfg.speed * randomBetween(0.5, 1.5);
            p.vy = Math.sin(angle) * cfg.speed * randomBetween(0.5, 1.5);
          });
        }
      }

      // --- Update particles ---
      for (const p of particles) {
        if (p.phase === 'converging') {
          // Drift toward center
          const dx = cx - p.x;
          const dy = cy - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          p.vx = lerp(p.vx, (dx / dist) * cfg.speed * 2, 0.05);
          p.vy = lerp(p.vy, (dy / dist) * cfg.speed * 2, 0.05);
        } else if (p.phase === 'scattering') {
          // Gradual slow-down
          p.vx *= 0.97;
          p.vy *= 0.97;
        } else {
          // Normal drift — gentle speed adjustment toward target
          const currentSpeed = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 0.01;
          const targetSpeed = cfg.speed * randomBetween(0.9, 1.1);
          const ratio = lerp(1, targetSpeed / currentSpeed, 0.02);
          p.vx *= ratio;
          p.vy *= ratio;
        }

        p.x += p.vx;
        p.y += p.vy;
        p.tick++;

        // Wrap around edges with padding
        const pad = 20;
        if (p.x < -pad) p.x = w + pad;
        if (p.x > w + pad) p.x = -pad;
        if (p.y < -pad) p.y = h + pad;
        if (p.y > h + pad) p.y = -pad;
      }

      // --- Pulse waves (thinking state only) ---
      if (cfg.pulseInterval > 0) {
        pulseTimer.current++;
        if (pulseTimer.current >= cfg.pulseInterval) {
          pulseTimer.current = 0;
          pulses.push({
            x: cx,
            y: cy,
            radius: 0,
            maxRadius: Math.max(w, h) * 0.6,
            alpha: 0.25,
          });
        }
      }

      // Update and draw pulses
      for (let i = pulses.length - 1; i >= 0; i--) {
        const pulse = pulses[i];
        pulse.radius += 3;
        pulse.alpha *= 0.98;
        if (pulse.alpha < 0.005 || pulse.radius > pulse.maxRadius) {
          pulses.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(pulse.x, pulse.y, pulse.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 240, 255, ${pulse.alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // --- Draw connections ---
      const maxDist = cfg.connectionDistance;
      const maxDistSq = maxDist * maxDist;

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distSq = dx * dx + dy * dy;
          if (distSq > maxDistSq) continue;

          const dist = Math.sqrt(distSq);
          const opacity = cfg.connectionOpacity * (1 - dist / maxDist);
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(${LINE_COLOR_R}, ${LINE_COLOR_G}, ${LINE_COLOR_B}, ${opacity})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }

      // --- Draw particles ---
      ctx.shadowColor = CYAN;
      ctx.shadowBlur = cfg.glowBlur;

      for (const p of particles) {
        const alpha = p.alpha * cfg.particleOpacity;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 240, 255, ${alpha})`;
        ctx.fill();
      }

      // Reset shadow so it does not affect next frame's lines
      ctx.shadowBlur = 0;

      // Schedule next frame
      animFrameRef.current = requestAnimationFrame(frame);
    };

    animFrameRef.current = requestAnimationFrame(frame);

    // Cleanup
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
      particlesRef.current = [];
      pulsesRef.current = [];
    };
  }, [state, handleResize, reconcileParticles]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
        background: 'transparent',
      }}
    />
  );
}
