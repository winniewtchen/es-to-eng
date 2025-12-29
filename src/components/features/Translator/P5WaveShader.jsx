import React, { useEffect, useRef } from "react";
import p5 from "p5";

const VERT = `
precision highp float;

attribute vec3 aPosition;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

void main() {
  gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);
}
`;

// Clean, high-contrast, multi-color sine waves
const FRAG = `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uLevel;   // [0..1]
uniform float uActive;  // [0..1]

// Color palette
const vec3 c1 = vec3(0.3, 0.4, 1.0); // Blue-ish
const vec3 c2 = vec3(1.0, 0.2, 0.6); // Pink-ish

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  
  float t = uTime;
  float level = clamp(uLevel, 0.0, 1.0);
  
  // Non-linear intensity curve for more dynamic range
  float intensity = pow(level, 0.8) * 1.5; 
  float active = smoothstep(0.0, 0.2, uActive);
  
  // Base alpha accumulation
  vec3 finalColor = vec3(0.0);
  float finalAlpha = 0.0;
  
  // Limit to 5 lines as requested
  const int N = 5;
  
  for (int i = 0; i < N; i++) {
    float fi = float(i);
    // Normalize index 0..1
    float normIndex = fi / float(N - 1); 
    
    // Each line has a unique speed and frequency offset
    float speed = 2.0 + normIndex * 1.5;
    float freq = 3.0 + normIndex * 2.0;
    float phase = t * speed + fi * 1.234;
    
    // Main sine wave
    // Amplitude modulation: 
    // - Base breathing (active state)
    // - Voice reaction (intensity)
    float baseAmp = 0.05 + 0.3 * intensity; 
    
    // Complex wave shape: main sine + harmonic
    float wave = sin(uv.x * freq + phase) 
               + 0.5 * sin(uv.x * freq * 0.5 - phase * 0.5);
               
    // Center at 0.5, scale by amplitude
    float y = 0.5 + wave * baseAmp * 0.3; // 0.3 scales the wave to fit nicely
    
    // Distance from current pixel to the wave line
    float d = abs(uv.y - y);
    
    // Line thickness varies slightly with intensity
    float thickness = 0.006 + 0.005 * intensity;
    
    // Soft glowy edge, but sharp core
    float line = smoothstep(thickness + 0.02, thickness, d);
    
    // Gradient color across X
    vec3 col = mix(c1, c2, uv.x + 0.2 * sin(t + fi));
    
    // Accumulate
    finalColor += col * line;
    finalAlpha += line;
  }
  
  // Fade out at edges (left/right)
  float edgeFade = smoothstep(0.0, 0.2, uv.x) * smoothstep(1.0, 0.8, uv.x);
  finalAlpha *= edgeFade * active;
  finalColor *= edgeFade * active;
  
  // Add global activity fade
  finalAlpha *= smoothstep(0.0, 0.1, uActive);

  gl_FragColor = vec4(finalColor, finalAlpha);
}
`;

export default function P5WaveShader({
  level = 0,
  active = false,
  className,
}) {
  const hostRef = useRef(null);
  const p5Ref = useRef(null);
  const stateRef = useRef({
    targetActive: 0,
    currentActive: 0,
    level: 0
  });

  useEffect(() => {
    stateRef.current.level = Math.max(0, Math.min(1, level || 0));
    stateRef.current.targetActive = active ? 1 : 0;
  }, [level, active]);

  useEffect(() => {
    if (!hostRef.current) return;
    if (p5Ref.current) return;

    const sketch = (p) => {
      let theShader;

      p.setup = () => {
        const { clientWidth, clientHeight } = hostRef.current;
        p.pixelDensity(Math.min(2, window.devicePixelRatio || 1));
        p.setAttributes('alpha', true);
        
        const c = p.createCanvas(
          Math.max(1, clientWidth),
          Math.max(1, clientHeight),
          p.WEBGL
        );
        c.parent(hostRef.current);
        p.noStroke();
        theShader = p.createShader(VERT, FRAG);
      };

      p.draw = () => {
        if (!theShader) return;
        p.clear(); // Important for transparency
        p.shader(theShader);
        
        const w = p.width;
        const h = p.height;
        
        const s = stateRef.current;
        // Smooth transition for active state
        s.currentActive += (s.targetActive - s.currentActive) * 0.1;

        if (Math.abs(s.currentActive) < 0.001 && s.targetActive === 0) {
           s.currentActive = 0;
        }

        theShader.setUniform("uResolution", [w * p.pixelDensity(), h * p.pixelDensity()]);
        theShader.setUniform("uTime", p.millis() / 1000.0);
        theShader.setUniform("uLevel", s.level);
        theShader.setUniform("uActive", s.currentActive);

        p.rect(0, 0, w, h);
      };

      p.windowResized = () => {
        if (!hostRef.current) return;
        const { clientWidth, clientHeight } = hostRef.current;
        p.resizeCanvas(Math.max(1, clientWidth), Math.max(1, clientHeight));
      };
    };

    p5Ref.current = new p5(sketch);
    return () => {
      p5Ref.current?.remove();
      p5Ref.current = null;
    };
  }, []);

  return <div ref={hostRef} className={className} aria-hidden="true" />;
}
