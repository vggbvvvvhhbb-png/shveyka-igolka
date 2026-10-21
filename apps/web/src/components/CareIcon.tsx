import type { CareIconSpec } from "@shveyka/core/calculator/care";

/**
 * Значки ухода — как на бирках: стирка, отбеливание, сушка, глажка.
 */
export function CareIcon({ icon }: { icon: CareIconSpec }) {
  return (
    <figure className="flex w-24 flex-col items-center text-center">
      <svg
        viewBox="0 0 40 40"
        width="48"
        height="48"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        role="img"
        aria-label={icon.label}
        className="text-stone-700"
      >
        {icon.kind === "wash" && (
          <>
            <path d="M5 12h30l-4 20H9z" />
            {icon.hand ? (
              <path d="M14 22c2-4 5 4 8 0s4 2 5 0" />
            ) : (
              <text
                x="20"
                y="27"
                fontSize="10"
                textAnchor="middle"
                fill="currentColor"
                stroke="none"
                dominantBaseline="central"
              >
                <tspan x="20" y="27" dominantBaseline="central">
                  {icon.temp}
                </tspan>
              </text>
            )}
          </>
        )}
        {icon.kind === "bleach" && <path d="M20 6 36 34H4z" />}
        {icon.kind === "tumble" && (
          <>
            <rect x="6" y="6" width="28" height="28" />
            <circle cx="20" cy="20" r="10" />
          </>
        )}
        {icon.kind === "iron" && (
          <>
            <path d="M5 30h30l-4-14H17C10 16 5 22 5 30z" />
            {Array.from({ length: icon.dots ?? 0 }).map((_, i) => (
              <circle key={i} cx={16 + i * 6} cy={24} r="1.6" fill="currentColor" />
            ))}
          </>
        )}
        {icon.kind === "dryclean" && (
          <>
            <circle cx="20" cy="20" r="14" />
            <text
              x="20"
              y="25"
              fontSize="14"
              textAnchor="middle"
              fill="currentColor"
              stroke="none"
              dominantBaseline="central"
            >
              <tspan x="20" y="25" dominantBaseline="central">
                P
              </tspan>
            </text>
          </>
        )}
        {icon.forbidden && <path d="M4 4 36 36M36 4 4 36" strokeWidth="2.5" />}
      </svg>
      <figcaption className="mt-1 text-xs text-stone-600">{icon.label}</figcaption>
    </figure>
  );
}
