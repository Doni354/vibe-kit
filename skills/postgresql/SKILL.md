---
name: postgresql
description: Technology workflow and engineering practices for PostgreSQL relational databases. Covers relational schema design, indexing, constraints, data types, transactions, parameterized queries, reversible migrations, and EXPLAIN query analysis.
---

# PostgreSQL Technology Workflow

Use this workflow to design, implement, optimize, and verify relational database schemas, migrations, queries, and connection lifecycles in PostgreSQL databases across any backend runtime or application architecture.

## When to Use
- Designing or modifying relational database tables, columns, constraints, foreign keys, or schemas in PostgreSQL.
- Writing, reviewing, or applying database migrations and schema evolution scripts.
- Optimizing slow queries, analyzing execution plans with `EXPLAIN (ANALYZE, BUFFERS)`, or establishing indexing strategies.
- Enforcing transactional data consistency, ACID guarantees, and concurrency controls (locking, isolation levels).
- Implementing secure parameterized queries and preventing SQL injection vulnerabilities.
- Configuring connection poolers (PgBouncer) or client database pools.

## When NOT to Use
- Working with document stores or NoSQL cloud databases (use `firebase`).
- Implementing frontend UI components or styling (use `ui-implementation`).
- Implementing generic server routes or domain logic without database interactions (use `backend-feature`).
- Video timeline compositions and storyboard animations (use `video-motion`).

---

## Required Inputs
1. **Target Schema & Domain Entities**: Entity relationships, cardinalities (1:1, 1:N, N:M), and data volume expectations.
2. **Access Patterns & Query Workflows**: Read vs write ratios, high-frequency filter columns, join paths, and sorting needs.
3. **Runtime & Data Access Layer**: Raw SQL driver (`pg`, `psycopg`, `postgres`), query builder (`knex`, `kysely`), or ORM (`drizzle`, `prisma`, `typeorm`, `sqlalchemy`).

## Expected Outputs
1. Normalized, defensively constrained table schemas utilizing appropriate PostgreSQL data types.
2. Targeted index definitions (B-Tree, composite, partial, GIN) aligned with actual query access patterns.
3. Parameterized queries preventing SQL injection and maintaining plan cache efficiency.
4. Reversible, safe migration scripts following expand-and-contract zero-downtime practices.
5. Verifiable query analysis with execution plan documentation when database tooling is available.

---

## Actionable Execution Procedure

### Step 1: Inspect Database Environment & ORM Neutrality
1. **Identify the Data Access Layer**:
   - Inspect project manifests to identify the active database driver, query builder, or ORM.
   - **Strict ORM-Neutrality**: Never enforce an unapproved ORM or library. PostgreSQL engineering best practices apply uniformly whether using raw SQL, query builders, or ORMs. Adapt recommendations to project idioms.
2. **Identify Target Engine Version**:
   - Check the target PostgreSQL version (e.g. 14, 15, 16, 17) to leverage supported features:
     - **UUIDv7**: Built-in native `uuidv7()` and `uuid_extract_timestamp()` are available natively starting in **PostgreSQL 17**. On PostgreSQL 16 and earlier, native `uuidv7()` is not available; use `gen_random_uuid()` for UUIDv4, an extension such as `pg_uuidv7`, or generate UUIDv7 in application code.
     - **Identity Columns**: `GENERATED ALWAYS AS IDENTITY` is standard in PostgreSQL 10+.
     - **NULLS NOT DISTINCT**: In `UNIQUE` constraints, available in PostgreSQL 15+.
     - **ALTER TABLE ADD COLUMN DEFAULT**: Metadata-only (no table rewrite for constant defaults) in PostgreSQL 11+.

### Step 2: Relational Schema Design, Normalization & Constraints
1. **Normalization Discipline**:
   - Normalize schemas to Third Normal Form (3NF) by default to eliminate data redundancy and anomaly risks.
   - Selectively denormalize only when justified by measured high-frequency read bottlenecks, and document the synchronization mechanism.
2. **Primary Key Strategy**:
   - **Identity Columns (Default)**: Use `BIGINT GENERATED ALWAYS AS IDENTITY` for high-throughput operational tables. Compact 8-byte footprint and sequential B-Tree index locality.
   - **UUIDs**: Use `UUID` when client-side ID generation or public ID obfuscation is required:
     - On **PostgreSQL 17+**: Use native `uuidv7()` for time-ordered locality.
     - On **PostgreSQL 16 and earlier**: Use `gen_random_uuid()` for random UUIDv4, an extension like `pg_uuidv7`, or generate UUIDv7 in the application layer.
3. **Foreign Keys & Referential Integrity**:
   - Explicitly declare foreign key actions:
     - `ON DELETE RESTRICT` or `ON DELETE NO ACTION` (default, prevents accidental deletion of referenced records).
     - `ON DELETE CASCADE` (only for owned, strictly child entities such as order line items).
     - `ON DELETE SET NULL` (for optional associations).
4. **Defensive Database Constraints**:
   - Use `NOT NULL` on all mandatory attributes.
   - Use `UNIQUE` constraints (or unique indexes) for natural business keys.
   - Use `CHECK` constraints for value domains and business boundaries:
     ```sql
     CHECK (amount >= 0)
     CHECK (status IN ('draft', 'pending', 'active', 'archived'))
     ```

### Step 3: Precise Data Type Selection
1. **Timestamps**:
   - **Mandatory Rule**: Always use `TIMESTAMPTZ` (`TIMESTAMP WITH TIME ZONE`).
   - Never use timezone-naive `TIMESTAMP`. All internal timestamps must be stored in UTC.
2. **Financial & Currency Amounts**:
   - Always use `NUMERIC(precision, scale)` (e.g. `NUMERIC(12, 2)`).
   - **Never** use floating-point types (`REAL`, `DOUBLE PRECISION`, `FLOAT`) for money or exact calculations.
3. **Text Data**:
   - Use `TEXT` or `VARCHAR(N)`. In PostgreSQL, `TEXT` and `VARCHAR` have identical storage performance. Use `VARCHAR(N)` only when enforcing domain length limits.
4. **Semi-Structured Data (`JSONB`)**:
   - Use `JSONB` for queryable binary JSON payloads (flexible metadata, provider payloads).
   - Keep relational, frequently filtered, or foreign-key referenced attributes in dedicated relational columns.

### Step 4: Indexing Strategy & Index Maintenance
1. **B-Tree Indexes**:
   - Default index type for equality (`=`) and range queries (`<`, `<=`, `>`, `>=`, `BETWEEN`).
   - Automatically index foreign key columns that are frequently joined or queried.
2. **Composite Indexes**:
   - Order columns from most selective equality filters to range and sorting columns (leftmost index prefix rule):
     ```sql
     -- Optimizes: WHERE tenant_id = $1 AND created_at >= $2 ORDER BY created_at DESC
     CREATE INDEX idx_tenant_created ON events (tenant_id, created_at DESC);
     ```
3. **Partial Indexes**:
   - Index only the active subset of a table to reduce disk usage and maintenance overhead:
     ```sql
     CREATE INDEX idx_orders_unfulfilled ON orders (created_at) WHERE status = 'unfulfilled';
     ```
4. **GIN / GiST Indexes**:
   - Use GIN for `JSONB` containment (`@>`), arrays (`&&`), and full-text search (`tsvector`).
5. **BRIN (Block Range Index)**:
   - For massive, append-only or timestamp-ordered tables (e.g. audit logs, time-series metrics where rows are naturally ordered by physical insertion), consider BRIN indexes. BRIN stores min/max values for physical page ranges, consuming a tiny fraction of the disk space of B-Trees with minimal update overhead.
6. **Over-Indexing Avoidance**:
   - Every index adds overhead to `INSERT`, `UPDATE`, and `DELETE` operations and consumes buffer cache. Audit unused indexes periodically using `pg_stat_user_indexes` (`idx_scan = 0`) before adding new indexes.

### Step 5: Transactions, ACID & Concurrency Control (MVCC)
1. **Atomic Transactions**:
   - Wrap multi-table or multi-row mutations in explicit transactions (`BEGIN ... COMMIT / ROLLBACK`).
   - Keep transaction duration as brief as possible to minimize lock retention and connection holding.
2. **Isolation Levels & Retry Loops**:
   - Default: `READ COMMITTED` (prevents dirty reads; sufficient for standard web requests with row locks).
   - Higher levels (`REPEATABLE READ` or `SERIALIZABLE`): Use when preventing non-repeatable reads, phantom reads, or serialization anomalies is strictly required.
   - **MANDATORY RETRY INVARIANT**: Transactions using `REPEATABLE READ` or `SERIALIZABLE` can fail with serialization errors (`SQLSTATE 40001: could not serialize access due to concurrent update / read/write dependencies`). The application code **must implement an automatic retry loop** with exponential backoff and jitter. Never configure higher isolation levels without application retry handling.
3. **Explicit Row-Level Locking**:
   - Use `SELECT ... FOR UPDATE` or `SELECT ... FOR NO KEY UPDATE` (which avoids blocking foreign key references on referenced tables) to prevent race conditions during concurrent read-modify-write workflows.

### Step 6: Parameterized Queries & Injection Prevention
1. **Strict Parameterization Mandate**:
   - **Always** pass dynamic parameters via driver parameter bindings (e.g. `$1, $2` in Node.js/Go or `%s` in Python):
     ```sql
     SELECT id, email, status FROM users WHERE organization_id = $1 AND role = $2;
     ```
   - **Never** concatenate, format, or interpolate untrusted strings directly into SQL queries.
2. **Identifier Quoting**:
   - If dynamic table or column names are required (e.g. user-selected sorting), validate them against an explicit whitelist of allowed identifiers.

### Step 7: Reversible Migrations & Zero-Downtime Strategy
1. **Reversible Migration Design**:
   - Every schema change must have a forward migration (`up`) and a tested rollback migration (`down`).
   - **Never** execute destructive migrations (`DROP TABLE`, `DROP COLUMN`, `TRUNCATE`) without explicit user authorization and verified data backups.
2. **`CREATE INDEX CONCURRENTLY` Constraints**:
   - **MANDATORY CONSTRAINT**: `CREATE INDEX CONCURRENTLY` (and `DROP INDEX CONCURRENTLY`) **cannot run inside an explicit transaction block (`BEGIN ... COMMIT`)**. Running it inside a transaction block will fail with `ERROR: CREATE INDEX CONCURRENTLY cannot run inside a transaction block`.
   - Migration frameworks that wrap migrations in transactions by default (e.g. Knex, Prisma, TypeORM, Rails, Django) must be configured with transaction wrapping disabled for concurrent index migrations.
   - Concurrent index creation requires two full table scans and takes longer. If interrupted, it may leave an `INVALID` index in the catalog that wastes disk space and slows writes; drop invalid indexes with `DROP INDEX CONCURRENTLY <idx>` before retrying.
3. **`ALTER TABLE ... ADD COLUMN ... DEFAULT` Rules**:
   - In **PostgreSQL 11 and later**, adding a column with a **constant** default (`ALTER TABLE tbl ADD COLUMN col INT DEFAULT 0;`) is a fast metadata-only operation that does **not** rewrite the table or hold exclusive locks for long.
   - Table rewrites in PostgreSQL 11+ only happen if the default expression is **volatile** (e.g. `DEFAULT clock_timestamp()`, `DEFAULT random()`).
   - In **PostgreSQL 10 and earlier**, adding a column with a default rewrites the entire table. For volatile defaults or legacy versions, use the expand pattern: add column without default or nullable, backfill in small batches, then set the default.
4. **Expand-and-Contract (Zero-Downtime) Pattern**:
   - When renaming columns or modifying types on production tables:
     - **Phase 1 (Expand)**: Add the new column alongside the old one.
     - **Phase 2**: Deploy application code writing to both old and new columns.
     - **Phase 3**: Backfill historical rows in small batches.
     - **Phase 4**: Switch read queries to the new column.
     - **Phase 5 (Contract)**: Drop the old column in a subsequent deployment.
5. **Migration Lock Safety**:
   - Set statement timeouts before applying DDL on large tables:
     ```sql
     SET statement_timeout = '5s';
     ```

### Step 8: Query Analysis & Verification with EXPLAIN
1. **CRITICAL WARNING: `EXPLAIN ANALYZE` Executes the Query**:
   - `EXPLAIN ANALYZE` **actually executes the statement** to record real execution time and buffer usage.
   - **MUTATION SAFETY**: If you run `EXPLAIN ANALYZE` on a `DELETE`, `UPDATE`, `INSERT`, or statement calling data-mutating functions, **the database data will actually be modified!**
   - For mutation queries, always test inside an explicit transaction and roll it back:
     ```sql
     BEGIN;
     EXPLAIN (ANALYZE, BUFFERS)
     DELETE FROM sessions WHERE expires_at < NOW();
     ROLLBACK;
     ```
   - On high-load production environments where query impact is unknown, use `EXPLAIN` (without `ANALYZE`) first. `EXPLAIN` safely displays the planner's cost estimate and node tree without executing the query.
2. **Execution Plan Inspection**:
   - When connected to a PostgreSQL instance, inspect execution plans:
     ```sql
     EXPLAIN (ANALYZE, BUFFERS)
     SELECT o.id, o.total, u.email
     FROM orders o
     JOIN users u ON u.id = o.user_id
     WHERE o.status = 'completed' AND o.created_at >= NOW() - INTERVAL '30 days';
     ```
   - Identify sequential scans (`Seq Scan`) on large tables, excessive disk buffers, or slow nested loops.
3. **Pagination Efficiency**:
   - Avoid large `OFFSET N` queries, which perform $O(N)$ row scans. Use keyset/cursor pagination:
     ```sql
     WHERE id > $last_seen_id ORDER BY id ASC LIMIT $page_size;
     ```
4. **No Unproven Claims**:
   - Never claim a query or index improved performance without execution plan evidence or measurement benchmarks. If no live database is available, state the theoretical basis and provide the exact `EXPLAIN` query.

### Step 9: Connection Management & Observability
1. **Connection Pooling (PgBouncer)**:
   - Use connection poolers (e.g. PgBouncer) or client pool managers with bounded pool sizes (e.g. 10–20 connections per service instance). Never spawn a new connection per incoming HTTP request.
   - **Session vs. Transaction Pooling**:
     - **Session Pooling**: Fully compatible with all PostgreSQL features, but connection concurrency is limited to the number of server connections.
     - **Transaction Pooling**: Maximum scalability (connections multiplexed per transaction), but connection state is reset after each transaction.
     - **Transaction Pooling Constraints**: In transaction pooling mode, session-level state is not preserved. Named prepared statements require protocol-level prepared statement support (PgBouncer >= 1.21 with `max_prepared_statements > 0`) or client-side unnamed prepared statements. Session variables (`SET TIME ZONE`, `SET search_path`), temporary tables, and session-level advisory locks (`pg_advisory_lock`) are not safe; use transaction-scoped advisory locks (`pg_advisory_xact_lock`).
2. **Monitor Database Activity**:
   - Inspect active queries, idle in transaction states, and lock contention using `pg_stat_activity`.
