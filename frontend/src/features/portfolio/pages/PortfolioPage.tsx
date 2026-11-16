import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Check, Copy, ExternalLink, Flame, Globe2, Search, Sparkles, Save } from 'lucide-react';
import { getRepositories, toggleRepository } from '@/features/dashboard/services/dashboard';
import { generatePortfolio, getPortfolio, getPublicPortfolio, roastPortfolio, updatePortfolio } from '@/features/portfolio/services/portfolio';
import type { PortfolioUpdate, SavedPortfolio } from '@/features/portfolio/services/portfolio';
import type { PortfolioData, Repository, RoastResult } from '@/types/api';

type PortfolioView = PortfolioData['portfolio'];

export function PortfolioPage() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioView | null>(null);
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [roasting, setRoasting] = useState(false);
  const [roast, setRoast] = useState<RoastResult | null>(null);
  const [changingRepo, setChangingRepo] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [savedPortfolio, setSavedPortfolio] = useState<SavedPortfolio | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settings, setSettings] = useState<PortfolioUpdate>({ displayName: '', bio: '', tagline: '', theme: 'indigo', socialLinks: {}, resumeUrl: '', displayEmail: '', featuredRepositories: [], showGithubStats: true });
  const includedCount = useMemo(() => repositories.filter(repo => repo.included).length, [repositories]);
  const filteredRepositories = useMemo(() => repositories.filter(repo => `${repo.name} ${repo.description || ''} ${repo.owner}`.toLowerCase().includes(query.toLowerCase())), [repositories, query]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const [repoResult, savedResult] = await Promise.allSettled([getRepositories(), getPortfolio()]);
      if (!active) return;
      if (repoResult.status === 'fulfilled') {
        setRepositories(repoResult.value.repos?.repositories ?? []);
      } else {
        setError(repoResult.reason instanceof Error ? repoResult.reason.message : 'Could not load your repositories.');
      }
      if (savedResult.status === 'fulfilled') {
        const saved = savedResult.value.portfolio;
        setSavedPortfolio(saved);
        if (saved) setSettings({ displayName: saved.display_name || '', bio: saved.bio || '', tagline: saved.tagline || '', theme: saved.theme || 'indigo', socialLinks: saved.social_links || {}, resumeUrl: saved.resume_url || '', displayEmail: saved.display_email || '', featuredRepositories: saved.featuredRepositories.map(repo => repo.id), showGithubStats: saved.show_github_stats ?? true });
        const savedSlug = saved?.portfolio_slug || saved?.github_username;
        if (saved?.status === 'ready' && savedSlug) {
          try {
            const result = await getPublicPortfolio(savedSlug);
            if (!active) return;
            const publicPortfolio = result.portfolio;
            setPortfolio({
              status: 'ready',
              profile: {
                username: publicPortfolio.user.username,
                name: saved.display_name || publicPortfolio.user.name,
                avatar: publicPortfolio.user.avatar,
                bio: saved.bio || publicPortfolio.user.bio,
                tagline: saved.tagline || undefined,
              },
              stats: {
                totalRepositories: publicPortfolio.stats.totalRepositories,
                publicRepositories: publicPortfolio.stats.publicRepositories,
                totalStars: 0,
                averageScore: 0,
              },
              repositories: publicPortfolio.repositories,
            });
            setPortfolioUrl(`/portfolio/${encodeURIComponent(savedSlug)}`);
          } catch (cause) {
            if (active) setError(cause instanceof Error ? cause.message : 'Could not load your saved portfolio.');
          }
        }
      }
      if (active) setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, []);

  const toggle = async (repo: Repository) => {
    setChangingRepo(repo.id);
    setError(''); setMessage('');
    try {
      const result = await toggleRepository(repo.id);
      setRepositories(current => current.map(item => item.id === repo.id ? { ...item, included: result.included } : item));
      setPortfolio(null);
      setPortfolioUrl('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update repository selection.');
    } finally {
      setChangingRepo('');
    }
  };

  const create = async () => {
    if (!includedCount) {
      setError('Select at least one repository before generating your portfolio.');
      return;
    }
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await generatePortfolio();
      const generatedUrl = typeof result.portfolioUrl === 'string' && result.portfolioUrl.trim()
        ? result.portfolioUrl
        : result.portfolio.profile.username
          ? `/portfolio/${encodeURIComponent(result.portfolio.profile.username)}`
          : '';
      if (!generatedUrl) throw new Error('The backend did not return a portfolio link. Check that your GitHub username is saved, then try again.');
      setPortfolio(result.portfolio);
      setPortfolioUrl(generatedUrl);
      const saved = await getPortfolio(); setSavedPortfolio(saved.portfolio);
      setMessage('Your portfolio is ready to share.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not generate portfolio.');
    } finally {
      setBusy(false);
    }
  };

  const saveSettings = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSavingSettings(true); setError(''); setMessage('');
    try { const result = await updatePortfolio(settings); setSavedPortfolio(result.portfolio); setMessage('Portfolio details saved.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save portfolio details.'); }
    finally { setSavingSettings(false); }
  };
  const toggleFeatured = (id: string) => setSettings(current => ({ ...current, featuredRepositories: current.featuredRepositories.includes(id) ? current.featuredRepositories.filter(item => item !== id) : current.featuredRepositories.length < 6 ? [...current.featuredRepositories, id] : current.featuredRepositories }));

  const runRoast = async () => {
    setRoasting(true); setError(''); setMessage('');
    try {
      const result = await roastPortfolio();
      setRoast(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not roast your portfolio. Analyze at least one repository and try again.');
    } finally {
      setRoasting(false);
    }
  };

  const copy = async () => {
    if (!portfolioUrl) return;
    try {
      await navigator.clipboard.writeText(new URL(portfolioUrl, window.location.origin).toString());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError('Copy failed. Open the portfolio preview to copy its address.');
    }
  };

  return <>
    <section className="welcome-row"><div><div className="eyebrow">YOUR WORK, OUT IN THE WORLD</div><h1>Portfolio<span className="title-period">.</span></h1><p>Choose the projects you want people to see, then publish your portfolio.</p></div><div className="welcome-actions"><button className="button button-soft" onClick={() => void runRoast()} disabled={roasting || busy || loading || repositories.length === 0}><Flame size={16}/>{roasting ? 'Roasting…' : 'Roast my portfolio'}</button><button className="button button-primary" onClick={create} disabled={busy || loading || includedCount === 0}><Sparkles size={16}/>{busy ? 'Preparing…' : portfolio ? 'Refresh portfolio' : 'Generate portfolio'}<ArrowRight size={16}/></button></div></section>
    {message && <div className="notice"><Check size={16}/>{message}</div>}
    {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError('')}>Dismiss</button></div>}

    <form className="panel portfolio-editor" onSubmit={saveSettings}><div className="panel-heading"><div><div className="eyebrow">MAKE IT YOURS</div><h2>Portfolio details</h2></div><span className="count-chip">{settings.featuredRepositories.length}/6 featured</span></div><p className="editor-description">Customize your public profile and choose up to six featured projects. Save details before generating the public link.</p>
      <div className="portfolio-form-grid"><label>Display name<input value={settings.displayName} onChange={e => setSettings(s => ({ ...s, displayName: e.target.value }))} placeholder={savedPortfolio?.user_name || 'Your name'}/></label><label>Tagline<input value={settings.tagline} onChange={e => setSettings(s => ({ ...s, tagline: e.target.value }))} placeholder="Full-stack developer building useful things"/></label><label className="form-wide">Bio<textarea rows={3} value={settings.bio} onChange={e => setSettings(s => ({ ...s, bio: e.target.value }))} placeholder="A short introduction"/></label><label>Resume URL<input type="url" value={settings.resumeUrl} onChange={e => setSettings(s => ({ ...s, resumeUrl: e.target.value }))} placeholder="https://…"/></label><label>Contact email<input type="email" value={settings.displayEmail} onChange={e => setSettings(s => ({ ...s, displayEmail: e.target.value }))} placeholder="you@example.com"/></label><label>LinkedIn URL<input type="url" value={settings.socialLinks.linkedin || ''} onChange={e => setSettings(s => ({ ...s, socialLinks: { ...s.socialLinks, linkedin: e.target.value } }))} placeholder="https://linkedin.com/in/…"/></label><label>Portfolio theme<select value={settings.theme} onChange={e => setSettings(s => ({ ...s, theme: e.target.value }))}><option value="indigo">Indigo</option><option value="teal">Teal</option><option value="light">Light</option><option value="dark">Dark</option></select></label></div>
      <label className="editor-checkbox"><input type="checkbox" checked={settings.showGithubStats} onChange={e => setSettings(s => ({ ...s, showGithubStats: e.target.checked }))}/> Show GitHub portfolio statistics</label>
      <div className="featured-picker"><div><strong>Featured repositories</strong><small>Pick up to six public repositories to highlight.</small></div>{repositories.filter(repo => !repo.private).length ? <div className="featured-picker-list">{repositories.filter(repo => !repo.private).map(repo => <label key={repo.id}><input type="checkbox" checked={settings.featuredRepositories.includes(repo.id)} disabled={!settings.featuredRepositories.includes(repo.id) && settings.featuredRepositories.length >= 6} onChange={() => toggleFeatured(repo.id)}/><span>{repo.name}</span></label>)}</div> : <span className="timeline-muted">Sync public repositories to feature them.</span>}</div>
      <div className="editor-actions"><button className="button button-primary" type="submit" disabled={savingSettings}>{savingSettings ? 'Saving…' : <><Save size={15}/> Save portfolio details</>}</button></div>
    </form>

    <section className="panel portfolio-selection">
      <div className="selection-heading"><div><div className="eyebrow">STEP 1 · CHOOSE YOUR WORK</div><h2>Repositories <span>{includedCount} selected</span></h2><p>Selected repositories appear in your public portfolio. You can change this anytime.</p></div><label className="search-box"><Search size={16}/><input aria-label="Search repositories" placeholder="Find a repository" value={query} onChange={event => setQuery(event.target.value)}/></label></div>
      {loading ? <div className="selection-state">Loading your GitHub repositories…</div> : repositories.length === 0 ? <div className="selection-state"><strong>No repositories found</strong><span>Sync GitHub first to choose projects for your portfolio.</span><Link className="button button-soft" to="/repositories">Go to repositories <ArrowRight size={14}/></Link></div> : filteredRepositories.length === 0 ? <div className="selection-state">No repositories match “{query}”.</div> : <div className="selection-list">{filteredRepositories.map(repo => <label className={`selection-row ${repo.included ? 'selection-row-active' : ''}`} key={repo.id}><input type="checkbox" checked={repo.included} disabled={changingRepo === repo.id || busy} onChange={() => void toggle(repo)}/><span className="selection-check" aria-hidden="true">{repo.included && <Check size={13}/>}</span><span className="selection-repo"><strong>{repo.name}</strong><small>{repo.description || `${repo.owner} / ${repo.default_branch}`}</small></span><span className={`selection-visibility ${repo.private ? 'is-private' : ''}`}>{repo.private ? 'Private' : 'Public'}</span>{changingRepo === repo.id && <span className="selection-saving">Saving…</span>}</label>)}</div>}
      {!loading && repositories.length > 0 && <div className="selection-footer"><span>{includedCount} selected for your portfolio</span><Link to="/repositories">Manage repository analysis <ArrowUpRight size={13}/></Link></div>}
    </section>

    {roast && <section className="roast-result" aria-live="polite"><div className="roast-heading"><span className="roast-icon"><Flame size={18}/></span><div className="roast-heading-copy"><div className="eyebrow">THE PORTFOLIO ROAST</div><h2>{roast.title || 'Your code, under the spotlight.'}</h2></div><div className={`roast-rating severity-${roast.severity}`}><strong>{roast.rating}<small>/10</small></strong><span>{roast.severity} heat</span></div></div><p className="roast-copy">{roast.roast}</p><div className="roast-columns"><section><h3>What stands out</h3><ul>{roast.highlights.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></section><section><h3>Ways to level up</h3><ul>{roast.recommendations.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></section></div>{roast.funniestMoment && <blockquote><span>FUNNIEST MOMENT</span>{roast.funniestMoment}</blockquote>}{roast.closingRemark && <p className="roast-closing">{roast.closingRemark}</p>}<div className="roast-footnote">Based on analyzed repositories from your GitHub account.</div></section>}

    {portfolio && <>
      <section className="portfolio-hero portfolio-result"><div className="portfolio-orb"/><div className="portfolio-copy"><span className="portfolio-kicker"><Globe2 size={15}/> YOUR PUBLIC PROFILE</span><h2>{portfolio.profile.name || 'Your portfolio is ready.'}</h2><p>{portfolio.profile.tagline || 'Your selected projects are now gathered in one place.'}</p><div className="portfolio-actions"><button className="button button-white" onClick={() => void copy()}><Copy size={15}/>{copied ? 'Copied' : 'Copy portfolio link'}</button>{portfolioUrl && <a className="portfolio-preview" href={portfolioUrl}>Open portfolio <ArrowUpRight size={15}/></a>}</div></div><div className="portfolio-preview-card"><div className="preview-browser"><i/><i/><i/><span>your portfolio</span><ArrowUpRight size={13}/></div><div className="preview-avatar">{portfolio.profile.name?.slice(0, 1) || 'Y'}</div><div className="preview-name">{portfolio.profile.name || portfolio.profile.username || 'Your name'}</div><div className="preview-bio">{portfolio.profile.bio || 'Software developer · building useful things'}</div><div className="preview-divider"/><div className="preview-stats"><span><strong>{portfolio.stats.totalRepositories}</strong> projects</span><span><strong>{portfolio.stats.totalStars || '—'}</strong> stars</span><span><strong>{portfolio.stats.averageScore || '—'}</strong> score</span></div><div className="preview-project"><div className="preview-project-icon"><Sparkles size={15}/></div><div><b>{portfolio.repositories[0]?.name || 'Selected projects'}</b><small>Your work, ready to share</small></div><ArrowUpRight size={13}/></div></div><div className="portfolio-spark">✳</div></section>
      <section className="panel portfolio-generated"><div className="panel-heading"><div><div className="eyebrow">STEP 2 · YOUR PUBLISHED WORK</div><h2>Portfolio projects</h2></div><span className="count-chip">{portfolio.repositories.length} projects</span></div><div className="featured-list">{portfolio.repositories.map(repo => <a className="featured-item" href={repo.html_url || '#'} target={repo.html_url ? '_blank' : undefined} rel="noreferrer" key={repo.id}><div className="featured-icon"><ExternalLink size={17}/></div><div><strong>{repo.name}</strong><span>{repo.description || 'A selected project from your GitHub profile'}</span></div><ArrowUpRight size={15}/></a>)}</div></section>
    </>}
  </>;
}
