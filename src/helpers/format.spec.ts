import { describe, expect, it } from 'vitest';

import {
    cleanText,
    describeAudioDetail,
    describeAudioTracks,
    describeKeySystem,
    describeRendition,
    describeRenditionDetail,
    formatBitrate,
    formatBytes,
    formatDuration,
    formatFrameRate,
    formatResolution,
    formatSpeed,
    shortenUrl,
} from './format';

describe(formatBitrate.name, () => {
    it('should round to kilobits per second', () => {
        expect(formatBitrate(1_500_000)).toBe('1500 kb/s');
        expect(formatBitrate(246_440)).toBe('246 kb/s');
    });
});

describe(formatResolution.name, () => {
    it('should join the width and the height', () => {
        expect(formatResolution({ width: 1280, height: 720, bitrate: 1 })).toBe('1280x720');
    });

    it('should say when the manifest gives no resolution', () => {
        expect(formatResolution({ bitrate: 1 })).toBe('no resolution');
        expect(formatResolution({ width: 0, height: 0, bitrate: 1 })).toBe('no resolution');
    });
});

describe(describeRendition.name, () => {
    it('should give the resolution and the bitrate', () => {
        expect(describeRendition({ width: 1280, height: 720, bitrate: 2_149_280 })).toBe('1280x720 (2149 kb/s)');
    });
});

describe(formatSpeed.name, () => {
    it('should give kilobits per second under 10 megabits per second', () => {
        expect(formatSpeed(850_000)).toBe('850 kb/s');
        expect(formatSpeed(9_999_000)).toBe('9999 kb/s');
    });

    it('should give megabits per second from 10 megabits per second', () => {
        expect(formatSpeed(10_000_000)).toBe('10 Mb/s');
        expect(formatSpeed(162_733_000)).toBe('163 Mb/s');
    });
});

describe(formatFrameRate.name, () => {
    it('should keep a whole rate whole and round another one to two digits', () => {
        expect(formatFrameRate(25)).toBe('25 fps');
        expect(formatFrameRate(30000 / 1001)).toBe('29.97 fps');
    });
});

describe(describeRenditionDetail.name, () => {
    it('should give the bitrate, the frame rate and the codecs', () => {
        expect(describeRenditionDetail({ bitrate: 2_149_000, frameRate: 25, codecs: 'avc1.64001f, mp4a.40.2' })).toBe(
            '2149 kb/s · 25 fps · avc1.64001f, mp4a.40.2',
        );
    });

    it('should leave out what the manifest does not give', () => {
        expect(describeRenditionDetail({ bitrate: 800_000 })).toBe('800 kb/s');
        expect(describeRenditionDetail({ bitrate: 800_000, codecs: 'avc1.64001e' })).toBe('800 kb/s · avc1.64001e');
    });
});

describe(formatBytes.name, () => {
    it('should choose the unit from the size', () => {
        expect(formatBytes(512)).toBe('512 B');
        expect(formatBytes(340_400)).toBe('340 kB');
        expect(formatBytes(1_240_000)).toBe('1.2 MB');
    });
});

describe(formatDuration.name, () => {
    it('should give minutes and seconds under one hour', () => {
        expect(formatDuration(33.4)).toBe('0:33');
        expect(formatDuration(75)).toBe('1:15');
    });

    it('should add the hours from one hour', () => {
        expect(formatDuration(3675)).toBe('1:01:15');
    });
});

describe(describeKeySystem.name, () => {
    it('should name the DRM system of a known identifier, in any case', () => {
        expect(describeKeySystem('urn:uuid:EDEF8BA9-79D6-4ACE-A3C8-27DCD51D21ED')).toBe('Widevine');
        expect(describeKeySystem('com.apple.streamingkeydelivery')).toBe('FairPlay');
        expect(describeKeySystem('com.microsoft.playready')).toBe('PlayReady');
    });

    it('should give an unknown identifier back', () => {
        expect(describeKeySystem('urn:uuid:00000000-0000-0000-0000-000000000000')).toBe(
            'urn:uuid:00000000-0000-0000-0000-000000000000',
        );
    });
});

describe(shortenUrl.name, () => {
    it('should keep the last two parts of the path, without the query string', () => {
        expect(shortenUrl('https://cdn.example.com/a/b/720p/segment_3.m4s?token=abc')).toBe('720p/segment_3.m4s');
        expect(shortenUrl('https://cdn.example.com/segment.m4s')).toBe('segment.m4s');
    });

    it('should give back a text that is not a URL', () => {
        expect(shortenUrl('segment_3.m4s')).toBe('segment_3.m4s');
    });
});

describe(cleanText.name, () => {
    it('should take away the characters that cannot be shown and the spaces around the text', () => {
        expect(cleanText('\u007f\u007f\u007f')).toBe('');
        expect(cleanText('  fr-CA\u0000 ')).toBe('fr-CA');
    });

    it('should give an empty text for nothing', () => {
        expect(cleanText(undefined)).toBe('');
    });
});

describe(describeAudioDetail.name, () => {
    it('should give the language, the codec and the channels', () => {
        expect(describeAudioDetail({ label: 'English', language: 'en', codec: 'mp4a.40.2', channels: '2' })).toBe(
            'en · mp4a.40.2 · 2 ch',
        );
    });

    it('should leave out what the manifest does not give, and a language that is only spaces', () => {
        expect(describeAudioDetail({ label: 'English', language: ' ', codec: 'mp4a.40.2' })).toBe('mp4a.40.2');
        expect(describeAudioDetail({ label: 'English', language: '' })).toBe('');
    });
});

describe(describeAudioTracks.name, () => {
    it('should say when the stream has no audio track of its own', () => {
        expect(describeAudioTracks([])).toBe('no track of its own: the sound, if any, is in the video segments');
    });

    it('should describe the only track', () => {
        expect(
            describeAudioTracks([{ label: 'Alternate Audio', language: '', codec: 'mp4a.40.2', channels: '2' }]),
        ).toBe('Alternate Audio · mp4a.40.2 · 2 ch');
    });

    it('should write once the language of a track that has no name of its own', () => {
        expect(describeAudioTracks([{ label: 'en', language: 'en', codec: 'mp4a.40.2' }])).toBe('en · mp4a.40.2');
    });

    it('should count the tracks when there are several', () => {
        expect(
            describeAudioTracks([
                { label: 'English', language: 'en' },
                { label: 'French', language: 'fr' },
            ]),
        ).toBe('2 tracks');
    });
});
