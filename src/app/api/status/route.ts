import {NextRequest} from 'next/server';
import {getJobStatus} from "@/client/database";
import {JobStatus} from "@/types";

const JobNotFound = {
  error: 'Job not found',
  details: 'No job found'
}

const StreamInitError = {
  error: 'Stream initialization failed',
  details: 'Failed to initialize SSE stream'
}

const PollingError = {
  error: 'Failed to fetch job status',
  details: 'Failed to poll job status'
}

export interface JobUpdateEvent {
  status: JobStatus;
  updated_at: string
}

function clearAndClose(controller: ReadableStreamDefaultController<string>, interval:  NodeJS.Timeout | null = null) {
  if (interval) {
    clearInterval(interval);
  }
  controller.close();
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return Response.json({error: 'Job ID required'}, {status: 400});
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {

      const sendEvent = (data: JobUpdateEvent | { error: string; details?: string }) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      let pollInterval: NodeJS.Timeout | null = null;

      try {
        pollInterval = setInterval(async () => {
          try {
            const job = await getJobStatus(jobId);

            if (!job) {
              sendEvent(JobNotFound);
              clearAndClose(controller, pollInterval);
              return;
            }

            sendEvent({
              status: job.status,
              updated_at: new Date(job.updated_at).toISOString(),
            });

            if (job.status === JobStatus.COMPLETE || job.status === JobStatus.FAILED) {
              clearAndClose(controller, pollInterval);
            }

          } catch (error) {
            console.error('Polling error:', error);
            sendEvent(PollingError);
            clearAndClose(controller, pollInterval);
          }
        }, 1000);

        request.signal.addEventListener('abort', () => {
          clearAndClose(controller, pollInterval);
        });

      } catch (error) {
        console.error('Stream initialization error:', error);
        sendEvent(StreamInitError);
        clearAndClose(controller, pollInterval);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
