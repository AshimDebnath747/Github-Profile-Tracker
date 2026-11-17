import { request } from '@/services/api/client';
import type { User } from '@/types/api';
export const getCurrentUser = () => request<{ success: true; data: User }>('/auth/me');
export const logout = () => request<{ success: true; message: string }>('/auth/logout', { method: 'POST' });
export const loginUrl = `${import.meta.env.VITE_API_BASE_URL || '/api'}/auth/github`;
