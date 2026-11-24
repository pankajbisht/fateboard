import { createRegistry } from '../registry';
import { TEMPLATES_A } from './templatesA';
import { TEMPLATES_B } from './templatesB';
import type { SceneTemplate } from './types';

/** All templates in menu order; templates.contract.test.ts checks every one. */
export const TEMPLATES = createRegistry<SceneTemplate>(
    [...TEMPLATES_A, ...TEMPLATES_B],
    'class-photo',
);
