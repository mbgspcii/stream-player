import { type ReactNode } from 'react';

/** A quiet sentence that says why a part of the page has nothing to show, or how to use it. */
export const Hint = ({ size, children }: { size?: 'small'; children: ReactNode }) => (
    <p className={`text-muted ${size === 'small' ? 'text-sm' : ''}`}>{children}</p>
);
