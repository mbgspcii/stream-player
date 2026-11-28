import { describe, expect, it } from 'vitest';

import { parseFrameRate, readDashManifest } from './readDashManifest';

describe(parseFrameRate.name, () => {
    it('should read a whole number, as a number or as a text', () => {
        expect(parseFrameRate(25)).toBe(25);
        expect(parseFrameRate('50')).toBe(50);
    });

    it('should read a fraction', () => {
        expect(parseFrameRate('30000/1001')).toBeCloseTo(29.97, 2);
    });

    it('should give nothing for a value that is not a rate', () => {
        expect(parseFrameRate(undefined)).toBeUndefined();
        expect(parseFrameRate('fast')).toBeUndefined();
        expect(parseFrameRate('25/0')).toBeUndefined();
        expect(parseFrameRate(0)).toBeUndefined();
    });
});

describe(readDashManifest.name, () => {
    it('should read the video representations, with what the adaptation set says for all of them', () => {
        const manifest = {
            maxSegmentDuration: 4,
            Period_asArray: [
                {
                    AdaptationSet_asArray: [
                        {
                            mimeType: 'video/mp4',
                            codecs: 'avc1.64001f',
                            frameRate: '25',
                            Representation_asArray: [
                                { bandwidth: 800_000 },
                                { bandwidth: 2_500_000, codecs: 'avc1.640028', frameRate: '50' },
                            ],
                        },
                        {
                            contentType: 'audio',
                            Representation_asArray: [{ bandwidth: 128_000, codecs: 'mp4a.40.2' }],
                        },
                    ],
                },
            ],
        };

        expect(readDashManifest(manifest)).toEqual({
            videoRepresentations: [
                { bandwidth: 800_000, codecs: 'avc1.64001f', frameRate: 25 },
                { bandwidth: 2_500_000, codecs: 'avc1.640028', frameRate: 50 },
            ],
            segmentDuration: 4,
            encryption: [],
        });
    });

    it('should see a video representation from its own MIME type', () => {
        const manifest = {
            Period_asArray: [
                {
                    AdaptationSet_asArray: [
                        { Representation_asArray: [{ bandwidth: 800_000, mimeType: 'video/mp4' }] },
                    ],
                },
            ],
        };

        expect(readDashManifest(manifest).videoRepresentations).toEqual([
            { bandwidth: 800_000, codecs: undefined, frameRate: undefined },
        ]);
    });

    it('should name each protection system once, on an adaptation set or on a representation', () => {
        const manifest = {
            Period_asArray: [
                {
                    AdaptationSet_asArray: [
                        {
                            contentType: 'video',
                            ContentProtection_asArray: [
                                { schemeIdUri: 'urn:mpeg:dash:mp4protection:2011', value: 'cenc' },
                                { schemeIdUri: 'urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed' },
                            ],
                            Representation_asArray: [
                                {
                                    bandwidth: 800_000,
                                    ContentProtection_asArray: [
                                        { schemeIdUri: 'urn:uuid:9a04f079-9840-4286-ab92-e65be0885f95' },
                                    ],
                                },
                            ],
                        },
                        {
                            contentType: 'audio',
                            ContentProtection_asArray: [
                                { schemeIdUri: 'urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed' },
                            ],
                            Representation_asArray: [{ bandwidth: 128_000 }],
                        },
                    ],
                },
            ],
        };

        expect(readDashManifest(manifest).encryption).toEqual(['cenc', 'Widevine', 'PlayReady']);
    });

    it('should give empty facts for a manifest that it cannot read', () => {
        const empty = { videoRepresentations: [], encryption: [] };

        expect(readDashManifest(undefined)).toEqual(empty);
        expect(readDashManifest('<MPD />')).toEqual(empty);
        expect(readDashManifest({ Period_asArray: 'none' })).toEqual({ ...empty, segmentDuration: undefined });
        expect(
            readDashManifest({ Period_asArray: [{ AdaptationSet_asArray: [null, { Representation_asArray: [{}] }] }] }),
        ).toEqual({
            ...empty,
            segmentDuration: undefined,
        });
    });
});
