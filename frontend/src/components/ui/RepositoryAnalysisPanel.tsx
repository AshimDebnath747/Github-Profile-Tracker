import type { RepositoryAnalysis } from '@/types/api';
import { toStringList } from '@/utils/toStringList';

export function RepositoryAnalysisPanel({ analysis, expanded = false }: { analysis: RepositoryAnalysis; expanded?: boolean }) {
  const score = analysis.scores?.overall ?? analysis.overallScore;
  const sections = [
    ['Strengths', 'strengths', toStringList(analysis.strengths)],
    ['Areas to improve', 'weaknesses', toStringList(analysis.weaknesses)],
    ['Recommendations', 'recommendations', toStringList(analysis.recommendations)],
  ] as const;
  return <details className="repository-analysis" open={expanded}>
    <summary><span>Analysis result</span>{typeof score === 'number' && <span className="analysis-score">Score {score}/100</span>}{analysis.analyzedAt && <time dateTime={analysis.analyzedAt}>{new Date(analysis.analyzedAt).toLocaleDateString()}</time>}</summary>
    <div className="repository-analysis-body">{analysis.summary && <p className="analysis-summary">{analysis.summary}</p>}<div className="analysis-score-grid">{Object.entries({ Architecture: analysis.scores?.architecture, Documentation: analysis.scores?.documentation, 'Code quality': analysis.scores?.codeQuality, Maintainability: analysis.scores?.maintainability, Security: analysis.scores?.security, Testing: analysis.scores?.testing, Deployment: analysis.scores?.deployment }).filter((entry): entry is [string, number] => typeof entry[1] === 'number').map(([label, value]) => <span key={label}><strong>{value}</strong>{label}</span>)}</div><div className="analysis-text-grid">{sections.map(([label, category, items]) => items.length ? <section key={label}><h4>{label}</h4><ul>{items.map((item, index) => <li key={`${index}-${item}`}>{item}{analysis.evidence?.filter(source => source.category === category && source.item === item).map((source, sourceIndex) => <details className="finding-evidence" key={`${source.url}-${sourceIndex}`}><summary>Evidence · {source.filePath}:{source.lineStart}</summary><blockquote>{source.quote}</blockquote><a href={source.url} target="_blank" rel="noreferrer">Open source at line {source.lineStart}</a></details>)}</li>)}</ul></section> : null)}</div>{analysis.evidence?.length === 0 && <p className="evidence-notice">This review predates source citations. Run an AI review again to see verifiable evidence.</p>}</div>
  </details>;
}
