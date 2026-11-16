import { useEffect, useState } from 'react';
import { ArrowUpRight, ExternalLink, Flame, GitFork, Github, MapPin, Sparkles } from 'lucide-react';
import { analyzePublicPortfolioRepository, getPublicPortfolio, roastPublicPortfolio } from '@/features/portfolio/services/portfolio';
import { RoastResultPanel } from '@/components/ui/RoastResultPanel';
import { RepositoryAnalysisPanel } from '@/components/ui/RepositoryAnalysisPanel';
import type { RepositoryAnalysis, RepositoryAnalysisEvidence, RoastResult } from '@/types/api';
import { toStringList } from '@/utils/toStringList';

type PublicPortfolio = {
  user: { username: string; name: string; avatar: string | null; bio: string; tagline: string; location: string; linkedin: string; slug: string; resumeUrl: string; displayEmail: string; showGithubStats: boolean; theme: string };
  repositories: { id: string; name: string; owner: string; description: string | null; html_url: string; private: boolean; fork: boolean; analysis: RepositoryAnalysis | null }[];
  stats: { totalRepositories: number; publicRepositories: number; forkedRepositories: number };
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
}
function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}
function asCount(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
function asNullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}
function normalizeAnalysis(value: unknown): RepositoryAnalysis | null {
  const data = asRecord(value);
  if (!data) return null;
  const scores = asRecord(data.scores);
  const evidence = (Array.isArray(data.evidence) ? data.evidence : []).flatMap(value => {
    const item = asRecord(value);
    if (!item || !['strengths', 'weaknesses', 'recommendations'].includes(asString(item.category)) || !asString(item.item) || !asString(item.filePath) || !asString(item.quote) || !asString(item.url)) return [];
    return [{ category: asString(item.category) as RepositoryAnalysisEvidence['category'], item: asString(item.item), filePath: asString(item.filePath), quote: asString(item.quote), lineStart: asCount(item.lineStart, 1), lineEnd: asCount(item.lineEnd, 1), url: asString(item.url) }];
  });
  return {
    summary: asString(data.summary),
    strengths: toStringList(data.strengths),
    weaknesses: toStringList(data.weaknesses),
    recommendations: toStringList(data.recommendations),
    evidence,
    overallScore: asNullableNumber(data.overallScore) ?? asNullableNumber(scores?.overall),
    analyzedAt: asString(data.analyzedAt) || null,
    scores: {
      architecture: asNullableNumber(scores?.architecture),
      documentation: asNullableNumber(scores?.documentation),
      codeQuality: asNullableNumber(scores?.codeQuality),
      maintainability: asNullableNumber(scores?.maintainability),
      security: asNullableNumber(scores?.security),
      testing: asNullableNumber(scores?.testing),
      deployment: asNullableNumber(scores?.deployment),
      overall: asNullableNumber(scores?.overall),
    },
  };
}
function normalizePortfolio(value: unknown): PublicPortfolio {
  const envelope = asRecord(value);
  const wrapped = asRecord(envelope?.portfolio);
  const data = asRecord(wrapped?.portfolio) ?? wrapped;
  if (!data) throw new Error('The portfolio response was empty.');
  const profile = asRecord(data.user) ?? asRecord(data.profile);
  const username = asString(profile?.username);
  if (!profile || !username) throw new Error('The portfolio response is missing profile information.');
  const repositories = (Array.isArray(data.repositories) ? data.repositories : []).flatMap((value, index) => {
    const repo = asRecord(value);
    const name = asString(repo?.name);
    if (!repo || !name) return [];
    return [{
      id: asString(repo.id, `${name}-${index}`),
      name,
      owner: asString(repo.owner, username),
      description: typeof repo.description === 'string' ? repo.description : null,
      html_url: asString(repo.html_url, `https://github.com/${username}/${name}`),
      private: repo.private === true,
      fork: repo.fork === true,
      analysis: normalizeAnalysis(repo.analysis),
    }];
  });
  const stats = asRecord(data.stats);
  return {
    user: {
      username,
      name: asString(profile.name, username),
      avatar: typeof profile.avatar === 'string' ? profile.avatar : null,
      bio: asString(profile.bio),
      tagline: asString(profile.tagline),
      location: asString(profile.location),
      linkedin: asString(profile.linkedin),
      slug: asString(profile.slug),
      resumeUrl: asString(profile.resumeUrl),
      displayEmail: asString(profile.displayEmail),
      showGithubStats: profile.showGithubStats !== false,
      theme: asString(profile.theme, 'indigo'),
    },
    repositories,
    stats: {
      totalRepositories: asCount(stats?.totalRepositories, repositories.length),
      publicRepositories: asCount(stats?.publicRepositories, repositories.filter(repo => !repo.private).length),
      forkedRepositories: asCount(stats?.forkedRepositories, repositories.filter(repo => repo.fork).length),
    },
  };
}

export function PublicPortfolioPage({ slug }: { slug: string }) {
  const [portfolio, setPortfolio] = useState<PublicPortfolio | null>(null);
  const [error, setError] = useState('');
  const [roast, setRoast] = useState<RoastResult | null>(null);
  const [roastError, setRoastError] = useState('');
  const [roasting, setRoasting] = useState(false);
  const [analyzingRepository, setAnalyzingRepository] = useState('');
  const [analysisErrors, setAnalysisErrors] = useState<Record<string, string>>({});
  const [expandedAnalyses, setExpandedAnalyses] = useState<Record<string, boolean>>({});
  const [reviewingAll, setReviewingAll] = useState(false);
  const [reviewProgress, setReviewProgress] = useState('');

  useEffect(() => {
    let active = true;
    setPortfolio(null);
    setError('');
    if (!slug.trim()) {
      setError('This portfolio URL is missing its slug. Open Portfolio and generate a new link.');
      return () => { active = false; };
    }
    getPublicPortfolio(slug)
      .then(result => normalizePortfolio(result))
      .then(data => { if (active) setPortfolio(data); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Portfolio could not be loaded.'); });
    return () => { active = false; };
  }, [slug]);

  const runRoast = async () => {
    setRoasting(true); setRoastError('');
    try { setRoast(await roastPublicPortfolio(slug)); }
    catch (cause) { setRoastError(cause instanceof Error ? cause.message : 'Could not roast this portfolio.'); }
    finally { setRoasting(false); }
  };

  const runAnalysis = async (repositoryId: string) => {
    setAnalyzingRepository(repositoryId);
    setAnalysisErrors(current => ({ ...current, [repositoryId]: '' }));
    try {
      await analyzePublicPortfolioRepository(slug, repositoryId);
      const refreshed = await getPublicPortfolio(slug);
      setPortfolio(normalizePortfolio(refreshed));
      setExpandedAnalyses(current => ({ ...current, [repositoryId]: true }));
    } catch (cause) {
      setAnalysisErrors(current => ({ ...current, [repositoryId]: cause instanceof Error ? cause.message : 'Could not analyze this repository.' }));
    } finally {
      setAnalyzingRepository('');
    }
  };

  const runReviewAll = async () => {
    if (!portfolio || analyzingRepository) return;
    const pending = portfolio.repositories.filter(repo => !repo.analysis?.evidence?.length);
    if (!pending.length) return;
    setReviewingAll(true);
    setAnalysisErrors({});
    const reviewed: string[] = [];
    for (let index = 0; index < pending.length; index += 1) {
      const repo = pending[index];
      setReviewProgress(`Reviewing ${index + 1} of ${pending.length}: ${repo.name}`);
      try {
        await analyzePublicPortfolioRepository(slug, repo.id);
        reviewed.push(repo.id);
      } catch (cause) {
        setAnalysisErrors(current => ({ ...current, [repo.id]: cause instanceof Error ? cause.message : 'Could not analyze this repository.' }));
      }
    }
    try {
      const refreshed = await getPublicPortfolio(slug);
      setPortfolio(normalizePortfolio(refreshed));
      setExpandedAnalyses(current => ({ ...current, ...Object.fromEntries(reviewed.map(id => [id, true])) }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load the completed repository reviews.');
    } finally {
      setReviewProgress('');
      setReviewingAll(false);
    }
  };

  if (error) return <main className="public-portfolio"><div className="public-empty" role="alert"><span className="brand-mark">R</span><h1>Portfolio unavailable</h1><p>{error}</p><a href="/">Return to RepoScope</a></div></main>;
  if (!portfolio) return <div className="boot-screen"><span className="brand-mark">R</span><span>Loading portfolio…</span></div>;

  return <main className="public-portfolio" data-portfolio-theme={portfolio.user.theme}>
    <header className="public-topbar"><a className="public-brand" href="/"><span className="brand-mark">R</span>reposcope<span className="brand-period">.</span></a><div className="public-top-actions"><button className="button button-soft public-roast-button" onClick={() => void runRoast()} disabled={roasting}><Flame size={15}/>{roasting ? 'Roasting…' : 'Roast this portfolio'}</button><a className="public-github" href={`https://github.com/${portfolio.user.username}`} target="_blank" rel="noreferrer"><Github size={15}/> GitHub profile <ArrowUpRight size={14}/></a></div></header>
    <section className="public-profile">{portfolio.user.avatar&&<img src={portfolio.user.avatar} alt={`${portfolio.user.name || portfolio.user.username}'s avatar`} />}<div className="public-profile-copy"><div className="eyebrow">DEVELOPER PORTFOLIO</div><h1>{portfolio.user.name}<span className="title-period">.</span></h1><span className="public-handle">@{portfolio.user.username}</span>{portfolio.user.tagline&&<strong className="public-tagline">{portfolio.user.tagline}</strong>}<p>{portfolio.user.bio || 'Building things and learning along the way.'}</p>{portfolio.user.location&&<span className="public-location"><MapPin size={14}/>{portfolio.user.location}</span>}<div className="public-contact-links">{portfolio.user.linkedin&&<a href={portfolio.user.linkedin} target="_blank" rel="noreferrer">LinkedIn <ArrowUpRight size={13}/></a>}{portfolio.user.resumeUrl&&<a href={portfolio.user.resumeUrl} target="_blank" rel="noreferrer">Resume <ArrowUpRight size={13}/></a>}{portfolio.user.displayEmail&&<a href={`mailto:${portfolio.user.displayEmail}`}>{portfolio.user.displayEmail}</a>}</div></div></section>
    {portfolio.user.showGithubStats&&<section className="public-stat-row"><div><strong>{portfolio.stats.totalRepositories}</strong><span>FEATURED PROJECTS</span></div><div><strong>{portfolio.stats.publicRepositories}</strong><span>PUBLIC PROJECTS</span></div><div><strong>{portfolio.stats.forkedRepositories}</strong><span>FORKED PROJECTS</span></div></section>}
    {roastError && <div className="error-banner" role="alert">{roastError}<button onClick={() => setRoastError('')}>Dismiss</button></div>}
    {roast && <RoastResultPanel result={roast} />}
    <section className="public-projects"><div className="public-projects-heading"><div className="panel-heading"><div><div className="eyebrow">SELECTED WORK</div><h2>Projects</h2></div><span className="count-chip">{portfolio.repositories.length} projects</span></div>{portfolio.repositories.some(repo => !repo.analysis?.evidence?.length) && <button className="button button-primary public-review-all" onClick={() => void runReviewAll()} disabled={reviewingAll || !!analyzingRepository || roasting}><Sparkles size={15}/>{reviewingAll ? 'Reviewing projects…' : 'AI review all projects'}</button>}</div>{reviewProgress && <p className="public-review-progress" role="status" aria-live="polite">{reviewProgress}</p>}{portfolio.repositories.length ? <div className="public-project-grid">{portfolio.repositories.map(repo=><article className="public-project-card" key={repo.id}><div className="public-project-top"><div className="featured-icon"><ExternalLink size={17}/></div><a href={repo.html_url} target="_blank" rel="noreferrer" aria-label={`Open ${repo.name} on GitHub`}><ArrowUpRight size={16}/></a></div><h3>{repo.name}</h3><p>{repo.description || 'A project from my GitHub profile.'}</p><div className="public-project-meta"><span><Github size={13}/>{repo.owner}/{repo.name}</span>{repo.fork&&<span><GitFork size={13}/>Fork</span>}</div><button className="button button-soft public-analyze-button" onClick={() => void runAnalysis(repo.id)} disabled={!!analyzingRepository || reviewingAll || roasting}><ExternalLink size={14}/>{analyzingRepository === repo.id ? 'Analyzing…' : repo.analysis?.evidence?.length ? 'Analyze again' : repo.analysis ? 'Add evidence' : 'Analyze repository'}</button>{analysisErrors[repo.id] && <p className="public-analysis-error" role="alert">{analysisErrors[repo.id]}</p>}{repo.analysis && <RepositoryAnalysisPanel analysis={repo.analysis} expanded={expandedAnalyses[repo.id] ?? false}/>}</article>)}</div> : <div className="empty-state"><div className="empty-icon"><ExternalLink size={20}/></div><strong>No public projects to show yet.</strong><span>This portfolio has no selected repositories.</span></div>}</section>
    <footer className="public-footer">A developer portfolio powered by <a href="/">RepoScope</a></footer>
  </main>;
}
