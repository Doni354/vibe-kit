/**
 * Built-in Pack Registry for Vibe Kit (Phase 1)
 *
 * Defines the statically registered packs for Phase 1: Core, Frontend, Backend, and Fullstack.
 * All packs are backed by concrete, verified assets in the repository.
 */

import { validatePack } from './pack-contract.js';

export const BUILTIN_PACKS = [
  {
    id: 'core',
    version: '0.1.0',
    type: 'core',
    name: 'Core Workflow',
    description: 'Foundational AI coding workflow: project onboarding, living documentation, verification, and workspace engineering standards.',
    dependencies: [],
    conflicts: [],
    assets: [
      {
        type: 'skill',
        src: 'skills/project-onboarding/SKILL.md',
        dest: 'skills/project-onboarding/SKILL.md'
      },
      {
        type: 'skill',
        src: 'skills/documentation/SKILL.md',
        dest: 'skills/documentation/SKILL.md'
      },
      {
        type: 'skill',
        src: 'skills/verification/SKILL.md',
        dest: 'skills/verification/SKILL.md'
      },
      {
        type: 'rule',
        src: 'rules/workspace/engineering-standards.md',
        dest: 'rules/engineering-standards.md'
      },
      {
        type: 'template',
        src: 'templates/docs/PROJECT_CONTEXT.md',
        dest: 'docs/ai-workflow/PROJECT_CONTEXT.md'
      },
      {
        type: 'template',
        src: 'templates/docs/README.md',
        dest: 'docs/ai-workflow/README.md'
      },
      {
        type: 'template',
        src: 'templates/docs/plan.md',
        dest: 'docs/ai-workflow/plan.md'
      }
    ]
  },
  {
    id: 'role:frontend',
    version: '0.1.0',
    type: 'role',
    name: 'Frontend Role',
    description: 'UI engineering: design tokens, component lifecycle states, WCAG accessibility, responsive layouts, and visual verification.',
    dependencies: ['core'],
    conflicts: [],
    assets: [
      {
        type: 'skill',
        src: 'skills/ui-implementation/SKILL.md',
        dest: 'skills/ui-implementation/SKILL.md'
      },
      {
        type: 'template',
        src: 'templates/docs/design-system.md',
        dest: 'docs/ai-workflow/design-system.md'
      }
    ]
  },
  {
    id: 'role:backend',
    version: '0.1.0',
    type: 'role',
    name: 'Backend Role',
    description: 'Backend engineering: API contracts, boundary validation, authorization, data integrity, error handling, and observability.',
    dependencies: ['core'],
    conflicts: [],
    assets: [
      {
        type: 'skill',
        src: 'skills/backend-feature/SKILL.md',
        dest: 'skills/backend-feature/SKILL.md'
      },
      {
        type: 'template',
        src: 'templates/docs/api-contracts.md',
        dest: 'docs/ai-workflow/api-contracts.md'
      },
      {
        type: 'template',
        src: 'templates/docs/data-model.md',
        dest: 'docs/ai-workflow/data-model.md'
      }
    ]
  },
  {
    id: 'role:fullstack',
    version: '0.1.0',
    type: 'role',
    name: 'Fullstack Role',
    description: 'Complete fullstack workflow combining frontend UI engineering, backend services, and overall system architecture.',
    dependencies: ['core', 'role:frontend', 'role:backend'],
    conflicts: [],
    assets: [
      {
        type: 'template',
        src: 'templates/docs/architecture.md',
        dest: 'docs/ai-workflow/architecture.md'
      }
    ]
  }
];

// Validate all packs at module load time to guarantee structural integrity
BUILTIN_PACKS.forEach(validatePack);

export const PACK_REGISTRY = new Map(BUILTIN_PACKS.map(p => [p.id, p]));
