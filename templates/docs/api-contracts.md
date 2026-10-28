# API Contracts

> **Usage**: Record verified HTTP API contracts derived from actual routes, controllers, or approved specifications. Do not guess schemas.

## 1. Endpoints Directory
| Method | Path | Auth Required | Roles / Permissions | Purpose | Source File |
|---|---|---|---|---|---|
| `GET` | `/api/v1/health` | No | Public | Service health check | `[src/routes/health.ts]` |
| `POST` | `/api/v1/users` | No | Public | Register new user account | `[src/routes/users.ts]` |
| `GET` | `/api/v1/orders/:id` | Yes (Bearer) | `user`, `admin` | Retrieve order details | `[src/routes/orders.ts]` |

## 2. Detailed Contract Specifications

### `POST /api/v1/orders`
- **Purpose**: [Create a new customer order]
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <TOKEN>`
- **Request Body**:
  ```json
  {
    "itemId": "string (UUID)",
    "quantity": "integer (min: 1, max: 100)",
    "shippingAddress": {
      "street": "string (max: 200)",
      "city": "string (max: 100)",
      "postalCode": "string"
    }
  }
  ```
- **Success Response (`201 Created`)**:
  ```json
  {
    "id": "order-12345",
    "status": "pending",
    "totalAmount": 150000,
    "createdAt": "2026-10-28T10:00:00Z"
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Payload validation failed (`{ "error": "validation_error", "details": [...] }`)
  - `401 Unauthorized`: Missing or expired token
  - `403 Forbidden`: User lacks permission to order for this account
  - `409 Conflict`: Duplicate idempotency key or out-of-stock item
  - `500 Internal Error`: Internal failure, sanitized error message returned
- **Rate Limiting & Idempotency**: [e.g. 60 requests/min per IP, Idempotency-Key supported]
- **Notes & Edge Cases**: [e.g. Transactions are automatically rolled back on payment failure]
