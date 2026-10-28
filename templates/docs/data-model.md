# Data Model & Schema

> **Usage**: Document database schemas, entities, relationships, constraints, and migration guidelines. Record only verified schema structures.

## 1. Entities & Collections Overview
| Entity / Table | Purpose | Primary Key | Storage Engine / Database | Source of Truth |
|---|---|---|---|---|
| `users` | [Stores user accounts and authentication credentials] | `id (UUID)` | [PostgreSQL] | `[src/db/schema/users.ts]` |
| `orders` | [Stores customer purchase transactions] | `id (UUID)` | [PostgreSQL] | `[src/db/schema/orders.ts]` |

## 2. Field Specifications & Constraints

### Entity: `users`
| Field | Type | Required | Default | Constraints & Validation | Notes |
|---|---|---|---|---|---|
| `id` | UUID | Yes | `gen_random_uuid()` | Primary key | Unique identifier |
| `email` | VARCHAR(255) | Yes | None | Unique, validated email format | Case-insensitive lookup |
| `password_hash` | VARCHAR(255) | Yes | None | Bcrypt / Argon2 hash | Never exposed in queries |
| `created_at` | TIMESTAMPTZ | Yes | `NOW()` | Immutable timestamp | Audit trail |

## 3. Relationships & Foreign Keys
- `orders.user_id` $\rightarrow$ `users.id` (Many-to-One, `ON DELETE RESTRICT`)
- `order_items.order_id` $\rightarrow$ `orders.id` (Many-to-One, `ON DELETE CASCADE`)

## 4. Query Patterns & Indexes
| Index Name | Table | Columns | Index Type | Purpose / Query Pattern |
|---|---|---|---|---|
| `idx_users_email` | `users` | `email` | B-tree (Unique) | Fast login lookup by email |
| `idx_orders_user_created` | `orders` | `user_id, created_at DESC` | B-tree | Order history pagination |

## 5. Migration & Data Integrity Rules
- **Non-Destructive Rules**: New columns must be added as nullable or with a default value to prevent breaking existing code during zero-downtime deployments.
- **Rollback Strategy**: Every forward migration must have a tested, non-destructive rollback counterpart.
- **Data Ownership & Tenant Boundary**: Document how row-level security or tenant IDs partition user data.
