import { type ReactNode } from 'react';

const Code = ({ children }: { children: ReactNode }) => <code className="font-mono text-[0.92em]">{children}</code>;

/** The name of the page and what to do with it. */
export const PageHeader = () => (
    <header className="mb-5">
        <h1 className="text-[22px] font-semibold">Stream player</h1>
        <p className="text-muted">
            Paste the URL of a DASH (<Code>.mpd</Code>) or HLS (<Code>.m3u8</Code>) manifest.
        </p>
    </header>
);
