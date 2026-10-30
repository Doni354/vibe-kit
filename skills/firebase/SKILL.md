---
name: firebase
description: Technology workflow and engineering practices for Firebase projects. Covers service scoping, Firestore data modeling, client vs admin trust boundaries, security rules, Cloud Functions, and emulator verification.
---

# Firebase Technology Workflow

Use this workflow to design, implement, secure, and verify features built with Google Firebase services across frontend clients, backend runtimes, and serverless Cloud Functions.

## When to Use
- Developing or updating features that utilize Firebase services (Cloud Firestore, Firebase Authentication, Cloud Functions, Cloud Storage).
- Designing or auditing Firestore data models, collection hierarchies, document schemas, or composite indexes.
- Writing, reviewing, or testing Firebase Security Rules (`firestore.rules`, `storage.rules`).
- Implementing Cloud Functions triggers (HTTP, Callable, Firestore events, Auth events).
- Configuring Firebase Local Emulator Suite or evaluating deployment blast radius.

## When NOT to Use
- Working with relational SQL databases like PostgreSQL (use `postgresql`).
- Implementing generic frontend UI component states or styling (use `ui-implementation`).
- Implementing generic backend REST/gRPC routes without Firebase SDKs (use `backend-feature`).
- Video timeline compositions and storyboard animations (use `video-motion`).

---

## Required Inputs
1. **Target Firebase Services**: The specific Firebase services required by the feature (Firestore, Auth, Storage, Functions).
2. **Execution Environment**: Client application (untrusted) vs trusted server/functions (elevated admin privileges).
3. **Data Access Requirements**: Query filters, ordering, pagination requirements, and security constraints.

## Expected Outputs
1. Service-appropriate implementation matching project SDK patterns (Client SDK vs Firebase Admin SDK).
2. Scalable Firestore document structure with composite indexes declared in `firestore.indexes.json` if required.
3. Secure, tested Firebase Security Rules protecting client-accessible collections.
4. Robust Cloud Functions with input validation, idempotency, and error handling.
5. Verification summary using Local Emulator Suite or truthful manual test procedures.

---

## Actionable Execution Procedure

### Step 1: Service Scoping & Trust Boundary Identification
1. **Identify Active Services**: Inspect `firebase.json`, `.firebaserc`, and project manifests (`package.json`, `pubspec.yaml`, `requirements.txt`) to determine the exact Firebase services utilized:
   - Cloud Firestore (document database)
   - Firebase Realtime Database (JSON database)
   - Firebase Authentication (identity & access tokens)
   - Cloud Functions for Firebase (serverless backend triggers)
   - Cloud Storage for Firebase (blob storage)
   - Firebase Hosting (static & web hosting)
   - **Service-Specific Adaptation**: Do NOT assume a project uses all Firebase services. Tailor workflow instructions strictly to the active services. If a project only uses Cloud Storage or Authentication, do not prescribe Firestore data modeling or Cloud Functions rules.
2. **Establish the Trust Boundary**:
   - **Client Context (Web / Mobile SDK)**:
     - Runs on end-user devices (untrusted environment).
     - Direct client access to Firestore and Storage is governed **strictly by Firebase Security Rules**.
     - All user input must be validated by Security Rules on write.
   - **Trusted Server Context (Firebase Admin SDK)**:
     - Runs in Cloud Functions, Node.js/Python servers, or secure backend containers with service account credentials.
     - **CRITICAL INVARIANT**: Operations performed via the Firebase Admin SDK **bypass Firebase Security Rules entirely**.
     - Security Rules do NOT protect backend Admin SDK operations. The backend application code MUST enforce its own boundary validation, tenant scoping, token verification, and authorization checks before executing Admin SDK writes. Security Rules cannot be relied upon to protect backend-to-backend operations.

### Step 2: Cloud Firestore Data Modeling & Query Access Patterns
1. **Hierarchy Design**:
   - **Root Collections**: For independently queryable top-level entities (e.g. `users`, `organizations`, `products`).
   - **Subcollections**: For data strictly scoped to a parent entity (e.g. `users/{userId}/sessions`). Use subcollections when items are almost always accessed within the context of the parent.
   - **Collection Group Queries**: If subcollections must be queried across all parents (e.g. all `reviews` across all `products`), define collection group index requirements in `firestore.indexes.json`.
2. **Firestore Architectural Constraints**:
   - **Document Size Limit & Bounded Arrays**: Maximum document size is 1 MiB.
     - *Bounded Arrays*: Small, bounded arrays (e.g. 5 tags, a few role names, small status lists) are completely idiomatic and safe.
     - *Unbounded Collections*: Never store unbounded arrays or growing event logs (e.g. infinite chat messages, audit logs) inside a single document; use subcollections instead.
   - **Write Rate Limits & Distributed Counters**: Maximum sustained write rate to a single document is ~1 write/second.
     - *Contextual Guidance*: Only recommend distributed counter shards when sustained write rates to a single counter document are expected to exceed **~1 write per second** (e.g. viral post likes, live polling). For standard application counters (user followers, cart items, view counts under normal loads), standard document updates or atomic `FieldValue.increment()` on a single document are simpler, cost-effective, and fully sufficient.
   - **Shallow Queries**: Firestore queries are shallow—querying a collection does not fetch subcollection documents.
   - **Query Filter Limitations**: A single query cannot combine inequality operators across multiple different fields without composite index definitions.
3. **Read Cost, Denormalization & Pagination Discipline**:
   - **Denormalization as a Trade-Off**: Denormalizing data (e.g. copying `authorName` into a post) reduces read latency and avoids N+1 queries. However, it introduces **write amplification** and **eventual consistency / synchronization maintenance**. Only denormalize when read volume heavily dominates and the application can tolerate stale data or handle synchronization.
   - **Mandatory Pagination**: Never fetch unbounded collections on the client. Always specify a query limit (`limit(N)`) and use cursor-based pagination with `startAfter(lastVisibleDocumentSnapshot)`.

### Step 3: Authentication, Authorization & Security Rules
1. **Authentication Identity & Claims**:
   - Use Firebase Authentication to verify identity (ID tokens).
   - Use Custom Claims (`request.auth.token.<claim>`) set via Admin SDK for role-based authorization (e.g. `role: 'admin'`, `tenantId: 'org_123'`). Avoid storing roles in user-writable Firestore documents.
2. **Security Rules Authoring (`firestore.rules`)**:
   - **Default Closed**: Start with `allow read, write: if false;`.
   - **Granular Operation Rules**: Separate permissions into discrete actions:
     - Read: `get` (single document) and `list` (queries).
     - Write: `create` (new document), `update` (existing document), `delete`.
   - **Comprehensive Authorization Patterns**:
     - *User Ownership Pattern* (single-user private data):
       ```javascript
       allow read, write: if request.auth != null && request.auth.uid == userId;
       ```
     - *Custom Claims Pattern* (fast, token-based RBAC, zero document read cost):
       ```javascript
       allow write: if request.auth.token.role == 'admin';
       allow read: if request.auth.token.orgId == resource.data.orgId;
       ```
     - *Collaborator / Membership Pattern* (shared access):
       ```javascript
       allow read: if request.auth.uid in resource.data.members;
       ```
     - *Dynamic RBAC via Document Lookup (`get()`)*:
       ```javascript
       allow write: if get(/databases/$(database)/documents/roles/$(request.auth.uid)).data.isAdmin == true;
       ```
       *(Note: Each `get()` call in security rules counts as an additional billable document read and adds latency).*
     - *Public Read / Restricted Write Pattern* (catalogs, blog posts):
       ```javascript
       allow read: if true;
       allow write: if request.auth.token.role == 'admin';
       ```
     - Never enforce `request.auth.uid == userId` as the sole authorization pattern when the domain calls for custom claims, membership lists, or public access.
   - **Data Validation Invariants**:
     - Compare `create` and `update` rules. Ensure a user cannot create valid data and then update it into an unauthorized state.
     - Enforce field types and bounds: verify string lengths (`request.resource.data.title.size() <= 100`) to prevent resource exhaustion attacks.
     - Prevent field tampering: ensure immutable fields cannot be modified (`request.resource.data.authorId == resource.data.authorId`).
     - Prevent privilege self-escalation: never permit client writes to modify `role`, `isAdmin`, or billing attributes.
3. **Change Safety**: Never suggest open security rules (`allow read, write: if true;`), even for temporary testing. Never modify production security rules without evaluating the blast radius.

### Step 4: Cloud Functions for Firebase
1. **Trigger Type Discipline**:
   - **Callable Functions (`onCall`)**: Built-in auth token validation and automatic serialization. Use for authenticated client-to-backend RPC operations.
   - **HTTP Functions (`onRequest`)**: Standard express-style HTTP endpoints. Must manually verify Bearer tokens via `admin.auth().verifyIdToken()`.
   - **Event Triggers (`onDocumentCreated`, `onDocumentUpdated`, etc.)**: Background tasks responding to database mutations.
2. **Idempotency & Cold Start Optimization**:
   - Event-driven background functions can occasionally execute more than once (at-least-once delivery). Implement idempotency checks (e.g. storing processed event IDs) for sensitive actions like payment processing or notification dispatch.
   - Keep global initialization lean to minimize cold start latency. Initialize SDKs outside handlers; load heavy dependencies dynamically only when needed.
3. **Structured Error Handling**:
   - In Callable functions, throw `functions.https.HttpsError` with standardized codes (`unauthenticated`, `permission-denied`, `invalid-argument`, `not-found`).
   - Never leak internal error stacks or sensitive configuration details to client callers.

### Step 5: Cloud Storage for Firebase (if applicable)
1. **Storage Rules (`storage.rules`)**:
   - Enforce authentication: `request.auth != null`.
   - Validate file metadata: restrict MIME types (`request.resource.contentType.matches('image/.*')`).
   - Validate file size limits (`request.resource.size < 5 * 1024 * 1024` for 5 MB limit).
   - Scope storage paths to authenticated user IDs (`users/{userId}/{fileName}`) or shared project IDs.

### Step 6: Testing, Emulators & Deployment Verification
1. **Local Emulator Suite Testing**:
   - Run the Firebase Local Emulator Suite for safe, zero-cost, offline testing:
     ```bash
     npx -y firebase-tools@latest emulators:start
     ```
   - Test security rules programmatically using `@firebase/rules-unit-testing` covering both allowed and denied access scenarios.
2. **Distinguishing Local Emulators from Production**:
   - Local emulators are ideal for functional testing and rule unit validation.
   - **Emulator Differences from Production**:
     - Emulators do NOT enforce production quotas, Cloud Firestore write rate limits (~1 write/sec), or concurrency throttling.
     - Emulators do NOT replicate cross-region network latencies or eventual consistency lag.
     - Emulators do NOT validate production IAM credentials or live third-party OAuth token lifecycles.
   - Functional passing in emulators must be followed by proper deployment verification.
3. **Tooling Transparency & Verification**:
   - If the Firebase CLI (`firebase-tools`) or local emulators are unavailable in the current environment, state this limitation explicitly. Never fabricate test outputs or pretend deployment has succeeded.
4. **Deployment Safety**:
   - Deploy specific targets to avoid accidental overwrites:
     ```bash
     firebase deploy --only firestore:rules
     firebase deploy --only firestore:indexes
     firebase deploy --only functions:<functionName>
     `````
