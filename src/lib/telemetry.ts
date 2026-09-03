import { useEffect, useRef, useState } from "react";

export type Severity = "high" | "medium" | "low" | "info";

export interface AlertItem {
  id: number;
  time: string;
  message: string;
  severity: Severity;
  detail: string;
  confidence: number;
}

export interface SensorStatus {
  id: string;
  name: string;
  value: string;
  state: "ok" | "warn" | "fault";
}

export interface TrendPoint {
  t: number;
  value: number;
  anomaly: boolean;
}

export interface Telemetry {
  fuelPercent: number;
  fuelLiters: number;
  rangeKm: number;
  flowDelta: number;
  leakActive: boolean;
  pressureKpa: number;
  temperatureC: number;
  trend: TrendPoint[];
  sensors: SensorStatus[];
  alerts: AlertItem[];
  clock: string;
}

const TANK_CAPACITY = 2000;
const TICK_MS = 3000;

function nowClock(): string {
  return new Date().toISOString().slice(11, 16) + " UTC";
}

function timeLabel(): string {
  return new Date().toISOString().slice(11, 16);
}

const INITIAL_ALERTS: AlertItem[] = [
  {
    id: 4,
    time: timeLabel(),
    message: "Fuel drop anomaly detected",
    severity: "high",
    detail: "Unexplained 2.1 L drop over 11 min below idle baseline.",
    confidence: 94,
  },
  {
    id: 3,
    time: timeLabel(),
    message: "Evap pressure drift",
    severity: "medium",
    detail: "Evap pressure drifting up 0.3 kPa over the last hour.",
    confidence: 71,
  },
  {
    id: 2,
    time: timeLabel(),
    message: "Sensor cluster recalibrated",
    severity: "info",
    detail: "Flow meter and level sonar recalibrated successfully.",
    confidence: 100,
  },
  {
    id: 1,
    time: timeLabel(),
    message: "Fill event logged — 480 L",
    severity: "info",
    detail: "Refuel detected, baseline recalibrated.",
    confidence: 100,
  },
];

let alertId = 10;

export function useTelemetry(): Telemetry {
  const [state, setState] = useState<Telemetry>(() => ({
    fuelPercent: 68,
    fuelLiters: 1360,
    rangeKm: 842,
    flowDelta: -0.4,
    leakActive: false,
    pressureKpa: 101.2,
    temperatureC: 24.1,
    trend: Array.from({ length: 30 }, (_, i) => ({
      t: i,
      value: 62 + Math.sin(i / 4) * 6 + (i > 22 ? (i - 22) * 2.2 : 0),
      anomaly: i === 26,
    })),
    sensors: [
      { id: "S-01", name: "Flow meter", value: "1.4 L/min", state: "ok" },
      { id: "S-02", name: "Pressure P1", value: "101.2 kPa", state: "fault" },
      { id: "S-03", name: "Temp probe", value: "24.1 °C", state: "warn" },
      { id: "S-04", name: "Level sonar", value: "68.0 %", state: "ok" },
    ],
    alerts: INITIAL_ALERTS,
    clock: nowClock(),
  }));
  const leakRef = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setState((prev) => {
        // Occasionally trigger / resolve a leak episode
        if (!leakRef.current && Math.random() < 0.06) {
          leakRef.current = true;
        } else if (leakRef.current && Math.random() < 0.18) {
          leakRef.current = false;
        }
        const leaking = leakRef.current;

        const drain = leaking ? 0.35 + Math.random() * 0.3 : 0.02 + Math.random() * 0.03;
        const fuelLiters = Math.max(0, prev.fuelLiters - drain * 4);
        const fuelPercent = (fuelLiters / TANK_CAPACITY) * 100;
        const flowDelta = leaking
          ? -(1.8 + Math.random() * 1.2)
          : -(0.2 + Math.random() * 0.4);
        const pressureKpa = prev.pressureKpa + (leaking ? 0.25 : -0.05) + (Math.random() - 0.5) * 0.1;
        const temperatureC = prev.temperatureC + (Math.random() - 0.5) * 0.2;

        const last = prev.trend[prev.trend.length - 1] ?? { t: 0, value: 62, anomaly: false };
        const nextValue = leaking
          ? Math.min(96, last.value + 3 + Math.random() * 3)
          : Math.max(48, 62 + Math.sin(last.t / 4) * 6 + (Math.random() - 0.5) * 3);
        const trend = [
          ...prev.trend.slice(-29),
          { t: last.t + 1, value: nextValue, anomaly: leaking },
        ];

        let alerts = prev.alerts;
        if (leaking && !prev.leakActive) {
          const alert: AlertItem = {
            id: ++alertId,
            time: timeLabel(),
            message: "Fuel drop anomaly detected",
            severity: "high",
            detail: `Unexplained ${(Math.abs(flowDelta) * 1.2).toFixed(1)} L drop below idle baseline.`,
            confidence: 90 + Math.round(Math.random() * 9),
          };
          alerts = [alert, ...prev.alerts].slice(0, 8);
        } else if (!leaking && prev.leakActive) {
          const alert: AlertItem = {
            id: ++alertId,
            time: timeLabel(),
            message: "Flow returned to baseline",
            severity: "info",
            detail: "Drain rate normalized, monitoring continues.",
            confidence: 100,
          };
          alerts = [alert, ...prev.alerts].slice(0, 8);
        }

        return {
          ...prev,
          fuelLiters,
          fuelPercent,
          rangeKm: Math.round(fuelLiters * 0.62),
          flowDelta,
          leakActive: leaking,
          pressureKpa,
          temperatureC,
          trend,
          clock: nowClock(),
          sensors: prev.sensors.map((s) => {
            if (s.id === "S-01")
              return { ...s, value: `${(1.4 + (leaking ? 2.4 : 0) + Math.random() * 0.2).toFixed(1)} L/min`, state: leaking ? "fault" : "ok" };
            if (s.id === "S-02")
              return { ...s, value: `${pressureKpa.toFixed(1)} kPa`, state: leaking ? "fault" : "ok" };
            if (s.id === "S-03")
              return { ...s, value: `${temperatureC.toFixed(1)} °C`, state: temperatureC > 26 ? "warn" : "ok" };
            return { ...s, value: `${fuelPercent.toFixed(1)} %`, state: "ok" };
          }),
          alerts,
        };
      });
    }, TICK_MS);
    return () => clearInterval(timer);
  }, []);

  return state;
}
