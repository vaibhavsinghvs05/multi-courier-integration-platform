# Design Document

## Architecture

The application is built with NestJS and is split into separate modules for orders, database access, and courier integrations.

"The main order logic is handled by OrdersService. It does not contain courier-specific API logic; the actual courier operations are handled by the registered adapters."

The project currently has two courier adapters:

- `MockCourierAdapter` for local testing
- `UrbaneBoltAdapter` for UrbaneBolt UAT

Each adapter handles its own API requests, authentication, payload mapping, response handling, and courier-specific errors.

This makes it easier to add another courier later without changing the existing order APIs or business logic.

## Order Flow

The main flow is:

```text
Client / Dashboard
        |
        v
OrdersController
        |
        v
OrdersService
        |
        v
CourierRegistry
        |
        v
CourierAdapter
     /       \
   Mock    UrbaneBolt
        |
        v
     MongoDB
```

When an order is created, it is first saved with a `PROCESSING` status. The selected courier adapter is then called. Once the courier responds, the order is updated with the courier order ID, AWB, status, and raw response.

If the courier request fails, the order is marked as `FAILED` and the error information is stored.

## Idempotency

`orderId` is used to make order creation idempotent.

The `orders` collection has a unique index on `orderId`. If the same order is submitted again, the existing order is returned instead of creating another shipment.

Duplicate-key handling is also included to cover concurrent requests for the same order.

## Database

MongoDB is used through Mongoose.

The main collections are:

```text
orders
tracking_events
batches
batch_items
```

The `orders` collection stores the order details, courier information, AWB, status, request payload, courier response, errors, and timestamps.

Tracking information is stored in `tracking_events` so that the tracking history is retained instead of replacing previous events.

`batches` and `batch_items` are used to keep track of bulk order processing and the result of each individual order.

## Bulk Orders

The bulk API accepts up to 100 orders.

A batch is created first and the API returns a `batchId` with a `202 Accepted` response. The orders are then processed asynchronously using `Promise.allSettled`.

Using `Promise.allSettled` means that one failed order does not stop the remaining orders in the batch.

For a production setup, I would move this processing to a durable queue such as BullMQ with Redis. This would make background processing more reliable if the application restarts and would also provide better retry and worker management.

## UrbaneBolt Integration

The UrbaneBolt adapter contains the UrbaneBolt-specific integration logic.

It handles:

- Authentication and token caching
- Shipment creation
- Tracking
- Cancellation
- Request payload mapping
- Response normalization

The UAT URL and credentials are configured through environment variables.

```env
URBANEBOLT_BASE_URL=https://uat.urbanebolt.in
URBANEBOLT_USERNAME=
URBANEBOLT_PASSWORD=
```

Credentials are kept outside the source code and are not committed to GitHub.

## Error Handling

Courier 4xx responses are treated as client errors.

Network failures, timeouts, and 5xx responses are retried using configurable exponential backoff.

The retry settings are controlled through:

```env
COURIER_TIMEOUT_MS=10000
COURIER_RETRY_ATTEMPTS=3
COURIER_RETRY_BACKOFF_MS=250
```

If UrbaneBolt returns a `401`, the cached token is cleared and authentication is attempted again once.

If the courier is still unavailable after the configured retries, the order is marked as failed.

## Frontend

The project includes two dashboards.

The main dashboard is a React/Vite application located in:

```text
web/
```

It can be used to create shipments, select a courier, track orders, cancel shipments, and check batch status.

There is also a lightweight static dashboard located at:

```text
app/static/index.html
```

Both dashboards use the same NestJS API.

## Future Improvements

For a production deployment, I would consider adding:

- BullMQ/Redis for durable background processing
- Authentication and authorization
- Rate limiting
- Swagger/OpenAPI documentation
- Centralized logging and monitoring
- Additional courier integrations
- CI/CD pipeline
