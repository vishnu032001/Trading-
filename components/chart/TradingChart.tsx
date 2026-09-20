"use client";

import { useEffect, useMemo, useRef, useState } from "react";\nimport type { MouseEvent } from "react";
import {
  AreaSeries, CandlestickSeries, ColorType, createChart, HistogramSeries, LineSeries,
  type IChartApi, type ISeriesApi, type Time,
} from "lightweight-charts";
import { Crosshair, Minus, MousePointer2, Pencil } from "lucide-react";
import { useTradingStore } from "@/store/useTradingStore";
import type { Drawing, IndicatorConfig, OHLCV } from "@/types/trading";

type PriceSeries = ISeriesApi<"Candlestick"> | ISeriesApi<"Line"> | ISeriesApi<"Area">;
type Tool = "cursor" | "trendline" | "horizontal-ray";

function sma(c: OHLCV[], p: number) {
  if (p <= 0 || c.length < p) return [];
  return c.slice(p - 1).map((_, i) => ({ time: c[i + p - 1].time as Time, value: c.slice(i, i + p).reduce((s, x) => s + x.close, 0) / p }));
}
function ema(c: OHLCV[], p: number) {
  if (p <= 0 || c.length < p) return [];
  const k = 2 / (p + 1); let prev = c.slice(0, p).reduce((s, x) => s + x.close, 0) / p;
  const out = [{ time: c[p - 1].time as Time, value: prev }];
  for (let i = p; i < c.length; i++) { prev = c[i].close * k + prev * (1 - k); out.push({ time: c[i].time as Time, value: prev }); }
  return out;
}
function rsi(c: OHLCV[], p = 14) {
  if (c.length <= p || p <= 0) return [];
  let gain = 0, loss = 0;
  for (let i = 1; i <= p; i++) { const d = c[i].close - c[i - 1].close; gain += Math.max(d, 0); loss += Math.max(-d, 0); }
  let ag = gain / p, al = loss / p; const value = () => al === 0 ? 100 : 100 - 100 / (1 + ag / al);
  const out = [{ time: c[p].time as Time, value: value() }];
  for (let i = p + 1; i < c.length; i++) { const d = c[i].close - c[i - 1].close; ag = (ag * (p - 1) + Math.max(d, 0)) / p; al = (al * (p - 1) + Math.max(-d, 0)) / p; out.push({ time: c[i].time as Time, value: value() }); }
  return out;
}
function macd(c: OHLCV[], fast = 12, slow = 26, signal = 9) {
  const f = ema(c, fast), s = ema(c, slow), sm = new Map(s.map(x => [String(x.time), x.value]));
  const values = f.filter(x => sm.has(String(x.time))).map(x => ({ time: x.time, value: x.value - sm.get(String(x.time))! }));
  if (values.length < signal) return { macd: values, signal: [], histogram: [] };
  const k = 2 / (signal + 1); let prev = values.slice(0, signal).reduce((a, x) => a + x.value, 0) / signal;
  const sig = [{ time: values[signal - 1].time, value: prev }];
  for (let i = signal; i < values.length; i++) { prev = values[i].value * k + prev * (1 - k); sig.push({ time: values[i].time, value: prev }); }
  const map = new Map(sig.map(x => [String(x.time), x.value]));
  return { macd: values, signal: sig, histogram: values.filter(x => map.has(String(x.time))).map(x => ({ time: x.time, value: x.value - map.get(String(x.time))! })) };
}

function indicatorSeries(chart: IChartApi, candles: OHLCV[], ind: IndicatorConfig) {
  if (!ind.enabled) return [] as ISeriesApi<any>[];
  if (ind.type === "SMA" || ind.type === "EMA") {
    const data = ind.type === "SMA" ? sma(candles, ind.period ?? 20) : ema(candles, ind.period ?? 20);
    const s = chart.addSeries(LineSeries, { lineWidth: 2, priceLineVisible: false, lastValueVisible: false }, 0); s.setData(data); return [s];
  }
  if (ind.type === "RSI") {
    const s = chart.addSeries(LineSeries, { lineWidth: 2, priceLineVisible: false, lastValueVisible: true, autoscaleInfoProvider: () => ({ priceRange: { minValue: 0, maxValue: 100 } }) }, 1);
    s.setData(rsi(candles, ind.period ?? 14)); return [s];
  }
  const m = macd(candles, ind.fastPeriod ?? 12, ind.slowPeriod ?? 26, ind.signalPeriod ?? 9);
  const a = chart.addSeries(LineSeries, { lineWidth: 2, priceLineVisible: false }, 2); a.setData(m.macd);
  const b = chart.addSeries(LineSeries, { lineWidth: 2, priceLineVisible: false }, 2); b.setData(m.signal);
  const h = chart.addSeries(HistogramSeries, { priceLineVisible: false }, 2); h.setData(m.histogram.map(x => ({ time: x.time, value: x.value, color: x.value >= 0 ? "#22c55e" : "#ef4444" })));
  return [a, b, h];
}

export function TradingChart() {
  const containerRef = useRef<HTMLDivElement>(null), chartRef = useRef<IChartApi | null>(null);
  const priceRef = useRef<PriceSeries | null>(null), seriesRefs = useRef<ISeriesApi<any>[]>([]);
  const [tool, setTool] = useState<Tool>("cursor"), [pending, setPending] = useState<{ time: number; price: number }[]>([]);
  const candles = useTradingStore(s => s.candles), chartType = useTradingStore(s => s.chartType), indicators = useTradingStore(s => s.indicators);
  const drawings = useTradingStore(s => s.drawings), addDrawing = useTradingStore(s => s.addDrawing);
  const normalized = useMemo(() => candles.map(c => ({ ...c, time: c.time as Time })), [candles]);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      autoSize: true, layout: { background: { type: ColorType.Solid, color: "#09090b" }, textColor: "#a1a1aa", panes: { separatorColor: "#27272a", separatorHoverColor: "#3f3f46", enableResize: true } },
      grid: { vertLines: { color: "#18181b" }, horzLines: { color: "#18181b" } }, crosshair: { mode: 0 },
      rightPriceScale: { borderColor: "#27272a" }, timeScale: { borderColor: "#27272a", timeVisible: true, secondsVisible: false },
    });
    chartRef.current = chart;
    const ro = new ResizeObserver(() => { if (containerRef.current) chart.resize(containerRef.current.clientWidth, containerRef.current.clientHeight); });
    ro.observe(containerRef.current);
    return () => { ro.disconnect(); chart.remove(); chartRef.current = null; };
  }, []);

  useEffect(() => {
    const chart = chartRef.current; if (!chart || !normalized.length) return;
    if (priceRef.current) chart.removeSeries(priceRef.current);
    seriesRefs.current.forEach(s => chart.removeSeries(s)); seriesRefs.current = [];
    if (chartType === "candlestick") {
      const s = chart.addSeries(CandlestickSeries, { upColor: "#22c55e", downColor: "#ef4444", borderVisible: false, wickUpColor: "#22c55e", wickDownColor: "#ef4444" }, 0); s.setData(normalized); priceRef.current = s;
    } else if (chartType === "line") {
      const s = chart.addSeries(LineSeries, { lineWidth: 2, priceLineVisible: false }, 0); s.setData(normalized.map(c => ({ time: c.time, value: c.close }))); priceRef.current = s;
    } else {
      const s = chart.addSeries(AreaSeries, { lineWidth: 2, priceLineVisible: false, topColor: "rgba(34,197,94,.25)", bottomColor: "rgba(34,197,94,.02)" }, 0); s.setData(normalized.map(c => ({ time: c.time, value: c.close }))); priceRef.current = s;
    }
    for (const ind of indicators) seriesRefs.current.push(...indicatorSeries(chart, candles, ind));
    const panes = chart.panes(); if (panes[1]) panes[1].setHeight(120); if (panes[2]) panes[2].setHeight(140);
    chart.timeScale().fitContent();
  }, [normalized, candles, chartType, indicators]);

  function handleChartClick(e: MouseEvent<HTMLDivElement>) {
    if (tool === "cursor" || !containerRef.current || !chartRef.current || !priceRef.current) return;
    const rect = containerRef.current.getBoundingClientRect(), x = e.clientX - rect.left, y = e.clientY - rect.top;
    const time = chartRef.current.timeScale().coordinateToTime(x), price = priceRef.current.priceToCoordinate ? chartRef.current.panes()[0].getSeries().length ? chartRef.current.priceScale("right").coordinateToPrice(y) : null : null;
    if (time == null || price == null) return;
    const point = { time: Number(time), price };
    if (tool === "horizontal-ray") { addDrawing({ type: "horizontal-ray", points: [point], color: "#f59e0b", lineWidth: 2 }); setTool("cursor"); return; }
    const next = [...pending, point];
    if (next.length === 2) { addDrawing({ type: "trendline", points: next, color: "#60a5fa", lineWidth: 2 }); setPending([]); setTool("cursor"); } else setPending(next);
  }

  const pointToXY = (p: { time: number; price: number }) => {
    const chart = chartRef.current; if (!chart) return null;
    const x = chart.timeScale().timeToCoordinate(p.time as Time), y = chart.priceScale("right").priceToCoordinate(p.price);
    return x == null || y == null ? null : { x, y };
  };

  return <div className="relative h-full min-h-[420px] w-full overflow-hidden">
    <div className="absolute left-2 top-2 z-20 flex gap-1 rounded-lg border border-[#263143] bg-[#0c111b]/95 p-1 shadow-lg">
      <button title="Cursor / crosshair" onClick={() => { setTool("cursor"); setPending([]); }} className={`rounded p-1.5 ${tool === "cursor" ? "bg-[#243044] text-white" : "text-gray-500"}`}><MousePointer2 size={15}/></button>
      <button title="Trendline: click two points" onClick={() => { setTool("trendline"); setPending([]); }} className={`rounded p-1.5 ${tool === "trendline" ? "bg-[#243044] text-white" : "text-gray-500"}`}><Pencil size={15}/></button>
      <button title="Horizontal support/resistance ray" onClick={() => { setTool("horizontal-ray"); setPending([]); }} className={`rounded p-1.5 ${tool === "horizontal-ray" ? "bg-[#243044] text-white" : "text-gray-500"}`}><Minus size={15}/></button>
      <button title="Crosshair" onClick={() => setTool("cursor")} className="rounded p-1.5 text-gray-500"><Crosshair size={15}/></button>
    </div>
    <div ref={containerRef} onClick={handleChartClick} className="h-full w-full"/>
    <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full">
      {drawings.map(d => {
        const a = pointToXY(d.points[0]); if (!a) return null;
        if (d.type === "horizontal-ray") return <line key={d.id} x1={a.x} x2="100%" y1={a.y} y2={a.y} stroke={d.color ?? "#f59e0b"} strokeWidth={d.lineWidth ?? 2} />;
        const b = pointToXY(d.points[1]); if (!b) return null;
        return <line key={d.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={d.color ?? "#60a5fa"} strokeWidth={d.lineWidth ?? 2} />;
      })}
      {pending.length === 1 && (() => { const p = pointToXY(pending[0]); return p ? <circle cx={p.x} cy={p.y} r="4" fill="#60a5fa"/> : null; })()}
    </svg>
  </div>;
}
