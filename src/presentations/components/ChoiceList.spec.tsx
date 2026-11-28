import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ChoiceList, type Choice } from './ChoiceList';

const CHOICES: Choice[] = [
    { index: -1, label: 'Auto' },
    { index: 0, label: '640x360', detail: '800 kb/s' },
    { index: 1, label: '1280x720', detail: '2500 kb/s' },
];

describe(ChoiceList.name, () => {
    it('should show one button per choice, with its detail', () => {
        render(<ChoiceList label="Renditions" choices={CHOICES} selected={-1} onSelect={vi.fn()} />);

        expect(screen.getByRole('group', { name: 'Renditions' })).toBeInTheDocument();
        expect(screen.getAllByRole('button')).toHaveLength(3);
        expect(screen.getByRole('button', { name: 'Auto' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '640x360, 800 kb/s' })).toHaveTextContent('640x360800 kb/s');
    });

    it('should name the choice that the player is showing', () => {
        render(<ChoiceList label="Renditions" choices={CHOICES} selected={-1} playing={1} onSelect={vi.fn()} />);

        expect(screen.getByRole('button', { name: '1280x720, 2500 kb/s, playing' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '640x360, 800 kb/s, playing' })).not.toBeInTheDocument();
    });

    it('should give the index of the pressed choice', async () => {
        const onSelect = vi.fn();
        render(<ChoiceList label="Renditions" choices={CHOICES} selected={-1} onSelect={onSelect} />);

        await userEvent.click(screen.getByRole('button', { name: '1280x720, 2500 kb/s' }));
        await userEvent.click(screen.getByRole('button', { name: 'Auto' }));

        expect(onSelect).toHaveBeenNthCalledWith(1, 1);
        expect(onSelect).toHaveBeenNthCalledWith(2, -1);
    });

    it('should not let a disabled list be used', async () => {
        const onSelect = vi.fn();
        render(<ChoiceList label="Renditions" choices={CHOICES} selected={-1} disabled onSelect={onSelect} />);

        await userEvent.click(screen.getByRole('button', { name: '640x360, 800 kb/s' }));

        expect(screen.getByRole('button', { name: '640x360, 800 kb/s' })).toBeDisabled();
        expect(onSelect).not.toHaveBeenCalled();
    });
});
