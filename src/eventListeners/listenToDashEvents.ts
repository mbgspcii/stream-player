import type { MediaInfo, MediaPlayerClass, MediaPlayerEvents } from 'dashjs';

import { watchShowingTrack } from '../helpers/textTracks';
import type { PlayerEvents } from '../models/Player';
import type { AudioTrack, SegmentReport } from '../models/Stream';
import { readDashManifest, type DashManifestFacts } from '../transformers/readDashManifest';

/** `video/mp4;codecs="avc1.64001f"` gives `avc1.64001f`. */
const readCodecs = (codec: string | null): string | undefined => /codecs="([^"]+)"/.exec(codec ?? '')?.[1];

const toAudioTrack = (track: MediaInfo): AudioTrack => {
    const channels: unknown = track.audioChannelConfiguration?.[0];
    return {
        // `||`: dash.js gives an empty text, not nothing, for a track without language.
        label: track.labels?.[0]?.text || track.lang || 'unnamed',
        language: track.lang ?? '',
        codec: readCodecs(track.codec),
        channels: typeof channels === 'string' || typeof channels === 'number' ? String(channels) : undefined,
    };
};

/**
 * One request of dash.js, as its `HttpList` metric records it.
 * These fields are not in the types of dash.js, so each one is checked before it is used.
 */
type HttpMetric = Record<string, unknown>;

/** The name that dash.js gives to the date when a request finished. */
const FINISH_DATE_FIELD = '_tfinish';

const SEGMENT_KINDS: Record<string, string> = { MediaSegment: '', InitializationSegment: ' init' };

/** The report of a request for a segment. `undefined` for another request, as the one for the manifest. */
const toSegmentReport = (mediaType: string, metric: HttpMetric): SegmentReport | undefined => {
    const suffix = typeof metric.type === 'string' ? SEGMENT_KINDS[metric.type] : undefined;
    if (suffix === undefined || typeof metric.url !== 'string') {
        return undefined;
    }

    const status = typeof metric.responsecode === 'number' && metric.responsecode > 0 ? metric.responsecode : undefined;
    const bytes = Array.isArray(metric.trace)
        ? metric.trace.reduce<number>((sum, part: { b?: unknown }) => {
              const loaded: unknown = Array.isArray(part?.b) ? part.b[0] : undefined;
              return sum + (typeof loaded === 'number' ? loaded : 0);
          }, 0)
        : undefined;
    const finished = metric[FINISH_DATE_FIELD];
    const milliseconds =
        metric.trequest instanceof Date && finished instanceof Date
            ? finished.getTime() - metric.trequest.getTime()
            : undefined;

    return {
        url: metric.url,
        kind: `${mediaType}${suffix}`,
        bytes: bytes || undefined,
        milliseconds,
        status,
        failed: status === undefined || status >= 400,
    };
};

/** The subtitle track that dash.js shows, and the way to change it. */
export type DashSubtitles = {
    /** -1 when the subtitles are off. */
    getSelected: () => number;
    show: (index: number) => void;
};

/**
 * Listens to dash.js and to the video element, and reports what they say as the events of the page.
 * `playerEvents` holds the names of the events of dash.js. Gives the function that stops the listening
 * to the video element: dash.js drops its own listeners when it is reset.
 */
export const listenToDashEvents = (
    player: MediaPlayerClass,
    playerEvents: MediaPlayerEvents,
    video: HTMLVideoElement,
    events: PlayerEvents,
    subtitles: DashSubtitles,
): (() => void) => {
    let manifestFacts: DashManifestFacts = { videoRepresentations: [], encryption: [] };

    // dash.js does not follow a choice made with the controls of the video: the track gets shown, but stays empty.
    // So the page asks dash.js for the track that the video shows.
    const stopListening = watchShowingTrack(video, (index) => {
        if (index !== subtitles.getSelected()) {
            subtitles.show(index);
            events.onSelectedSubtitle(index);
        }
    });

    player.on(playerEvents.ERROR, (event) => {
        const error = 'error' in event ? event.error : event;
        events.onLog(`dash.js error: ${JSON.stringify(error)}`, true);
    });
    player.on(playerEvents.MANIFEST_LOADED, (event) => {
        manifestFacts = readDashManifest(event.data);
    });
    player.on(playerEvents.STREAM_INITIALIZED, () => {
        events.onLog('stream initialized');

        // dash.js gives the resolution and the bitrate. The codecs and the frame rate come from the manifest.
        events.onRenditions(
            (player.getBitrateInfoListFor('video') ?? []).map(({ width, height, bitrate }) => {
                const representation = manifestFacts.videoRepresentations.find((item) => item.bandwidth === bitrate);
                return {
                    width,
                    height,
                    bitrate,
                    codecs: representation?.codecs ?? readCodecs(player.getCurrentTrackFor('video')?.codec ?? null),
                    frameRate: representation?.frameRate,
                };
            }),
        );

        const audioTracks: MediaInfo[] = player.getTracksFor('audio') ?? [];
        const currentAudio = player.getCurrentTrackFor('audio');
        events.onAudioTracks(
            audioTracks.map(toAudioTrack),
            audioTracks.findIndex((track) => track.index === currentAudio?.index),
        );

        const isLive = player.isDynamic();
        events.onInfo({
            isLive,
            duration: isLive ? undefined : player.duration(),
            segmentDuration: manifestFacts.segmentDuration,
            encryption: manifestFacts.encryption,
        });
    });
    player.on(playerEvents.QUALITY_CHANGE_RENDERED, (event) => {
        if (event.mediaType === 'video') {
            events.onPlayingRendition(event.newQuality);
        }
    });
    player.on(playerEvents.TEXT_TRACKS_ADDED, (event) => {
        const tracks = (event.tracks ?? []).map((track) => ({
            label: track.labels?.[0]?.text ?? track.lang ?? 'unnamed',
            language: track.lang ?? '',
        }));
        events.onLog(
            `dash.js found ${tracks.length} subtitle track(s): ${tracks.map((track) => track.language).join(', ')}`,
        );
        events.onSubtitles(tracks);
        // Off until one is chosen, so the chosen button and the screen agree.
        subtitles.show(-1);
    });
    player.on(playerEvents.METRIC_ADDED, (event) => {
        // dash.js names the metric of its HTTP requests `HttpList`, but its types do not list that name.
        const metric: string = event.metric;
        if (metric !== 'HttpList') {
            return;
        }
        const segment = toSegmentReport(event.mediaType, { ...event.value });
        if (segment) {
            events.onSegment(segment);
        }
    });

    return stopListening;
};
