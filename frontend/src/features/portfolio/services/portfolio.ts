import { request } from '@/services/api/client';
import type { PortfolioData, RepositoryAnalysis, RoastResult } from '@/types/api';
export interface SavedPortfolio {
  id: string;
  status: string;
  portfolio_slug: string | null;
  display_name: string | null;
  tagline: string | null;
  bio: string | null;
  theme: string | null;
  social_links: Record<string, string> | null;
  resume_url: string | null;
  display_email: string | null;
  show_github_stats: boolean | null;
  user_name: string | null;
  github_username: string | null;
  avatar_url: string | null;
  featuredRepositories: { id: string; name: string; description: string | null; owner: string; html_url: string; display_order: number }[];
}
export const getPortfolio = () => request<{ success: true; portfolio: SavedPortfolio | null }>('/portfolio');
export interface PortfolioUpdate {
  displayName: string;
  bio: string;
  tagline: string;
  theme: string;
  socialLinks: Record<string, string>;
  resumeUrl: string;
  displayEmail: string;
  featuredRepositories: string[];
  showGithubStats: boolean;
}
export const updatePortfolio = (data: PortfolioUpdate) => request<{ success: true; message: string; portfolio: SavedPortfolio }>('/portfolio', { method: 'PATCH', body: JSON.stringify(data) });
export const generatePortfolio = () => request<PortfolioData & { success: true }>('/portfolio/generate', { method: 'POST' });
export const roastPortfolio = () => request<RoastResult>('/portfolio/roast');
export const roastPublicPortfolio = (slug: string) => request<RoastResult>(`/portfolio/${encodeURIComponent(slug)}/roast`, { method: 'POST' });
export const analyzePublicPortfolioRepository = (slug: string, repositoryId: string) => request<{ success: true; cached?: boolean }>(`/portfolio/${encodeURIComponent(slug)}/repositories/${encodeURIComponent(repositoryId)}/analyze`, { method: 'POST' });
export const getPublicPortfolio = (slug: string) => request<{ success: true; portfolio: { user: { username: string; name: string; avatar: string; bio: string; location: string; linkedin: string; slug: string }; repositories: { id: string; name: string; owner: string; description: string | null; html_url: string; private: boolean; fork: boolean; analysis: RepositoryAnalysis | null }[]; stats: { totalRepositories: number; publicRepositories: number; forkedRepositories: number } } }>(`/portfolio/${encodeURIComponent(slug)}`);
