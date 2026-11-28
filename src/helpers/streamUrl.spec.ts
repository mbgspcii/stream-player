import { describe, expect, it } from 'vitest';

import { detectType, readStreamUrl, writeStreamUrl } from './streamUrl';

describe(detectType.name, () => {
    it('should read the type from the extension of the path', () => {
        expect(detectType('https://cdn.example.com/video/master.mpd')).toBe('dash');
        expect(detectType('https://cdn.example.com/video/master.m3u8')).toBe('hls');
    });

    it('should ignore the query string and the case', () => {
        expect(detectType('https://cdn.example.com/video/MASTER.M3U8?token=abc.mpd')).toBe('hls');
    });

    it('should give nothing for another extension or for a text that is not a URL', () => {
        expect(detectType('https://cdn.example.com/video/master.mp4')).toBeUndefined();
        expect(detectType('master.mpd')).toBeUndefined();
    });
});

describe(readStreamUrl.name, () => {
    it('should read a URL pasted without encoding', () => {
        expect(readStreamUrl('?stream=https://cdn.example.com/video/master.m3u8')).toBe(
            'https://cdn.example.com/video/master.m3u8',
        );
    });

    it('should keep the parameters of a URL pasted without encoding', () => {
        expect(readStreamUrl('?stream=https://cdn.example.com/master.mpd?token=a&url=b')).toBe(
            'https://cdn.example.com/master.mpd?token=a&url=b',
        );
    });

    it('should stop an encoded URL at the next parameter of the page', () => {
        expect(readStreamUrl('?stream=https%3A%2F%2Fcdn.example.com%2Fmaster.mpd&other=1')).toBe(
            'https://cdn.example.com/master.mpd',
        );
    });

    it('should read the older `url` parameter too', () => {
        expect(readStreamUrl('?url=https://cdn.example.com/master.mpd')).toBe('https://cdn.example.com/master.mpd');
        expect(readStreamUrl('?url=https%3A%2F%2Fcdn.example.com%2Fmaster.mpd')).toBe(
            'https://cdn.example.com/master.mpd',
        );
    });

    it('should give an empty text when the page has no URL', () => {
        expect(readStreamUrl('')).toBe('');
        expect(readStreamUrl('?other=1')).toBe('');
    });
});

describe(writeStreamUrl.name, () => {
    it('should write a query string that readStreamUrl reads back', () => {
        const stream = 'https://cdn.example.com/master.mpd?token=a&expires=b';
        expect(writeStreamUrl(stream)).toBe(`?stream=${encodeURIComponent(stream)}`);
        expect(readStreamUrl(writeStreamUrl(stream))).toBe(stream);
    });
});
