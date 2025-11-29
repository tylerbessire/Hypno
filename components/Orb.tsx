import React, { useEffect, useRef } from 'react';
import { ThemeType } from './Intake';

interface OrbProps {
  isActive: boolean;
  volume: number; // 0 to 1
  state: 'listening' | 'speaking' | 'processing' | 'idle';
  theme: ThemeType;
}

const Orb: React.FC<OrbProps> = ({ isActive, volume, state, theme }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const render = () => {
      time += 0.05;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      let baseRadius = 80;
      let pulse = 0;
      
      if (state === 'speaking') {
        pulse = volume * 50; 
      } else if (state === 'listening') {
        pulse = Math.sin(time * 2) * 5;
      } else {
        pulse = Math.sin(time) * 3;
      }

      const radius = baseRadius + pulse;

      // Define Theme Colors
      let colorStart = '';
      let colorMid = '';
      let colorEnd = '';
      let glowColor = '';

      if (state === 'speaking') {
         // Active/Speaking Colors per theme
         switch(theme) {
             case 'forest':
                 // Gold/Warm light
                 colorStart = 'rgba(250, 204, 21, 0.9)'; // Yellow 400
                 colorMid = 'rgba(234, 179, 8, 0.5)'; // Yellow 500
                 colorEnd = 'rgba(161, 98, 7, 0)'; // Yellow 800
                 glowColor = 'rgba(250, 204, 21, 0.1)';
                 break;
             case 'ocean':
                 // Cyan/Blue
                 colorStart = 'rgba(34, 211, 238, 0.9)'; // Cyan 400
                 colorMid = 'rgba(6, 182, 212, 0.5)'; // Cyan 500
                 colorEnd = 'rgba(21, 94, 117, 0)'; // Cyan 800
                 glowColor = 'rgba(34, 211, 238, 0.1)';
                 break;
             case 'sunrise':
                 // Orange/Rose
                 colorStart = 'rgba(251, 146, 60, 0.9)'; // Orange 400
                 colorMid = 'rgba(249, 115, 22, 0.5)'; // Orange 500
                 colorEnd = 'rgba(154, 52, 18, 0)'; // Orange 800
                 glowColor = 'rgba(251, 146, 60, 0.1)';
                 break;
             case 'sage':
                 // Emerald/Stone
                 colorStart = 'rgba(52, 211, 153, 0.9)'; // Emerald 400
                 colorMid = 'rgba(16, 185, 129, 0.5)'; // Emerald 500
                 colorEnd = 'rgba(28, 25, 23, 0)'; // Stone 900
                 glowColor = 'rgba(52, 211, 153, 0.1)';
                 break;
             case 'nebula':
             default:
                 // Violet/Purple
                 colorStart = 'rgba(167, 139, 250, 0.9)'; // Violet 400
                 colorMid = 'rgba(139, 92, 246, 0.5)'; // Violet 500
                 colorEnd = 'rgba(76, 29, 149, 0)'; // Violet 900
                 glowColor = 'rgba(167, 139, 250, 0.1)';
                 break;
         }
      } else {
         // Idle/Listening Colors per theme
         switch(theme) {
            case 'forest':
                // Emerald
                colorStart = 'rgba(52, 211, 153, 0.9)'; 
                colorMid = 'rgba(16, 185, 129, 0.5)';
                colorEnd = 'rgba(6, 78, 59, 0)';
                glowColor = 'rgba(52, 211, 153, 0.1)';
                break;
            case 'ocean':
                // Blue
                colorStart = 'rgba(96, 165, 250, 0.9)';
                colorMid = 'rgba(59, 130, 246, 0.5)';
                colorEnd = 'rgba(30, 58, 138, 0)';
                glowColor = 'rgba(96, 165, 250, 0.1)';
                break;
            case 'sunrise':
                // Rose
                colorStart = 'rgba(251, 113, 133, 0.9)';
                colorMid = 'rgba(244, 63, 94, 0.5)';
                colorEnd = 'rgba(136, 19, 55, 0)';
                glowColor = 'rgba(251, 113, 133, 0.1)';
                break;
            case 'sage':
                // Teal/Slate
                colorStart = 'rgba(20, 184, 166, 0.9)'; // Teal 500
                colorMid = 'rgba(13, 148, 136, 0.5)'; // Teal 600
                colorEnd = 'rgba(28, 25, 23, 0)'; // Stone 900
                glowColor = 'rgba(20, 184, 166, 0.1)';
                break;
            case 'nebula':
            default:
                // Teal (default listening state from before)
                colorStart = 'rgba(45, 212, 191, 0.9)';
                colorMid = 'rgba(20, 184, 166, 0.5)';
                colorEnd = 'rgba(17, 94, 89, 0)';
                glowColor = 'rgba(45, 212, 191, 0.1)';
                break;
        }
      }

      if (state === 'idle' && !isActive) {
         // Greyed out when not active
         colorStart = 'rgba(148, 163, 184, 0.9)'; 
         colorMid = 'rgba(71, 85, 105, 0.5)';
         colorEnd = 'rgba(15, 23, 42, 0)';
         glowColor = 'rgba(148, 163, 184, 0.05)';
      }

      const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.2, centerX, centerY, radius);
      gradient.addColorStop(0, colorStart);
      gradient.addColorStop(0.6, colorMid);
      gradient.addColorStop(1, colorEnd);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();

      // Outer Glow Ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.2 + Math.sin(time * 3)*2, 0, Math.PI * 2);
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isActive, volume, state, theme]);

  return (
    <div className="relative flex items-center justify-center w-64 h-64 md:w-96 md:h-96 transition-all duration-1000">
      <canvas 
        ref={canvasRef} 
        width={400} 
        height={400} 
        className="w-full h-full"
      />
    </div>
  );
};

export default Orb;