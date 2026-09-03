import { useState } from "react";
import { Sparkles, TriangleAlert } from "lucide-react";
import { useTelemetry, type Severity, type TrendPoint } from "@/lib/telemetry";
import { analyzeFuelAnomaly } from "@/lib/ai.functions";

const severityColor: Record<Severity, string> = {
  high: "bg-destructive",
  medium: "bg-warning",
  low: "bg-primary",
  info: "bg-success",
};

const severityText: Record<Severity, string> = {
  high: "text-destructive",
  medium: "text-warning",
  low: "text-primary",
  info: "text-success",
};

function skewClass(extra = "") {
  return `-skew-x-3 rounded-2xl bg-card/60 ring-1 ring-white/5 backdrop-blur-md ${extra}`;
}

function TrendChart({ trend }: { trend: TrendPoint[] }) {
  const w = 300;
  const h = 100;
  const min = 40;
  const max = 100;
  const x = (i: number) => (i / (trend.length - 1)) * w;
  const y = (v: number) => h - ((v - min) / (max - min)) * h;
  const points = trend.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
  const anomaly = trend.findLast((p) => p.anomaly);
  const anomalyIdx = anomaly ? trend.lastIndexOf(anomaly) : -1;

  return (
    <svg className="h-full w-full" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="oklch(0.8 0.15 80)" stopOpacity="0.35" />
          <stop offset="1" stopColor="oklch(0.8 0.15 80)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`${points} ${w},${h} 0,${h}`} fill="url(#trendFill)" />
      <polyline
        className="flow-line"
        points={points}
        fill="none"
        stroke="oklch(0.8 0.15 80)"
        strokeWidth="2"
      />
      {anomalyIdx >= 0 && (
        <circle
          cx={x(anomalyIdx)}
          cy={y(anomaly!.value)}
          r="3"
          fill="oklch(0.63 0.22 27)"
          className="tele-pulse"
        />
      )}
    </svg>
  );
}

export function FuelDashboard() {
  const data = useTelemetry();
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const activeAlert = data.alerts.find((a) => a.severity === "high");
  const watchAlert = data.alerts.find((a) => a.severity === "medium");
  const gaugeDeg = 210 + (data.fuelPercent / 100) * 250;

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await analyzeFuelAnomaly({
        data: {
          fuelPercent: Math.round(data.fuelPercent * 10) / 10,
          fuelLiters: Math.round(data.fuelLiters),
          flowDelta: data.flowDelta,
          pressureKpa: Math.round(data.pressureKpa * 10) / 10,
          temperatureC: Math.round(data.temperatureC * 10) / 10,
          leakActive: data.leakActive,
          recentAlerts: data.alerts.slice(0, 4).map((a) => ({
            message: a.message,
            severity: a.severity,
            confidence: a.confidence,
          })),
        },
      });
      setAnalysis(res.analysis);
    } catch {
      setAnalysis("AI analysis is temporarily unavailable. Please try again shortly.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      {/* ambient background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(1100px 620px at 72% -14%, oklch(0.79 0.12 205 / 0.16), transparent 60%), radial-gradient(900px 520px at 8% 120%, oklch(0.82 0.15 160 / 0.08), transparent 60%)",
        }}
      />
      <div className="pointer-events-none absolute -left-40 top-24 h-96 w-[620px] -skew-x-12 rounded-[40px] bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-96 -skew-x-12 rounded-[40px] bg-warning/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-5 py-6 sm:px-8">
        {/* header */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
              <span className="font-display text-lg font-semibold text-primary">V</span>
            </div>
            <div>
              <p className="font-display text-base font-semibold leading-none tracking-tight">
                VantGuard
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Fleet Fuel Integrity
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-card/70 px-4 py-2 font-mono ring-1 ring-white/5">
            <span className="relative flex size-2">
              <span className="soft-blink absolute inline-flex size-2 rounded-full bg-success" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
            <span className="text-xs font-medium uppercase tracking-wider text-success">
              Live · {data.clock}
            </span>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-4">
          {/* live fuel level */}
          <section className={`${skewClass()} col-span-12 p-6 sm:col-span-7 lg:col-span-5`}>
            <div className="skew-x-3">
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Live Fuel Level
                </h2>
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  Tank A
                </span>
              </div>
              <div className="flex items-center gap-5">
                <div
                  className="relative size-40 shrink-0 rounded-full"
                  style={{
                    background: `conic-gradient(from 210deg, oklch(0.79 0.12 205) 0deg, oklch(0.82 0.15 160) ${Math.min(gaugeDeg - 210, 250)}deg, oklch(0.27 0.03 255) ${gaugeDeg - 210}deg, oklch(0.27 0.03 255) 250deg, transparent 250deg)`,
                  }}
                >
                  <div className="absolute inset-3 grid place-items-center rounded-full bg-background ring-1 ring-white/5">
                    <div className="text-center">
                      <p className="font-display text-4xl font-semibold leading-none">
                        {Math.round(data.fuelPercent)}
                        <span className="text-xl text-muted-foreground">%</span>
                      </p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                        {Math.round(data.fuelLiters).toLocaleString()} L
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-xs text-muted-foreground">Estimated range</span>
                    <span className="font-mono text-sm font-medium">{data.rangeKm} km</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-xs text-muted-foreground">Flow delta</span>
                    <span
                      className={`font-mono text-sm font-medium ${data.flowDelta < -1 ? "text-destructive" : "text-warning"}`}
                    >
                      {data.flowDelta.toFixed(1)} L/h
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Tank pressure</span>
                    <span className="font-mono text-sm font-medium">
                      {data.pressureKpa.toFixed(1)} kPa
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* alerts */}
          <section className="col-span-12 space-y-4 sm:col-span-5 lg:col-span-4">
            {activeAlert ? (
              <div className={`${skewClass("pulse-glow bg-destructive/10 ring-destructive/30")} p-5`}>
                <div className="skew-x-3">
                  <div className="flex items-center gap-2">
                    <TriangleAlert className="size-4 text-destructive tele-pulse" />
                    <span className="font-display text-sm font-semibold uppercase tracking-[0.15em] text-destructive">
                      Leak Anomaly
                    </span>
                  </div>
                  <p className="mt-3 font-display text-base font-medium leading-snug">
                    {activeAlert.detail}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Confidence {activeAlert.confidence}% · sensor cluster P1 ·{" "}
                    <span className="text-destructive">High severity</span>
                  </p>
                  <button
                    onClick={runAnalysis}
                    disabled={analyzing}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-destructive/15 px-4 py-2 text-xs font-medium text-destructive ring-1 ring-destructive/40 transition-colors hover:bg-destructive/25 disabled:opacity-50"
                  >
                    <Sparkles className="size-3.5" />
                    {analyzing ? "Analyzing…" : "Analyze with AI"}
                  </button>
                </div>
              </div>
            ) : (
              <div className={`${skewClass("bg-success/10 ring-success/30")} p-5`}>
                <div className="skew-x-3">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-success" />
                    <span className="font-display text-sm font-semibold uppercase tracking-[0.15em] text-success">
                      System Nominal
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-snug text-foreground/80">
                    No leak signature detected. Fuel drain matches consumption baseline.
                  </p>
                  <button
                    onClick={runAnalysis}
                    disabled={analyzing}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-success/15 px-4 py-2 text-xs font-medium text-success ring-1 ring-success/40 transition-colors hover:bg-success/25 disabled:opacity-50"
                  >
                    <Sparkles className="size-3.5" />
                    {analyzing ? "Analyzing…" : "Run AI health check"}
                  </button>
                </div>
              </div>
            )}

            {watchAlert && (
              <div className={`${skewClass()} p-5`}>
                <div className="skew-x-3">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-warning" />
                    <span className="font-display text-sm font-semibold uppercase tracking-[0.15em] text-warning">
                      Watch Item
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-snug text-foreground/80">{watchAlert.detail}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Confidence {watchAlert.confidence}% ·{" "}
                    <span className="text-warning">Medium</span>
                  </p>
                </div>
              </div>
            )}

            {analysis && (
              <div className={`${skewClass("ring-primary/30")} p-5`}>
                <div className="skew-x-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-3.5 text-primary" />
                    <span className="font-display text-sm font-semibold uppercase tracking-[0.15em] text-primary">
                      AI Assessment
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-foreground/80">
                    {analysis}
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* consumption trend */}
          <section className={`${skewClass()} col-span-12 p-6 lg:col-span-6`}>
            <div className="skew-x-3">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Consumption Trend
                </h2>
                <span className="text-xs text-muted-foreground">L / 100 km · live</span>
              </div>
              <div className="relative h-32 w-full overflow-hidden">
                <TrendChart trend={data.trend} />
                {data.leakActive && (
                  <span className="absolute right-2 top-2 rounded-md bg-destructive/15 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-destructive ring-1 ring-destructive/30">
                    Spike
                  </span>
                )}
              </div>
              <div className="mt-3 flex justify-between font-mono text-[11px] text-muted-foreground">
                <span>-90s</span>
                <span>-60s</span>
                <span>-30s</span>
                <span>now</span>
              </div>
            </div>
          </section>

          {/* sensor health */}
          <section className={`${skewClass()} col-span-12 p-6 lg:col-span-3`}>
            <div className="skew-x-3">
              <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Sensor Health
              </h2>
              <ul className="space-y-3">
                {data.sensors.map((s) => (
                  <li key={s.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`size-2 rounded-full ${
                          s.state === "ok"
                            ? "bg-success"
                            : s.state === "warn"
                              ? "bg-warning"
                              : "bg-destructive tele-pulse"
                        }`}
                      />
                      <span className="text-xs text-foreground/80">{s.name}</span>
                    </div>
                    <span
                      className={`font-mono text-[11px] ${
                        s.state === "ok"
                          ? "text-muted-foreground"
                          : s.state === "warn"
                            ? "text-warning"
                            : "text-destructive"
                      }`}
                    >
                      {s.state === "ok" ? s.value : s.state.toUpperCase()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* alert history */}
          <section className={`${skewClass()} col-span-12 p-6`}>
            <div className="skew-x-3">
              <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Alert History
              </h2>
              <div className="divide-y divide-white/5">
                {data.alerts.map((a) => (
                  <div key={a.id} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-3">
                      <span
                        className={`size-2 rounded-full ${severityColor[a.severity]} ${a.severity === "high" ? "tele-pulse" : ""}`}
                      />
                      <span className="text-sm text-foreground/85">{a.message}</span>
                      <span
                        className={`hidden font-mono text-[10px] uppercase tracking-wider sm:inline ${severityText[a.severity]}`}
                      >
                        {a.severity}
                      </span>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">{a.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          <span>VantGuard · Early-warning fuel AI</span>
          <span>Telemetry refreshed · {data.clock}</span>
        </footer>
      </div>
    </div>
  );
}
