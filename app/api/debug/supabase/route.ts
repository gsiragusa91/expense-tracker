import { NextResponse } from "next/server";
import { getSupabaseDiagnostics } from "@/lib/supabase/env";

export function GET() {
  return NextResponse.json(getSupabaseDiagnostics(), {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
