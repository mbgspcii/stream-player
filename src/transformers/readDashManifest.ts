import { describeKeySystem } from '../helpers/format';

/** What the page reads in an MPD, once dash.js parsed it. */
export type DashManifestFacts = {
    /** One entry per video representation of the manifest. */
    videoRepresentations: { bandwidth: number; codecs?: string; frameRate?: number }[];
    /** `maxSegmentDuration` of the MPD, in seconds. */
    segmentDuration?: number;
    /** The names of the protection systems of the manifest. Empty when it is not encrypted. */
    encryption: string[];
};

type Fields = Record<string, unknown>;

const isFields = (value: unknown): value is Fields => typeof value === 'object' && value !== null;

/** dash.js 4 keeps the children of an element in a field with the `_asArray` suffix. */
const children = (parent: Fields, name: string): Fields[] => {
    const list = parent[`${name}_asArray`];
    return Array.isArray(list) ? list.filter(isFields) : [];
};

const text = (value: unknown): string | undefined => (typeof value === 'string' && value !== '' ? value : undefined);

const positive = (value: unknown): number | undefined =>
    typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;

/** An MPD writes a frame rate as `25` or as a fraction, `30000/1001`. */
export const parseFrameRate = (value: unknown): number | undefined => {
    if (typeof value === 'number') {
        return positive(value);
    }
    if (typeof value !== 'string') {
        return undefined;
    }
    const [frames, base = '1'] = value.split('/');
    return positive(Number(frames) / Number(base));
};

const isVideo = (adaptationSet: Fields, representation: Fields): boolean => {
    const mimeType = text(representation.mimeType) ?? text(adaptationSet.mimeType) ?? '';
    return adaptationSet.contentType === 'video' || mimeType.startsWith('video/');
};

/** `cenc` or `cbcs` for the generic MP4 protection, the name of the DRM system for the others. */
const describeProtection = (protection: Fields): string | undefined => {
    const scheme = text(protection.schemeIdUri);
    if (!scheme) {
        return undefined;
    }
    if (scheme.toLowerCase() === 'urn:mpeg:dash:mp4protection:2011') {
        return text(protection.value) ?? 'MP4 protection';
    }
    return describeKeySystem(scheme);
};

/**
 * Reads the manifest that dash.js gives with its `manifestLoaded` event.
 * The shape of that object is not part of the API of dash.js, so every field is checked:
 * a field that is not there gives no value, never an error.
 */
export const readDashManifest = (manifest: unknown): DashManifestFacts => {
    const facts: DashManifestFacts = { videoRepresentations: [], encryption: [] };
    if (!isFields(manifest)) {
        return facts;
    }

    facts.segmentDuration = positive(manifest.maxSegmentDuration);
    const encryption = new Set<string>();

    for (const period of children(manifest, 'Period')) {
        for (const adaptationSet of children(period, 'AdaptationSet')) {
            const protections = children(adaptationSet, 'ContentProtection');

            for (const representation of children(adaptationSet, 'Representation')) {
                protections.push(...children(representation, 'ContentProtection'));

                const bandwidth = positive(representation.bandwidth);
                if (bandwidth && isVideo(adaptationSet, representation)) {
                    facts.videoRepresentations.push({
                        bandwidth,
                        // An attribute may be written once on the adaptation set for all its representations.
                        codecs: text(representation.codecs) ?? text(adaptationSet.codecs),
                        frameRate: parseFrameRate(representation.frameRate ?? adaptationSet.frameRate),
                    });
                }
            }

            for (const protection of protections) {
                const name = describeProtection(protection);
                if (name) {
                    encryption.add(name);
                }
            }
        }
    }

    facts.encryption = [...encryption];
    return facts;
};
