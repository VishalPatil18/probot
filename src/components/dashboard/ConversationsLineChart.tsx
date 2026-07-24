type Point = { date: string; count: number };

type Props = {
  data: Point[];
};

const VIEW_W = 700;
const VIEW_H = 200;
const PAD_X = 24;
const PAD_TOP = 16;
const PAD_BOTTOM = 32;

function dayLabel(date: string, idx: number, total: number): string {
  if (idx === total - 1) return "Today";
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return "";
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString(undefined, {
    weekday: "short",
    timeZone: "UTC",
  });
}

function toCoords(data: Point[]): Array<{ x: number; y: number }> {
  const n = data.length;
  if (n === 0) return [];
  const maxCount = Math.max(1, ...data.map((p) => p.count));
  const usableW = VIEW_W - PAD_X * 2;
  const usableH = VIEW_H - PAD_TOP - PAD_BOTTOM;
  const stepX = n === 1 ? 0 : usableW / (n - 1);
  return data.map((p, i) => ({
    x: PAD_X + i * stepX,
    y: PAD_TOP + usableH - (p.count / maxCount) * usableH,
  }));
}

function smoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const p = points[0]!;
    return `M ${p.x} ${p.y}`;
  }
  let d = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function fillPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  const linePath = smoothPath(points);
  const last = points[points.length - 1]!;
  const first = points[0]!;
  const baseY = VIEW_H - PAD_BOTTOM;
  return `${linePath} L ${last.x} ${baseY} L ${first.x} ${baseY} Z`;
}

export function ConversationsLineChart({ data }: Props) {
  const coords = toCoords(data);
  const hasData = data.some((p) => p.count > 0);

  return (
    <div>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        className="block h-44 w-full"
        role="img"
        aria-label="Conversations over the last 7 days"
      >
        <defs>
          <linearGradient id="convo-fill" x1="0" x2="0" y1="0" y2="1">
            <stop
              offset="0%"
              stopColor="oklch(0.55 0.193 251.78)"
              stopOpacity="0.25"
            />
            <stop
              offset="100%"
              stopColor="oklch(0.55 0.193 251.78)"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>

        {hasData ? (
          <>
            <path d={fillPath(coords)} fill="url(#convo-fill)" />
            <path
              d={smoothPath(coords)}
              fill="none"
              stroke="oklch(0.55 0.193 251.78)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {coords.map((c, i) => (
              <circle
                key={i}
                cx={c.x}
                cy={c.y}
                r={i === coords.length - 1 ? 4 : 2.5}
                fill="white"
                stroke="oklch(0.55 0.193 251.78)"
                strokeWidth="2"
              />
            ))}
          </>
        ) : (
          <line
            x1={PAD_X}
            x2={VIEW_W - PAD_X}
            y1={VIEW_H - PAD_BOTTOM}
            y2={VIEW_H - PAD_BOTTOM}
            stroke="oklch(0.90 0.008 264)"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
        )}
      </svg>

      <div className="mt-1 flex justify-between px-6 text-[10px] text-muted">
        {data.map((p, i) => (
          <span
            key={p.date}
            className={
              i === data.length - 1 ? "font-bold text-brand" : undefined
            }
          >
            {dayLabel(p.date, i, data.length)}
          </span>
        ))}
      </div>
    </div>
  );
}
