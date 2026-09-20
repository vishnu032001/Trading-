import { NextRequest, NextResponse } from "next/server";
import type { Timeframe } from "@/types/trading";

const steps: Record<Timeframe, number> = { "1m": 60, "5m": 300, "1h": 3600, "1D": 86400, "1W": 604800 };

function seed(symbol: string, timeframe: Timeframe, count = 250) {
  const now = Math.floor(Date.now() / 1000), step = steps[timeframe];
  let price = symbol === "AAPL" ? 220 : symbol === "NVDA" ? 145 : symbol === "MSFT" ? 510 : 100;
  return Array.from({ length: count }, (_, i) => {
    const time = now - (count - i) * step, drift = (Math.sin(i * 0.17) * 0.004 + (Math.random() - 0.5) * 0.008) * price;
    const open = price, close = Math.max(1, price + drift);
    const high = Math.max(open, close) * (1 + Math.random() * 0.006), low = Math.min(open, close) * (1 - Math.random() * 0.006);
    price = close;
    return { time, open, high, low, close, volume: Math.floor(100000 + Math.random() * 2000000) };
  });
}

export async function GET(request: NextRequest) {
  const symbol = (request.nextUrl.searchParams.get("symbol") || "AAPL").toUpperCase();
  const timeframe = (request.nextUrl.searchParams.get("timeframe") || "5m") as Timeframe;
  return NextResponse.json({ symbol, timeframe, candles: seed(symbol, steps[timeframe] ? timeframe : "5m"), source: "mock" });
}
