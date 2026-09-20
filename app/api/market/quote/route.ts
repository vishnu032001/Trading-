import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const symbol = (request.nextUrl.searchParams.get("symbol") || "AAPL").toUpperCase();
  const bases: Record<string, number> = { AAPL: 220, MSFT: 510, NVDA: 145, TSLA: 330, AMZN: 235 };
  const price = (bases[symbol] ?? 100) * (1 + (Math.random() - 0.5) * 0.01);
  const change = (Math.random() - 0.5) * price * 0.02;
  return NextResponse.json({
    quote: { symbol, price, change, changePercent: (change / price) * 100, timestamp: Date.now() },
    source: "mock",
  });
}
