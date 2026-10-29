---
name: fullstack-integration
description: Coordinates cross-layer features spanning client UI and server backend. Enforces contract-first design, synchronized state handling, authentication propagation, implementation sequencing, and end-to-end integration verification.
---

# Fullstack Role Workflow

Use this workflow to coordinate features that span both the frontend user interface and backend services. Fullstack engineering is a distinct coordination workflow that eliminates contract drift, asymmetrical assumptions, and integration breakdowns.

## When to Use
- Implementing an end-to-end user-facing feature requiring both UI and API changes.
- Wiring frontend forms, tables, or views to backend endpoints.
- Synchronizing authentication tokens and role-based permissions across client and server.
- Refactoring existing client-server contracts, payloads, or error handling.
- Performing end-to-end integration verification and cross-layer debugging.

## When NOT to Use
- Working exclusively on frontend visual components or isolated styling (use `ui-implementation`).
- Working exclusively on backend database schemas, background jobs, or server internals (use `backend-feature`).
- Video composition and storyboard animation planning (use `video-motion`).

---

## Required Inputs
1. **End-to-End Feature Requirement**: User story, acceptance criteria, and expected user experience from UI trigger to data persistence.
2. **System Architecture Baseline**: Documented in `docs/ai-workflow/architecture.md` (component layout, network boundaries, and trust layers).
3. **Existing Contracts & Models**: `docs/ai-workflow/api-contracts.md` and `docs/ai-workflow/data-model.md`.

## Expected Outputs
1. Synchronized API contract preventing schema mismatch between client and server.
2. Ordered implementation respecting dependency sequencing (Contract -> Backend/Mock -> Frontend -> E2E Wire-up).
3. Symmetric state handling across the integration boundary (loading, empty, success, validation error, server error).
4. Cross-layer integration verification and truthful reporting.

---

## Actionable Execution Procedure

### Step 1: Clarify Cross-Layer Requirements & Acceptance Criteria
1. Define the complete user journey:
   - What triggers the action in the UI?
   - What data does the client collect, validate, and serialize?
   - What does the server validate, authorize, process, and persist?
   - What response payload is returned, and how does the UI acknowledge success or failure?
2. Explicitly specify acceptance criteria that span both layers (e.g. "When user submits with duplicate email, server responds with 409 and client highlights email field with inline error without page refresh").

### Step 2: Contract-First API & Data-Flow Planning
1. **Prevent Contract Drift**: Define the formal request and response interface in `docs/ai-workflow/api-contracts.md` *before* editing client or server code:
   - Route path, HTTP verb, query parameters, headers.
   - Request JSON payload schema with types, optionality, and constraints.
   - Success response payload schema (e.g. `{ data: { id, name, ... } }`).
   - Standardized error payload schema (e.g. `{ error: { code, message, details: [] } }`).
2. Share types or validate schema parity between client API client and server handlers.

### Step 3: Authentication & Authorization Propagation
1. Map user identity and authorization context across the boundary:
   - How does the client store and attach credentials (e.g. `Authorization: Bearer <token>` or HTTP-only cookies with CSRF tokens)?
   - How does the server verify the credential and extract claims (user ID, organization/tenant ID, role)?
   - How does the client reflect permission states (e.g. hide or disable action buttons for read-only users)?
2. **Never Trust Client Claims**: Ensure server authorization is independent of client UI visibility rules.

### Step 4: Implementation Sequencing
To avoid breaking the application during development, follow strict implementation sequencing:
1. **Phase A (Backend Endpoint / Contract)**:
   - Implement server route, validation middleware, and service handler according to `backend-feature` standards.
   - If backend takes longer to build, establish a deterministic mock or route stub matching the exact contract.
2. **Phase B (Client API Client / Service Layer)**:
   - Implement client API service function or query hook matching the exact contract types.
   - Handle network transport, base URL, headers, and authentication token injection.
3. **Phase C (UI Integration & State Wiring)**:
   - Wire the UI component to the client service according to `ui-implementation` standards.

### Step 5: Boundary State Synchronization
Ensure seamless user experience across all network and lifecycle states:
- **Loading**: Show immediate client-side feedback (disable submit button, display spinner/skeleton loader). Prevent duplicate submissions while in-flight.
- **Success**: Update local state or cache optimistically or upon server confirmation. Provide clear affirmative feedback (toast, redirect, or view update).
- **Validation Errors (400 / 422)**: Server returns field-specific error details; client maps errors to specific form inputs.
- **Authentication Failure (401 / 403)**: Client clears invalid session state, displays an actionable message, or prompts re-authentication.
- **Server / Network Errors (500 / Offline)**: Client presents non-technical, friendly error banner with a manual retry option.

### Step 6: Data Consistency & Error Propagation
1. Ensure data types serialize and deserialize symmetrically (e.g. Date objects as ISO strings, numbers not converted to strings).
2. Maintain data consistency when mutations fail: rollback optimistic UI updates if the server request fails.
3. Sanitize server errors so internal stack traces or database errors are not exposed on the client UI.

### Step 7: End-to-End & Integration Verification
1. Run backend unit/integration tests to verify endpoint correctness.
2. Run frontend unit/component tests to verify client rendering and mock interaction.
3. If an end-to-end test framework (e.g. Playwright, Cypress) or full local stack is available:
   - Execute an integrated workflow test from browser/client to server and verify database state.
4. If full automated E2E testing is unavailable, state the limitation and verify via `curl` / API check followed by frontend dev server inspection.

### Step 8: Documentation & Change Reporting
1. Update `docs/ai-workflow/architecture.md` with any new components or data flows.
2. Update `docs/ai-workflow/api-contracts.md` with final endpoint contracts.
3. Report:
   - Backend files changed and verification status.
   - Frontend files changed and verification status.
   - Verified cross-layer scenarios (success, validation error, server error).
   - Any residual risks or follow-up tasks.
