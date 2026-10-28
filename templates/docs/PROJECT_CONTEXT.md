# Project Context

> **Note**: Maintain this document as the central operational hub. Record verified facts only. Hyperlink to specialized docs instead of duplicating details.

## Purpose & Target Users
- **Purpose**: [Brief statement of what the system does and the problem it solves]
- **Target Users**: [Primary user personas, internal teams, or consumer roles]
- **Current Lifecycle Stage**: [e.g. Greenfield Prototype / Active Development / Maintenance]

## Stack & Primary Entry Points
- **Languages & Frameworks**: [e.g. TypeScript, Node.js 18+, React 18, PostgreSQL]
- **App Entry Points**: [e.g. src/index.ts, app/page.tsx, cmd/server/main.go]
- **API Base Path**: [e.g. /api/v1]
- **Data Persistence**: [e.g. PostgreSQL, Redis, Cloud Storage]
- **Key Integrations**: [e.g. Auth provider, Payment gateway, Notification service]

## Living Documentation Map
- **Architecture**: [`architecture.md`](./architecture.md)
- **Data Model**: [`data-model.md`](./data-model.md)
- **API Contracts**: [`api-contracts.md`](./api-contracts.md)
- **Design System**: [`design-system.md`](./design-system.md) (if UI exists)
- **Active Task Plan**: [`plan.md`](./plan.md)

## Development & Verification Runbook
- **Install Dependencies**: `[e.g. npm install]`
- **Run Locally**: `[e.g. npm run dev]`
- **Lint & Typecheck**: `[e.g. npm run lint && npx tsc --noEmit]`
- **Execute Tests**: `[e.g. npm test]`
- **Production Build**: `[e.g. npm run build]`

## Current Milestone & Active Task
- **Active Goal**: [Current feature or fix in progress]
- **Acceptance Criteria**: [Verifiable conditions for completing this task]
- **Affected Components**: [List of relevant source files and modules]

## Known Risks & Open Questions
- **Known Technical Debts / Risks**: [e.g. Missing index on orders table, pending OAuth upgrade]
- **Unresolved Questions**: [e.g. Cache invalidation strategy across workers]
- **Last Updated**: [YYYY-MM-DD]
