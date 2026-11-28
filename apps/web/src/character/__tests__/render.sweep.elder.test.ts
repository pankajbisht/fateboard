// @vitest-environment node
/** Every pose on the elder from every 15° (the sweep lives in poseSweep.ts; one file per body runs them in parallel). */
import { describe } from 'vitest';
import { poseSweepTests } from './poseSweep';

describe('rendering', () => poseSweepTests('elder'));
