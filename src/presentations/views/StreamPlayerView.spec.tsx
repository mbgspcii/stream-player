import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StreamPlayerView } from './StreamPlayerView';
import { PlayerHandleDummy } from '../../_tests/PlayerHandleDummy';
import { RenditionDummy } from '../../_tests/RenditionDummy';
import { startDash } from '../../repositories/startDash';
import { startHls } from '../../repositories/startHls';
import type { PlayerEvents } from '../../models/Player';

// The specs open the page with no stream, except the one about the default stream.
const defaultStream = vi.hoisted(() => ({ url: '' }));
vi.mock(import('../../helpers/defaultStream'), () => ({
    get DEFAULT_STREAM_URL() {
        return defaultStream.url;
    },
}));

// The adapters load dash.js and hls.js, which cannot play in the test environment.
vi.mock(import('../../repositories/startDash'), () => ({ startDash: vi.fn() }));
vi.mock(import('../../repositories/startHls'), () => ({ startHls: vi.fn() }));

const HLS_URL = 'https://cdn.example.com/video/master.m3u8';
const DASH_URL = 'https://cdn.example.com/video/master.mpd';

/** The callbacks that the page gave to the adapter on its last start. */
const lastEvents = (start: typeof startHls): PlayerEvents => {
    const call = vi.mocked(start).mock.calls.at(-1);
    if (!call) {
        throw new Error('the player was not started');
    }
    return call[2];
};

const urlInput = () => screen.getByRole('textbox', { name: 'URL of the manifest' });

const loadStream = async (url: string) => {
    await userEvent.type(urlInput(), url);
    await userEvent.click(screen.getByRole('button', { name: 'Load' }));
};

describe(StreamPlayerView.name, () => {
    let handle = PlayerHandleDummy.create();

    beforeEach(() => {
        window.history.replaceState(null, '', '/');
        defaultStream.url = '';
        handle = PlayerHandleDummy.create();
        vi.mocked(startHls).mockResolvedValue(handle);
        vi.mocked(startDash).mockResolvedValue(handle);
    });

    it('should wait for a stream when the page opens without one', () => {
        render(<StreamPlayerView />);

        expect(urlInput()).toHaveValue('');
        expect(screen.getByText('none')).toBeInTheDocument();
        expect(screen.getByText('Load a stream to see the renditions of its manifest.')).toBeInTheDocument();
        expect(screen.getByText('Load a stream to see its subtitle tracks.')).toBeInTheDocument();
        expect(startHls).not.toHaveBeenCalled();
    });

    it('should show the type of the stream while the URL is typed, without asking for it', async () => {
        render(<StreamPlayerView />);

        await userEvent.type(urlInput(), DASH_URL);

        expect(within(screen.getByTestId('type-row')).getByText('DASH')).toBeInTheDocument();
        expect(screen.queryByRole('radiogroup', { name: 'Type of the stream' })).not.toBeInTheDocument();
    });

    it('should ask for the type only while the extension of the URL does not give it', async () => {
        render(<StreamPlayerView />);

        await userEvent.type(urlInput(), 'https://cdn.example.com/video/master');

        expect(screen.getByRole('radiogroup', { name: 'Type of the stream' })).toBeInTheDocument();
        expect(screen.queryByRole('radio', { name: /^Auto/ })).not.toBeInTheDocument();

        await userEvent.type(urlInput(), '.mpd');

        expect(screen.queryByRole('radiogroup', { name: 'Type of the stream' })).not.toBeInTheDocument();
    });

    it('should load the typed stream and put it in the address of the page', async () => {
        render(<StreamPlayerView />);

        await loadStream(HLS_URL);

        expect(startHls).toHaveBeenCalledExactlyOnceWith(expect.any(HTMLVideoElement), HLS_URL, expect.any(Object));
        expect(window.location.search).toBe(`?stream=${encodeURIComponent(HLS_URL)}`);
        expect(screen.getByText('HLS')).toBeInTheDocument();
        expect(screen.getByText(`loading ${HLS_URL}`, { exact: false })).toBeInTheDocument();
    });

    it('should load the stream of the address of the page when the page opens', async () => {
        window.history.replaceState(null, '', `/?stream=${DASH_URL}`);

        render(<StreamPlayerView />);

        await waitFor(() => expect(startDash).toHaveBeenCalledOnce());
        expect(startDash).toHaveBeenCalledWith(expect.any(HTMLVideoElement), DASH_URL, expect.any(Object));
        expect(urlInput()).toHaveValue(DASH_URL);
    });

    it('should load the default stream when the address of the page gives none, and leave the address as it is', async () => {
        defaultStream.url = DASH_URL;

        render(<StreamPlayerView />);

        await waitFor(() => expect(startDash).toHaveBeenCalledOnce());
        expect(startDash).toHaveBeenCalledWith(expect.any(HTMLVideoElement), DASH_URL, expect.any(Object));
        expect(urlInput()).toHaveValue(DASH_URL);
        expect(window.location.search).toBe('');
    });

    it('should load the stream of the address rather than the default one', async () => {
        defaultStream.url = DASH_URL;
        window.history.replaceState(null, '', `/?stream=${HLS_URL}`);

        render(<StreamPlayerView />);

        await waitFor(() => expect(startHls).toHaveBeenCalledOnce());
        expect(startDash).not.toHaveBeenCalled();
        expect(urlInput()).toHaveValue(HLS_URL);
    });

    it('should play a URL without a known extension as HLS, unless DASH is chosen', async () => {
        render(<StreamPlayerView />);

        await loadStream('https://cdn.example.com/play/abc123');

        expect(startHls).toHaveBeenCalledOnce();
        expect(startDash).not.toHaveBeenCalled();

        await userEvent.click(screen.getByRole('radio', { name: 'DASH' }));
        await userEvent.click(screen.getByRole('button', { name: 'Load' }));

        expect(startDash).toHaveBeenCalledExactlyOnceWith(
            expect.any(HTMLVideoElement),
            'https://cdn.example.com/play/abc123',
            expect.any(Object),
        );
    });

    it('should say that the type is unknown for a stream of the address without a known extension, and ask for it', async () => {
        window.history.replaceState(null, '', '/?stream=https://cdn.example.com/play/abc123');

        render(<StreamPlayerView />);

        expect(
            await screen.findByText(/unknown type: the path ends with neither \.mpd nor \.m3u8/),
        ).toBeInTheDocument();
        expect(startHls).not.toHaveBeenCalled();
        expect(startDash).not.toHaveBeenCalled();
        expect(within(screen.getByTestId('type-row')).getByText('unknown')).toBeInTheDocument();
        expect(screen.getByRole('radiogroup', { name: 'Type of the stream' })).toBeInTheDocument();
    });

    it('should list the renditions, mark the one on screen and force the pressed one', async () => {
        render(<StreamPlayerView />);
        await loadStream(HLS_URL);

        act(() => {
            const events = lastEvents(startHls);
            events.onEngine('hls.js 1.5.17');
            events.onRenditions([
                RenditionDummy.create({ width: 640, height: 360, bitrate: 800_000 }),
                RenditionDummy.create({ width: 1280, height: 720, bitrate: 2_500_000 }),
            ]);
            events.onPlayingRendition(1);
        });

        expect(screen.getByText('played with hls.js 1.5.17')).toBeInTheDocument();
        expect(screen.getByText('(2)')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Auto' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '1280x720, 2500 kb/s, playing' })).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: '640x360, 800 kb/s' }));

        expect(handle.selectRendition).toHaveBeenCalledExactlyOnceWith(0);
        expect(screen.getByText(/rendition forced: 640x360 \(800 kb\/s\)/)).toBeInTheDocument();
    });

    it('should say when the stream has no rendition and no subtitle track', async () => {
        render(<StreamPlayerView />);
        await loadStream(HLS_URL);

        act(() => lastEvents(startHls).onRenditions([]));

        expect(screen.getByText('The player found no video rendition in this stream.')).toBeInTheDocument();
        expect(screen.getByText('The player found no subtitle track in this stream.')).toBeInTheDocument();
        expect(screen.getByText('(0 tracks)')).toBeInTheDocument();
    });

    it('should list the subtitle tracks and show the pressed one', async () => {
        render(<StreamPlayerView />);
        await loadStream(HLS_URL);

        act(() => lastEvents(startHls).onSubtitles([{ label: 'English', language: 'en' }]));

        expect(screen.getByText('(1 track)')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Off' })).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'English, en' }));

        expect(handle.selectSubtitle).toHaveBeenCalledExactlyOnceWith(0);
        expect(screen.getByText(/subtitles: English \(en\)/)).toBeInTheDocument();
    });

    it('should keep the buttons of the renditions short, and give the frame rate and the codecs of the one on screen', async () => {
        render(<StreamPlayerView />);
        await loadStream(HLS_URL);

        act(() => {
            lastEvents(startHls).onRenditions([
                RenditionDummy.create({
                    width: 640,
                    height: 360,
                    bitrate: 800_000,
                    frameRate: 25,
                    codecs: 'avc1.64001e',
                }),
            ]);
            lastEvents(startHls).onPlayingRendition(0);
        });

        expect(screen.getByRole('button', { name: '640x360, 800 kb/s, playing' })).toBeInTheDocument();
        expect(
            await within(await screen.findByRole('list', { name: 'Statistics' })).findByText(
                '640x360 · 800 kb/s · 25 fps · avc1.64001e',
            ),
        ).toBeInTheDocument();
    });

    it('should list the audio tracks and play the pressed one', async () => {
        render(<StreamPlayerView />);
        await loadStream(HLS_URL);

        act(() =>
            lastEvents(startHls).onAudioTracks(
                [
                    { label: 'English', language: 'en', codec: 'mp4a.40.2', channels: '2' },
                    { label: 'French', language: 'fr' },
                ],
                0,
            ),
        );

        expect(screen.getByText('(2 tracks)')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'English, en · mp4a.40.2 · 2 ch' })).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'French, fr' }));

        expect(handle.selectAudioTrack).toHaveBeenCalledExactlyOnceWith(1);
        expect(screen.getByText(/audio: French \(fr\)/)).toBeInTheDocument();
    });

    it('should show a single audio track as a line of the stream, not as a choice', async () => {
        render(<StreamPlayerView />);
        await loadStream(HLS_URL);

        act(() =>
            lastEvents(startHls).onAudioTracks(
                [{ label: 'Alternate Audio', language: ' ', codec: 'mp4a.40.2', channels: '2' }],
                0,
            ),
        );

        expect(screen.queryByRole('group', { name: 'Audio' })).not.toBeInTheDocument();
        expect(
            within(screen.getByRole('list', { name: 'Stream' })).getByText('Alternate Audio · mp4a.40.2 · 2 ch'),
        ).toBeInTheDocument();
    });

    it('should write once the language of a single audio track that has no name of its own', async () => {
        render(<StreamPlayerView />);
        await loadStream(HLS_URL);

        act(() => lastEvents(startHls).onAudioTracks([{ label: 'en', language: 'en', codec: 'mp4a.40.2' }], 0));

        expect(within(screen.getByRole('list', { name: 'Stream' })).getByText('en · mp4a.40.2')).toBeInTheDocument();
    });

    it('should show what the manifest says about the stream, and draw the eye to its encryption', async () => {
        render(<StreamPlayerView />);
        await loadStream(HLS_URL);

        act(() =>
            lastEvents(startHls).onInfo({
                isLive: false,
                duration: 634.5,
                segmentDuration: 6,
                encryption: ['Widevine'],
            }),
        );

        const facts = within(screen.getByRole('list', { name: 'Stream' })).getAllByRole('listitem');
        expect(facts.map((fact) => fact.textContent)).toEqual([
            'KindOn demand',
            'Duration10:35',
            'Longest segment6 s',
            'Audiono track of its own: the sound, if any, is in the video segments',
            'EncryptionWidevine',
        ]);
        expect(screen.getByText('Widevine').className).toContain('text-warning');
    });

    it('should say that a live stream has no duration and that the stream is not encrypted', async () => {
        render(<StreamPlayerView />);
        await loadStream(HLS_URL);

        act(() => lastEvents(startHls).onInfo({ isLive: true, encryption: [] }));

        const facts = within(screen.getByRole('list', { name: 'Stream' })).getAllByRole('listitem');
        expect(facts.map((fact) => fact.textContent)).toEqual([
            'KindLive',
            'Durationnone: the stream is live',
            'Longest segmentnot given by the manifest',
            'Audiono track of its own: the sound, if any, is in the video segments',
            'Encryptionnone',
        ]);
    });

    it('should list the segments that the player asks for, with a failed one marked', async () => {
        render(<StreamPlayerView />);
        await loadStream(HLS_URL);

        expect(screen.getByText('No segment was requested yet. Press play.')).toBeInTheDocument();

        act(() => {
            lastEvents(startHls).onSegment({
                url: 'https://cdn.example.com/video/720p/segment_1.m4s',
                kind: 'video',
                bytes: 512_000,
                milliseconds: 120,
                status: 200,
                failed: false,
            });
            lastEvents(startHls).onSegment({
                url: 'https://cdn.example.com/video/720p/segment_2.m4s',
                kind: 'video',
                status: 404,
                failed: true,
            });
        });

        const segments = within(screen.getByRole('log', { name: 'Segments' }));
        expect(segments.getByText(/HTTP 200 · video · 512 kB · 120 ms · 720p\/segment_1\.m4s/)).toBeInTheDocument();
        expect(segments.getByText(/HTTP 404 · video · 720p\/segment_2\.m4s/).className).toContain('text-error');
    });

    it('should show the statistics of the stream once one is loaded', async () => {
        vi.mocked(handle.getBandwidthEstimate).mockReturnValue(4_200_000);
        render(<StreamPlayerView />);

        expect(screen.getByText('Load a stream to see how it plays.')).toBeInTheDocument();

        await loadStream(HLS_URL);
        act(() => {
            lastEvents(startHls).onRenditions([
                RenditionDummy.create({ width: 1280, height: 720, bitrate: 2_500_000 }),
            ]);
            lastEvents(startHls).onPlayingRendition(0);
        });

        const facts = within(await screen.findByRole('list', { name: 'Statistics' }));
        expect(facts.getByText('1280x720 · 2500 kb/s')).toBeInTheDocument();
        expect(facts.getByText('Rendition switches')).toBeInTheDocument();
        expect(facts.getByText('Stalls')).toBeInTheDocument();
    });

    it('should offer the text of the manifest of the loaded stream', async () => {
        render(<StreamPlayerView />);

        expect(screen.getByText('Load a stream to read the text of its manifest.')).toBeInTheDocument();

        await loadStream(HLS_URL);

        expect(screen.getByRole('button', { name: 'Show the manifest' })).toBeInTheDocument();
    });

    it('should not let a rendition be chosen when the browser plays the stream itself', async () => {
        vi.mocked(startHls).mockResolvedValue(PlayerHandleDummy.create({ canSelectRendition: false }));
        render(<StreamPlayerView />);
        await loadStream(HLS_URL);

        act(() => lastEvents(startHls).onRenditions([RenditionDummy.create()]));

        expect(screen.getByRole('button', { name: '1280x720, 2149 kb/s' })).toBeDisabled();
    });
});
