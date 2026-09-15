import { NextResponse } from "next/server";
import { getStats, getLatest } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [stats, latest] = await Promise.all([getStats(), getLatest(3)]);
    return NextResponse.json({ stats, latest });
  } catch (err) {
    return NextResponse.json(
      { error: "فشل جلب الإحصائيات", detail: (err as Error).message },
      { status: 500 }
    );
  }
}