import { NextRequest } from "next/server";
import { documentsGraph } from "@/lib/graph/graphs/documents";
import { emitWorkflowComplete, makeSseAdapter } from "@/lib/graph/sse";
import { getCurrentUser } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new Response("unauthorized", { status: 401 });

  const { caseId, userComment } = await req.json();
  if (!caseId) return new Response("caseId required", { status: 400 });

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (data: unknown) =>
        controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));

      const handle = makeSseAdapter(send);
      try {
        for await (const ev of documentsGraph.streamEvents(
          { caseId, userId: user.id, userComment },
          { version: "v2" },
        )) {
          await handle(ev);
        }
        emitWorkflowComplete(send);
      } catch (err) {
        send({ type: "agent_error", message: String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    },
  });
}
