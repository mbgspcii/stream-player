import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RenditionDummy } from '../../_tests/RenditionDummy';

import { ManifestPanel } from './ManifestPanel';

const MANIFEST_URL = 'https://cdn.example.com/video/master.m3u8';
const PLAYLIST_URL = 'https://cdn.example.com/video/720p.m3u8';

const textResponse = (text: string, status = 200) => new Response(text, { status });

describe(ManifestPanel.name, () => {
    const fetchMock = vi.fn<typeof fetch>();

    beforeEach(() => {
        fetchMock.mockReset();
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('should not ask for the manifest before the user opens it', () => {
        render(<ManifestPanel url={MANIFEST_URL} renditions={[]} />);

        expect(screen.getByRole('button', { name: 'Show the manifest' })).toBeInTheDocument();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should show the text of the manifest once opened, without sending a referrer', async () => {
        fetchMock.mockResolvedValue(textResponse('#EXTM3U\n#EXT-X-VERSION:6'));
        render(<ManifestPanel url={MANIFEST_URL} renditions={[]} />);

        await userEvent.click(screen.getByRole('button', { name: 'Show the manifest' }));

        expect(await screen.findByText(/#EXTM3U/)).toHaveTextContent('#EXTM3U #EXT-X-VERSION:6');
        expect(fetchMock).toHaveBeenCalledExactlyOnceWith(MANIFEST_URL, { referrerPolicy: 'no-referrer' });
        expect(screen.getByText(MANIFEST_URL)).toBeInTheDocument();
    });

    it('should hide the text again', async () => {
        fetchMock.mockResolvedValue(textResponse('#EXTM3U'));
        render(<ManifestPanel url={MANIFEST_URL} renditions={[]} />);
        await userEvent.click(screen.getByRole('button', { name: 'Show the manifest' }));
        await screen.findByText('#EXTM3U');

        await userEvent.click(screen.getByRole('button', { name: 'Hide the manifest' }));

        expect(screen.queryByText('#EXTM3U')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Show the manifest' })).toBeInTheDocument();
    });

    it('should say why the file did not load', async () => {
        fetchMock.mockResolvedValue(textResponse('Forbidden', 403));
        render(<ManifestPanel url={MANIFEST_URL} renditions={[]} />);

        await userEvent.click(screen.getByRole('button', { name: 'Show the manifest' }));

        expect(await screen.findByText('The file did not load: HTTP 403')).toBeInTheDocument();
    });

    it('should say when the request itself failed', async () => {
        fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
        render(<ManifestPanel url={MANIFEST_URL} renditions={[]} />);

        await userEvent.click(screen.getByRole('button', { name: 'Show the manifest' }));

        expect(await screen.findByText('The file did not load: Failed to fetch')).toBeInTheDocument();
    });

    it('should offer no other file for renditions without a playlist of their own', async () => {
        fetchMock.mockResolvedValue(textResponse('<MPD />'));
        render(<ManifestPanel url="https://cdn.example.com/video/master.mpd" renditions={[RenditionDummy.create()]} />);

        await userEvent.click(screen.getByRole('button', { name: 'Show the manifest' }));
        await screen.findByText('<MPD />');

        expect(screen.queryByRole('group', { name: 'File to show' })).not.toBeInTheDocument();
    });

    it('should show the playlist of the chosen rendition', async () => {
        fetchMock.mockImplementation(async (input) =>
            textResponse(input === PLAYLIST_URL ? '#EXT-X-TARGETDURATION:7' : '#EXTM3U'),
        );
        render(
            <ManifestPanel
                url={MANIFEST_URL}
                renditions={[
                    RenditionDummy.create({ width: 1280, height: 720, bitrate: 2_500_000, url: PLAYLIST_URL }),
                ]}
            />,
        );
        await userEvent.click(screen.getByRole('button', { name: 'Show the manifest' }));
        await screen.findByText('#EXTM3U');

        await userEvent.click(screen.getByRole('button', { name: '1280x720, 2500 kb/s' }));

        expect(await screen.findByText('#EXT-X-TARGETDURATION:7')).toBeInTheDocument();
        expect(fetchMock).toHaveBeenLastCalledWith(PLAYLIST_URL, { referrerPolicy: 'no-referrer' });
        expect(screen.getByText(PLAYLIST_URL)).toBeInTheDocument();
    });

    it('should wait for a stream', () => {
        render(<ManifestPanel url="" renditions={[]} />);

        expect(screen.getByText('Load a stream to read the text of its manifest.')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Show the manifest' })).not.toBeInTheDocument();
    });
});
