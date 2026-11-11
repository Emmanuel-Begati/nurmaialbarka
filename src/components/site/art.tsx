// Decorative Islamic-style artwork drawn in SVG (no image files to download).
// All shapes use `currentColor`, so colour and opacity come from Tailwind classes.

/** Repeating eight-point-star tile, used as a faint watermark behind sections. */
export function StarPattern({ id, className = "", size = 88 }: { id: string; className?: string; size?: number }) {
  const s = size;
  const h = s / 2;
  const q = s / 4;
  const d = s * 0.36;
  return (
    <svg aria-hidden className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}>
      <defs>
        <pattern id={id} width={s} height={s} patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth="1">
            <rect x={q} y={q} width={h} height={h} />
            <polygon points={`${h},${h - d} ${h + d},${h} ${h},${h + d} ${h - d},${h}`} />
            <circle cx={h} cy={h} r={s * 0.12} />
            <path d={`M0 0 L${q} ${q} M${s} 0 L${s - q} ${q} M0 ${s} L${q} ${s - q} M${s} ${s} L${s - q} ${s - q}`} />
            <path d={`M${h} 0 V${h - d} M${h} ${s} V${h + d} M0 ${h} H${h - d} M${s} ${h} H${h + d}`} />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

function starPoints(cx: number, cy: number, points: number, outer: number, inner: number, rot = 0) {
  return Array.from({ length: points * 2 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / points + rot;
    return `${(cx + r * Math.sin(a)).toFixed(2)},${(cy - r * Math.cos(a)).toFixed(2)}`;
  }).join(" ");
}

/** Large geometric rosette (girih-style), used as a slowly rotating watermark. */
export function Rosette({ className = "" }: { className?: string }) {
  const rays = Array.from({ length: 16 }, (_, i) => (Math.PI * 2 * i) / 16);
  return (
    <svg aria-hidden viewBox="0 0 400 400" className={className}>
      <g fill="none" stroke="currentColor" strokeWidth="1.2">
        <circle cx="200" cy="200" r="196" />
        <circle cx="200" cy="200" r="150" />
        <circle cx="200" cy="200" r="58" />
        <polygon points={starPoints(200, 200, 16, 190, 150)} />
        <polygon points={starPoints(200, 200, 8, 150, 92)} />
        <polygon points={starPoints(200, 200, 8, 150, 92, Math.PI / 8)} />
        <polygon points={starPoints(200, 200, 8, 58, 30)} />
        {rays.map((a, i) => (
          <line key={i} x1={200 + 58 * Math.sin(a)} y1={200 - 58 * Math.cos(a)} x2={200 + 150 * Math.sin(a)} y2={200 - 150 * Math.cos(a)} />
        ))}
      </g>
    </svg>
  );
}

/** Mosque skyline silhouette for the bottom of the hero. */
export function MosqueSkyline({ className = "", archColor = "#4f0d10" }: { className?: string; archColor?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 1440 240" preserveAspectRatio="xMidYMax slice" className={className}>
      <g fill="currentColor">
        {/* distant layer */}
        <g opacity=".45">
          <rect x="90" y="150" width="190" height="90" />
          <path d="M120 150 Q185 85 250 150 Z" />
          <rect x="60" y="80" width="14" height="160" />
          <path d="M56 80 L67 50 L78 80 Z" />
          <rect x="1150" y="150" width="200" height="90" />
          <path d="M1180 150 Q1250 80 1320 150 Z" />
          <rect x="1370" y="70" width="14" height="170" />
          <path d="M1366 70 L1377 40 L1388 70 Z" />
          <rect x="0" y="200" width="1440" height="40" />
        </g>
        {/* main mosque */}
        <rect x="520" y="140" width="400" height="100" />
        <path d="M560 140 C560 40 880 40 880 140 Z" />
        <rect x="716" y="22" width="8" height="30" />
        <path d="M720 0 a10 10 0 1 0 8 16 a8 8 0 1 1 -8 -16 z" />
        <rect x="440" y="170" width="90" height="70" />
        <path d="M450 170 Q485 120 520 170 Z" />
        <rect x="910" y="170" width="90" height="70" />
        <path d="M920 170 Q955 120 990 170 Z" />
        {/* minarets */}
        <rect x="470" y="50" width="22" height="190" />
        <rect x="464" y="96" width="34" height="6" />
        <path d="M466 50 L481 8 L496 50 Z" />
        <rect x="948" y="50" width="22" height="190" />
        <rect x="942" y="96" width="34" height="6" />
        <path d="M944 50 L959 8 L974 50 Z" />
        {/* arches cut-out look */}
        <g fill={archColor}>
          <path d="M600 240 V200 a20 20 0 0 1 40 0 V240 Z" />
          <path d="M700 240 V190 a20 20 0 0 1 40 0 V240 Z" />
          <path d="M800 240 V200 a20 20 0 0 1 40 0 V240 Z" />
        </g>
        <rect x="0" y="228" width="1440" height="12" />
      </g>
    </svg>
  );
}

/** Hanging lantern (fanoos). */
export function Lantern({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 60 160" className={className}>
      <g fill="none" stroke="currentColor" strokeWidth="1.5">
        <line x1="30" y1="0" x2="30" y2="40" />
        <circle cx="30" cy="44" r="4" />
        <path d="M18 56 L30 48 L42 56 Z" />
        <path d="M16 56 H44 L48 70 L44 112 H16 L12 70 Z" />
        <path d="M12 70 H48 M16 112 L30 128 L44 112 M30 56 V112" />
        <path d="M22 70 Q30 92 22 112 M38 70 Q30 92 38 112" />
        <line x1="30" y1="128" x2="30" y2="140" />
      </g>
      <ellipse cx="30" cy="90" rx="8" ry="14" fill="currentColor" opacity=".35" />
    </svg>
  );
}

/** Open Qur'an resting on a rehal (wooden book stand). */
export function QuranOnStand({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 320 260" className={className}>
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
        {/* pages */}
        <path d="M160 70 C125 52 80 50 40 62 L48 170 C88 160 128 162 160 180 Z" />
        <path d="M160 70 C195 52 240 50 280 62 L272 170 C232 160 192 162 160 180 Z" />
        <path d="M160 70 V180" />
        {/* lines of text */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <g key={i} opacity=".55">
            <path d={`M64 ${88 + i * 13} C90 ${83 + i * 13} 118 ${84 + i * 13} 146 ${92 + i * 13}`} />
            <path d={`M256 ${88 + i * 13} C230 ${83 + i * 13} 202 ${84 + i * 13} 174 ${92 + i * 13}`} />
          </g>
        ))}
        {/* rehal stand */}
        <path d="M70 176 L250 250 M250 176 L70 250" strokeWidth="6" />
        <path d="M60 172 L160 196 L260 172" strokeWidth="4" />
      </g>
    </svg>
  );
}
