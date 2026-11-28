import { type ButtonHTMLAttributes } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    /** `strong` is the main action, or the choice that is on. */
    emphasis?: 'default' | 'strong';
    size?: 'small' | 'medium';
};

const EMPHASIS = {
    default: 'border-line bg-panel text-ink hover:border-muted',
    strong: 'border-accent bg-accent text-on-accent font-semibold',
};

const SIZE = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-3.5 py-2.5',
};

/** A button of the page. It is of the type `button` unless another type is given. */
export const Button = ({ emphasis = 'default', size = 'medium', type = 'button', ...props }: ButtonProps) => (
    <button
        type={type}
        className={`cursor-pointer rounded-lg border disabled:cursor-not-allowed disabled:opacity-50 ${EMPHASIS[emphasis]} ${SIZE[size]}`}
        {...props}
    />
);
