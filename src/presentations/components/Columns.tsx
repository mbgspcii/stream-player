import { Children, type ReactNode } from 'react';

import { GRID_CELL, TWO_COLUMNS_WHEN_WIDE } from '../helpers/grid';

/** Puts each child in a column: side by side on a wide screen, one under the other on a narrow one. */
export const Columns = ({ children }: { children: ReactNode }) => (
    <div className={TWO_COLUMNS_WHEN_WIDE}>
        {Children.map(children, (child) => (
            <div className={GRID_CELL}>{child}</div>
        ))}
    </div>
);
