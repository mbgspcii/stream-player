import { type ReactNode } from 'react';

type PanelProps = {
    title: string;
    /** A quieter text after the title, for example `(3)`. */
    count?: string;
    children: ReactNode;
};

/** A part of the page: a box with a title, then its content. */
export const Panel = ({ title, count, children }: PanelProps) => (
    <section className="mt-4 flex flex-col gap-3 rounded-xl border border-line bg-panel px-4 py-3.5">
        <h2 className="font-semibold">
            {title}
            {count ? <span className="font-normal text-muted"> {count}</span> : null}
        </h2>
        {children}
    </section>
);
