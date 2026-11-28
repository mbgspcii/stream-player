import { useEffect, useState } from 'react';

import { Button } from './Button';
import { ChoiceList } from './ChoiceList';
import { Hint } from './Hint';
import { Panel } from './Panel';
import { formatBitrate, formatResolution } from '../../helpers/format';
import type { Rendition } from '../../models/Stream';
import { fetchManifestText } from '../../repositories/fetchManifestText';

type ManifestPanelProps = {
    /** The URL of the manifest. Empty while no stream is loaded. */
    url: string;
    /** HLS: the renditions that have a playlist of their own. */
    renditions: Rendition[];
};

type FileState = { status: 'loading' } | { status: 'loaded'; text: string } | { status: 'failed'; reason: string };

/**
 * Shows the text of the manifest, and for HLS the text of the playlist of a rendition.
 * The file is asked again to its server, and only when the user opens this part.
 */
const ManifestViewer = ({ url, renditions }: ManifestPanelProps) => {
    const [isOpen, setIsOpen] = useState(false);
    /** -1 is the manifest. Another value is the place of a rendition. */
    const [selected, setSelected] = useState(-1);
    const [file, setFile] = useState<FileState>({ status: 'loading' });

    const playlists = renditions.filter((rendition) => rendition.url);
    const fileUrl = selected === -1 ? url : (playlists[selected]?.url ?? url);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        let isCurrent = true;

        fetchManifestText(fileUrl)
            .then((text) => {
                if (isCurrent) {
                    setFile({ status: 'loaded', text });
                }
            })
            .catch((error: unknown) => {
                if (isCurrent) {
                    setFile({ status: 'failed', reason: error instanceof Error ? error.message : String(error) });
                }
            });

        return () => {
            isCurrent = false;
        };
    }, [isOpen, fileUrl]);

    // Each action that asks for another file shows "Loading…" until that file arrives.
    const toggle = () => {
        setFile({ status: 'loading' });
        setIsOpen((open) => !open);
    };
    const select = (index: number) => {
        if (index !== selected) {
            setFile({ status: 'loading' });
            setSelected(index);
        }
    };

    return (
        <div className="flex flex-col gap-3">
            <div>
                <Button size="small" onClick={toggle}>
                    {isOpen ? 'Hide the manifest' : 'Show the manifest'}
                </Button>
            </div>

            {isOpen && playlists.length > 0 ? (
                <ChoiceList
                    label="File to show"
                    choices={[
                        { index: -1, label: 'Manifest' },
                        ...playlists.map((rendition, index) => ({
                            index,
                            label: formatResolution(rendition),
                            detail: formatBitrate(rendition.bitrate),
                        })),
                    ]}
                    selected={selected}
                    onSelect={select}
                />
            ) : null}

            {isOpen ? (
                <div role="region" aria-label="Text of the file">
                    <p className="text-sm [overflow-wrap:anywhere] text-muted">{fileUrl}</p>
                    {file.status === 'loading' ? <p className="text-muted">Loading…</p> : null}
                    {file.status === 'failed' ? (
                        <p className="text-error">The file did not load: {file.reason}</p>
                    ) : null}
                    {file.status === 'loaded' ? (
                        <p className="max-h-[420px] overflow-y-auto font-mono text-sm [overflow-wrap:anywhere] whitespace-pre-wrap">
                            {file.text}
                        </p>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
};

/**
 * The text of the manifest of the loaded stream.
 * Give it the URL as its `key`, so each stream gets a new, closed viewer.
 */
export const ManifestPanel = ({ url, renditions }: ManifestPanelProps) => (
    <Panel title="Manifest">
        {url ? (
            <ManifestViewer url={url} renditions={renditions} />
        ) : (
            <Hint>Load a stream to read the text of its manifest.</Hint>
        )}
    </Panel>
);
