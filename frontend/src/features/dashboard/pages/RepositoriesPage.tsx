import { useEffect, useState } from 'react';
import { ArrowUpRight, Check, ExternalLink, Flame, FolderGit2, LockKeyhole, RefreshCw, Search, Sparkles } from 'lucide-react';
import { analyzeAll, analyzeRepository, getRepositories, getRepositoryHealth, roastRepository, syncRepositories, toggleRepository } from '@/features/dashboard/services/dashboard';
import type { AnalyzeAllResult } from '@/features/dashboard/services/dashboard';
import { RepositoryAnalysisPanel } from '@/components/ui/RepositoryAnalysisPanel';
import { RoastResultPanel } from '@/components/ui/RoastResultPanel';
import type { Repository, RepositoryHealth, RoastResult } from '@/types/api';

export function RepositoriesPage() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<AnalyzeAllResult | null>(null);
  const [repoRoasts, setRepoRoasts] = useState<Record<string, RoastResult>>({});
  const [expandedAnalyses, setExpandedAnalyses] = useState<Record<string, boolean>>({});
  const [healthById, setHealthById] = useState<Record<string, RepositoryHealth>>({});

  const load = async () => {
    try {
      const result = await getRepositories();
      setRepos(result.repos?.repositories ?? []);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load repositories.');
    }
  };

  useEffect(() => { void load(); }, []);

  const sync = async () => {
    setBusy('sync'); setError(''); setMessage('');
    try {
      const result = await syncRepositories();
      await load();
      setMessage(`${result.count} repositories synced from GitHub.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Repository sync failed.');
    } finally {
      setBusy('');
    }
  };

  const runAnalyzeAll = async () => {
    setBusy('all'); setError(''); setMessage(''); setAnalysis(null);
    try {
      const result = await analyzeAll();
      setAnalysis(result);
      await load();
      const analyzedIds = repos.filter(repo => result.results.some(item => item.success && String(item.githubRepoId) === String(repo.github_repo_id))).map(repo => repo.id);
      setExpandedAnalyses(current => ({ ...current, ...Object.fromEntries(analyzedIds.map(id => [id, true])) }));
      setMessage(`Analysis finished: ${result.successful} of ${result.totalRepositories} repositories analyzed${result.failed ? `; ${result.failed} failed` : ''}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not analyze repositories.');
    } finally {
      setBusy('');
    }
  };

  const change = async (id: string, action: 'toggle' | 'analyze' | 'roast' | 'health') => {
    setBusy(`${id}:${action}`); setError(''); setMessage('');
    try {
      if (action === 'toggle') {
        const result = await toggleRepository(id);
        setRepos(current => current.map(repo => repo.id === id ? { ...repo, included: result.included } : repo));
      } else if (action === 'analyze') {
        await analyzeRepository(id);
        await load();
        setExpandedAnalyses(current => ({ ...current, [id]: true }));
        setMessage('Repository analysis complete.');
      } else if (action === 'roast') {
        const result = await roastRepository(id);
        setRepoRoasts(current => ({ ...current, [id]: result }));
      } else {
        const result = await getRepositoryHealth(id);
        setHealthById(current => ({ ...current, [id]: result }));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Repository action failed.');
    } finally {
      setBusy('');
    }
  };

  const filtered = repos.filter(repo => `${repo.name} ${repo.description || ''} ${repo.owner}`.toLowerCase().includes(query.toLowerCase()));

  return <>
    <section className="welcome-row">
      <div><div className="eyebrow">YOUR GITHUB PROJECTS</div><h1>Repositories<span className="title-period">.</span></h1><p>Choose the projects to include in your portfolio, then analyze them for useful insights.</p></div>
      <div className="welcome-actions"><button className="button button-soft" onClick={runAnalyzeAll} disabled={!!busy || repos.length === 0}><Sparkles size={16} className={busy === 'all' ? 'spin' : ''}/>{busy === 'all' ? 'Analyzing all…' : 'Analyze all'}</button><button className="button button-primary" onClick={sync} disabled={!!busy}><RefreshCw size={16} className={busy === 'sync' ? 'spin' : ''}/>{busy === 'sync' ? 'Syncing…' : 'Sync GitHub'}<ArrowUpRight size={16}/></button></div>
    </section>
    {message && <div className="notice" role="status"><Check size={16}/>{message}</div>}
    {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError('')}>Dismiss</button></div>}
    {analysis?.failed ? <details className="analysis-failures"><summary>See repositories that need attention</summary><ul>{analysis.results.filter(result => !result.success).map(result => <li key={String(result.githubRepoId)}><strong>{result.repository}</strong><span>{result.error || 'Analysis failed.'}</span></li>)}</ul></details> : null}
    <section className="panel repo-browser">
      <div className="repo-browser-head"><div><div className="eyebrow">YOUR PROJECT LIST</div><h2>{repos.length} repositories <span>· {repos.filter(repo => repo.included).length} in portfolio</span></h2></div><label className="search-box"><Search size={16}/><input aria-label="Search repositories" placeholder="Search by project name" value={query} onChange={event => setQuery(event.target.value)}/></label></div>
      <div className="repo-table-head"><span>REPOSITORY</span><span>VISIBILITY</span><span>UPDATED</span><span>PORTFOLIO</span><span>ACTIONS</span></div>
      {filtered.length ? filtered.map(repo => <div className="repo-row-group" key={repo.id}>
        <div className="repo-table-row">
        <div className="repo-table-name"><div className="repo-table-icon"><FolderGit2 size={17}/></div><div><a href={repo.html_url} target="_blank" rel="noreferrer">{repo.name}<ExternalLink size={12}/></a><small>{repo.description || `${repo.owner} / ${repo.default_branch}`}</small></div></div>
        <span className="repo-visibility">{repo.private ? <><LockKeyhole size={13}/> Private</> : <><span className="public-dot"/> Public</>}</span>
        <span className="repo-date">{new Date(repo.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        <label className="switch-label"><input type="checkbox" checked={repo.included} onChange={() => void change(repo.id, 'toggle')} disabled={!!busy}/><span className="switch"/><span>{repo.included ? 'Included' : 'Hidden'}</span></label>
        <div className="repo-row-actions"><button className="analyze-button" onClick={() => void change(repo.id, 'analyze')} disabled={!!busy}>{busy === `${repo.id}:analyze` ? 'Analyzing…' : 'Analyze'}<ArrowUpRight size={14}/></button><button className="analyze-button roast-repo-button" onClick={() => void change(repo.id, 'roast')} disabled={!!busy || !repo.analysis}>{busy === `${repo.id}:roast` ? 'Roasting…' : <><Flame size={13}/>Roast</>}</button>{repo.analysis && <button className="analyze-button health-repo-button" onClick={() => void change(repo.id, 'health')} disabled={!!busy}>{busy === `${repo.id}:health` ? 'Loading…' : healthById[repo.id] ? 'Refresh health' : 'Health'}</button>}</div>
        </div>
        {repo.analysis && <RepositoryAnalysisPanel analysis={repo.analysis} expanded={expandedAnalyses[repo.id] ?? false}/>}
        {healthById[repo.id] && <div className="health-panel" aria-live="polite"><div className="health-heading"><strong>{healthById[repo.id].repository.name} health</strong><span>Overall <b>{healthById[repo.id].health.overall ?? '—'}</b></span></div><div className="health-grid">{Object.entries(healthById[repo.id].health).filter(([key]) => key !== 'overall').map(([key, score]) => <div key={key}><span>{key}</span><b>{score ?? '—'}</b></div>)}</div></div>}
        {repoRoasts[repo.id] && <RoastResultPanel result={repoRoasts[repo.id]} compact/>}
      </div>) : <div className="repo-empty"><FolderGit2 size={22}/><strong>{repos.length ? 'No matches' : 'No repositories yet'}</strong><span>{repos.length ? 'Try another search.' : 'Sync your GitHub account to bring your projects into view.'}</span>{!repos.length && <button className="button button-soft" onClick={() => void sync()}>Sync GitHub</button>}</div>}
      <div className="panel-foot"><span>Showing {filtered.length} of {repos.length} repositories</span><span>Changes save automatically</span></div>
    </section>
  </>;
}
