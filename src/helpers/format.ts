import type { AudioTrack, Rendition, SegmentReport } from '../models/Stream';

/** `1500000` gives `1500 kb/s`. */
export const formatBitrate = (bitsPerSecond: number): string => `${Math.round(bitsPerSecond / 1000)} kb/s`;

export const formatResolution = ({ width, height }: Rendition): string =>
    width && height ? `${width}x${height}` : 'no resolution';

/** `1280x720 (2149 kb/s)`. */
export const describeRendition = (rendition: Rendition): string =>
    `${formatResolution(rendition)} (${formatBitrate(rendition.bitrate)})`;

/** The speed of a network: `850 kb/s`, and `163 Mb/s` from 10 Mb/s. */
export const formatSpeed = (bitsPerSecond: number): string =>
    bitsPerSecond >= 10_000_000 ? `${Math.round(bitsPerSecond / 1_000_000)} Mb/s` : formatBitrate(bitsPerSecond);

/** `25 fps`, and `29.97 fps` for a rate that is not a whole number. */
export const formatFrameRate = (framesPerSecond: number): string => `${Number(framesPerSecond.toFixed(2))} fps`;

/** The texts that tell one rendition from another with the same resolution: `2149 kb/s · 25 fps · avc1.64001f`. */
export const describeRenditionDetail = (rendition: Rendition): string =>
    [
        formatBitrate(rendition.bitrate),
        rendition.frameRate ? formatFrameRate(rendition.frameRate) : undefined,
        rendition.codecs,
    ]
        .filter(Boolean)
        .join(' · ');

/** `512 B`, `340 kB`, `1.2 MB`. */
export const formatBytes = (bytes: number): string => {
    if (bytes < 1000) {
        return `${bytes} B`;
    }
    if (bytes < 1_000_000) {
        return `${Math.round(bytes / 1000)} kB`;
    }
    return `${(bytes / 1_000_000).toFixed(1)} MB`;
};

/** `75` gives `1:15`, and `3675` gives `1:01:15`. */
export const formatDuration = (seconds: number): string => {
    const total = Math.round(seconds);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const rest = String(total % 60).padStart(2, '0');
    return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`;
};

const KEY_SYSTEMS: Record<string, string> = {
    'urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed': 'Widevine',
    'com.widevine.alpha': 'Widevine',
    'urn:uuid:9a04f079-9840-4286-ab92-e65be0885f95': 'PlayReady',
    'com.microsoft.playready': 'PlayReady',
    'urn:uuid:94ce86fb-07ff-4f43-adb8-93d2fa968ca2': 'FairPlay',
    'com.apple.streamingkeydelivery': 'FairPlay',
    'urn:uuid:e2719d58-a985-b3c9-781a-b030af78d30e': 'ClearKey',
    'org.w3.clearkey': 'ClearKey',
};

/** The usual name of a DRM system, from the identifier that a manifest gives. An unknown identifier is given back. */
export const describeKeySystem = (identifier: string): string => KEY_SYSTEMS[identifier.toLowerCase()] ?? identifier;

/** The last two parts of the path of a URL: enough to tell one segment from another in a list. */
export const shortenUrl = (url: string): string => {
    try {
        return new URL(url).pathname.split('/').filter(Boolean).slice(-2).join('/');
    } catch {
        return url;
    }
};

/** `HTTP 200 · video · 512 kB · 120 ms · 720p/segment_3.m4s`. A part that is not known is left out. */
export const describeSegment = (segment: SegmentReport): string =>
    [
        segment.status ? `HTTP ${segment.status}` : segment.failed ? 'no response' : undefined,
        segment.kind,
        segment.bytes === undefined ? undefined : formatBytes(segment.bytes),
        segment.milliseconds === undefined ? undefined : `${segment.milliseconds} ms`,
        shortenUrl(segment.url),
    ]
        .filter(Boolean)
        .join(' · ');

/**
 * A text of a manifest without the characters that cannot be shown, and without the spaces around it.
 * hls.js gives such characters for an attribute that the manifest leaves empty, as `LANGUAGE=""`.
 */
export const cleanText = (text: string | undefined): string =>
    // eslint-disable-next-line no-control-regex -- the control characters are what this removes
    (text ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim();

/** `en · mp4a.40.2 · 2 ch`. A part that the manifest does not give is left out. */
export const describeAudioDetail = (track: AudioTrack): string =>
    [track.language, track.codec, track.channels ? `${track.channels} ch` : undefined]
        // A manifest may give a language that is only spaces.
        .filter((part) => part?.trim())
        .join(' · ');

/** The audio of a stream in one line: its only track, or how many tracks it has. */
export const describeAudioTracks = (tracks: AudioTrack[]): string => {
    if (tracks.length === 0) {
        return 'no track of its own: the sound, if any, is in the video segments';
    }
    if (tracks.length > 1) {
        return `${tracks.length} tracks`;
    }
    const [track] = tracks;
    // A track without a name gets its language as its label: the language is then written once.
    const detail = describeAudioDetail(track.label === track.language ? { ...track, language: '' } : track);
    return [track.label, detail].filter(Boolean).join(' · ');
};
