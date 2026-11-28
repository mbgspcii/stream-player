import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// The page names its test attribute `data-test-id`.
configure({ testIdAttribute: 'data-test-id' });

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});
