/* global React */
// ============================================================
// CANNEXA — LOGO MARKS
// Primitive-based SVGs only (teardrops, hexes, circles, strokes)
// Colors controlled via props.color / bg
// ============================================================

const INK = "#0D2B1E";
const CREAM = "#F2EFE8";
const ORANGE = "#E8572A";
const SAGE = "#D0DDD4";

// ------- LEAF PRIMITIVES -----------------------------------------------------
// A single stylised leaf = ellipse tilted, with a centerline.
// Build 5-point fan using rotations.

function LeafSingle({ color = INK, stroke = 0, tilt = 0, w = 14, h = 40 }) {
  return (
    <g transform={`rotate(${tilt})`}>
      <ellipse cx="0" cy="0" rx={w} ry={h} fill={color} />
      {stroke ? <line x1="0" y1={-h + 2} x2="0" y2={h - 2} stroke={CREAM} strokeWidth={stroke} /> : null}
    </g>
  );
}

function LeafFan({ color = INK, count = 5, spread = 120, w = 10, h = 36, cx = 0, cy = 0, centerline = 1 }) {
  const step = spread / (count - 1);
  const start = -spread / 2;
  return (
    <g transform={`translate(${cx} ${cy})`}>
      {Array.from({ length: count }).map((_, i) => {
        const a = start + step * i;
        return (
          <g key={i} transform={`rotate(${a}) translate(0 ${-h})`}>
            <ellipse cx="0" cy="0" rx={w} ry={h} fill={color} />
            {centerline ? <line x1="0" y1={-h + 3} x2="0" y2={h - 3} stroke={CREAM} strokeWidth={centerline} opacity=".55" /> : null}
          </g>
        );
      })}
    </g>
  );
}

// ------- OPTION 1 — APEX (MODERN CANNABIS LEAF) ------------------------------
// A literal but modern 7-leaflet cannabis silhouette built from sharp
// teardrop leaflets (quadratic paths, not ellipses) — symmetrical, disciplined,
// pharma-grade rather than stoner-art. Orange "drop" sits at the stem base.
function MarkApex({ size = 160, color = INK, accent = ORANGE }) {
  const s = size;
  // A single leaflet as a sharp teardrop pointing "up" (tip at negative y).
  // Anchored at the base (0,0). Length L, half-width W at the widest point (~35% down).
  const leaflet = (L, W) => {
    const widest = L * 0.42; // y position (from tip) of widest bulge
    // Path: from base (0,0) -> curve out to right widest point -> to tip (0,-L) -> curve back
    return `M 0 0
            C ${W * 0.25} ${-widest * 0.15}, ${W * 1.02} ${-widest * 0.55}, ${W} ${-widest}
            C ${W * 0.55} ${-L * 0.72}, ${W * 0.18} ${-L * 0.92}, 0 ${-L}
            C ${-W * 0.18} ${-L * 0.92}, ${-W * 0.55} ${-L * 0.72}, ${-W} ${-widest}
            C ${-W * 1.02} ${-widest * 0.55}, ${-W * 0.25} ${-widest * 0.15}, 0 0 Z`;
  };

  // 7 leaflets — center tallest, symmetric pairs shrinking outward.
  // Angles measured from straight-up (0°); outer ones fan down to ~90°.
  const R = s * 0.46; // reference radius for scaling
  const leaflets = [
    { a: 0,    L: R * 1.00, W: R * 0.18 }, // center
    { a: -30,  L: R * 0.86, W: R * 0.17 },
    { a:  30,  L: R * 0.86, W: R * 0.17 },
    { a: -62,  L: R * 0.66, W: R * 0.145 },
    { a:  62,  L: R * 0.66, W: R * 0.145 },
    { a: -92,  L: R * 0.44, W: R * 0.11 }, // outermost, nearly horizontal
    { a:  92,  L: R * 0.44, W: R * 0.11 },
  ];

  // All leaflets emerge from a single base node slightly below center.
  const baseY = s * 0.26;

  return (
    <svg width={s} height={s} viewBox={`-${s / 2} -${s / 2} ${s} ${s}`} role="img" aria-label="Cannexa leaf">
      {/* short stem */}
      <line x1="0" y1={baseY} x2="0" y2={baseY + s * 0.09}
            stroke={color} strokeWidth={s * 0.018} strokeLinecap="round" />
      {/* leaflets, drawn back-to-front so center sits on top */}
      <g transform={`translate(0 ${baseY})`}>
        {[...leaflets].sort((a, b) => Math.abs(b.a) - Math.abs(a.a)).map((l, i) => (
          <path key={i} d={leaflet(l.L, l.W)} fill={color}
                transform={`rotate(${l.a})`} />
        ))}
      </g>
      {/* accent drop at base of stem */}
      <circle cx="0" cy={baseY + s * 0.125} r={s * 0.028} fill={accent} />
    </svg>
  );
}

function WordApex({ size = 52, color = INK }) {
  return (
    <span className="wm-mod" style={{ fontSize: size, color, lineHeight: 1, letterSpacing: "-.025em", fontWeight: 300 }}>
      cannexa
    </span>
  );
}

// ------- OPTION 2 — CLINICAL HEX ---------------------------------------------
// Hexagon (molecule/crystal) containing a simplified leaf split by its stem.
// Wordmark: uppercase serif (Fraunces) with standard tracking — pharma feel.
function MarkHex({ size = 160, color = INK, accent = ORANGE }) {
  const s = size;
  const r = s * 0.44;
  // hex points
  const pts = Array.from({ length: 6 }).map((_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${Math.cos(a) * r},${Math.sin(a) * r}`;
  }).join(" ");
  return (
    <svg width={s} height={s} viewBox={`-${s / 2} -${s / 2} ${s} ${s}`}>
      <polygon points={pts} fill="none" stroke={color} strokeWidth={s * 0.035} strokeLinejoin="miter" />
      {/* Leaf — two ellipse halves flanking a centerline */}
      <g transform="translate(0 2)">
        <ellipse cx={-r * 0.18} cy="0" rx={r * 0.22} ry={r * 0.58} fill={color} />
        <ellipse cx={r * 0.18} cy="0" rx={r * 0.22} ry={r * 0.58} fill={color} />
        <rect x={-s * 0.008} y={-r * 0.6} width={s * 0.016} height={r * 1.2} fill={CREAM} />
        {/* crystal accent at bottom vertex */}
        <circle cx="0" cy={r * 0.62} r={s * 0.025} fill={accent} />
      </g>
    </svg>
  );
}

function WordHex({ size = 40, color = INK }) {
  return (
    <span className="wm-serif" style={{ fontSize: size, color, lineHeight: 1, letterSpacing: ".01em", textTransform: "uppercase", fontWeight: 400 }}>
      Cannexa
    </span>
  );
}

// ------- OPTION 3 — MODERN WORDMARK ------------------------------------------
// Pure wordmark: the 'x' is replaced by a 5-leaf fan so the mark lives inside
// the word. Ultra modern. Light sans, low-contrast.
function WordModern({ size = 96, color = INK, accent = ORANGE }) {
  // We render: cann [leaf-fan] exa   with the fan sized to the cap height.
  const fanSize = size * 0.62;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, color }}>
      <span className="wm-mod" style={{ fontSize: size, lineHeight: 1, fontWeight: 300, letterSpacing: "-.03em" }}>cann</span>
      <svg width={fanSize * 1.1} height={fanSize} viewBox="-60 -60 120 120" style={{ margin: `0 ${size * 0.01}px`, transform: `translateY(${size * 0.02}px)` }}>
        <LeafFan color={color} count={5} spread={110} w={8} h={44} cy={10} centerline={0} />
        <circle cx="0" cy="14" r="5" fill={accent} />
      </svg>
      <span className="wm-mod" style={{ fontSize: size, lineHeight: 1, fontWeight: 300, letterSpacing: "-.03em" }}>exa</span>
    </div>
  );
}

// A simplified symbol version for favicon/app icon: just the fan in a square.
function MarkModern({ size = 160, color = INK, accent = ORANGE, bg = "transparent", stroke = false }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox={`-${s / 2} -${s / 2} ${s} ${s}`}>
      {bg !== "transparent" ? (
        <rect x={-s / 2} y={-s / 2} width={s} height={s} rx={s * 0.12} fill={bg}
          stroke={stroke ? color : "none"} strokeWidth={stroke ? 1 : 0} />
      ) : null}
      <g transform={`translate(0 ${s * 0.12})`}>
        <LeafFan color={color} count={5} spread={110} w={s * 0.04} h={s * 0.22} cy={-s * 0.08} centerline={0} />
        <circle cx="0" cy={-s * 0.02} r={s * 0.025} fill={accent} />
      </g>
    </svg>
  );
}

// ------- OPTION 4 — APOTHECARY SEAL ------------------------------------------
// Circular seal: outer ring, inner orbit text "CANNEXA · MEDICINAL CANNABIS ·",
// central leaf-and-cross mark. Pairs with an uppercase spaced wordmark for
// secondary use.
function MarkSeal({ size = 200, color = INK, accent = ORANGE, showText = true }) {
  const s = size;
  const R = s * 0.46;
  const rInner = s * 0.34;
  return (
    <svg width={s} height={s} viewBox={`-${s / 2} -${s / 2} ${s} ${s}`}>
      {/* outer ring */}
      <circle cx="0" cy="0" r={R} fill="none" stroke={color} strokeWidth="1.25" />
      <circle cx="0" cy="0" r={R - 5} fill="none" stroke={color} strokeWidth="1.25" />
      {/* orbit text */}
      {showText && (
        <>
          <defs>
            <path id={`orbit-${s}`} d={`M ${-R + 14} 0 A ${R - 14} ${R - 14} 0 1 1 ${R - 14} 0 A ${R - 14} ${R - 14} 0 1 1 ${-R + 14} 0`} />
          </defs>
          <text fontFamily="Trebuchet MS, sans-serif" fontWeight="700" letterSpacing="3.5" fontSize={s * 0.062} fill={color}>
            <textPath href={`#orbit-${s}`} startOffset="0%">
              CANNEXA · MEDICINAL CANNABIS · EST. 2026 · CANNEXA · MEDICINAL CANNABIS · EST. 2026 ·
            </textPath>
          </text>
        </>
      )}
      {/* inner ring */}
      <circle cx="0" cy="0" r={rInner} fill="none" stroke={color} strokeWidth="1.25" />
      {/* Central mark — leaf + medical cross hybrid */}
      <g>
        {/* vertical leaf */}
        <ellipse cx="0" cy="0" rx={rInner * 0.22} ry={rInner * 0.72} fill={color} />
        {/* horizontal cross bar */}
        <rect x={-rInner * 0.54} y={-rInner * 0.09} width={rInner * 1.08} height={rInner * 0.18} fill={color} />
        {/* centerline */}
        <line x1="0" y1={-rInner * 0.7} x2="0" y2={rInner * 0.7} stroke={CREAM} strokeWidth="1.5" />
        {/* accent dot */}
        <circle cx="0" cy={rInner * 0.86} r={s * 0.018} fill={accent} />
      </g>
    </svg>
  );
}

function WordSeal({ size = 34, color = INK }) {
  return (
    <span className="wm-uc" style={{ fontSize: size, color, lineHeight: 1 }}>
      Cannexa
    </span>
  );
}

// =============================================================================
Object.assign(window, {
  LeafSingle, LeafFan,
  MarkApex, WordApex,
  MarkHex, WordHex,
  MarkModern, WordModern,
  MarkSeal, WordSeal,
  CANNEXA_COLORS: { INK, CREAM, ORANGE, SAGE }
});
