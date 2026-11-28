import type { StreamType } from '../models/Stream';

/** The type of the stream, from the extension of the path. The query string is ignored. */
export const detectType = (url: string): StreamType | undefined => {
    let path: string;
    try {
        path = new URL(url).pathname.toLowerCase();
    } catch {
        return undefined;
    }
    if (path.endsWith('.mpd')) {
        return 'dash';
    }
    if (path.endsWith('.m3u8')) {
        return 'hls';
    }
    return undefined;
};

/**
 * The URL of the stream, from the query string of the page: `?stream=https://…/master.m3u8`.
 * The URL may be pasted as it is, without encoding. All the text after `stream=` is then the URL of the stream,
 * so its own parameters (`?token=a&expires=b`) are kept.
 *
 * `?url=` is read too, but the page writes `?stream=`: the development server of Vite keeps `?url` for itself
 * and answers 403 to a page address that has it.
 */
export const readStreamUrl = (search: string): string => {
    const match = /[?&](?:stream|url)=(.*)$/.exec(search);
    if (!match) {
        return '';
    }
    const rest = match[1];
    if (rest.includes('://')) {
        // Not encoded: an encoded URL has `%3A%2F%2F` here.
        return rest.trim();
    }
    return new URLSearchParams(`stream=${rest}`).get('stream')?.trim() ?? '';
};

/** The query string that makes the page open with this stream. */
export const writeStreamUrl = (url: string): string => `?stream=${encodeURIComponent(url)}`;
