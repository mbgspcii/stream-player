import { useEffect, useRef } from 'react';

/** One line of a list that scrolls. */
export type Line = {
    id: number;
    time: string;
    message: string;
    isError: boolean;
};

/** Lines of text with their time. It scrolls to the last line when one is added. */
export const ScrollingLines = ({ label, lines }: { label: string; lines: Line[] }) => {
    // The part that scrolls.
    const viewportRef = useRef<HTMLDivElement>(null);

    const lineCount = lines.length;

    useEffect(() => {
        const viewport = viewportRef.current;
        // `lineCount` is read so the effect runs for each new line.
        if (viewport && lineCount > 0) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }, [lineCount]);

    return (
        <div ref={viewportRef} className="max-h-[220px] overflow-y-auto" role="log" aria-label={label}>
            {lines.map((line) => (
                <p
                    key={line.id}
                    // A long URL must not widen the page.
                    className={`text-sm [overflow-wrap:anywhere] ${line.isError ? 'text-error' : 'text-muted'}`}
                >
                    {`${line.time} ${line.message}`}
                </p>
            ))}
        </div>
    );
};
