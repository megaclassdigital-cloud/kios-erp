/** Dependency-free inline SVG bar chart (PRD 9: clean, data-focused, not
 * decorative — a real charting library is overkill for a handful of bars). */
export function MiniBarChart({
  data,
  height = 120,
  formatValue,
}: {
  data: { label: string; value: number }[];
  height?: number;
  formatValue?: (v: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const barWidth = 100 / data.length;

  return (
    <div>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="h-32 w-full">
        {data.map((d, i) => {
          const barHeight = (d.value / max) * (height - 4);
          return (
            <rect
              key={i}
              x={i * barWidth + barWidth * 0.15}
              y={height - barHeight}
              width={barWidth * 0.7}
              height={barHeight}
              className="fill-primary"
            />
          );
        })}
      </svg>
      <div className="mt-1 flex text-[10px] text-muted-foreground">
        {data.map((d, i) => (
          <div key={i} style={{ width: `${barWidth}%` }} className="truncate text-center" title={d.label}>
            {data.length <= 10 ? d.label : i % Math.ceil(data.length / 10) === 0 ? d.label : ""}
          </div>
        ))}
      </div>
      {formatValue && (
        <p className="mt-1 text-xs text-muted-foreground">
          Tertinggi: {formatValue(max)}
        </p>
      )}
    </div>
  );
}
