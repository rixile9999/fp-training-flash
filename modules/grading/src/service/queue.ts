/** FIFO limiter: at most `concurrency` tasks run at once (runner jobs are CPU and memory heavy). */
export interface JobQueue {
  run<T>(task: () => Promise<T>): Promise<T>;
  readonly active: number;
  readonly waiting: number;
}

export function createJobQueue(concurrency: number): JobQueue {
  const limit = Math.max(1, Math.floor(concurrency));
  let active = 0;
  const waiters: (() => void)[] = [];
  // A finishing task hands its slot directly to the next waiter, so newcomers cannot jump the queue.
  const release = () => {
    const next = waiters.shift();
    if (next) next();
    else active--;
  };
  return {
    get active() {
      return active;
    },
    get waiting() {
      return waiters.length;
    },
    async run<T>(task: () => Promise<T>): Promise<T> {
      if (active >= limit) await new Promise<void>((r) => waiters.push(r));
      else active++;
      try {
        return await task();
      } finally {
        release();
      }
    },
  };
}
