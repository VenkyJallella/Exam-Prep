import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimer } from '../useTimer';

describe('useTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts at the initial value', () => {
    const { result } = renderHook(() => useTimer(60, false));
    expect(result.current.seconds).toBe(60);
    expect(result.current.isRunning).toBe(false);
  });

  it('counts up when started in count-up mode', () => {
    const { result } = renderHook(() => useTimer(0, false));
    act(() => result.current.start());
    expect(result.current.isRunning).toBe(true);

    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.seconds).toBe(3);
  });

  it('counts down when started in countdown mode', () => {
    const { result } = renderHook(() => useTimer(10, true));
    act(() => result.current.start());

    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.seconds).toBe(7);
  });

  it('pauses the timer', () => {
    const { result } = renderHook(() => useTimer(0, false));
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(2000));
    act(() => result.current.pause());

    const pausedValue = result.current.seconds;
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.seconds).toBe(pausedValue);
  });

  it('formats time correctly', () => {
    const { result } = renderHook(() => useTimer(3661, false));
    expect(result.current.formatted).toBe('01:01:01');
  });

  it('stops at 0 in countdown mode', () => {
    const { result } = renderHook(() => useTimer(2, true));
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.seconds).toBe(0);
    expect(result.current.isExpired).toBe(true);
  });

  it('resets timer', () => {
    const { result } = renderHook(() => useTimer(10, true));
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(5000));
    act(() => result.current.reset(20));
    expect(result.current.seconds).toBe(20);
    expect(result.current.isRunning).toBe(false);
  });
});
