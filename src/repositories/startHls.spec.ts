import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createPlayerEventsMock } from '../_tests/playerEventsMock';
import { setTextTracks } from '../_tests/textTracks';
import { startHls } from './startHls';

// hls.js is a true external: it needs Media Source Extensions, which the test environment does not have.
const { FakeHls } = vi.hoisted(() => {
    type Handler = (event: string, data: unknown) => void;

    class HlsFake {
        static readonly Events = {
            ERROR: 'hlsError',
            MANIFEST_PARSED: 'hlsManifestParsed',
            LEVEL_SWITCHED: 'hlsLevelSwitched',
            SUBTITLE_TRACKS_UPDATED: 'hlsSubtitleTracksUpdated',
            LEVEL_LOADED: 'hlsLevelLoaded',
            SUBTITLE_TRACK_SWITCH: 'hlsSubtitleTrackSwitch',
            AUDIO_TRACKS_UPDATED: 'hlsAudioTracksUpdated',
            FRAG_LOADED: 'hlsFragLoaded',
        };
        static readonly version = '1.5.17';
        static supported = true;
        static instances: HlsFake[] = [];
        static isSupported = () => HlsFake.supported;

        private readonly handlers = new Map<string, Handler>();
        currentLevel = -1;
        subtitleTrack = 0;
        subtitleDisplay = true;
        audioTrack = 0;
        bandwidthEstimate = Number.NaN;
        loadSource = vi.fn();
        attachMedia = vi.fn();
        destroy = vi.fn();

        constructor() {
            HlsFake.instances.push(this);
        }

        on(event: string, handler: Handler) {
            this.handlers.set(event, handler);
        }

        /** Does what hls.js does when it has something to report. */
        emit(event: string, data: unknown) {
            this.handlers.get(event)?.(event, data);
        }
    }

    return { FakeHls: HlsFake };
});

vi.mock('hls.js', () => ({ default: FakeHls }));

const STREAM_URL = 'https://cdn.example.com/video/master.m3u8';

const lastHls = () => {
    const hls = FakeHls.instances.at(-1);
    if (!hls) {
        throw new Error('hls.js was not started');
    }
    return hls;
};

describe(startHls.name, () => {
    beforeEach(() => {
        FakeHls.supported = true;
        FakeHls.instances = [];
    });

    it('should load the stream in the video element and report the player', async () => {
        const video = document.createElement('video');
        const events = createPlayerEventsMock();

        const handle = await startHls(video, STREAM_URL, events);

        expect(lastHls().loadSource).toHaveBeenCalledExactlyOnceWith(STREAM_URL);
        expect(lastHls().attachMedia).toHaveBeenCalledExactlyOnceWith(video);
        expect(events.onEngine).toHaveBeenCalledExactlyOnceWith('hls.js 1.5.17');
        expect(handle.canSelectRendition).toBe(true);
    });

    it('should report the renditions of the manifest', async () => {
        const events = createPlayerEventsMock();
        await startHls(document.createElement('video'), STREAM_URL, events);

        lastHls().emit(FakeHls.Events.MANIFEST_PARSED, {
            levels: [
                {
                    width: 640,
                    height: 360,
                    bitrate: 800_000,
                    videoCodec: 'avc1.64001e',
                    audioCodec: 'mp4a.40.2',
                    frameRate: 25,
                    uri: 'https://cdn.example.com/video/360p.m3u8',
                },
                { width: 1280, height: 720, bitrate: 2_500_000, videoCodec: undefined, frameRate: 0, uri: '720p.m3u8' },
            ],
            sessionKeys: null,
        });

        expect(events.onRenditions).toHaveBeenCalledExactlyOnceWith([
            {
                width: 640,
                height: 360,
                bitrate: 800_000,
                codecs: 'avc1.64001e, mp4a.40.2',
                frameRate: 25,
                url: 'https://cdn.example.com/video/360p.m3u8',
            },
            { width: 1280, height: 720, bitrate: 2_500_000, codecs: undefined, frameRate: undefined, url: '720p.m3u8' },
        ]);
        expect(events.onInfo).toHaveBeenCalledExactlyOnceWith({ encryption: [] });
    });

    it('should report the keys of the manifest as the encryption of the stream', async () => {
        const events = createPlayerEventsMock();
        await startHls(document.createElement('video'), STREAM_URL, events);

        lastHls().emit(FakeHls.Events.MANIFEST_PARSED, {
            levels: [],
            sessionKeys: [
                { method: 'SAMPLE-AES', keyFormat: 'com.apple.streamingkeydelivery' },
                { method: 'SAMPLE-AES', keyFormat: 'com.apple.streamingkeydelivery' },
            ],
        });

        expect(events.onInfo).toHaveBeenCalledExactlyOnceWith({ encryption: ['SAMPLE-AES (FairPlay)'] });
    });

    it('should report what the playlist of a rendition says about the stream', async () => {
        const events = createPlayerEventsMock();
        await startHls(document.createElement('video'), STREAM_URL, events);

        lastHls().emit(FakeHls.Events.LEVEL_LOADED, {
            details: { live: false, totalduration: 634.5, targetduration: 6, encryptedFragments: [] },
        });

        expect(events.onInfo).toHaveBeenCalledExactlyOnceWith({ isLive: false, duration: 634.5, segmentDuration: 6 });
    });

    it('should report no duration for a live stream, and the key of its segments', async () => {
        const events = createPlayerEventsMock();
        await startHls(document.createElement('video'), STREAM_URL, events);

        lastHls().emit(FakeHls.Events.LEVEL_LOADED, {
            details: {
                live: true,
                totalduration: 30,
                targetduration: 4,
                encryptedFragments: [
                    { levelkeys: { identity: { method: 'AES-128', keyFormat: 'identity' } } },
                    { levelkeys: { identity: { method: 'AES-128', keyFormat: 'identity' } } },
                ],
            },
        });

        expect(events.onInfo).toHaveBeenCalledExactlyOnceWith({
            isLive: true,
            duration: undefined,
            segmentDuration: 4,
            encryption: ['AES-128'],
        });
    });

    it('should report the audio tracks and the one that plays', async () => {
        const events = createPlayerEventsMock();
        await startHls(document.createElement('video'), STREAM_URL, events);
        lastHls().audioTrack = 1;

        lastHls().emit(FakeHls.Events.AUDIO_TRACKS_UPDATED, {
            audioTracks: [
                { name: 'English', lang: 'en', audioCodec: 'mp4a.40.2', channels: '2' },
                { name: '', lang: 'fr' },
                // hls.js gives characters that cannot be shown for `LANGUAGE=""`.
                { name: '', lang: '\u007f\u007f\u007f' },
            ],
        });

        expect(events.onAudioTracks).toHaveBeenCalledExactlyOnceWith(
            [
                { label: 'English', language: 'en', codec: 'mp4a.40.2', channels: '2' },
                { label: 'fr', language: 'fr', codec: undefined, channels: undefined },
                { label: 'unnamed', language: '', codec: undefined, channels: undefined },
            ],
            1,
        );
    });

    it('should report a loaded segment with its size, its time and its HTTP status', async () => {
        const events = createPlayerEventsMock();
        await startHls(document.createElement('video'), STREAM_URL, events);

        lastHls().emit(FakeHls.Events.FRAG_LOADED, {
            frag: {
                url: 'https://cdn.example.com/video/720p.cmfv',
                type: 'main',
                sn: 3,
                stats: { total: 512_000, loaded: 512_000, loading: { start: 1000.2, first: 1040, end: 1120.6 } },
            },
            networkDetails: { status: 206 },
        });
        lastHls().emit(FakeHls.Events.FRAG_LOADED, {
            frag: {
                url: 'https://cdn.example.com/video/audio.cmfa',
                type: 'audio',
                sn: 'initSegment',
                stats: { total: 0, loaded: 900, loading: { start: 0, first: 5, end: 10 } },
            },
            networkDetails: null,
        });

        expect(events.onSegment).toHaveBeenNthCalledWith(1, {
            url: 'https://cdn.example.com/video/720p.cmfv',
            kind: 'video #3',
            bytes: 512_000,
            milliseconds: 120,
            status: 206,
            failed: false,
        });
        expect(events.onSegment).toHaveBeenNthCalledWith(2, {
            url: 'https://cdn.example.com/video/audio.cmfa',
            kind: 'audio init',
            bytes: 900,
            milliseconds: 10,
            status: undefined,
            failed: false,
        });
    });

    it('should report a segment that did not load as failed, with the HTTP status', async () => {
        const events = createPlayerEventsMock();
        await startHls(document.createElement('video'), STREAM_URL, events);

        lastHls().emit(FakeHls.Events.ERROR, {
            type: 'networkError',
            details: 'fragLoadError',
            fatal: false,
            frag: { url: 'https://cdn.example.com/video/720p_4.m4s', type: 'main', sn: 4 },
            response: { code: 404 },
        });

        expect(events.onSegment).toHaveBeenCalledExactlyOnceWith({
            url: 'https://cdn.example.com/video/720p_4.m4s',
            kind: 'video #4',
            status: 404,
            failed: true,
        });
    });

    it('should report no segment for an error that is not about a segment', async () => {
        const events = createPlayerEventsMock();
        await startHls(document.createElement('video'), STREAM_URL, events);

        lastHls().emit(FakeHls.Events.ERROR, { type: 'networkError', details: 'manifestLoadError', fatal: true });

        expect(events.onSegment).not.toHaveBeenCalled();
    });

    it('should report the rendition that the player switched to', async () => {
        const events = createPlayerEventsMock();
        await startHls(document.createElement('video'), STREAM_URL, events);

        lastHls().emit(FakeHls.Events.LEVEL_SWITCHED, { level: 1 });

        expect(events.onPlayingRendition).toHaveBeenCalledExactlyOnceWith(1);
    });

    it('should report the subtitle tracks and keep them off until one is chosen', async () => {
        const events = createPlayerEventsMock();
        await startHls(document.createElement('video'), STREAM_URL, events);

        lastHls().emit(FakeHls.Events.SUBTITLE_TRACKS_UPDATED, {
            subtitleTracks: [{ name: 'English', lang: 'en' }, { lang: 'de' }, {}],
        });

        expect(events.onSubtitles).toHaveBeenCalledExactlyOnceWith([
            { label: 'English', language: 'en' },
            { label: 'de', language: 'de' },
            { label: 'unnamed', language: '' },
        ]);
        expect(events.onLog).toHaveBeenCalledWith('hls.js found 3 subtitle track(s): en, de, ');
        expect(lastHls().subtitleTrack).toBe(-1);
    });

    it('should log an error of the player and say when it is fatal', async () => {
        const events = createPlayerEventsMock();
        await startHls(document.createElement('video'), STREAM_URL, events);

        lastHls().emit(FakeHls.Events.ERROR, { type: 'networkError', details: 'manifestLoadError', fatal: true });
        lastHls().emit(FakeHls.Events.ERROR, { type: 'mediaError', details: 'bufferStalledError', fatal: false });

        expect(events.onLog).toHaveBeenNthCalledWith(1, 'hls.js error: networkError / manifestLoadError (fatal)', true);
        expect(events.onLog).toHaveBeenNthCalledWith(2, 'hls.js error: mediaError / bufferStalledError', true);
    });

    it('should make the player stay on the chosen rendition, and give the choice back with -1', async () => {
        const handle = await startHls(document.createElement('video'), STREAM_URL, createPlayerEventsMock());

        handle.selectRendition(2);
        expect(lastHls().currentLevel).toBe(2);

        handle.selectRendition(-1);
        expect(lastHls().currentLevel).toBe(-1);
    });

    it('should show the chosen subtitle track, and hide the subtitles with -1', async () => {
        const handle = await startHls(document.createElement('video'), STREAM_URL, createPlayerEventsMock());

        handle.selectSubtitle(1);
        expect(lastHls().subtitleTrack).toBe(1);

        handle.selectSubtitle(-1);
        expect(lastHls().subtitleTrack).toBe(-1);
    });

    it('should leave the display of the subtitles on, so a track chosen in the controls of the video is shown', async () => {
        const handle = await startHls(document.createElement('video'), STREAM_URL, createPlayerEventsMock());

        handle.selectSubtitle(-1);

        expect(lastHls().subtitleDisplay).toBe(true);
    });

    it('should report the subtitle track that the player switched to', async () => {
        const events = createPlayerEventsMock();
        await startHls(document.createElement('video'), STREAM_URL, events);

        lastHls().emit(FakeHls.Events.SUBTITLE_TRACK_SWITCH, { id: 2 });
        lastHls().emit(FakeHls.Events.SUBTITLE_TRACK_SWITCH, { id: -1 });

        expect(events.onSelectedSubtitle).toHaveBeenNthCalledWith(1, 2);
        expect(events.onSelectedSubtitle).toHaveBeenNthCalledWith(2, -1);
    });

    it('should play the chosen audio track', async () => {
        const handle = await startHls(document.createElement('video'), STREAM_URL, createPlayerEventsMock());

        handle.selectAudioTrack(2);

        expect(lastHls().audioTrack).toBe(2);
    });

    it('should give the network speed that the player measured, once there is one', async () => {
        const handle = await startHls(document.createElement('video'), STREAM_URL, createPlayerEventsMock());

        expect(handle.getBandwidthEstimate()).toBeUndefined();

        lastHls().bandwidthEstimate = 4_200_000;
        expect(handle.getBandwidthEstimate()).toBe(4_200_000);
    });

    it('should destroy the player when the stream stops', async () => {
        const handle = await startHls(document.createElement('video'), STREAM_URL, createPlayerEventsMock());

        handle.destroy();

        expect(lastHls().destroy).toHaveBeenCalledOnce();
    });

    describe('when the browser has no Media Source Extensions', () => {
        beforeEach(() => {
            FakeHls.supported = false;
        });

        it('should let the browser play the stream, without a choice of rendition', async () => {
            const video = document.createElement('video');
            const events = createPlayerEventsMock();

            const handle = await startHls(video, STREAM_URL, events);

            expect(FakeHls.instances).toHaveLength(0);
            expect(video.src).toBe(STREAM_URL);
            expect(events.onEngine).toHaveBeenCalledExactlyOnceWith('the browser (native HLS)');
            expect(handle.canSelectRendition).toBe(false);
            expect(handle.getBandwidthEstimate()).toBeUndefined();
        });

        it('should report the text tracks of the video once its metadata is loaded', async () => {
            const video = document.createElement('video');
            const events = createPlayerEventsMock();
            setTextTracks(video, [
                { label: 'English', language: 'en', mode: 'disabled' },
                { label: '', language: 'fr', mode: 'disabled' },
            ]);
            await startHls(video, STREAM_URL, events);

            video.dispatchEvent(new Event('loadedmetadata'));

            expect(events.onSubtitles).toHaveBeenCalledExactlyOnceWith([
                { label: 'English', language: 'en' },
                { label: 'fr', language: 'fr' },
            ]);
        });

        it('should show only the chosen text track', async () => {
            const video = document.createElement('video');
            const { tracks: textTracks } = setTextTracks(video, [
                { label: 'English', language: 'en', mode: 'disabled' },
                { label: 'French', language: 'fr', mode: 'disabled' },
            ]);
            const handle = await startHls(video, STREAM_URL, createPlayerEventsMock());
            video.dispatchEvent(new Event('loadedmetadata'));

            handle.selectSubtitle(1);
            expect(textTracks.map((track) => track.mode)).toEqual(['disabled', 'showing']);

            handle.selectSubtitle(-1);
            expect(textTracks.map((track) => track.mode)).toEqual(['disabled', 'disabled']);
        });

        it('should report a track chosen in the controls of the video', async () => {
            vi.useFakeTimers();
            const video = document.createElement('video');
            const events = createPlayerEventsMock();
            const textTracks = setTextTracks(video, [
                { label: 'English', language: 'en', mode: 'disabled' },
                { label: 'French', language: 'fr', mode: 'disabled' },
            ]);
            await startHls(video, STREAM_URL, events);

            textTracks.tracks[1].mode = 'showing';
            textTracks.change();
            vi.advanceTimersByTime(200);

            expect(events.onSelectedSubtitle).toHaveBeenCalledExactlyOnceWith(1);
            vi.useRealTimers();
        });

        it('should free the video element when the stream stops', async () => {
            const video = document.createElement('video');
            const handle = await startHls(video, STREAM_URL, createPlayerEventsMock());

            handle.destroy();

            expect(video.hasAttribute('src')).toBe(false);
        });
    });
});
