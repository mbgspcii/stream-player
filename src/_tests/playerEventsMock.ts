import { vi } from 'vitest';

import type { PlayerEvents } from '../models/Player';

/** The callbacks that a player adapter gets, as mocks that record their calls. */
export const createPlayerEventsMock = () =>
    ({
        onEngine: vi.fn(),
        onRenditions: vi.fn(),
        onPlayingRendition: vi.fn(),
        onSubtitles: vi.fn(),
        onSelectedSubtitle: vi.fn(),
        onAudioTracks: vi.fn(),
        onInfo: vi.fn(),
        onSegment: vi.fn(),
        onLog: vi.fn(),
    }) satisfies PlayerEvents;
