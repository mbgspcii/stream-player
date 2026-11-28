import type Hls from 'hls.js';
import type { Events, Fragment, LevelKey } from 'hls.js';

import { cleanText, describeKeySystem } from '../helpers/format';
import type { PlayerEvents } from '../models/Player';
import type { SegmentReport } from '../models/Stream';

/** `AES-128` for a key of the playlist itself, the name of the DRM system for the others. */
const describeKey = (key: LevelKey): string =>
    key.keyFormat && key.keyFormat !== 'identity' ? `${key.method} (${describeKeySystem(key.keyFormat)})` : key.method;

/**
 * `video #3`, `audio #3`, or `video init` for an initialization segment.
 * The number tells the segments apart when they are byte ranges of one file, with one URL for all.
 */
const describeFragment = (fragment: Fragment): string =>
    `${fragment.type === 'main' ? 'video' : fragment.type} ${fragment.sn === 'initSegment' ? 'init' : `#${fragment.sn}`}`;

/** The HTTP status of a request of hls.js, which is an `XMLHttpRequest` or a `Response`. */
const readStatus = (networkDetails: unknown): number | undefined => {
    const status = (networkDetails as { status?: unknown } | null)?.status;
    return typeof status === 'number' && status > 0 ? status : undefined;
};

/**
 * Listens to hls.js and reports what it says as the events of the page.
 * `hlsEvents` holds the names of the events of hls.js. hls.js drops the listeners when it is destroyed.
 */
export const listenToHlsEvents = (hls: Hls, hlsEvents: typeof Events, events: PlayerEvents): void => {
    hls.on(hlsEvents.ERROR, (_event, data) => {
        events.onLog(`hls.js error: ${data.type} / ${data.details}${data.fatal ? ' (fatal)' : ''}`, true);
        if (data.frag) {
            // A segment that did not load: the rendition is listed, but this part of it is missing.
            events.onSegment({
                url: data.frag.url,
                kind: describeFragment(data.frag),
                status: data.response?.code || undefined,
                failed: true,
            });
        }
    });
    hls.on(hlsEvents.MANIFEST_PARSED, (_event, data) => {
        events.onRenditions(
            data.levels.map((level) => ({
                width: level.width,
                height: level.height,
                bitrate: level.bitrate,
                codecs: [level.videoCodec, level.audioCodec].filter(Boolean).join(', ') || undefined,
                frameRate: level.frameRate || undefined,
                url: level.uri,
            })),
        );
        events.onInfo({ encryption: [...new Set((data.sessionKeys ?? []).map(describeKey))] });
    });
    hls.on(hlsEvents.LEVEL_SWITCHED, (_event, data) => events.onPlayingRendition(data.level));
    hls.on(hlsEvents.LEVEL_LOADED, (_event, { details }) => {
        const keys = details.encryptedFragments.flatMap((fragment) => Object.values(fragment.levelkeys ?? {}));
        events.onInfo({
            isLive: details.live,
            duration: details.live ? undefined : details.totalduration,
            segmentDuration: details.targetduration,
            // Nothing is reported for a playlist without key, so the keys of the manifest are kept.
            ...(keys.length > 0 ? { encryption: [...new Set(keys.map(describeKey))] } : {}),
        });
    });
    hls.on(hlsEvents.AUDIO_TRACKS_UPDATED, (_event, data) => {
        events.onAudioTracks(
            data.audioTracks.map((track) => ({
                label: cleanText(track.name) || cleanText(track.lang) || 'unnamed',
                language: cleanText(track.lang),
                codec: track.audioCodec,
                channels: track.channels,
            })),
            hls.audioTrack,
        );
    });
    hls.on(hlsEvents.SUBTITLE_TRACKS_UPDATED, (_event, data) => {
        const tracks = data.subtitleTracks.map((track) => ({
            label: track.name ?? track.lang ?? 'unnamed',
            language: track.lang ?? '',
        }));
        events.onLog(
            `hls.js found ${tracks.length} subtitle track(s): ${tracks.map((track) => track.language).join(', ')}`,
        );
        events.onSubtitles(tracks);
        // Off until one is chosen, so the chosen button and the screen agree.
        hls.subtitleTrack = -1;
    });
    // hls.js follows a choice made with the controls of the video, and reports it here like a choice of the page.
    hls.on(hlsEvents.SUBTITLE_TRACK_SWITCH, (_event, data) => events.onSelectedSubtitle(data.id));
    hls.on(hlsEvents.FRAG_LOADED, (_event, data) => {
        const { stats } = data.frag;
        const segment: SegmentReport = {
            url: data.frag.url,
            kind: describeFragment(data.frag),
            bytes: stats.total || stats.loaded,
            milliseconds: Math.round(stats.loading.end - stats.loading.start),
            status: readStatus(data.networkDetails),
            failed: false,
        };
        events.onSegment(segment);
    });
};
