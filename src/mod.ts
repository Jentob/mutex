/**
 * Mutex for coordinating asynchronous access to shared resources.
 *
 * The package currently provides a lightweight FIFO mutex implementation for
 * enforcing mutually exclusive execution of asynchronous operations.
 *
 * Additional synchronization primitives and more advanced mutex
 * implementations may be added in future.
 *
 * @module
 */

export * from "./simple-mutex.ts";
