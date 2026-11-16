import { request } from '@/services/api/client';
import type { DashboardData, DeveloperDNA, RepoList, RepositoryAnalysis, RepositoryHealth, RoastResult, SkillTimelineEntry } from '@/types/api';
export const getDashboard = () => request<{ success: true; dashboard: DashboardData }>('/dashboard');
export const getSkillTimeline = () => request<{ success: true; timeline: SkillTimelineEntry[] }>('/dashboard/skill-timeline');
export const getDeveloperDNA = () => request<{ success: true; dna: DeveloperDNA }>('/dashboard/developer-dna');
export const getRepositories = () => request<RepoList>('/github/repos');
export const syncRepositories = () => request<{ success: true; count: number; message: string }>('/github/repos/sync', { method: 'POST' });
export const toggleRepository = (id: string) => request<{ success: true; included: boolean }>(`/github/repos/${encodeURIComponent(id)}/toggle`, { method: 'POST' });
export const analyzeRepository = (id: string) => request<{ success: true; analysis: RepositoryAnalysis }>(`/github/repos/${encodeURIComponent(id)}/analyze`, { method: 'POST' });
export const roastRepository = (id: string) => request<RoastResult>(`/github/repos/${encodeURIComponent(id)}/roast`, { method: 'POST' });
export const getRepositoryHealth = (id: string) => request<{ success: true } & RepositoryHealth>(`/github/repos/${encodeURIComponent(id)}/health`);
export interface AnalyzeAllResult {
  success: true;
  totalRepositories: number;
  successful: number;
  failed: number;
  results: { repository: string; githubRepoId: string | number; success: boolean; error?: string }[];
}
export const analyzeAll = () => request<AnalyzeAllResult>('/github/repos/analyze-all', { method: 'POST' });
