"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  AreaSeries, CandlestickSeries, ColorType, createChart, HistogramSeries, LineSeries,
  type IChartApi, type ISeriesApi, type Time,
} from "lightweight-charts";
import { useTradingStore } from "@/store/useTradingStore";
import type { IndicatorConfig, OHLCV } from "@/types/trading";

type PriceSeries = ISeriesApi<"Candlestick"> | ISeriesApi<"Line"> | ISeriesApi<"Area">;

const line = (data: { time: Time; value: number }[]) => data;

function sma(c: OHLCV[], p: number) {
  if (p <= 0 || c.length < p) return [];
  return c.slice(p - 1).map((_, i) => ({
    time: c[i + p - 1].time as Time,
    value: c.slice(i, i + p).reduce((s, x) => s + x.close, 0) / p,
  }));
}

function ema(c: OHLCV[], p: number) {
  if (p <= 0 || c.length < p) return [];
  const k = 2 / (p + 1);
  let prev = c.slice(0, p).reduce((s, x) => s + x.close, 0) / p;
  const out = [{ time: c[p - 1].time as Time, value: prev }];
  for (let i = p; i < c.length; i++) {
    prev = c[i].close * k + prev * (1 - k);
    out.push({ time: c[i].time as Time, value: prev });
  }
  return out;
}

function rsi(c: OHLCV[], p = 14) {
  if (c.length <= p || p <= 0) return [];
  let gain = 0, loss = 0;
  for (let i = 1; i <= p; i++) {
    const d = c[i].close - c[i - 1].close;
    gain += Math.max(d, 0); loss += Math.max(-d, 0);
  }
  let ag = gain / p, al = loss / p;
  const value = () => al === 0 ? 100 : 100 - 100 / (1 + ag / al);
  const out = [{ time: c[p].time as Time, value: value() }];
  for (let i = p + 1; i < c.length; i++) {
    const d = c[i].close - c[i - 1].close;
    ag = (ag * (p - 1) + Math.max(d, 0)) / p;
    al = (al * (p - 1) + Math.max(-d, 0)) / p;
    out.push({ time: c[i].time as Time, value: value() });
  }
  return out;
}

function macd(c: OHLCV[], fast = 12, slow = 26, signal = 9) {
  const fastEma = ema(c, fast), slowEma = ema(c, slow);
  const slowMap = new Map(slowEma.map(x => [String(x.time), x.value]));
  const values = fastEma.filter(x => slowMap.has(String(x.time))).map(x => ({
    time: x.time, value: x.value - slowMap.get(String(x.time))!,
  }));
  if (values.length < signal) return { macd: values, signal: [], histogram: [] };
  const k = 2 / (signal + 1);
  let prev = values.slice(0, signal).reduce((s, x) => s + x.value, 0) / signal;
  const sig = [{ time: values[signal - 1].time, value: prev }];
  for (let i = signal; i < values.length; i++) {
    prev = values[i].value * k + prev * (1 - k);
    sig.push({ time: values[i].time, value: prev });
  }
  const signalMap = new Map(sig.map(x => [String(x.time), x.value]));
  const histogram = values.filter(x => signalMap.has(String(x.time))).map(x => ({
    time: x.time, value: x.value - signalMap.get(String(x.time))!,
  }));
  return { macd: values, signal: sig, histogram };
}

export default function TradingChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const priceRef = useRef<PriceSeries | null>(null);
  const indicatorRefs = useRef<ISeriesApi<any>[]>([]);
  const candles = useTradingStore(s => s.candles);
  const chartType = useTradingStore(s => s.chartType);
  const indicators = useTradingStore(s => s.indicators);
  const normalized = useMemo(() => candles.map(c => ({ ...c, time: c.time as Time })), [candles]);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "#09090b" }, textColor: "#a1a1aa" },
      grid: { vertLines: { color: "#18181b" }, horzLines: { color: "#18181b" } },
      crosshair: { mode: 0 },
      rightPriceScale: { borderColor: "#27272a" },
      timeScale: { borderColor: "#27272a", timeVisible: true, secondsVisible: false },
    });
    chartRef.current = chart;
    const ro = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
    });
    ro.observe(containerRef.current);
    return () => { ro.disconnect(); chart.remove(); chartRef.current = null; };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !normalized.length) return;
    if (priceRef.current) chart.removeSeries(priceRef.current);
    priceRef.current = null;

    if (chartType === "candlestick") {
      const s = chart.addSeries(CandlestickSeries, { upColor: "#22c55e", downColor: "#ef4444", borderVisible: false, wickUpColor: "#22c55e", wickDownColor: "#ef4444" });
      s.setData(normalized); priceRef.current = s;
    } else if (chartType === "line") {
      const s = chart.addSeries(LineSeries, { lineWidth: 2, priceLineVisible: false });
      s.setData(normalized.map(c => ({ time: c.time, value: c.close }))); priceRef.current = s;
    } else {
      const s = chart.addSeries(AreaSeries, { lineWidth: 2, priceLineVisible: false, topColor: "rgba(34,197,94,.25)", bottomColor: "rgba(34,197,94,.02)" });
      s.setData(normalized.map(c => ({ time: c.time, value: c.close }))); priceRef.current = s;
    }

    indicatorRefs.current.forEach(s => chart.removeSeries(s));
    indicatorRefs.current = [];

    indicators.filter(i => i.enabled).forEach(ind => {
      if (ind.type === "SMA" || ind.type === "EMA") {
        const data = ind.type === "SMA" ? sma(candles, ind.period ?? 20) : ema(candles, ind.period ?? 20);
        const s = chart.addSeries(LineSeries, { lineWidth: 2, priceLineVisible: false, lastValueVisible: false, pane: 0 });
        s.setData(line(data)); indicatorRefs.current.push(s);
      } else if (ind.type === "RSI") {
        const s = chart.addSeries(LineSeries, { lineWidth: 2, priceLineVisible: false, lastValueVisible: true, pane: 1, autoscaleInfoProvider: () => ({ priceRange: { minValue: 0, maxValue: 100 } }) });
        s.setData(line(rsi(candles, ind.period ?? 14))); indicatorRefs.current.push(s);
      } else if (ind.type === "MACD") {
        const m = macd(candles, ind.fastPeriod ?? 12, ind.slowPeriod ?? 26, ind.signalPeriod ?? 9);
        const a = chart.addSeries(LineSeries, { lineWidth: 2, priceLineVisible: false, pane: 2 });
        a.setData(line(m.macd)); indicatorRefs.current.push(a);
        const b = chart.addSeries(LineSeries, { lineWidth: 2, priceLineVisible: false, pane: 2 });
        b.setData(line(m.signal)); indicatorRefs.current.push(b);
        const h = chart.addSeries(HistogramSeries, { priceLineVisible: false, pane: 2 });
        h.setData(m.histogram.map(x => ({ time: x.time, value: x.value, color: x.value >= 0 ? "#22c55e" : "#ef4444" }))); indicatorRefs.current.push(h);
      }
    });
    chart.timeScale().fitContent();
  }, [normalized, candles, chartType, indicators]);

  return <div ref={containerRef} className="h-full min-h-[420px] w-full overflow-hidden" aria-label="Interactive financial chart"/>;
}
