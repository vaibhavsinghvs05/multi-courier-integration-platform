# Multi-Courier Integration Platform

This project is a multi-courier shipment integration platform built using Node.js, TypeScript, NestJS, MongoDB/Mongoose, and React.

I have kept the courier-specific logic separate from the main order flow using a common `CourierAdapter` interface. Currently, the project supports a mock courier for local testing and UrbaneBolt UAT for the actual courier integration.

## Features

- Create shipment
- Track shipment
- Cancel shipment
- Bulk order submission
- Batch status tracking
- Idempotent order creation using `orderId`
- Mock courier for local testing
- UrbaneBolt UAT integration
- MongoDB persistence
- Courier error handling and retries
- React/Vite dashboard
- Static HTML dashboard
- Request validation
- Health check endpoint

## Tech Stack

- Node.js
- TypeScript
- NestJS
- MongoDB
- Mongoose
- Axios
- React
- Vite
- Jest

## Project Structure

```text
src/
├── couriers/
│   ├── courier.errors.ts
│   ├── courier.registry.ts
│   ├── courier.types.ts
│   ├── couriers.module.ts
│   ├── mock-courier.adapter.ts
│   └── urbanebolt.adapter.ts
│
├── orders/
│   ├── dto/
│   ├── schemas/
│   ├── batches.controller.ts
│   ├── health.controller.ts
│   ├── orders.controller.ts
│   ├── orders.module.ts
│   └── orders.service.ts
│
├── app.module.ts
└── main.ts

web/
├── src/
│   ├── main.tsx
│   ├── styles.css
│   └── vite-env.d.ts
├── index.html
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts

app/
└── static/
    └── index.html

tests/
└── mock-courier.spec.ts
```

## How to Run

### 1. Install dependencies

```powershell
npm.cmd install
```

### 2. Configure environment

Copy the example environment file:

```powershell
Copy-Item .env.example .env
```

Update `.env` with the required values.

For local testing, the `mock` courier can be used, so UrbaneBolt credentials are not required.

### 3. Start MongoDB

Start MongoDB locally or use a MongoDB Atlas connection string.

### 4. Start the backend

```powershell
npm.cmd run dev
```

The backend will run on:

```text
http://localhost:3000
```

API base URL:

```text
http://localhost:3000/api/v1
```

### 5. Start the React dashboard

Open another terminal and run:

```powershell
npm.cmd run dev:web
```

Open:

```text
http://localhost:5173
```

For local testing, select the `mock` courier.

## Dashboards

There are two dashboards included in the project.

### React/Vite Dashboard

The React dashboard is located in:

```text
web/
```

It can be started with:

```powershell
npm.cmd run dev:web
```

It provides options for:

- Creating a shipment
- Selecting a courier
- Tracking an order
- Cancelling an order
- Checking batch status

### Static Dashboard

I have also included a simple static HTML dashboard:

```text
app/static/index.html
```

This can be used as a lightweight alternative for testing the API.

Both dashboards use the same backend API.

## API Endpoints

### Health Check

```http
GET /api/v1/health
```

### Create Shipment

```http
POST /api/v1/orders
```

Creates a shipment using the selected courier.

The API uses `orderId` for idempotency. If the same order is submitted again, the existing order is returned instead of creating another shipment.

### Track Shipment

```http
GET /api/v1/orders/:orderId/track
```

Fetches the latest tracking information and stores tracking events in MongoDB.

### Cancel Shipment

```http
POST /api/v1/orders/:orderId/cancel
```

Cancels an existing shipment.

### Submit Bulk Orders

```http
POST /api/v1/orders/bulk
```

Accepts up to 100 orders and processes them asynchronously.

### Get Batch Status

```http
GET /api/v1/batches/:batchId
```

Returns batch progress, completed orders, failed orders, and individual batch items.

## Courier Integration

Courier-specific functionality is implemented through the `CourierAdapter` interface.

Currently available adapters:

```text
MockCourierAdapter
UrbaneBoltAdapter
```

### Mock Courier

The mock courier is mainly used for local testing.

Example:

```json
{
  "courierPartner": "mock"
}
```

It does not require any external credentials.

### UrbaneBolt

The UrbaneBolt adapter uses the UAT environment.

Configuration:

```env
URBANEBOLT_BASE_URL=https://uat.urbanebolt.in
URBANEBOLT_USERNAME=
URBANEBOLT_PASSWORD=
```

Valid UAT credentials are required to test the real UrbaneBolt APIs.

If another courier needs to be added later, a new adapter can be implemented and registered in the courier registry without changing the main order flow.

## Error Handling

The courier integration handles:

- 4xx courier errors
- Network errors
- Request timeouts
- 5xx responses
- Authentication token refresh
- Request retries
- Exponential retry backoff

Retry and timeout values are configurable through environment variables.

Courier failures are also stored against the order so they can be reviewed later.

## Database

MongoDB is used to store:

- Orders
- Order request payloads
- Courier responses
- Tracking events
- Batch information
- Batch items
- Error information
- Order status

Tracking events are stored separately so the shipment history is retained.

## Environment Variables

Example `.env` configuration:

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/courier_platform
JWT_SECRET=replace-with-a-long-random-value
CORS_ORIGIN=http://localhost:5173

COURIER_TIMEOUT_MS=10000
COURIER_RETRY_ATTEMPTS=3
COURIER_RETRY_BACKOFF_MS=250

URBANEBOLT_BASE_URL=https://uat.urbanebolt.in
URBANEBOLT_USERNAME=
URBANEBOLT_PASSWORD=
```

The `.env` file should not be committed to GitHub.

Only `.env.example` should be committed.

## Testing

Run the automated tests:

```powershell
npm.cmd test
```

Build the backend:

```powershell
npm.cmd run build
```

### Manual Testing

For a basic manual test:

1. Start MongoDB.
2. Start the backend.
3. Start the React dashboard.
4. Select the `mock` courier.
5. Create a shipment.
6. Track the shipment.
7. Cancel the shipment.
8. Submit the same order again to verify idempotency.
9. Submit multiple orders using the bulk API.
10. Check the batch status.
11. Test the health endpoint.
12. Test an unsupported courier and validation errors.

## Example Order

The API uses camelCase request fields.

```json
{
  "orderId": "WEB-1001",
  "courierPartner": "mock",
  "invoiceNumber": "INV-WEB-1001",
  "invoiceDate": "2026-08-19",
  "itemDescription": "Cotton t-shirt",
  "itemQuantity": 1,
  "declaredValue": 499,
  "paymentMode": "PREPAID",
  "collectableValue": 0,
  "weightKg": 0.4,
  "dimensionsCm": {
    "length": 20,
    "breadth": 15,
    "height": 5
  },
  "shipper": {
    "name": "Acme Store",
    "addressLine1": "10 Market Road",
    "city": "Gurugram",
    "state": "Haryana",
    "pincode": "122001",
    "phone": "9876543210",
    "email": "ops@example.test"
  },
  "consignee": {
    "name": "Riya Shah",
    "addressLine1": "20 Market Road",
    "city": "Delhi",
    "state": "Delhi",
    "pincode": "110001",
    "phone": "9876543211",
    "email": "riya@example.test"
  },
  "returnAddress": {
    "name": "Acme Returns",
    "addressLine1": "10 Market Road",
    "city": "Gurugram",
    "state": "Haryana",
    "pincode": "122001",
    "phone": "9876543210",
    "email": "returns@example.test"
  }
}
```

## Notes

The `mock` courier is provided so that the complete shipment flow can be tested locally without depending on an external courier service.

The UrbaneBolt adapter is available for UAT testing when valid credentials are configured.

The project was created as part of a technical assignment.