/**
 * A handle representing an acquired lock.
 * Must be disposed of via `release()` or `Symbol.dispose` to unlock the
 * mutex for the next waiting task.
 */
export type LockHandle = Disposable & {
    /**
     * Releases the lock and allows the next queued task to proceed. This
     * method is idempotent. Calling it multiple times has no effect.
     */
    release: () => void;
};

/**
 * A minimal asynchronous FIFO mutex.
 *
 * Only one caller may hold the lock at a time. Callers that attempt to acquire
 * the lock while it is held are queued and granted access in the order they
 * requested it.
 *
 * The lock must be released when the protected operation completes, or the
 * application will hang.
 *
 * There are three ways to use this mutex:
 *
 * @example Execute a task exclusively
 * ```ts ignore
 * const mutex = new SimpleMutex()
 *
 * await mutex.runExclusive(async () => {
 *     await criticalOperation();
 * });
 * ```
 *
 * @example Use a lock handle with `using`
 * ```ts ignore
 * // Lock is released when _lock goes out of scope
 * using _lock = await mutex.acquire();
 * await criticalOperation();
 * ```
 *
 * @example Acquire and release manually
 * ```ts ignore
 * const lock = await mutex.acquire();
 * try {
 *     await criticalOperation();
 * } finally {
 *     lock.release();
 * }
 * ```
 */
export class SimpleMutex {
    #queue: ((lockHandle: LockHandle) => void)[] = [];
    #isLocked = false;

    /**
     * Whether the mutex is currently held by a caller.
     *
     * A value of `true` indicates that a lock is active or ownership is being
     * transferred to the next queued waiter.
     */
    get isLocked(): boolean {
        return this.#isLocked;
    }

    #release(): void {
        const resolveNext = this.#queue.shift();
        if (resolveNext) {
            resolveNext(this.#createLockHandle());
        } else {
            this.#isLocked = false;
        }
    }

    #createLockHandle(): LockHandle {
        let releaseCalled = false;
        const release = () => {
            if (releaseCalled) return;
            releaseCalled = true;
            this.#release();
        };

        return {
            release,
            [Symbol.dispose]: release,
        };
    }

    /**
     * Acquires the mutex.
     *
     * If the mutex is available, the returned promise resolves immediately.
     * Otherwise, the caller is queued and the promise resolves once all
     * earlier waiters have acquired and released the lock.
     *
     * The returned handle must be released when the protected operation has
     * completed. Calling `release()` or disposing of the handle multiple times
     * is safe.
     *
     * @returns A promise that resolves to a lock handle. The handle must be
     * released or disposed of to allow the next queued task to proceed.
     */
    acquire(): Promise<LockHandle> {
        return new Promise<LockHandle>((resolve, _reject) => {
            if (!this.#isLocked) {
                this.#isLocked = true;
                resolve(this.#createLockHandle());
            } else {
                this.#queue.push(resolve);
            }
        });
    }

    /**
     * Executes a task while holding the mutex.
     *
     * The mutex is automatically released after the task completes, even if
     * the task throws.
     *
     * @param task The function to execute while holding the mutex.
     * @returns The value returned by the task.
     */
    async runExclusive<T>(task: () => Promise<T> | T): Promise<T> {
        using _lock = await this.acquire();
        return await task();
    }
}
