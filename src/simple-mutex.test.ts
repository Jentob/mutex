import { assertEquals } from "@std/assert";
import { SimpleMutex } from "./simple-mutex.ts";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.test("isLocked reflects mutex state", async () => {
    const mutex = new SimpleMutex();

    assertEquals(mutex.isLocked, false);

    const lock = await mutex.acquire();

    assertEquals(mutex.isLocked, true);

    lock.release();

    assertEquals(mutex.isLocked, false);
});

Deno.test("mutex allows only one active critical section", async () => {
    const mutex = new SimpleMutex();

    let active = 0;
    let maxActive = 0;

    const tasks = Array.from({ length: 100 }, async () => {
        const lock = await mutex.acquire();

        active++;
        maxActive = Math.max(maxActive, active);

        await sleep(5);

        active--;
        lock.release();
    });

    await Promise.all(tasks);

    assertEquals(maxActive, 1);
    assertEquals(active, 0);
});

Deno.test("mutex preserves FIFO ordering", async () => {
    const mutex = new SimpleMutex();
    const order: number[] = [];

    const makeTask = (id: number, registerDelay: number) => async () => {
        if (registerDelay > 0) await sleep(registerDelay);
        const lock = await mutex.acquire();
        order.push(id);
        lock.release();
    };

    const baseLock = await mutex.acquire();

    const p1 = makeTask(0, 0)();
    const p2 = makeTask(1, 5)();
    const p3 = makeTask(2, 10)();

    await sleep(5);
    baseLock.release();

    await Promise.all([p1, p2, p3]);

    assertEquals(order, [0, 1, 2]);
});

Deno.test("mutex releases lock even if task throws", async () => {
    const mutex = new SimpleMutex();

    let completed = 0;

    const t1 = mutex.runExclusive(() => {
        throw new Error("fail");
    }).catch(() => {});

    const t2 = mutex.runExclusive(() => {
        completed++;
    });

    await Promise.all([t1, t2]);

    assertEquals(completed, 1);
});

Deno.test("manual acquire/release allows subsequent acquisition", async () => {
    const mutex = new SimpleMutex();

    const lock = await mutex.acquire();

    let secondAcquired = false;

    const p = mutex.acquire().then((l) => {
        secondAcquired = true;
        l.release();
    });

    // Ensure second cannot proceed immediately
    await sleep(10);
    assertEquals(secondAcquired, false);

    lock.release();

    await p;
    assertEquals(secondAcquired, true);
});

Deno.test("lock is released via Symbol.dispose", async () => {
    const mutex = new SimpleMutex();

    let acquired = false;

    {
        using _lock = await mutex.acquire();

        mutex.acquire().then(() => {
            acquired = true;
        });

        await Promise.resolve();
        assertEquals(acquired, false);
    }

    await Promise.resolve();
    assertEquals(acquired, true);
});

Deno.test("lock handle ignores duplicate release calls", async () => {
    const mutex = new SimpleMutex();

    const lock1 = await mutex.acquire();

    let acquired2 = false;
    let acquired3 = false;

    const lock2Promise = mutex.acquire().then((lock) => {
        acquired2 = true;
        return lock;
    });

    const lock3Promise = mutex.acquire().then((lock) => {
        acquired3 = true;
        return lock;
    });

    lock1.release();
    lock1.release();

    const lock2 = await lock2Promise;
    assertEquals(acquired2, true);
    assertEquals(acquired3, false);

    lock2.release();

    const lock3 = await lock3Promise;
    assertEquals(acquired3, true);

    lock3.release();
});
