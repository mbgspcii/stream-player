import { type ReactNode, type RefObject } from 'react';

import { GRID_CELL, TWO_COLUMNS_WHEN_WIDE } from '../helpers/grid';

type PlayerLayoutProps = {
    videoRef: RefObject<HTMLVideoElement>;
    /** What is next to the video on a wide screen. */
    aside: ReactNode;
    /** What is under the video, on the whole width. */
    children: ReactNode;
};

/**
 * The video element, with what is around it.
 *
 * On a wide screen, the video is on the left and `aside` on the right, and `children` are under both.
 * On a narrow screen there is one column: `contents` takes the cell of the video away, so the video sticks
 * to the top of the page for the whole length of the parts under it.
 */
export const PlayerLayout = ({ videoRef, aside, children }: PlayerLayoutProps) => (
    <div className={TWO_COLUMNS_WHEN_WIDE}>
        <div className="contents xl:block">
            <div className="sticky top-0 z-10 w-full bg-page pt-4 pb-1 xl:static xl:pb-0">
                <video
                    ref={videoRef}
                    // Smaller when it sticks to the top of a narrow screen, to leave room for what is read under it.
                    className="block max-h-[40vh] w-full rounded-xl bg-black xl:max-h-[70vh]"
                    controls
                    playsInline
                />
            </div>
        </div>
        <div className={GRID_CELL}>{aside}</div>
        <div className={`${GRID_CELL} xl:col-span-2`}>{children}</div>
    </div>
);
