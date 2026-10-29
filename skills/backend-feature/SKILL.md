---
name: backend-feature
description: Plans, implements, and verifies server-side features, API endpoints, business logic, authorization boundaries, data access, validation, and error handling. Technology-agnostic and enforces security and test coverage.
---

# Backend Role Workflow

Use this workflow to design, implement, test, and verify robust server-side features, APIs, database operations, and background jobs across any backend runtime or framework.

## When to Use
- Implementing or updating API endpoints (REST, GraphQL, gRPC, RPC).
- Developing business logic, domain services, or background tasks.
- Creating or altering database models, queries, or migration scripts.
- Strengthening server-side authentication, authorization, or boundary validation.
- Diagnosing or fixing backend errors, performance bottlenecks, or security defects.

## When NOT to Use
- Implementing frontend UI components or client styling (use `ui-implementation`).
- Coordinating cross-layer API contract sequencing and shared state (use `fullstack-integration`).
- Video composition and storyboard timeline scripting (use `video-motion`).

---

## Required Inputs
1. **Business Requirements & Acceptance Criteria**: What the feature must accomplish, expected inputs/outputs, and edge conditions.
2. **Existing Architecture & Conventions**: Route structures, dependency injection, ORM/query builder, auth middleware, and error handling patterns.
3. **Data & Security Boundaries**: Tenant isolation rules, user roles, permission checks, and data sensitivity requirements.

## Expected Outputs
1. Backward-compatible, secure backend implementation following existing project idioms.
2. Server-side validation, authorization checks, and sanitized error responses.
3. Meaningful unit and integration tests covering happy, boundary, and error paths.
4. Updated API contract (`docs/ai-workflow/api-contracts.md`) and data model documentation (`docs/ai-workflow/data-model.md`).
5. Truthful verification report with test execution results and remaining risks.

---

## Actionable Execution Procedure

### Step 1: Clarify Business Requirements & Edge Cases
1. Analyze the feature request and identify core business rules, actors, and permissions.
2. Identify potential edge cases: null values, empty collections, duplicate records, concurrent modifications, expired tokens, rate limits, and network timeouts.
3. Establish clear success and failure criteria before writing code.

### Step 2: Inspect Architecture, Runtime & Integrations
1. Review the existing project structure: controllers, services, repositories/models, and middleware.
2. Identify the runtime (Node.js, Python, Go, etc.) and active database or caching mechanisms without imposing unapproved dependencies.
3. Trace external dependencies: downstream microservices, third-party APIs (payment, email, search), or message queues.

### Step 3: Define API Contracts & Data Changes First
1. Check `docs/ai-workflow/api-contracts.md` and define the contract:
   - HTTP method and route path (e.g. `POST /api/v1/orders`).
   - Request headers, path params, query params, and body JSON schema.
   - Response status codes and payload structures (200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 422 Unprocessable Entity, 500 Internal Error).
2. Check `docs/ai-workflow/data-model.md` and outline data modifications:
   - Schema migrations, table/collection additions, or column alterations.
   - Maintain backward compatibility (expand before contract; add optional/default fields first).

### Step 4: Security, Authorization & Boundary Validation
1. **Strict Server-Side Validation**:
   - Never trust client data. Validate all incoming parameters against explicit schemas (types, bounds, regex, string length, allowed enums).
   - Sanitize inputs to prevent SQL injection, NoSQL injection, and path traversal.
2. **Boundary Authorization**:
   - Enforce authentication (valid JWT, session cookie, or API key).
   - Enforce authorization at the controller/service boundary: verify user permissions and tenant scope against database/claims.
   - Never accept user IDs or tenant IDs directly from request bodies without validating ownership against the authenticated context.
3. **Secret Protection**:
   - Never hardcode secrets, private keys, or API tokens. Read strictly from environment variables or secret vaults.

### Step 5: Implement Coherent, Idiomatic Changes
1. Implement the minimal necessary change to satisfy requirements without unnecessary refactoring of unrelated code.
2. Maintain transactional consistency: wrap multi-table or multi-document mutations in database transactions where atomicity is required.
3. Query Efficiency: Avoid N+1 queries by utilizing eager loading or batching. Ensure indexed fields are utilized for filters and foreign keys.

### Step 6: Error Handling & Secure Observability
1. Return structured, predictable error responses with standard HTTP status codes.
2. **Sanitize Error Payloads**: Never leak stack traces, database query errors, file paths, or internal server details to external clients.
3. **Secure Logging**: Log operational events with contextual request/correlation IDs. **Never log sensitive data** (passwords, credit card numbers, authorization headers, tokens, PII).

### Step 7: Write & Run Comprehensive Tests
1. Add automated tests covering:
   - **Happy Path**: Expected inputs returning correct status codes and payloads.
   - **Validation Failures**: Missing, malformed, or out-of-range payloads returning 400/422.
   - **Security Checks**: Unauthenticated (401) and unauthorized/forbidden (403) access attempts.
   - **Edge Cases**: Empty lists, boundary values, duplicate entries returning 409 Conflict.
2. Execute the test suite using project test runners (e.g. `npm test`, `pytest`, `go test`).

### Step 8: Update Documentation & Operational Notes
1. Update `docs/ai-workflow/api-contracts.md` with new or modified endpoints.
2. Update `docs/ai-workflow/data-model.md` if schema or relations changed.
3. Note any required environment variables or migration commands in operational documentation.

### Step 9: Verification & Risk Reporting
1. Report exact test command executed, exit status, and test counts.
2. Explicitly note any remaining risks (e.g. database migration locking, third-party API rate limits, or pending asynchronous jobs).
