# mutex

[![JSR](https://jsr.io/badges/@tobias/mutex)](https://jsr.io/@tobias/mutex)

Mutex for coordinating asynchronous access to shared resources.

The package currently provides a lightweight FIFO mutex implementation for enforcing mutually
exclusive execution of asynchronous operations.

## Examples

### Using SimpleMutex

```ts
const mutex = new SimpleMutex();

// Execute a task exclusively
await mutex.runExclusive(async () => {
    await criticalOperation();
});

// Use a lock handle with `using`
{
    // Lock is released when _lock goes out of scope
    using _lock = await mutex.acquire();
    await criticalOperation();
}

// Acquire and release manually
const lock = await mutex.acquire();
try {
    await criticalOperation();
} finally {
    lock.release();
}
```
