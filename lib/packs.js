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
    description: 'Cross-layer integration workflow: contract-first API design, authentication propagation, implementation sequencing, and E2E verification.',
    dependencies: ['core', 'role:frontend', 'role:backend'],
    conflicts: [],
    assets: [
      {
        type: 'skill',
        src: 'skills/fullstack-integration/SKILL.md',
        dest: 'skills/fullstack-integration/SKILL.md'
      },
      {
        type: 'template',
        src: 'templates/docs/architecture.md',
        dest: 'docs/ai-workflow/architecture.md'
      }
    ]
  },
  {
    id: 'role:video-motion',
    version: '0.1.0',
    type: 'role',
    name: 'Video & Motion Role',
    description: 'Engine-independent video and motion workflow: creative briefs, storyboarding, frame-accurate timeline planning, asset inventory, audio sync, and QC checklist.',
    dependencies: ['core'],
    conflicts: [],
    assets: [
      {
        type: 'skill',
        src: 'skills/video-motion/SKILL.md',
        dest: 'skills/video-motion/SKILL.md'
      },
      {
        type: 'template',
        src: 'templates/docs/storyboard.md',
        dest: 'docs/ai-workflow/storyboard.md'
      },
      {
        type: 'template',
        src: 'templates/docs/video-qc-checklist.md',
        dest: 'docs/ai-workflow/video-qc-checklist.md'
      }
    ]
  }
];

// Validate all packs at module load time to guarantee structural integrity
BUILTIN_PACKS.forEach(validatePack);

export const PACK_REGISTRY = new Map(BUILTIN_PACKS.map(p => [p.id, p]));
