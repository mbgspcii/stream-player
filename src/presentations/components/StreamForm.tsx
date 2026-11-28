import { useState, type FormEvent } from 'react';

import { Button } from './Button';

import { detectType } from '../../helpers/streamUrl';
import type { StreamType } from '../../models/Stream';

type StreamFormProps = {
    /** The URL that the field shows when the page opens. */
    initialUrl: string;
    /** `true` once a stream was asked for, even if it failed. */
    isLoaded: boolean;
    /** The type of the loaded stream. `undefined` when the page could not tell it. */
    loadedType: StreamType | undefined;
    /** The player of the loaded stream, for example `hls.js 1.5.17`. */
    engine: string;
    onLoad: (url: string, type: StreamType) => void;
};

const TYPE_NAMES: Record<StreamType, string> = { dash: 'DASH', hls: 'HLS' };
const STREAM_TYPES: StreamType[] = ['dash', 'hls'];

const BADGE_TONES = {
    none: 'border-line',
    known: 'border-ok text-ok',
    unknown: 'border-error text-error',
};

/** The field for the URL of the manifest and the "Load" button, then the type of the stream. */
export const StreamForm = ({ initialUrl, isLoaded, loadedType, engine, onLoad }: StreamFormProps) => {
    const [url, setUrl] = useState(initialUrl);
    // Used only for a URL whose extension does not give the type.
    const [typeChoice, setTypeChoice] = useState<StreamType>('hls');

    const trimmed = url.trim();
    const detectedType = detectType(trimmed);
    // A manifest may have no known extension, for example when an API serves it. The user then gives the type.
    const needsTypeChoice = trimmed !== '' && !detectedType;
    // The type is shown while typing, before the stream is loaded.
    const shownType = isLoaded ? loadedType : (detectedType ?? typeChoice);
    const hasType = isLoaded || trimmed !== '';
    const badgeTone = !hasType ? 'none' : shownType ? 'known' : 'unknown';

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (trimmed) {
            onLoad(trimmed, detectedType ?? typeChoice);
        }
    };

    return (
        <>
            <form className="flex flex-wrap items-center gap-2" onSubmit={onSubmit}>
                <input
                    type="url"
                    required
                    aria-label="URL of the manifest"
                    placeholder="https://…/master.mpd or https://…/master.m3u8"
                    autoComplete="off"
                    spellCheck={false}
                    className="min-w-0 flex-1 basis-80 rounded-lg border border-line bg-panel px-3 py-2.5"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                />
                {needsTypeChoice ? (
                    <div
                        className="flex rounded-lg border border-line bg-panel p-1"
                        role="radiogroup"
                        aria-label="Type of the stream"
                    >
                        {STREAM_TYPES.map((type) => (
                            <label
                                key={type}
                                className="cursor-pointer rounded-md px-3 py-1.5 has-checked:bg-accent has-checked:font-semibold has-checked:text-on-accent has-focus-visible:outline-2"
                            >
                                <input
                                    type="radio"
                                    name="stream-type"
                                    className="sr-only"
                                    value={type}
                                    checked={typeChoice === type}
                                    onChange={() => setTypeChoice(type)}
                                />
                                {TYPE_NAMES[type]}
                            </label>
                        ))}
                    </div>
                ) : null}
                <Button type="submit" emphasis="strong">
                    Load
                </Button>
            </form>

            <div className="mt-4 mb-1 flex flex-wrap items-center gap-2" data-test-id="type-row">
                <span>Type:</span>
                <span
                    className={`rounded-full border bg-panel px-2.5 py-0.5 text-[13px] font-semibold ${BADGE_TONES[badgeTone]}`}
                >
                    {hasType ? (shownType ? TYPE_NAMES[shownType] : 'unknown') : 'none'}
                </span>
                {engine ? <span className="text-muted">played with {engine}</span> : null}
            </div>
        </>
    );
};
