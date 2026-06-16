/**
 * Mutex for coordinating asynchronous access to shared resources.
 *
 * The package currently provides a lightweight FIFO mutex implementation for
 * enforcing mutually exclusive execution of asynchronous operations.
 *
 * Additional synchronization primitives and more advanced mutex
 * implementations may be added in future.
 *
 * @example
 * ```ts ignore
 * const mutex = new SimpleMutex()
 *
 * // Execute a task exclusively
 * await mutex.runExclusive(async () => {
 *     await criticalOperation();
 * });
 *
 * // Use a lock handle with `using`
 * {
 *     // Lock is released when _lock goes out of scope
 *     using _lock = await mutex.acquire();
 *     await criticalOperation();
 * }
 *
 * // Acquire and release manually
 * const lock = await mutex.acquire();
 * try {
 *     await criticalOperation();
 * } finally {
 *     lock.release();
 * }
 * ```
 *
 * @module
 */

export * from "./simple-mutex.ts";
