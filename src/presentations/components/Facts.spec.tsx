import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Facts } from './Facts';

describe(Facts.name, () => {
    it('should show each name with its value, as a list', () => {
        render(
            <Facts
                label="Stream"
                facts={[
                    { label: 'Kind', value: 'On demand' },
                    { label: 'Duration', value: '10:35' },
                ]}
            />,
        );

        const items = within(screen.getByRole('list', { name: 'Stream' })).getAllByRole('listitem');

        expect(items).toHaveLength(2);
        expect(items[0]).toHaveTextContent('KindOn demand');
        expect(items[1]).toHaveTextContent('Duration10:35');
    });

    it('should mark only a value with the warning tone', () => {
        render(
            <Facts
                label="Stream"
                facts={[
                    { label: 'Encryption', value: 'Widevine', tone: 'warning' },
                    { label: 'Kind', value: 'Live' },
                ]}
            />,
        );

        expect(screen.getByText('Widevine').className).toContain('text-warning');
        expect(screen.getByText('Live').className).not.toContain('text-warning');
    });
});
