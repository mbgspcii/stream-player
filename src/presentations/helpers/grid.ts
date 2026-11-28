/**
 * One column, and two columns of the same width from the `xl` breakpoint (1280 pixels).
 * `minmax(0, 1fr)`: a column takes its share of the width and no more, even with a long line of text in it.
 */
export const TWO_COLUMNS_WHEN_WIDE =
    'grid grid-cols-[minmax(0,1fr)] items-start gap-x-8 xl:grid-cols-[repeat(2,minmax(0,1fr))]';

/**
 * A part placed in a grid takes the whole width of its column.
 * Without it, the part is as wide as its longest line, and two columns do not get the same width.
 */
export const GRID_CELL = 'w-full min-w-0';
