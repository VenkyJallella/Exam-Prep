import { describe, it, expect } from 'vitest';
import { render } from '@/test/utils';
import LoadingScreen from '../LoadingScreen';

describe('LoadingScreen', () => {
  it('renders a spinner', () => {
    const { container } = render(<LoadingScreen />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });
});
