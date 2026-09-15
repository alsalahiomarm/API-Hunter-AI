import { NextRequest, NextResponse } from "next/server";
import { getAllServices } from "@/lib/store";
import type { ServiceRecord } from "@apihunter/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  try {
    const services = await getAllServices({
      search: sp.get("search") ?? "",
      category: (sp.get("category") as ServiceRecord["category"]) ?? "",
      status: (sp.get("status") as ServiceRecord["status"]) ?? "",
    });
    return NextResponse.json({ services });
  } catch (err) {
    return NextResponse.json(
      { error: "فشل جلب الخدمات", detail: (err as Error).message },
      { status: 500 }
    );
  }
}