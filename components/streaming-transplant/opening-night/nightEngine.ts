/**
 * #262: the opening night's animation, drawn entirely in code. Zeesh (2026-11-05): "i wanted the openng night to be made with yk better naimation screen and stuff rather
 * htan using images" and "high quality and kafi cool and tagde aniamtion bananaa".
 *
 * One set of lights runs through the whole night: a stadium of phones and a drone show's countdown, then the service's logo, then the turning world, a city's windows, and
 * the control room's board. Each is a Formation (nightFormations.ts), and the lights fly from one to the next on the graphics card, so the night is one continuous thing and
 * not a run of cuts. The main thread only sets a few numbers a frame.
 *
 * A frame: a soft sky at two thirds of the screen's size (beams, the stage, the globe's air, a skyline); the lights once more at a quarter of the size, blurred, for their glow;
 * then the two together and the lights themselves on top, sharp.
 *
 * It watches its own frame times and steps down (a smaller canvas, then fewer lights) if a phone cannot keep up. No WebGL: `createNightEngine` returns null, and the night
 * plays on its words and numbers alone.
 */
export const NIGHT_LIGHTS = 14000;
/** the first lights are the ones a formation most needs (a number's strokes, the cities): stepping down drops only those after them */
export const NIGHT_LEAD_LIGHTS = 3400;

/** GLOBE and STREAM keep a longitude and a latitude, in radians, where the others keep x and y */
export const KIND = { DOT: 0, WINDOW: 1, FIREWORK: 3, FALLING: 4, GLOBE: 5, STREAM: 6, RISING: 7 } as const;

export interface Formation {
  /** x, y, in CSS pixels */
  pos: Float32Array;
  /** size, alpha */
  look: Float32Array;
  /** r, g, b */
  color: Float32Array;
  /** when this light comes on, in the seconds of its formation; below zero: from the start */
  act: Float32Array;
  kind: Float32Array;
}

export const blankFormation = (): Formation => ({
  pos: new Float32Array(NIGHT_LIGHTS * 2),
  look: new Float32Array(NIGHT_LIGHTS * 2),
  color: new Float32Array(NIGHT_LIGHTS * 3),
  act: new Float32Array(NIGHT_LIGHTS).fill(-1),
  kind: new Float32Array(NIGHT_LIGHTS),
});

/** where a place is on the turned globe: x right, y up, z towards the viewer. The vertex shader does the same sums. */
export const globePoint = (lon: number, lat: number, spin: number, tilt: number): [number, number, number] => {
  const c = Math.cos(lat);
  const x0 = c * Math.sin(lon);
  const y0 = Math.sin(lat);
  const z0 = c * Math.cos(lon);
  const cs = Math.cos(spin);
  const ss = Math.sin(spin);
  const x = x0 * cs + z0 * ss;
  const z1 = z0 * cs - x0 * ss;
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  return [x, y0 * ct - z1 * st, y0 * st + z1 * ct];
};

/** eight o'clock starts at the date line and moves west: the easternmost city first. A small network still gets a turn of the world, with itself in the middle. */
export const eveningOf = (lngs: number[]): { east: number; range: number } => {
  if (!lngs.length) return { east: 90, range: 120 };
  const east = Math.max(...lngs);
  const covered = east - Math.min(...lngs);
  const range = Math.max(80, covered);
  return { east: east + (range - covered) / 2, range };
};

/** what the lights are doing right now: set freely each frame */
export interface NightLook {
  phase: number;
  sway: number;
  twinkle: number;
  hover: number;
  dim: number;
  zoom: number;
  focus: [number, number];
  center: [number, number];
  waveFront: number;
  waveWidth: number;
  waveGain: number;
  accent: [number, number, number];
  /* the whole picture, sky too */
  fade: number;
  fall: number;
  bloom: number;
  /* #264: which way the rising lights go: up, or on a bad night, down */
  rise: number;
  /* the globe: its centre and radius in CSS pixels, its tilt, how far it has turned, and where the streams leave from */
  globe: [number, number, number, number];
  spin: number;
  hub: [number, number];
  /* the sky, which eases to these by itself */
  top: [number, number, number];
  bottom: [number, number, number];
  horizon: number;
  glow: number;
  beams: number;
  stage: number;
  atmosphere: number;
  city: number;
  brand: [number, number, number];
  lift: [number, number, number];
}

export interface NightEngine {
  look: NightLook;
  width: number;
  height: number;
  /** jump to a formation */
  snap: (formation: Formation) => void;
  /** fly to a formation */
  morph: (formation: Formation, options: { seconds: number; stagger?: number; swirl?: number; glow?: number }) => void;
  /** where the globe's lights are now becomes where they are, so they can leave it */
  bakeGlobe: () => void;
  /** draw only the first so many lights from now on: a page that stays up should not cost what the show did */
  keepLights: (count: number) => void;
  /** the tops of the city's buildings: 512 × 1 RGBA, heights from the bottom of the screen, near in red, middle in green, far in blue */
  setSkyline: (rgba: Uint8Array) => void;
  render: (seconds: number) => void;
  dispose: () => void;
}

const POINT_VERTEX = `
precision highp float;
attribute vec4 aFrom; attribute vec4 aTo;
attribute vec3 aFromC; attribute vec3 aToC;
attribute vec3 aSeed; attribute vec2 aPlan;
uniform vec2 uRes, uFocus, uCenter;
uniform vec3 uWave, uAccent, uHubV;
uniform vec4 uGlobe, uTurn;
uniform float uDpr, uMorph, uStagger, uSwirl, uGlow, uTime, uPhase, uSway, uTwinkle, uHover, uDim, uZoom, uFade, uFall, uMaxPoint, uRise;
varying vec4 vC; varying vec2 vSprite;
float ease(float t) { return t * t * t * (t * (6.0 * t - 15.0) + 10.0); }
vec3 unit(vec2 ll) { float c = cos(ll.y); return vec3(c * sin(ll.x), sin(ll.y), c * cos(ll.x)); }
vec3 turned(vec3 v) {
  vec3 r = vec3(v.x * uTurn.x + v.z * uTurn.y, v.y, v.z * uTurn.x - v.x * uTurn.y);
  return vec3(r.x, r.y * uTurn.z - r.z * uTurn.w, r.y * uTurn.w + r.z * uTurn.z);
}
void main() {
  float act = aPlan.x; float kind = aPlan.y;
  float k = ease(clamp(uMorph * (1.0 + uStagger) - aSeed.z * uStagger, 0.0, 1.0));
  vec2 target = aTo.xy;
  float seen = 1.0;
  float depth = 1.0;
  if (kind > 6.5) {
    /* going up for as long as the page is open, drifting a little; each at its own pace */
    float up = fract(aTo.y / uRes.y - uTime * (0.012 + aSeed.y * 0.05) * uRise + aSeed.z);
    target = vec2(aTo.x + sin(uTime * (0.4 + aSeed.z) + aSeed.x * 30.0) * (4.0 + aSeed.y * 9.0), up * uRes.y);
    seen = smoothstep(0.0, 0.1, up) * (1.0 - smoothstep(0.86, 1.0, up));
  } else if (kind > 4.5) {
    vec3 v;
    if (kind > 5.5) {
      /* a stream on its way from the hub to a city, in a bow over the surface; hidden when it is behind the world */
      float f = fract(uTime * (0.14 + aSeed.y * 0.26) + aSeed.x);
      vec3 b = unit(aTo.xy);
      float rise = sin(f * 3.14159);
      v = turned(normalize(mix(uHubV, b, f) + vec3(0.0, 0.0004, 0.0))) * (1.0 + rise * (0.03 + length(uHubV - b) * 0.2));
      seen = rise * ((v.z < 0.0 && dot(v.xy, v.xy) < 1.0) ? 0.0 : 1.0);
    } else {
      /* on the surface: the far side shows through, a little; lit from the upper left */
      v = turned(unit(aTo.xy));
      seen = (0.05 + 0.95 * smoothstep(-0.02, 0.2, v.z)) * (0.62 + 0.6 * max(0.0, dot(v, vec3(-0.42, 0.52, 0.74))));
      depth = 0.62 + 0.38 * max(v.z, 0.0);
    }
    target = uGlobe.xy + uGlobe.z * vec2(v.x, -v.y);
  }
  vec2 p = mix(aFrom.xy, target, k);
  float size = mix(aFrom.z, aTo.z * depth, k);
  float a = mix(aFrom.w, aTo.w * seen, k);
  vec3 c = mix(aFromC, aToC, k);
  /* the flight: a bow out of the straight line, brighter in the air; only for a light that is going somewhere */
  float moved = min(1.0, length(target - aFrom.xy) / 40.0);
  float bow = sin(k * 3.14159) * moved;
  float ang = aSeed.x * 6.2832 + k * 2.6;
  p += vec2(cos(ang), sin(ang)) * uSwirl * bow * (0.35 + aSeed.y);
  a *= 1.0 + bow * uGlow;
  /* phones held up: a slow sway, closer ones further */
  float near = clamp(size / 5.0, 0.0, 1.0);
  float crowd = smoothstep(uCenter.y - 80.0, uCenter.y + 10.0, p.y);
  p.x += crowd * uSway * sin(uTime * 1.3 + aSeed.x * 6.2832 + p.y * 0.012) * (0.6 + 4.2 * near);
  p.y += crowd * uSway * sin(uTime * 2.1 + aSeed.y * 6.2832) * (0.4 + 2.2 * near);
  a *= mix(1.0, 0.72 + 0.28 * sin(uTime * (1.5 + aSeed.y * 4.0) + aSeed.x * 40.0), uTwinkle * max(crowd, 0.18));
  /* drones hold their place, not quite still */
  p += uHover * vec2(sin(uTime * 1.7 + aSeed.x * 30.0), cos(uTime * 1.3 + aSeed.y * 30.0)) * 1.15;
  /* coming on */
  float on = 1.0;
  float flash = 0.0;
  if (act >= 0.0) {
    on = smoothstep(act, act + 0.3, uPhase);
    flash = on * exp(-max(0.0, uPhase - act) * 2.4);
  }
  if (kind > 5.5 && kind < 6.5) {
    a *= on;
  } else if (kind > 2.5 && kind < 3.5) {
    /* a firework. A rising spark, then a shell: rays, each a bright head and a dimming tail, opening fast and slowing, and falling a little */
    float t = uPhase - act;
    float ray = floor(aSeed.x * 64.0);
    float lag = aSeed.y * aSeed.y * 0.3;
    float since = t - lag;
    if (since < 0.0) {
      a = 0.0;
      if (t < 0.0 && t > -0.5 && aSeed.z < 0.012) {
        p = aTo.xy + vec2((aSeed.y - 0.5) * 2.0, -t * 300.0 + aSeed.y * 24.0);
        a = 0.8 * (1.0 - aSeed.y);
        size = 1.6;
      }
    } else {
      float angle = (ray + 0.5) * 0.09817 + aTo.z;
      float length = 0.62 + 0.38 * fract(sin(ray * 12.9898 + aTo.z * 7.0) * 437.585);
      float reach = aTo.z * 16.0 * length;
      p = aTo.xy + vec2(cos(angle), sin(angle)) * reach * (1.0 - exp(-3.1 * since)) + vec2(0.0, 30.0 * since * since);
      float tail = 1.0 - aSeed.y;
      a *= exp(-1.05 * t) * (0.2 + 1.5 * tail * tail);
      if (t > 1.0) a *= 0.55 + 0.45 * sin(t * 30.0 + aSeed.x * 60.0);
      size = 1.3 + 1.7 * tail;
      c = mix(c, vec3(1.0), exp(-t * 6.0));
    }
  } else if (kind > 3.5 && kind < 4.5) {
    /* a light that gives out: it drops */
    float t = max(0.0, uFall);
    p.y += t * t * (120.0 + aSeed.y * 340.0) * step(0.45, aSeed.x);
    p.x += t * (aSeed.y - 0.5) * 42.0;
    a *= mix(on * 1.0 + (1.0 - on) * uDim, 0.2, clamp(t * 0.6, 0.0, 1.0));
  } else {
    a *= mix(uDim, 1.0, on);
    if (kind > 0.5 && kind < 1.5) {
      /* a window: warm when somebody is just home, the TV's colour when it comes on, and a TV flickers */
      c = mix(vec3(1.0, 0.72, 0.42) * 0.6, c, on);
      if (on > 0.5) a *= 0.78 + 0.22 * sin(uTime * (2.0 + aSeed.y * 8.0) + aSeed.x * 30.0);
    }
  }
  a *= 1.0 + flash * 1.1;
  size *= 1.0 + flash * 1.4;
  /* a ripple through the lights that are lit */
  float gap = (length(p - uCenter) - uWave.x) / max(1.0, uWave.y);
  float ripple = uWave.z * exp(-gap * gap);
  if (a > 0.001) a += ripple * (0.22 + a) * 1.5;
  size *= 1.0 + ripple * 0.75;
  c = mix(c, uAccent, min(1.0, ripple * 0.8));
  p += normalize(p - uCenter + vec2(0.001)) * ripple * 7.0;
  /* the camera */
  p = uFocus + (p - uFocus) * uZoom;
  float isWindow = step(0.5, kind) * step(kind, 1.5);
  size *= mix(mix(1.0, uZoom, 0.5), uZoom, isWindow);
  gl_Position = vec4(p.x / uRes.x * 2.0 - 1.0, 1.0 - p.y / uRes.y * 2.0, 0.0, 1.0);
  float px = size * uDpr;
  gl_PointSize = clamp(px, 1.0, uMaxPoint);
  /* what is smaller than a pixel keeps its light, not its size */
  vC = vec4(c, clamp(a, 0.0, 4.0) * uFade * min(1.0, px * px));
  vSprite = vec2(isWindow, 1.0 - min(0.9, 2.2 / max(1.0, px)));
}`;

const POINT_FRAGMENT = `
precision mediump float;
varying vec4 vC; varying vec2 vSprite;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float m;
  if (vSprite.x > 0.5) {
    vec2 e = abs(q);
    m = 1.0 - smoothstep(vSprite.y, 1.0, max(e.x, e.y));
  } else {
    float r = dot(q, q);
    m = exp(-r * 3.4) * (1.0 - smoothstep(0.72, 1.0, r)) + (1.0 - smoothstep(0.0, 0.14, r)) * 0.7;
  }
  gl_FragColor = vec4(vC.rgb * m * vC.a, 1.0);
}`;

const QUAD_VERTEX = `
attribute vec2 aXy; varying vec2 vUv;
void main() { vUv = vec2(aXy.x * 0.5 + 0.5, 0.5 - aXy.y * 0.5); gl_Position = vec4(aXy, 0.0, 1.0); }`;

const SKY_FRAGMENT = `
precision mediump float;
varying vec2 vUv;
uniform float uTime, uHorizon, uGlow, uBeams, uAspect, uStage, uAtmosphere, uCity, uZoom;
uniform vec2 uFocus;
uniform vec3 uTop, uBottom, uBrand, uLift, uGlobe;
uniform sampler2D uSkyline;
void main() {
  vec3 col = mix(uTop, uBottom, smoothstep(0.0, 1.0, vUv.y));
  float h = vUv.y - uHorizon;
  float dx = vUv.x - 0.5;
  /* a line of glow along the horizon, or a stage in the middle of a bowl */
  vec3 line = uBrand * exp(-h * h * 120.0) * 0.5 + uLift * exp(-h * h * 1500.0) * 0.32;
  vec3 stage = uBrand * exp(-(dx * dx * 7.0 + h * h * 64.0)) * 0.72 + uLift * exp(-(dx * dx * 40.0 + h * h * 2400.0)) * 1.05;
  col += mix(line, stage, uStage) * uGlow;
  if (uBeams > 0.001) {
    for (int i = 0; i < 6; i++) {
      float fi = float(i);
      float bx = mix(0.12 + fi * 0.152, 0.5 + (fi - 2.5) * 0.1, uStage);
      vec2 d = vec2((vUv.x - bx) * uAspect, vUv.y - uHorizon);
      float up = -d.y;
      if (up > 0.0) {
        float ang = atan(d.x, up);
        float aim = sin(uTime * (0.38 + fi * 0.07) + fi * 1.9) * 0.46 + (bx - 0.5) * mix(0.9, 2.3, uStage);
        float off = (ang - aim) * (7.0 + fi);
        float b = exp(-off * off);
        b *= smoothstep(0.0, 0.03, up) * exp(-up * 2.1);
        col += mix(uLift, uBrand, mod(fi, 2.0)) * b * uBeams * 0.42;
      }
    }
  }
  if (uAtmosphere > 0.001) {
    /* the world's air and its dark body, lit from the upper left */
    vec2 d = vec2((vUv.x - uGlobe.x) * uAspect, vUv.y - uGlobe.y) / uGlobe.z;
    float r = length(d);
    vec3 world = col + uBrand * exp(-(r - 1.0) * 6.5) * 0.3 + uLift * exp(-(r - 1.0) * 26.0) * 0.3;
    if (r < 1.0) {
      vec3 n = vec3(d.x, -d.y, sqrt(1.0 - r * r));
      float lit = max(0.0, dot(n, vec3(-0.42, 0.52, 0.74)));
      world = uBrand * (0.018 + 0.15 * lit * lit) + uLift * pow(r, 7.0) * 0.28;
    }
    col = mix(col, world, uAtmosphere);
  }
  if (uCity > 0.001) {
    /* the buildings: the camera moves them the way it moves their windows */
    vec2 q = uFocus + (vUv - uFocus) / uZoom;
    vec3 tops = texture2D(uSkyline, vec2(q.x, 0.5)).rgb;
    float up = 1.0 - q.y;
    vec3 city = col;
    if (up < tops.b) city = mix(col, uBrand * 0.1 + vec3(0.02, 0.025, 0.05), 0.86);
    if (up < tops.g) city = uBrand * 0.035 + vec3(0.012, 0.014, 0.026);
    if (up < tops.r) city = vec3(0.007, 0.008, 0.014);
    col = mix(col, city, uCity);
  }
  gl_FragColor = vec4(col, 1.0);
}`;

const BLUR_FRAGMENT = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uStep;
void main() {
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  vec3 c = texture2D(uTex, uv).rgb * 0.227;
  c += (texture2D(uTex, uv + uStep * 1.385).rgb + texture2D(uTex, uv - uStep * 1.385).rgb) * 0.316;
  c += (texture2D(uTex, uv + uStep * 3.231).rgb + texture2D(uTex, uv - uStep * 3.231).rgb) * 0.07;
  gl_FragColor = vec4(c, 1.0);
}`;

const COMPOSE_FRAGMENT = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uSky, uHalo;
uniform float uTime, uBloom, uFade;
float grain(vec2 p) { return fract(sin(dot(p + uTime, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  vec3 col = texture2D(uSky, uv).rgb + texture2D(uHalo, uv).rgb * uBloom;
  /* a little grain: dark gradients band without it */
  gl_FragColor = vec4((col + (grain(gl_FragCoord.xy) - 0.5) * 0.012) * uFade, 1.0);
}`;

const compile = (gl: WebGLRenderingContext, vertex: string, fragment: string): WebGLProgram | null => {
  const program = gl.createProgram();
  if (!program) return null;
  for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]] as const) {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return null;
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
};

const seeded = (text: string) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
};

const SKY_NUMBERS = ['horizon', 'glow', 'beams', 'stage', 'atmosphere', 'city'] as const;

export const createNightEngine = (canvas: HTMLCanvasElement, options: { dprLimit?: number; preserve?: boolean } = {}): NightEngine | null => {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: Boolean(options.preserve) })
    ?? (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
  if (!gl) return null;
  const points = compile(gl, POINT_VERTEX, POINT_FRAGMENT);
  const sky = compile(gl, QUAD_VERTEX, SKY_FRAGMENT);
  const blur = compile(gl, QUAD_VERTEX, BLUR_FRAGMENT);
  const compose = compile(gl, QUAD_VERTEX, COMPOSE_FRAGMENT);
  if (!points || !sky || !blur || !compose) return null;

  const width = canvas.clientWidth || canvas.width || 390;
  const height = canvas.clientHeight || canvas.height || 844;
  let dpr = Math.min(window.devicePixelRatio || 1, options.dprLimit ?? 2);
  let drawn = NIGHT_LIGHTS;
  const sizeCanvas = () => {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  };
  sizeCanvas();

  const target = (w: number, h: number) => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const frame = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, frame);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { texture, frame, w, h };
  };
  /* the sky's small canvas, and two smaller for the glow */
  const skyTarget = target(Math.max(64, Math.round(width * 0.66)), Math.max(64, Math.round(height * 0.66)));
  const haloW = Math.max(32, Math.round(width * 0.25));
  const haloH = Math.max(32, Math.round(height * 0.25));
  const haloA = target(haloW, haloH);
  const haloB = target(haloW, haloH);
  const haloScale = haloW / width;

  const skyline = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, skyline);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  /* what stays the same for a light all night: its randomness */
  const rand = seeded('opening-night');
  const seedData = new Float32Array(NIGHT_LIGHTS * 3);
  for (let i = 0; i < seedData.length; i += 1) seedData[i] = rand();
  const seedBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, seedBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, seedData, gl.STATIC_DRAW);

  const from = new Float32Array(NIGHT_LIGHTS * 4);
  const to = new Float32Array(NIGHT_LIGHTS * 4);
  const fromC = new Float32Array(NIGHT_LIGHTS * 3);
  const toC = new Float32Array(NIGHT_LIGHTS * 3);
  const plan = new Float32Array(NIGHT_LIGHTS * 2);
  const fromBuffer = gl.createBuffer();
  const toBuffer = gl.createBuffer();
  const fromCBuffer = gl.createBuffer();
  const toCBuffer = gl.createBuffer();
  const planBuffer = gl.createBuffer();

  const attr = (program: WebGLProgram, name: string) => gl.getAttribLocation(program, name);
  const pointAttrs = { from: attr(points, 'aFrom'), to: attr(points, 'aTo'), fromC: attr(points, 'aFromC'), toC: attr(points, 'aToC'), seed: attr(points, 'aSeed'), plan: attr(points, 'aPlan') };
  const skyAt = attr(sky, 'aXy');
  const blurAt = attr(blur, 'aXy');
  const composeAt = attr(compose, 'aXy');
  const uniform = (program: WebGLProgram, names: string[]) => Object.fromEntries(names.map(name => [name, gl.getUniformLocation(program, name)])) as Record<string, WebGLUniformLocation | null>;
  const u = uniform(points, ['uRes', 'uFocus', 'uCenter', 'uWave', 'uAccent', 'uHubV', 'uGlobe', 'uTurn', 'uDpr', 'uMorph', 'uStagger', 'uSwirl', 'uGlow', 'uTime', 'uPhase', 'uSway', 'uTwinkle', 'uHover', 'uDim', 'uZoom', 'uFade', 'uFall', 'uMaxPoint', 'uRise']);
  const us = uniform(sky, ['uTime', 'uHorizon', 'uGlow', 'uBeams', 'uAspect', 'uStage', 'uAtmosphere', 'uCity', 'uZoom', 'uFocus', 'uTop', 'uBottom', 'uBrand', 'uLift', 'uGlobe', 'uSkyline']);
  const ub = uniform(blur, ['uTex', 'uStep']);
  const uc = uniform(compose, ['uSky', 'uHalo', 'uTime', 'uBloom', 'uFade']);
  const range = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as Float32Array | number[] | null;
  const maxPoint = range ? Number(range[1]) : 64;

  const look: NightLook = {
    phase: 0, sway: 0, twinkle: 0, hover: 0, dim: 1, zoom: 1, focus: [width / 2, height / 2], center: [width / 2, height / 2],
    waveFront: 0, waveWidth: 60, waveGain: 0, accent: [1, 1, 1], fade: 1, fall: 0, bloom: 1, rise: 1,
    globe: [width / 2, height / 2, width / 2, 0.3], spin: 0, hub: [0, 0],
    top: [0.01, 0.015, 0.04], bottom: [0, 0, 0], horizon: 0.5, glow: 0, beams: 0, stage: 0, atmosphere: 0, city: 0, brand: [0.2, 0.4, 1], lift: [0.5, 0.7, 1],
  };
  /* the sky as it is on screen, a moment behind what was asked for */
  const shown = { horizon: 0, glow: 0, beams: 0, stage: 0, atmosphere: 0, city: 0, top: [0, 0, 0], bottom: [0, 0, 0] };
  let lastRender = -1;

  const write = (formation: Formation) => {
    for (let i = 0; i < NIGHT_LIGHTS; i += 1) {
      to[i * 4] = formation.pos[i * 2];
      to[i * 4 + 1] = formation.pos[i * 2 + 1];
      to[i * 4 + 2] = formation.look[i * 2];
      to[i * 4 + 3] = formation.look[i * 2 + 1];
      plan[i * 2] = formation.act[i];
      plan[i * 2 + 1] = formation.kind[i];
    }
    toC.set(formation.color);
    gl.bindBuffer(gl.ARRAY_BUFFER, toBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, to, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, toCBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, toC, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, planBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, plan, gl.DYNAMIC_DRAW);
  };
  const writeFrom = () => {
    gl.bindBuffer(gl.ARRAY_BUFFER, fromBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, from, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, fromCBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, fromC, gl.DYNAMIC_DRAW);
  };

  let morphStart = -1;
  let morphSeconds = 0;
  let stagger = 0;
  let swirl = 0;
  let flightGlow = 0;
  let now = 0;

  /* stepping down when a phone cannot keep up. A long gap is the show resting behind the ident or the room, not a slow frame. */
  let frames = 0;
  let spent = 0;
  let last = 0;
  let step = 0;
  const watch = (seconds: number) => {
    const gap = seconds - last;
    if (last && gap < 0.25) {
      spent += gap;
      frames += 1;
    }
    last = seconds;
    if (frames < 40) return;
    const average = spent / frames;
    frames = 0;
    spent = 0;
    if (average < 0.03 || step >= 2 || options.preserve) return;
    step += 1;
    dpr = Math.max(1, dpr * 0.72);
    drawn = Math.round(NIGHT_LIGHTS * (step === 1 ? 0.75 : 0.5));
    sizeCanvas();
  };

  const bindPoint = (location: number, buffer: WebGLBuffer | null, size: number) => {
    if (location < 0) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
  };
  const fullScreen = (at: number) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(at);
    gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disableVertexAttribArray(at);
  };
  const blurInto = (source: WebGLTexture | null, into: WebGLFramebuffer | null, stepX: number, stepY: number) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, into);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, source);
    gl.uniform1i(ub.uTex, 0);
    gl.uniform2f(ub.uStep, stepX / haloW, stepY / haloH);
    fullScreen(blurAt);
  };

  const drawLights = (scale: number, morph: number, seconds: number, turn: [number, number, number, number], hubV: [number, number, number]) => {
    gl.useProgram(points);
    bindPoint(pointAttrs.from, fromBuffer, 4);
    bindPoint(pointAttrs.to, toBuffer, 4);
    bindPoint(pointAttrs.fromC, fromCBuffer, 3);
    bindPoint(pointAttrs.toC, toCBuffer, 3);
    bindPoint(pointAttrs.seed, seedBuffer, 3);
    bindPoint(pointAttrs.plan, planBuffer, 2);
    gl.uniform2f(u.uRes, width, height);
    gl.uniform2fv(u.uFocus, look.focus);
    gl.uniform2fv(u.uCenter, look.center);
    gl.uniform3f(u.uWave, look.waveFront, look.waveWidth, look.waveGain);
    gl.uniform3fv(u.uAccent, look.accent);
    gl.uniform3fv(u.uHubV, hubV);
    gl.uniform4fv(u.uGlobe, look.globe);
    gl.uniform4fv(u.uTurn, turn);
    gl.uniform1f(u.uDpr, scale);
    gl.uniform1f(u.uMorph, morph);
    gl.uniform1f(u.uStagger, stagger);
    gl.uniform1f(u.uSwirl, swirl);
    gl.uniform1f(u.uGlow, flightGlow);
    gl.uniform1f(u.uTime, seconds);
    gl.uniform1f(u.uPhase, look.phase);
    gl.uniform1f(u.uSway, look.sway);
    gl.uniform1f(u.uTwinkle, look.twinkle);
    gl.uniform1f(u.uHover, look.hover);
    gl.uniform1f(u.uDim, look.dim);
    gl.uniform1f(u.uZoom, look.zoom);
    gl.uniform1f(u.uFade, look.fade);
    gl.uniform1f(u.uFall, look.fall);
    gl.uniform1f(u.uMaxPoint, maxPoint);
    gl.uniform1f(u.uRise, look.rise);
    gl.drawArrays(gl.POINTS, 0, Math.min(drawn, kept));
    for (const at of Object.values(pointAttrs)) if (at >= 0) gl.disableVertexAttribArray(at);
  };

  let disposed = false;
  let kept = NIGHT_LIGHTS;
  return {
    look,
    width,
    height,
    snap: formation => {
      write(formation);
      from.set(to);
      fromC.set(toC);
      writeFrom();
      morphStart = -1;
    },
    morph: (formation, o) => {
      from.set(to);
      fromC.set(toC);
      writeFrom();
      write(formation);
      morphStart = now;
      morphSeconds = Math.max(0.01, o.seconds);
      stagger = o.stagger ?? 0;
      swirl = o.swirl ?? 0;
      flightGlow = o.glow ?? 0;
    },
    bakeGlobe: () => {
      const [cx, cy, radius, tilt] = look.globe;
      for (let i = 0; i < NIGHT_LIGHTS; i += 1) {
        const kind = plan[i * 2 + 1];
        if (kind !== KIND.GLOBE && kind !== KIND.STREAM) continue;
        const [x, y, z] = globePoint(to[i * 4], to[i * 4 + 1], look.spin, tilt);
        to[i * 4] = cx + radius * x;
        to[i * 4 + 1] = cy - radius * y;
        if (kind === KIND.STREAM) {
          to[i * 4 + 3] = 0;
          continue;
        }
        const facing = Math.max(0, Math.min(1, (z + 0.02) / 0.22));
        to[i * 4 + 2] *= 0.62 + 0.38 * Math.max(z, 0);
        to[i * 4 + 3] *= (0.05 + 0.95 * facing * facing * (3 - 2 * facing)) * (0.62 + 0.6 * Math.max(0, -0.42 * x + 0.52 * y + 0.74 * z));
      }
    },
    keepLights: count => { kept = count; },
    setSkyline: rgba => {
      gl.bindTexture(gl.TEXTURE_2D, skyline);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 512, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
    },
    render: seconds => {
      if (disposed || gl.isContextLost()) return;
      now = seconds;
      watch(seconds);
      const dt = lastRender < 0 ? 99 : seconds - lastRender;
      lastRender = seconds;
      const settle = 1 - Math.exp(-dt * 5);
      for (const key of SKY_NUMBERS) shown[key] += (look[key] - shown[key]) * settle;
      for (let i = 0; i < 3; i += 1) {
        shown.top[i] += (look.top[i] - shown.top[i]) * settle;
        shown.bottom[i] += (look.bottom[i] - shown.bottom[i]) * settle;
      }

      /* the sky */
      gl.bindFramebuffer(gl.FRAMEBUFFER, skyTarget.frame);
      gl.viewport(0, 0, skyTarget.w, skyTarget.h);
      gl.disable(gl.BLEND);
      gl.useProgram(sky);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, skyline);
      gl.uniform1i(us.uSkyline, 0);
      gl.uniform1f(us.uTime, seconds);
      gl.uniform1f(us.uHorizon, shown.horizon);
      gl.uniform1f(us.uGlow, shown.glow);
      gl.uniform1f(us.uBeams, shown.beams);
      gl.uniform1f(us.uAspect, width / height);
      gl.uniform1f(us.uStage, shown.stage);
      gl.uniform1f(us.uAtmosphere, shown.atmosphere);
      gl.uniform1f(us.uCity, shown.city);
      gl.uniform1f(us.uZoom, look.zoom);
      gl.uniform2f(us.uFocus, look.focus[0] / width, look.focus[1] / height);
      gl.uniform3fv(us.uTop, shown.top);
      gl.uniform3fv(us.uBottom, shown.bottom);
      gl.uniform3fv(us.uBrand, look.brand);
      gl.uniform3fv(us.uLift, look.lift);
      gl.uniform3f(us.uGlobe, look.globe[0] / width, look.globe[1] / height, look.globe[2] / height);
      fullScreen(skyAt);

      const morph = morphStart < 0 ? 1 : Math.min(1, (seconds - morphStart) / morphSeconds);
      const turn: [number, number, number, number] = [Math.cos(look.spin), Math.sin(look.spin), Math.cos(look.globe[3]), Math.sin(look.globe[3])];
      const hubLat = Math.cos(look.hub[1]);
      const hubV: [number, number, number] = [hubLat * Math.sin(look.hub[0]), Math.sin(look.hub[1]), hubLat * Math.cos(look.hub[0])];

      /* the lights, small, and blurred twice: their glow */
      gl.bindFramebuffer(gl.FRAMEBUFFER, haloA.frame);
      gl.viewport(0, 0, haloW, haloH);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      drawLights(haloScale, morph, seconds, turn, hubV);
      gl.disable(gl.BLEND);
      gl.useProgram(blur);
      blurInto(haloA.texture, haloB.frame, 1.1, 0);
      blurInto(haloB.texture, haloA.frame, 0, 1.1);
      blurInto(haloA.texture, haloB.frame, 2.4, 0);
      blurInto(haloB.texture, haloA.frame, 0, 2.4);

      /* the sky and the glow, on the screen */
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(compose);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, skyTarget.texture);
      gl.uniform1i(uc.uSky, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, haloA.texture);
      gl.uniform1i(uc.uHalo, 1);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform1f(uc.uTime, seconds % 10);
      gl.uniform1f(uc.uBloom, look.bloom);
      gl.uniform1f(uc.uFade, look.fade);
      fullScreen(composeAt);

      /* the lights themselves: each adds to what is under it, so they glow where they gather */
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      drawLights(dpr, morph, seconds, turn, hubV);
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
};
