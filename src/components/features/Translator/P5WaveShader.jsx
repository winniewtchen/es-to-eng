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

// Black/white multi-line wave reminiscent of the reference image.
// Intensity modulates amplitude, thickness, and motion speed.
const FRAG = `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uLevel;   // [0..1]
uniform float uActive;  // 0/1

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

float wave(float x, float t, float k, float p) {
  return sin(x * k + t + p);
}

void main() {
  vec2 uv = gl_FragCoord.xy / max(uResolution, vec2(1.0));
  // Keep aspect stable so the wave looks consistent in a square button.
  float aspect = uResolution.x / max(1.0, uResolution.y);
  vec2 p = uv;
  p.x = (p.x - 0.5) * aspect + 0.5;

  float t = uTime;

  float level = clamp(uLevel, 0.0, 1.0);
  // Slightly non-linear so quiet speech still shows movement.
  float lev = pow(level, 0.65);
  float active = clamp(uActive, 0.0, 1.0);

  float baseAmp = mix(0.010, 0.090, lev) * mix(0.25, 1.0, active);
  float baseThick = mix(0.0008, 0.0045, lev) * mix(0.6, 1.0, active);
  float speed = mix(0.35, 2.2, lev) * mix(0.4, 1.0, active);

  // Gentle center-focus envelope like a "breathe" around the middle.
  float x = p.x;
  float centerEnv = 1.0 - smoothstep(0.35, 0.9, abs(x - 0.5) * 2.0);
  float env = mix(0.25, 1.0, centerEnv);

  float ink = 0.0;
  float y0 = 0.5;

  // Multiple strands with slight phase offsets
  const int N = 10;
  for (int i = 0; i < N; i++) {
    float fi = float(i);
    float phase = hash21(vec2(fi, fi + 10.0)) * 6.2831853;
    float k1 = mix(10.0, 18.0, hash21(vec2(fi, 2.0)));
    float k2 = mix(18.0, 30.0, hash21(vec2(fi, 3.0)));

    float wobble =
      0.55 * wave(x, t * speed, k1, phase) +
      0.35 * wave(x, t * (speed * 0.8), k2, phase * 1.3) +
      0.10 * sin((x - 0.5) * 40.0 - t * speed * 0.6 + phase);

    float y = y0 + wobble * baseAmp * env;

    float d = abs(p.y - y);
    float strand = smoothstep(baseThick * 3.0, baseThick, d);

    // Fade edges slightly; concentrate energy near center.
    float edgeFade = 1.0 - smoothstep(0.0, 0.55, abs(p.y - 0.5));
    ink += strand * edgeFade;
  }

  // Normalize and clamp for stable black lines
  ink = clamp(ink / float(N) * 1.7, 0.0, 1.0);

  // White background, black ink.
  vec3 bg = vec3(1.0);
  vec3 line = vec3(0.0);

  // Subtle grayscale softening so it feels "shader-y" even in black/white.
  float vignette = smoothstep(0.95, 0.35, distance(uv, vec2(0.5)));
  bg = mix(bg, vec3(0.985), (1.0 - vignette) * 0.65);

  vec3 col = mix(bg, line, ink);
  gl_FragColor = vec4(col, 1.0);
}
`;

/**
 * p5 WebGL shader background.
 * - White background, black wave strands
 * - Intensity-driven uniforms for real-time modulation
 */
export default function P5WaveShader({
  level = 0,
  active = false,
  className,
}) {
  const hostRef = useRef(null);
  const p5Ref = useRef(null);
  const uniformsRef = useRef({ level: 0, active: 0 });

  useEffect(() => {
    if (!hostRef.current) return;
    if (p5Ref.current) return;

    const sketch = (p) => {
      let theShader;

      p.setup = () => {
        const { clientWidth, clientHeight } = hostRef.current;
        p.pixelDensity(Math.min(2, window.devicePixelRatio || 1));
        const c = p.createCanvas(
          Math.max(1, clientWidth),
          Math.max(1, clientHeight),
          p.WEBGL
        );
        c.parent(hostRef.current);
        p.noStroke();
        p.rectMode(p.CENTER);
        theShader = p.createShader(VERT, FRAG);
      };

      p.draw = () => {
        if (!theShader) return;
        p.shader(theShader);
        const w = p.width;
        const h = p.height;

        theShader.setUniform("uResolution", [w * p.pixelDensity(), h * p.pixelDensity()]);
        theShader.setUniform("uTime", p.millis() / 1000.0);
        theShader.setUniform("uLevel", uniformsRef.current.level);
        theShader.setUniform("uActive", uniformsRef.current.active);

        // Fullscreen quad (in WEBGL mode, 0,0 is canvas center).
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
      try {
        p5Ref.current?.remove?.();
      } finally {
        p5Ref.current = null;
      }
    };
  }, []);

  // Update uniforms without recreating p5.
  useEffect(() => {
    uniformsRef.current.level = Math.max(0, Math.min(1, level || 0));
    uniformsRef.current.active = active ? 1 : 0;
  }, [level, active]);

  return <div ref={hostRef} className={className} aria-hidden="true" />;
}


