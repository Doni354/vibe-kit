---
name: backend-feature
description: Plans, implements, and verifies robust backend features while preserving existing architecture, API contracts, validation, authorization, data integrity, error handling, and observability. Use for endpoints, business logic, background jobs, database changes, or server integrations.
---

# Backend Feature Engineering

Follow this end-to-end procedure when designing, modifying, or testing backend services.

## 1. Discovery & Boundary Analysis

1. **Inspect Existing Patterns**: Review current route/controller/service/repository layering and project conventions before drafting code. Preserve existing architectural patterns.
2. **Review API Contracts**: Check `docs/ai-workflow/api-contracts.md` or existing route definitions. Confirm method, route path, query parameters, payload schemas, and response formats.
3. **Trace Dependencies**: Identify downstream services, database tables, caches, third-party APIs, and messaging queues affected by the change.

## 2. Security, Validation & Authorization

- **Strict Server-Side Validation**: Never rely solely on client-side validation. Enforce schema validation (types, string lengths, ranges, regex, allowed enum values) on all incoming requests. Sanitize inputs to prevent SQL injection, NoSQL injection, and path traversal.
- **Boundary Authorization**: Enforce authentication and authorization at the service/controller boundary. Verify user identity, tenant isolation, and permissions against the database or token claims. Never trust client-supplied user IDs or role overrides.
- **Secret & Token Protection**: Load secrets strictly via environment variables or secret managers. Never hardcode credentials, private keys, or tokens in source code.

## 3. Data Integrity, Migrations & Cost Efficiency

- **Non-Destructive Migrations**: Plan schema changes to be backwards-compatible (expand before contract). Add new nullable/default columns first; avoid deleting or renaming production columns without migration phases.
- **Transactional Consistency**: Wrap multi-step mutations in database transactions where atomicity is required.
- **Query & Resource Efficiency**: Prevent N+1 queries by leveraging eager loading or joins. Ensure proper indexes exist for foreign keys and frequent query filters. Keep payload sizes and external API calls lean to minimize cloud/API costs.

## 4. Error Handling & Secure Observability

- **Unified Error Responses**: Return structured, consistent error payloads with standard HTTP status codes (400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 422 Unprocessable Entity, 500 Internal Error).
- **Sanitized Error Details**: Never leak stack traces, database query errors, internal server paths, or SQL syntax to API clients in production responses.
- **Secure Logging**: Log meaningful operational events with contextual request/trace IDs. **Never log sensitive data**, including passwords, credit card numbers, authorization headers, JWT tokens, session cookies, or PII.

## 5. Implementation & Verification

1. Implement the feature in small, coherent steps following existing project idioms.
2. Write targeted tests covering:
   - Happy path with valid payloads.
   - Validation failures with invalid/malformed payloads.
   - Unauthorized and forbidden access attempts.
   - Edge cases (null values, boundary values, empty lists, duplicate keys).
3. Verify with actual test runners or curl checks, observe exit codes, and report exact results.
