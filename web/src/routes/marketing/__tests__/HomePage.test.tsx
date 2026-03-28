import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils';
import HomePage from '../HomePage';

describe('HomePage', () => {
  it('renders the hero heading', () => {
    render(<HomePage />);
    expect(screen.getByText(/Crack Your Exam/i)).toBeInTheDocument();
  });

  it('renders exam cards', () => {
    render(<HomePage />);
    expect(screen.getByText('UPSC')).toBeInTheDocument();
    expect(screen.getByText('JEE')).toBeInTheDocument();
    expect(screen.getByText('SSC CGL')).toBeInTheDocument();
    expect(screen.getByText('Banking')).toBeInTheDocument();
  });

  it('renders features section', () => {
    render(<HomePage />);
    expect(screen.getByText('AI-Generated Questions')).toBeInTheDocument();
    expect(screen.getByText('Adaptive Learning')).toBeInTheDocument();
  });

  it('has CTA links to register', () => {
    render(<HomePage />);
    const registerLinks = screen.getAllByRole('link', { name: /start/i });
    expect(registerLinks.length).toBeGreaterThan(0);
  });
});
