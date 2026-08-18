# Architecture

NestJS modules separate transport, order use cases, persistence, and courier integrations. `OrdersService` is courier-neutral; `CourierRegistry` resolves a strategy-style `CourierAdapter` by partner name. Each adapter owns payload mapping, token handling, and response normalization, so new couriers do not change routes, DTOs, or existing adapters.

MongoDB collections are `orders`, `tracking_events`, `batches`, and `batch_items`. `orderId` is unique for idempotency. Orders retain courier IDs, AWB, normalized outbound request, raw provider response, state, errors, and timestamps. Tracking is append-only. The bulk endpoint returns `202` and processes items with `Promise.allSettled`; production should replace this in-process worker with BullMQ or another durable queue.

The React/Vite dashboard is a separate client communicating with the Nest API through CORS. UrbaneBolt retries transient failures with configurable exponential backoff and refreshes its token after one 401 response.
