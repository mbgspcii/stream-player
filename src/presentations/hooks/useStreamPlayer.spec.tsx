import { act, renderHook } from '@testing-library/react';
import { type RefObject } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PlayerHandleDummy } from '../../_tests/PlayerHandleDummy';
import { RenditionDummy } from '../../_tests/RenditionDummy';
import { startDash } from '../../repositories/startDash';
import { startHls } from '../../repositories/startHls';
import type { PlayerEvents, PlayerHandle } from '../../models/Player';
import { MAX_SEGMENTS, useStreamPlayer } from './useStreamPlayer';

// The adapters load dash.js and hls.js, which cannot play in the test environment.
vi.mock(import('../../repositories/startDash'), () => ({ startDash: vi.fn() }));
vi.mock(import('../../repositories/startHls'), () => ({ startHls: vi.fn() }));

const HLS_URL = 'https://cdn.example.com/video/master.m3u8';
const DASH_URL = 'https://cdn.example.com/video/master.mpd';

const renderPlayer = () => {
    const videoRef: RefObject<HTMLVideoElement> = { current: document.createElement('video') };
    return { ...renderHook(() => useStreamPlayer(videoRef)), video: videoRef.current };
};

/** The callbacks that the hook gave to the adapter on its last start. */
const lastEvents = (start: typeof startHls): PlayerEvents => {
    const call = vi.mocked(start).mock.calls.at(-1);
    if (!call) {
        throw new Error('the player was not started');
    }
    return call[2];
};

const messages = (log: { message: string }[]) => log.map((line) => line.message);

describe(useStreamPlayer.name, () => {
    let handle = PlayerHandleDummy.create();

    beforeEach(() => {
        handle = PlayerHandleDummy.create();
        vi.mocked(startHls).mockResolvedValue(handle);
        vi.mocked(startDash).mockResolvedValue(handle);
    });

    it('should start with nothing loaded', () => {
        const { result } = renderPlayer();

        expect(result.current.state.isLoaded).toBe(false);
        expect(result.current.state.renditions).toBeUndefined();
        expect(result.current.log).toEqual([]);
    });

    it('should play an .m3u8 URL with the HLS player', async () => {
        const { result, video } = renderPlayer();

        await act(() => result.current.load(HLS_URL));

        expect(startHls).toHaveBeenCalledExactlyOnceWith(video, HLS_URL, expect.any(Object));
        expect(startDash).not.toHaveBeenCalled();
        expect(result.current.state).toMatchObject({ isLoaded: true, type: 'hls', canSelectRendition: true });
        expect(messages(result.current.log)).toEqual([`loading ${HLS_URL}`]);
    });

    it('should play an .mpd URL with the DASH player', async () => {
        const { result, video } = renderPlayer();

        await act(() => result.current.load(DASH_URL));

        expect(startDash).toHaveBeenCalledExactlyOnceWith(video, DASH_URL, expect.any(Object));
        expect(result.current.state.type).toBe('dash');
    });

    it('should use the forced type when the URL does not give it', async () => {
        const { result } = renderPlayer();

        await act(() => result.current.load('https://cdn.example.com/video/manifest', 'dash'));

        expect(startDash).toHaveBeenCalledOnce();
        expect(result.current.state.type).toBe('dash');
    });

    it('should not start a player and should log an error when the type is unknown', async () => {
        const { result } = renderPlayer();

        await act(() => result.current.load('https://cdn.example.com/video/manifest'));

        expect(startHls).not.toHaveBeenCalled();
        expect(startDash).not.toHaveBeenCalled();
        expect(result.current.state).toMatchObject({ isLoaded: true, type: undefined });
        expect(result.current.log.at(-1)).toMatchObject({
            message: 'unknown type: the path ends with neither .mpd nor .m3u8. Choose the type in the list.',
            isError: true,
        });
    });

    it('should keep what the player reports and write it in the log', async () => {
        const { result } = renderPlayer();
        const renditions = [
            RenditionDummy.create({ width: 640, height: 360, bitrate: 800_000 }),
            RenditionDummy.create({ width: 1280, height: 720, bitrate: 2_500_000 }),
        ];
        const subtitles = [{ label: 'English', language: 'en' }];
        await act(() => result.current.load(HLS_URL));

        act(() => {
            const events = lastEvents(startHls);
            events.onEngine('hls.js 1.5.17');
            events.onRenditions(renditions);
            events.onPlayingRendition(1);
            events.onSubtitles(subtitles);
            events.onLog('something failed', true);
        });

        expect(result.current.state).toMatchObject({
            engine: 'hls.js 1.5.17',
            renditions,
            playingRendition: 1,
            subtitles,
            selectedSubtitle: -1,
        });
        expect(messages(result.current.log)).toEqual([
            `loading ${HLS_URL}`,
            '2 rendition(s): 640x360 (800 kb/s), 1280x720 (2500 kb/s)',
            'playing 1280x720 (2500 kb/s)',
            'something failed',
        ]);
        expect(result.current.log.at(-1)?.isError).toBe(true);
    });

    it('should force a rendition on the player, and go back to automatic with -1', async () => {
        const { result } = renderPlayer();
        await act(() => result.current.load(HLS_URL));
        act(() =>
            lastEvents(startHls).onRenditions([RenditionDummy.create({ width: 640, height: 360, bitrate: 800_000 })]),
        );

        act(() => result.current.selectRendition(0));

        expect(handle.selectRendition).toHaveBeenLastCalledWith(0);
        expect(result.current.state.selectedRendition).toBe(0);
        expect(result.current.log.at(-1)?.message).toBe('rendition forced: 640x360 (800 kb/s)');

        act(() => result.current.selectRendition(-1));

        expect(handle.selectRendition).toHaveBeenLastCalledWith(-1);
        expect(result.current.state.selectedRendition).toBe(-1);
        expect(result.current.log.at(-1)?.message).toBe('rendition: auto');
    });

    it('should show a subtitle track on the player, and hide the subtitles with -1', async () => {
        const { result } = renderPlayer();
        await act(() => result.current.load(HLS_URL));
        act(() => lastEvents(startHls).onSubtitles([{ label: 'English', language: 'en' }]));

        act(() => result.current.selectSubtitle(0));

        expect(handle.selectSubtitle).toHaveBeenLastCalledWith(0);
        expect(result.current.state.selectedSubtitle).toBe(0);
        expect(result.current.log.at(-1)?.message).toBe('subtitles: English (en)');

        act(() => result.current.selectSubtitle(-1));

        expect(handle.selectSubtitle).toHaveBeenLastCalledWith(-1);
        expect(result.current.log.at(-1)?.message).toBe('subtitles off');
    });

    it('should follow a subtitle track chosen in the controls of the video, and write it in the log', async () => {
        const { result } = renderPlayer();
        await act(() => result.current.load(HLS_URL));
        act(() => lastEvents(startHls).onSubtitles([{ label: 'English', language: 'en' }]));

        act(() => lastEvents(startHls).onSelectedSubtitle(0));

        expect(result.current.state.selectedSubtitle).toBe(0);
        expect(result.current.log.at(-1)?.message).toBe('subtitles: English (en), chosen in the controls of the video');
        // The player follows the video by itself: the page does not ask it again.
        expect(handle.selectSubtitle).not.toHaveBeenCalled();

        act(() => lastEvents(startHls).onSelectedSubtitle(-1));

        expect(result.current.state.selectedSubtitle).toBe(-1);
        expect(result.current.log.at(-1)?.message).toBe('subtitles off, chosen in the controls of the video');
    });

    it('should not write twice a subtitle choice that the page made and the player reports back', async () => {
        const { result } = renderPlayer();
        await act(() => result.current.load(HLS_URL));
        act(() => lastEvents(startHls).onSubtitles([{ label: 'English', language: 'en' }]));
        act(() => result.current.selectSubtitle(0));
        const logLength = result.current.log.length;

        act(() => lastEvents(startHls).onSelectedSubtitle(0));

        expect(result.current.log).toHaveLength(logLength);
        expect(result.current.log.at(-1)?.message).toBe('subtitles: English (en)');
    });

    it('should keep the audio tracks, play the chosen one and write it in the log', async () => {
        const { result } = renderPlayer();
        const audioTracks = [
            { label: 'English', language: 'en' },
            { label: 'French', language: 'fr' },
        ];
        await act(() => result.current.load(HLS_URL));

        act(() => lastEvents(startHls).onAudioTracks(audioTracks, 0));

        expect(result.current.state).toMatchObject({ audioTracks, selectedAudioTrack: 0 });

        act(() => result.current.selectAudioTrack(1));

        expect(handle.selectAudioTrack).toHaveBeenCalledExactlyOnceWith(1);
        expect(result.current.state.selectedAudioTrack).toBe(1);
        expect(result.current.log.at(-1)?.message).toBe('audio: French (fr)');
    });

    it('should add each part of the information on the stream to what it had', async () => {
        const { result } = renderPlayer();
        await act(() => result.current.load(HLS_URL));

        act(() => {
            lastEvents(startHls).onInfo({ encryption: ['AES-128'] });
            lastEvents(startHls).onInfo({ isLive: false, duration: 634.5, segmentDuration: 6 });
        });

        expect(result.current.state.info).toEqual({
            encryption: ['AES-128'],
            isLive: false,
            duration: 634.5,
            segmentDuration: 6,
        });
    });

    it('should keep the last segments only, the oldest first', async () => {
        const { result } = renderPlayer();
        await act(() => result.current.load(HLS_URL));

        act(() => {
            for (let index = 1; index <= MAX_SEGMENTS + 5; index++) {
                lastEvents(startHls).onSegment({
                    url: `https://cdn.example.com/video/segment_${index}.m4s`,
                    kind: 'video',
                    status: 200,
                    failed: false,
                });
            }
        });

        const { segments } = result.current.state;
        expect(segments).toHaveLength(MAX_SEGMENTS);
        expect(segments[0].url).toBe('https://cdn.example.com/video/segment_6.m4s');
        expect(segments.at(-1)).toMatchObject({
            url: `https://cdn.example.com/video/segment_${MAX_SEGMENTS + 5}.m4s`,
            kind: 'video',
            status: 200,
            failed: false,
        });
        expect(new Set(segments.map((segment) => segment.id)).size).toBe(MAX_SEGMENTS);
    });

    it('should count a change of the rendition on screen, but not the first rendition nor the same one again', async () => {
        const { result } = renderPlayer();
        await act(() => result.current.load(HLS_URL));
        act(() => lastEvents(startHls).onRenditions([RenditionDummy.create(), RenditionDummy.create()]));

        act(() => lastEvents(startHls).onPlayingRendition(0));
        expect(result.current.state.renditionSwitches).toBe(0);

        act(() => lastEvents(startHls).onPlayingRendition(0));
        expect(result.current.state.renditionSwitches).toBe(0);

        act(() => lastEvents(startHls).onPlayingRendition(1));
        act(() => lastEvents(startHls).onPlayingRendition(0));
        expect(result.current.state.renditionSwitches).toBe(2);
    });

    it('should give the network speed that the player measured, and nothing without a player', async () => {
        const { result } = renderPlayer();

        expect(result.current.getBandwidthEstimate()).toBeUndefined();

        vi.mocked(handle.getBandwidthEstimate).mockReturnValue(4_200_000);
        await act(() => result.current.load(HLS_URL));

        expect(result.current.getBandwidthEstimate()).toBe(4_200_000);
    });

    it('should stop the previous stream and forget what it reported when another one is loaded', async () => {
        const { result } = renderPlayer();
        await act(() => result.current.load(HLS_URL));
        act(() => {
            lastEvents(startHls).onRenditions([RenditionDummy.create()]);
            lastEvents(startHls).onSubtitles([{ label: 'English', language: 'en' }]);
        });
        const nextHandle = PlayerHandleDummy.create();
        vi.mocked(startDash).mockResolvedValue(nextHandle);

        await act(() => result.current.load(DASH_URL));

        expect(handle.destroy).toHaveBeenCalledOnce();
        expect(nextHandle.destroy).not.toHaveBeenCalled();
        expect(result.current.state).toMatchObject({
            url: DASH_URL,
            type: 'dash',
            renditions: undefined,
            subtitles: [],
            audioTracks: [],
            info: {},
            segments: [],
            renditionSwitches: 0,
        });
    });

    it('should ignore what an older stream reports after a newer one was loaded', async () => {
        const { result } = renderPlayer();
        await act(() => result.current.load(HLS_URL));
        const olderEvents = lastEvents(startHls);
        await act(() => result.current.load(DASH_URL));

        act(() => {
            olderEvents.onRenditions([RenditionDummy.create()]);
            olderEvents.onLog('late message');
        });

        expect(result.current.state.renditions).toBeUndefined();
        expect(messages(result.current.log)).toEqual([`loading ${HLS_URL}`, `loading ${DASH_URL}`]);
    });

    it('should destroy a player that finished starting after a newer stream was loaded', async () => {
        const { result } = renderPlayer();
        let finishSlowStart: (handle: PlayerHandle) => void = () => undefined;
        vi.mocked(startHls).mockReturnValue(
            new Promise((resolve) => {
                finishSlowStart = resolve;
            }),
        );
        const slowHandle = PlayerHandleDummy.create({ canSelectRendition: false });

        await act(async () => {
            void result.current.load(HLS_URL);
            await result.current.load(DASH_URL);
            finishSlowStart(slowHandle);
        });

        expect(slowHandle.destroy).toHaveBeenCalledOnce();
        expect(handle.destroy).not.toHaveBeenCalled();
        expect(result.current.state).toMatchObject({ type: 'dash', canSelectRendition: true });
    });

    it('should log an error when the player does not start', async () => {
        const { result } = renderPlayer();
        vi.mocked(startHls).mockRejectedValue(new Error('the library did not load'));

        await act(() => result.current.load(HLS_URL));

        expect(result.current.log.at(-1)).toMatchObject({
            message: 'the player did not start: the library did not load',
            isError: true,
        });
    });

    it('should stop the stream when the page goes away', async () => {
        const { result, unmount } = renderPlayer();
        await act(() => result.current.load(HLS_URL));

        unmount();

        expect(handle.destroy).toHaveBeenCalledOnce();
    });
});
