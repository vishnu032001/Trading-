"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  AreaSeries,
  CandlestickSeries,
  ColorType,
  createChart,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import { useTradingStore } from "@/store/useTradingStore";
import type { IndicatorConfig, OHLCV } from "@/types/trading";

type PriceSeries = ISeriesApi<"Candlestick"> | ISeriesApi<"Line"> | ISeriesApi<"Area">;

function sma(candles: OHLCV[], period: number) {
  const output: { time: Time; value: number }[] = [];
  for (let i = period - 1; i < candles.length; i++) {
    const window = candles.slice(i - period + 1, i + 1);
    output.push({
      time: candles[i].time as Time,
      value: window.reduce((sum, candle) => sum + candle.close, 0) / period,
    });
  }
  return output;
}

function ema(candles: OHLCV[], period: number) {
  if (candles.length < period) return [];
  const multiplier = 2 / (period + 1);
  let previous = candles.slice(0, period).reduce((s, c) => s + c.close, 0) / period;
  const output: { time: Time; value: number }[] = [
    { time: candles[period - 1].time as Time, value: previous },
  ];

  for (let i = period; i < candles.length; i++) {
    previous = (candles[i].close - previous) * multiplier + previous;
    output.push({ time: candles[i].time as Time, value: previous });
  }
  return output;
}

function rsi(candles: OHLCV[], period = 14) {
  if (candles.length <= period) return [];
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = candles[i].close - candles[i - 1].close;
    gains += Math.max(change, 0);
    losses += Math.max(-change, 0);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  const output: { time: Time; value: number }[] = [];

  const calculate = () => {
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  };

  output.push({ time: candles[period].time as Time, value: calculate() });

  for (let i = period + 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    output.push({ time: candles[i].time as Time, value: calculate() });
  }

  return output;
}

function addIndicatorSeries(
  chart: IChartApi,
  candles: OHLCV[],
  indicator: IndicatorConfig
) {
  if (!indicator.enabled) return null;

  if (indicator.type === "SMA" || indicator.type === "EMA") {
    const period = indicator.period ?? 20;
    const data =
      indicator.type === "SMA" ? sma(candles, period) : ema(candles, period);

    const series = chart.addSeries(LineSeries, {
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    series.setData(data);
    return series;
  }

  // RSI is calculated here so the chart has a usable baseline.
  // A dedicated pane can be introduced by creating another chart instance
  // or by using Lightweight Charts' pane configuration in a later pass.
  if (indicator.type === "RSI") {
    const data = rsi(candles, indicator.period ?? 14);
    const series = chart.addSeries(LineSeries, {
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    series.setData(data);
    return series;
  }

  return null;
}

export default function TradingChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<PriceSeries | null>(null);
  const indicatorSeriesRef = useRef<ISeriesApi<"Line">[]>([]);

  const candles = useTradingStore((state) => state.candles);
  const chartType = useTradingStore((state) => state.chartType);
  const indicators = useTradingStore((state) => state.indicators);

  const normalizedCandles = useMemo(
    () =>
      candles.map((candle) => ({
        ...candle,
        time: candle.time as Time,
      })),
    [candles]
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "#09090b" },
        textColor: "#a1a1aa",
      },
      grid: {
        vertLines: { color: "#18181b" },
        horzLines: { color: "#18181b" },
      },
      crosshair: {
        mode: 0,
      },
      rightPriceScale: {
        borderColor: "#27272a",
      },
      timeScale: {
        borderColor: "#27272a",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !normalizedCandles.length) return;

    if (seriesRef.current) {
      chart.removeSeries(seriesRef.current);
      seriesRef.current = null;
    }

    if (chartType === "candlestick") {
      const series = chart.addSeries(CandlestickSeries, {
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderVisible: false,
        wickUpColor: "#22c55e",
        wickDownColor: "#ef4444",
      });
      series.setData(normalizedCandles);
      seriesRef.current = series;
    } else if (chartType === "line") {
      const series = chart.addSeries(LineSeries, {
        lineWidth: 2,
        priceLineVisible: false,
      });
      series.setData(
        normalizedCandles.map((candle) => ({
          time: candle.time,
          value: candle.close,
        }))
      );
      seriesRef.current = series;
    } else {
      const series = chart.addSeries(AreaSeries, {
        lineWidth: 2,
        priceLineVisible: false,
        topColor: "rgba(34, 197, 94, 0.25)",
        bottomColor: "rgba(34, 197, 94, 0.02)",
      });
      series.setData(
        normalizedCandles.map((candle) => ({
          time: candle.time,
          value: candle.close,
        }))
      );
      seriesRef.current = series;
    }

    indicatorSeriesRef.current.forEach((series) => {
      chart.removeSeries(series);
    });
    indicatorSeriesRef.current = [];

    for (const indicator of indicators) {
      const series = addIndicatorSeries(chart, candles, indicator);
      if (series) indicatorSeriesRef.current.push(series);
    }

    chart.timeScale().fitContent();
  }, [normalizedCandles, candles, chartType, indicators]);

  return (
    <div
      ref={containerRef}
      className="h-full min-h-[420px] w-full overflow-hidden"
      aria-label="Interactive financial chart"
    />
  );
}
