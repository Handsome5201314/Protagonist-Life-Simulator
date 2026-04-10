import { getStream } from "@/lib/app-service";

export const runtime = "nodejs";

function emit(event: string, payload: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ streamId: string }> }
) {
  const { streamId } = await context.params;
  const streamRecord = await getStream(streamId);
  const encoder = new TextEncoder();

  let timer: NodeJS.Timeout | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let index = 0;

      controller.enqueue(encoder.encode(emit("phase", { phase: "queued", round: streamRecord.round })));

      timer = setInterval(() => {
        if (index < streamRecord.segments.length) {
          controller.enqueue(
            encoder.encode(
              emit("delta", {
                phase: "typing",
                checkpoint: index + 1,
                total: streamRecord.segments.length,
                text: streamRecord.segments[index],
              })
            )
          );
          index += 1;
          return;
        }

        controller.enqueue(
          encoder.encode(
            emit("final", {
              phase: "final",
              chapter: streamRecord.finalChapter,
              scoreBoard: streamRecord.scoreBoard,
              elimination: streamRecord.elimination,
              winnerId: streamRecord.winnerId,
            })
          )
        );
        clearInterval(timer);
        controller.close();
      }, 520);
    },
    cancel() {
      if (timer) {
        clearInterval(timer);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
