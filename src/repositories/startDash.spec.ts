import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createPlayerEventsMock } from '../_tests/playerEventsMock';
import { setTextTracks } from '../_tests/textTracks';
import { startDash } from './startDash';

// dash.js is a true external: it needs Media Source Extensions, which the test environment does not have.
const { fakeDashjs, fakePlayer, EVENTS } = vi.hoisted(() => {
    type Handler = (event: unknown) => void;

    const events = {
        ERROR: 'error',
        STREAM_INITIALIZED: 'streamInitialized',
        QUALITY_CHANGE_RENDERED: 'qualityChangeRendered',
        TEXT_TRACKS_ADDED: 'allTextTracksAdded',
        MANIFEST_LOADED: 'manifestLoaded',
        METRIC_ADDED: 'metricAdded',
    };

    const handlers = new Map<string, Handler>();
    const player = {
        on: vi.fn((event: string, handler: Handler) => {
            handlers.set(event, handler);
        }),
        /** Does what dash.js does when it has something to report. */
        emit: (event: string, data: unknown) => handlers.get(event)?.(data),
        initialize: vi.fn(),
        getVersion: vi.fn(() => '4.7.4'),
        getBitrateInfoListFor: vi.fn(),
        getTracksFor: vi.fn(),
        getCurrentTrackFor: vi.fn(),
        setCurrentTrack: vi.fn(),
        isDynamic: vi.fn(),
        duration: vi.fn(),
        getAverageThroughput: vi.fn(),
        updateSettings: vi.fn(),
        setQualityFor: vi.fn(),
        enableText: vi.fn(),
        setTextTrack: vi.fn(),
        reset: vi.fn(),
    };

    const dashjs = {
        MediaPlayer: Object.assign(() => ({ create: () => player }), { events }),
    };

    return { fakeDashjs: dashjs, fakePlayer: player, EVENTS: events };
});

vi.mock('dashjs', () => ({ default: fakeDashjs }));

const STREAM_URL = 'https://cdn.example.com/video/master.mpd';

describe(startDash.name, () => {
    beforeEach(() => {
        fakePlayer.getBitrateInfoListFor.mockReturnValue([]);
        fakePlayer.getTracksFor.mockReturnValue([]);
        fakePlayer.getCurrentTrackFor.mockReturnValue(null);
        fakePlayer.isDynamic.mockReturnValue(false);
        fakePlayer.duration.mockReturnValue(120);
        fakePlayer.getAverageThroughput.mockReturnValue(Number.NaN);
    });

    it('should load the stream in the video element without autoplay, and report the player', async () => {
        const video = document.createElement('video');
        const events = createPlayerEventsMock();

        const handle = await startDash(video, STREAM_URL, events);

        expect(fakePlayer.initialize).toHaveBeenCalledExactlyOnceWith(video, STREAM_URL, false);
        expect(events.onEngine).toHaveBeenCalledExactlyOnceWith('dash.js 4.7.4');
        expect(handle.canSelectRendition).toBe(true);
    });

    it('should report the video renditions once the stream is initialized', async () => {
        const events = createPlayerEventsMock();
        const renditions = [
            { width: 640, height: 360, bitrate: 800_000 },
            { width: 1280, height: 720, bitrate: 2_500_000 },
        ];
        fakePlayer.getBitrateInfoListFor.mockReturnValue(renditions);
        await startDash(document.createElement('video'), STREAM_URL, events);

        fakePlayer.emit(EVENTS.STREAM_INITIALIZED, {});

        expect(fakePlayer.getBitrateInfoListFor).toHaveBeenCalledExactlyOnceWith('video');
        expect(events.onRenditions).toHaveBeenCalledExactlyOnceWith(
            renditions.map((rendition) => ({ ...rendition, codecs: undefined, frameRate: undefined })),
        );
        expect(events.onLog).toHaveBeenCalledWith('stream initialized');
    });

    it('should add the codecs and the frame rate of the manifest to the renditions', async () => {
        const events = createPlayerEventsMock();
        fakePlayer.getBitrateInfoListFor.mockReturnValue([
            { width: 640, height: 360, bitrate: 800_000 },
            { width: 1280, height: 720, bitrate: 2_500_000 },
        ]);
        fakePlayer.getCurrentTrackFor.mockImplementation((type: string) =>
            type === 'video' ? { codec: 'video/mp4;codecs="avc1.64001f"' } : null,
        );
        await startDash(document.createElement('video'), STREAM_URL, events);

        fakePlayer.emit(EVENTS.MANIFEST_LOADED, {
            data: {
                Period_asArray: [
                    {
                        AdaptationSet_asArray: [
                            {
                                contentType: 'video',
                                Representation_asArray: [
                                    { bandwidth: 800_000, codecs: 'avc1.64001e', frameRate: '30000/1001' },
                                ],
                            },
                        ],
                    },
                ],
            },
        });
        fakePlayer.emit(EVENTS.STREAM_INITIALIZED, {});

        expect(events.onRenditions).toHaveBeenCalledExactlyOnceWith([
            { width: 640, height: 360, bitrate: 800_000, codecs: 'avc1.64001e', frameRate: 30000 / 1001 },
            // Not in the manifest that was read: the codecs of the playing track are used.
            { width: 1280, height: 720, bitrate: 2_500_000, codecs: 'avc1.64001f', frameRate: undefined },
        ]);
    });

    it('should report the audio tracks and the one that plays', async () => {
        const events = createPlayerEventsMock();
        const english = {
            index: 0,
            labels: [{ text: 'English' }],
            lang: 'en',
            codec: 'audio/mp4;codecs="mp4a.40.2"',
            audioChannelConfiguration: ['2'],
        };
        const unnamed = { index: 1, labels: [], lang: '', codec: null, audioChannelConfiguration: [] };
        fakePlayer.getTracksFor.mockReturnValue([english, unnamed]);
        fakePlayer.getCurrentTrackFor.mockImplementation((type: string) => (type === 'audio' ? unnamed : null));
        await startDash(document.createElement('video'), STREAM_URL, events);

        fakePlayer.emit(EVENTS.STREAM_INITIALIZED, {});

        expect(fakePlayer.getTracksFor).toHaveBeenCalledExactlyOnceWith('audio');
        expect(events.onAudioTracks).toHaveBeenCalledExactlyOnceWith(
            [
                { label: 'English', language: 'en', codec: 'mp4a.40.2', channels: '2' },
                { label: 'unnamed', language: '', codec: undefined, channels: undefined },
            ],
            1,
        );
    });

    it('should report what the manifest says about an on-demand stream', async () => {
        const events = createPlayerEventsMock();
        await startDash(document.createElement('video'), STREAM_URL, events);

        fakePlayer.emit(EVENTS.MANIFEST_LOADED, { data: { maxSegmentDuration: 4 } });
        fakePlayer.emit(EVENTS.STREAM_INITIALIZED, {});

        expect(events.onInfo).toHaveBeenCalledExactlyOnceWith({
            isLive: false,
            duration: 120,
            segmentDuration: 4,
            encryption: [],
        });
    });

    it('should report no duration for a live stream', async () => {
        const events = createPlayerEventsMock();
        fakePlayer.isDynamic.mockReturnValue(true);
        await startDash(document.createElement('video'), STREAM_URL, events);

        fakePlayer.emit(EVENTS.STREAM_INITIALIZED, {});

        expect(events.onInfo).toHaveBeenCalledExactlyOnceWith(
            expect.objectContaining({ isLive: true, duration: undefined }),
        );
    });

    it('should report a request for a segment with its size, its time and its HTTP status', async () => {
        const events = createPlayerEventsMock();
        await startDash(document.createElement('video'), STREAM_URL, events);

        fakePlayer.emit(EVENTS.METRIC_ADDED, {
            metric: 'HttpList',
            mediaType: 'video',
            value: {
                type: 'MediaSegment',
                url: 'https://cdn.example.com/video/720p_3.m4s',
                responsecode: 200,
                trequest: new Date(1000),
                _tfinish: new Date(1150),
                trace: [{ b: [300_000] }, { b: [212_000] }],
            },
        });
        fakePlayer.emit(EVENTS.METRIC_ADDED, {
            metric: 'HttpList',
            mediaType: 'audio',
            value: { type: 'InitializationSegment', url: 'https://cdn.example.com/audio/init.mp4', responsecode: 404 },
        });

        expect(events.onSegment).toHaveBeenNthCalledWith(1, {
            url: 'https://cdn.example.com/video/720p_3.m4s',
            kind: 'video',
            bytes: 512_000,
            milliseconds: 150,
            status: 200,
            failed: false,
        });
        expect(events.onSegment).toHaveBeenNthCalledWith(2, {
            url: 'https://cdn.example.com/audio/init.mp4',
            kind: 'audio init',
            bytes: undefined,
            milliseconds: undefined,
            status: 404,
            failed: true,
        });
    });

    it('should report a request without response as failed', async () => {
        const events = createPlayerEventsMock();
        await startDash(document.createElement('video'), STREAM_URL, events);

        fakePlayer.emit(EVENTS.METRIC_ADDED, {
            metric: 'HttpList',
            mediaType: 'video',
            value: { type: 'MediaSegment', url: 'https://cdn.example.com/video/720p_4.m4s', responsecode: null },
        });

        expect(events.onSegment).toHaveBeenCalledExactlyOnceWith(
            expect.objectContaining({ status: undefined, failed: true }),
        );
    });

    it('should report no segment for the request of the manifest or for another metric', async () => {
        const events = createPlayerEventsMock();
        await startDash(document.createElement('video'), STREAM_URL, events);

        fakePlayer.emit(EVENTS.METRIC_ADDED, {
            metric: 'HttpList',
            mediaType: 'stream',
            value: { type: 'MPD', url: STREAM_URL, responsecode: 200 },
        });
        fakePlayer.emit(EVENTS.METRIC_ADDED, { metric: 'BufferLevel', mediaType: 'video', value: { level: 12 } });

        expect(events.onSegment).not.toHaveBeenCalled();
    });

    it('should report the video rendition on screen and ignore the audio one', async () => {
        const events = createPlayerEventsMock();
        await startDash(document.createElement('video'), STREAM_URL, events);

        fakePlayer.emit(EVENTS.QUALITY_CHANGE_RENDERED, { mediaType: 'audio', newQuality: 1 });
        fakePlayer.emit(EVENTS.QUALITY_CHANGE_RENDERED, { mediaType: 'video', newQuality: 2 });

        expect(events.onPlayingRendition).toHaveBeenCalledExactlyOnceWith(2);
    });

    it('should report the subtitle tracks and keep them off until one is chosen', async () => {
        const events = createPlayerEventsMock();
        await startDash(document.createElement('video'), STREAM_URL, events);

        fakePlayer.emit(EVENTS.TEXT_TRACKS_ADDED, {
            tracks: [{ labels: [{ text: 'English' }], lang: 'en' }, { lang: 'de' }, {}],
        });

        expect(events.onSubtitles).toHaveBeenCalledExactlyOnceWith([
            { label: 'English', language: 'en' },
            { label: 'de', language: 'de' },
            { label: 'unnamed', language: '' },
        ]);
        expect(events.onLog).toHaveBeenCalledWith('dash.js found 3 subtitle track(s): en, de, ');
        expect(fakePlayer.enableText).toHaveBeenLastCalledWith(false);
        expect(fakePlayer.setTextTrack).toHaveBeenLastCalledWith(-1);
    });

    it('should log an error of the player', async () => {
        const events = createPlayerEventsMock();
        await startDash(document.createElement('video'), STREAM_URL, events);

        fakePlayer.emit(EVENTS.ERROR, { error: { code: 25, message: 'manifest not found' } });

        expect(events.onLog).toHaveBeenCalledExactlyOnceWith(
            'dash.js error: {"code":25,"message":"manifest not found"}',
            true,
        );
    });

    it('should turn the automatic choice off and replace the buffer when a rendition is chosen', async () => {
        const handle = await startDash(document.createElement('video'), STREAM_URL, createPlayerEventsMock());

        handle.selectRendition(2);

        expect(fakePlayer.updateSettings).toHaveBeenCalledExactlyOnceWith({
            streaming: { abr: { autoSwitchBitrate: { video: false } } },
        });
        expect(fakePlayer.setQualityFor).toHaveBeenCalledExactlyOnceWith('video', 2, true);
    });

    it('should give the choice of the rendition back to the player with -1', async () => {
        const handle = await startDash(document.createElement('video'), STREAM_URL, createPlayerEventsMock());

        handle.selectRendition(-1);

        expect(fakePlayer.updateSettings).toHaveBeenCalledExactlyOnceWith({
            streaming: { abr: { autoSwitchBitrate: { video: true } } },
        });
        expect(fakePlayer.setQualityFor).not.toHaveBeenCalled();
    });

    it('should show the chosen subtitle track, and hide the subtitles with -1', async () => {
        const handle = await startDash(document.createElement('video'), STREAM_URL, createPlayerEventsMock());

        handle.selectSubtitle(1);
        expect(fakePlayer.enableText).toHaveBeenLastCalledWith(true);
        expect(fakePlayer.setTextTrack).toHaveBeenLastCalledWith(1);

        handle.selectSubtitle(-1);
        expect(fakePlayer.enableText).toHaveBeenLastCalledWith(false);
        expect(fakePlayer.setTextTrack).toHaveBeenLastCalledWith(-1);
    });

    it('should report a subtitle track chosen with the page', async () => {
        const events = createPlayerEventsMock();
        const handle = await startDash(document.createElement('video'), STREAM_URL, events);

        handle.selectSubtitle(1);

        expect(events.onSelectedSubtitle).toHaveBeenCalledExactlyOnceWith(1);
    });

    describe('when a subtitle track is chosen in the controls of the video', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        const startWithTracks = async () => {
            const video = document.createElement('video');
            const events = createPlayerEventsMock();
            const textTracks = setTextTracks(video, [
                { label: 'English', language: 'en', mode: 'disabled' },
                { label: 'French', language: 'fr', mode: 'disabled' },
            ]);
            const handle = await startDash(video, STREAM_URL, events);
            return { events, textTracks, handle };
        };

        it('should ask dash.js for that track, which stays empty otherwise, and report it', async () => {
            const { events, textTracks } = await startWithTracks();

            textTracks.tracks[1].mode = 'showing';
            textTracks.change();
            vi.advanceTimersByTime(200);

            expect(fakePlayer.enableText).toHaveBeenLastCalledWith(true);
            expect(fakePlayer.setTextTrack).toHaveBeenLastCalledWith(1);
            expect(events.onSelectedSubtitle).toHaveBeenCalledExactlyOnceWith(1);
        });

        it('should turn the subtitles off in dash.js when the controls hide them', async () => {
            const { events, textTracks, handle } = await startWithTracks();
            handle.selectSubtitle(0);
            textTracks.tracks[0].mode = 'showing';

            textTracks.tracks[0].mode = 'disabled';
            textTracks.change();
            vi.advanceTimersByTime(200);

            expect(fakePlayer.enableText).toHaveBeenLastCalledWith(false);
            expect(fakePlayer.setTextTrack).toHaveBeenLastCalledWith(-1);
            expect(events.onSelectedSubtitle).toHaveBeenLastCalledWith(-1);
        });

        it('should do nothing for the change that dash.js makes itself after a choice of the page', async () => {
            const { events, textTracks, handle } = await startWithTracks();
            handle.selectSubtitle(1);
            fakePlayer.setTextTrack.mockClear();
            events.onSelectedSubtitle.mockClear();

            textTracks.tracks[1].mode = 'showing';
            textTracks.change();
            vi.advanceTimersByTime(200);

            expect(fakePlayer.setTextTrack).not.toHaveBeenCalled();
            expect(events.onSelectedSubtitle).not.toHaveBeenCalled();
        });

        it('should stop the watch when the stream stops', async () => {
            const { events, textTracks, handle } = await startWithTracks();

            handle.destroy();
            textTracks.tracks[1].mode = 'showing';
            textTracks.change();
            vi.advanceTimersByTime(200);

            expect(events.onSelectedSubtitle).not.toHaveBeenCalled();
        });
    });

    it('should play the chosen audio track', async () => {
        const french = { index: 1, labels: [], lang: 'fr', codec: null, audioChannelConfiguration: [] };
        fakePlayer.getTracksFor.mockReturnValue([{ index: 0, labels: [], lang: 'en' }, french]);
        const handle = await startDash(document.createElement('video'), STREAM_URL, createPlayerEventsMock());
        fakePlayer.emit(EVENTS.STREAM_INITIALIZED, {});

        handle.selectAudioTrack(1);

        expect(fakePlayer.setCurrentTrack).toHaveBeenCalledExactlyOnceWith(french);
    });

    it('should give the network speed that the player measured in bits per second, once there is one', async () => {
        const handle = await startDash(document.createElement('video'), STREAM_URL, createPlayerEventsMock());

        expect(handle.getBandwidthEstimate()).toBeUndefined();

        fakePlayer.getAverageThroughput.mockReturnValue(4200);
        expect(handle.getBandwidthEstimate()).toBe(4_200_000);
        expect(fakePlayer.getAverageThroughput).toHaveBeenLastCalledWith('video');
    });

    it('should reset the player when the stream stops', async () => {
        const handle = await startDash(document.createElement('video'), STREAM_URL, createPlayerEventsMock());

        handle.destroy();

        expect(fakePlayer.reset).toHaveBeenCalledOnce();
    });
});
