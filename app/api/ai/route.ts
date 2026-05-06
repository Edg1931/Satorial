import { NextRequest, NextResponse } from "next/server";
import { aiChat } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json();
  try {
    const { text, actions } = await aiChat({
      conversationId: body.conversationId || "default",
      userMessage: body.message,
      history: body.history,
      contextHint: body.contextHint,
    });
    return NextResponse.json({ text, actions });
  } catch (e: any) {
    return NextResponse.json({ text: `AI error: ${e?.message || String(e)}`, actions: [] }, { status: 500 });
  }
}
