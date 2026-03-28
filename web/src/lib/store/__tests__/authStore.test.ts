import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../authStore';

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('should start unauthenticated', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
  });

  it('should set tokens and become authenticated', () => {
    useAuthStore.getState().setTokens('access-123', 'refresh-456');
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.accessToken).toBe('access-123');
    expect(state.refreshToken).toBe('refresh-456');
  });

  it('should set user data', () => {
    const user = { id: '1', email: 'test@test.com', full_name: 'Test', role: 'student' };
    useAuthStore.getState().setUser(user);
    expect(useAuthStore.getState().user).toEqual(user);
  });

  it('should clear everything on logout', () => {
    useAuthStore.getState().setTokens('access', 'refresh');
    useAuthStore.getState().setUser({ id: '1', email: 'a@b.com', full_name: 'A', role: 'student' });
    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
  });
});
