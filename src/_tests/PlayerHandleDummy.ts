import { vi } from 'vitest';

import type { PlayerHandle } from '../models/Player';

/** The controls of a playing stream, as mocks that record their calls. */
export const PlayerHandleDummy = {
    create: (overrides?: Partial<PlayerHandle>) =>
        ({
            canSelectRendition: true,
            selectRendition: vi.fn(),
            selectSubtitle: vi.fn(),
            selectAudioTrack: vi.fn(),
            getBandwidthEstimate: vi.fn(() => undefined as number | undefined),
            destroy: vi.fn(),
            ...overrides,
        }) satisfies PlayerHandle,
};
