import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

import { describeRendition } from '../../helpers/format';
import { detectType } from '../../helpers/streamUrl';
import { startDash } from '../../repositories/startDash';
import { startHls } from '../../repositories/startHls';
import type { PlayerEvents, PlayerHandle } from '../../models/Player';
import type { AudioTrack, Rendition, SegmentReport, StreamInfo, StreamType, SubtitleTrack } from '../../models/Stream';

/** A line of the log of the page. */
export type LogLine = {
    id: number;
    time: string;
    message: string;
    isError: boolean;
};

/** A request for a segment, with the time when the page learned about it. */
export type SegmentLine = SegmentReport & { id: number; time: string };

/** The page keeps the last segments only: a long stream has thousands of them. */
export const MAX_SEGMENTS = 50;

export type StreamState = {
    /** `true` once a stream was asked for, even if it failed. */
    isLoaded: boolean;
    /** The URL of the manifest. Empty before a stream is loaded. */
    url: string;
    type: StreamType | undefined;
    engine: string;
    /** `undefined` until the player reports the renditions. */
    renditions: Rendition[] | undefined;
    canSelectRendition: boolean;
    /** The rendition on screen. -1 when not known. */
    playingRendition: number;
    /** The rendition that the user chose. -1 is "Auto". */
    selectedRendition: number;
    subtitles: SubtitleTrack[];
    /** The subtitle track that the user chose. -1 is "Off". */
    selectedSubtitle: number;
    audioTracks: AudioTrack[];
    /** The audio track that plays. -1 when not known. */
    selectedAudioTrack: number;
    /** What the manifest says about the stream as a whole. */
    info: StreamInfo;
    /** The last requests for a segment, the oldest first. */
    segments: SegmentLine[];
    /** How many times the rendition on screen changed since the stream started. */
    renditionSwitches: number;
};

const INITIAL_STATE: StreamState = {
    isLoaded: false,
    url: '',
    type: undefined,
    engine: '',
    renditions: undefined,
    canSelectRendition: false,
    playingRendition: -1,
    selectedRendition: -1,
    subtitles: [],
    selectedSubtitle: -1,
    audioTracks: [],
    selectedAudioTrack: -1,
    info: {},
    segments: [],
    renditionSwitches: 0,
};

/**
 * Plays one stream at a time in the video element, and keeps what the player reports.
 * `forcedType` is used when the extension of the URL does not give the type.
 */
export const useStreamPlayer = (videoRef: RefObject<HTMLVideoElement>) => {
    const [state, setState] = useState<StreamState>(INITIAL_STATE);
    const [log, setLog] = useState<LogLine[]>([]);

    const handleRef = useRef<PlayerHandle>();
    /** Counts the calls of `load`, so a slow load can see that a newer one replaced it. */
    const loadIdRef = useRef(0);
    const logIdRef = useRef(0);
    /** The renditions of the current stream, for the log lines. */
    const renditionsRef = useRef<Rendition[]>([]);
    const subtitlesRef = useRef<SubtitleTrack[]>([]);
    /** The subtitle track on screen, to tell a new choice from the echo of one that the page already knows. */
    const selectedSubtitleRef = useRef(-1);
    const audioTracksRef = useRef<AudioTrack[]>([]);
    const segmentIdRef = useRef(0);

    const addLog = useCallback((message: string, isError = false) => {
        const line = { id: ++logIdRef.current, time: new Date().toLocaleTimeString(), message, isError };
        setLog((lines) => [...lines, line]);
    }, []);

    const stop = useCallback(() => {
        handleRef.current?.destroy();
        handleRef.current = undefined;
        renditionsRef.current = [];
        subtitlesRef.current = [];
        selectedSubtitleRef.current = -1;
        audioTracksRef.current = [];
    }, []);

    const load = useCallback(
        async (url: string, forcedType?: StreamType) => {
            const video = videoRef.current;
            if (!video) {
                return;
            }

            const loadId = ++loadIdRef.current;
            const isCurrent = () => loadId === loadIdRef.current;

            stop();
            const type = forcedType ?? detectType(url);
            setState({ ...INITIAL_STATE, isLoaded: true, url, type });
            addLog(`loading ${url}`);

            if (type === undefined) {
                addLog('unknown type: the path ends with neither .mpd nor .m3u8. Choose the type in the list.', true);
                return;
            }

            // An older stream may still report while it stops: only the current one changes the page.
            const update = (patch: Partial<StreamState>) => {
                if (isCurrent()) {
                    setState((current) => ({ ...current, ...patch }));
                }
            };
            const events: PlayerEvents = {
                onEngine: (engine) => update({ engine }),
                onRenditions: (renditions) => {
                    renditionsRef.current = renditions;
                    update({ renditions });
                    if (isCurrent() && renditions.length > 0) {
                        addLog(`${renditions.length} rendition(s): ${renditions.map(describeRendition).join(', ')}`);
                    }
                },
                onPlayingRendition: (index) => {
                    if (isCurrent()) {
                        setState((current) => ({
                            ...current,
                            playingRendition: index,
                            // The first rendition is the start of the stream, not a switch.
                            renditionSwitches:
                                current.playingRendition === -1 || current.playingRendition === index
                                    ? current.renditionSwitches
                                    : current.renditionSwitches + 1,
                        }));
                    }
                    const rendition = renditionsRef.current[index];
                    if (isCurrent() && rendition) {
                        addLog(`playing ${describeRendition(rendition)}`);
                    }
                },
                onSubtitles: (subtitles) => {
                    if (isCurrent()) {
                        subtitlesRef.current = subtitles;
                        selectedSubtitleRef.current = -1;
                    }
                    update({ subtitles, selectedSubtitle: -1 });
                },
                onSelectedSubtitle: (index) => {
                    // The player also reports the choices made with the buttons of the page: those are known.
                    if (!isCurrent() || index === selectedSubtitleRef.current) {
                        return;
                    }
                    selectedSubtitleRef.current = index;
                    update({ selectedSubtitle: index });
                    const track = subtitlesRef.current[index];
                    addLog(
                        track
                            ? `subtitles: ${track.label} (${track.language}), chosen in the controls of the video`
                            : 'subtitles off, chosen in the controls of the video',
                    );
                },
                onAudioTracks: (audioTracks, selectedAudioTrack) => {
                    if (isCurrent()) {
                        audioTracksRef.current = audioTracks;
                    }
                    update({ audioTracks, selectedAudioTrack });
                },
                onInfo: (info) => {
                    if (!isCurrent()) {
                        return;
                    }
                    setState((current) => ({ ...current, info: { ...current.info, ...info } }));
                },
                onSegment: (segment) => {
                    if (!isCurrent()) {
                        return;
                    }
                    const line = { ...segment, id: ++segmentIdRef.current, time: new Date().toLocaleTimeString() };
                    setState((current) => ({ ...current, segments: [...current.segments, line].slice(-MAX_SEGMENTS) }));
                },
                onLog: (message, isError) => {
                    if (isCurrent()) {
                        addLog(message, isError);
                    }
                },
            };

            try {
                const handle = await (type === 'dash' ? startDash : startHls)(video, url, events);
                if (!isCurrent()) {
                    // Another stream was loaded while the player was downloading.
                    handle.destroy();
                    return;
                }
                handleRef.current = handle;
                update({ canSelectRendition: handle.canSelectRendition });
            } catch (error) {
                if (isCurrent()) {
                    addLog(`the player did not start: ${error instanceof Error ? error.message : String(error)}`, true);
                }
            }
        },
        [videoRef, stop, addLog],
    );

    const selectRendition = useCallback(
        (index: number) => {
            handleRef.current?.selectRendition(index);
            setState((current) => ({ ...current, selectedRendition: index }));
            const rendition = renditionsRef.current[index];
            addLog(rendition ? `rendition forced: ${describeRendition(rendition)}` : 'rendition: auto');
        },
        [addLog],
    );

    const selectSubtitle = useCallback(
        (index: number) => {
            selectedSubtitleRef.current = index;
            handleRef.current?.selectSubtitle(index);
            setState((current) => ({ ...current, selectedSubtitle: index }));
            const track = subtitlesRef.current[index];
            addLog(track ? `subtitles: ${track.label} (${track.language})` : 'subtitles off');
        },
        [addLog],
    );

    const selectAudioTrack = useCallback(
        (index: number) => {
            handleRef.current?.selectAudioTrack(index);
            setState((current) => ({ ...current, selectedAudioTrack: index }));
            const track = audioTracksRef.current[index];
            if (track) {
                addLog(`audio: ${track.label} (${track.language})`);
            }
        },
        [addLog],
    );

    /** The speed of the network that the player measured, in bits per second. */
    const getBandwidthEstimate = useCallback(() => handleRef.current?.getBandwidthEstimate(), []);

    // Stop the stream when the page goes away.
    useEffect(
        () => () => {
            loadIdRef.current++;
            stop();
        },
        [stop],
    );

    return { state, log, load, selectRendition, selectSubtitle, selectAudioTrack, getBandwidthEstimate };
};
