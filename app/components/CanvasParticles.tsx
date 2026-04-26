'use client';

import { useEffect, useRef } from 'react';

export default function CanvasParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];

    // Particle Class
    class Particle {
      x: number;
      y: number;
      size: number;
      speedY: number;
      alpha: number;

      constructor(canvasWidth: number, canvasHeight: number) {
        this.x = Math.random() * canvasWidth;
        // Start randomly on screen or slightly below
        this.y = Math.random() * canvasHeight + 100;
        // Varying sizes for depth
        this.size = Math.random() * 2 + 0.5;
        // Move upwards at varying speeds
        this.speedY = -(Math.random() * 1.5 + 0.5);
        // Varying opacities
        this.alpha = Math.random() * 0.5 + 0.2;
      }

      update(canvasWidth: number, canvasHeight: number) {
        this.y += this.speedY;
        // Reset to bottom when it floats off the top
        if (this.y < -10) {
          this.y = canvasHeight + 10;
          this.x = Math.random() * canvasWidth;
        }
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(34, 211, 238, ${this.alpha})`; // Cyan-400
        // Canvas native glow effect
        ctx.shadowBlur = 8;
        ctx.shadowColor = "rgba(34, 211, 238, 0.8)";
        ctx.fill();
      }
    }

    // Handle Resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      // 50 canvas particles is extremely lightweight compared to DOM particles
      for (let i = 0; i < 50; i++) {
        particles.push(new Particle(canvas.width, canvas.height));
      }
    };

    const animate = () => {
      // Clear previous frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach((p) => {
        p.update(canvas.width, canvas.height);
        p.draw(ctx);
      });
      
      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', handleResize);
    
    // Initial setup
    handleResize();
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0 mix-blend-screen opacity-70"
    />
  );
}
