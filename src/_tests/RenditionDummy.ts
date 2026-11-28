import type { Rendition } from '../models/Stream';

export const RenditionDummy = {
    create: (overrides?: Partial<Rendition>): Rendition => ({
        width: 1280,
        height: 720,
        bitrate: 2_149_000,
        ...overrides,
    }),
};
