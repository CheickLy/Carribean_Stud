import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';

vi.mock('../src/App', () => ({ default: () => <p>Mounted app</p> }));

describe('client entry', () => {
  it('renders the app into the root element', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    await import('../src/main');
    await waitFor(() => expect(screen.getByText('Mounted app')).toBeTruthy());
  });
});
