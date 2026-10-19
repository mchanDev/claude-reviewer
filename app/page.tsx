'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { GitPullRequest, Clock, CheckCircle, XCircle, GitMerge, Filter } from 'lucide-react';

interface PullRequest {
  id: number;
  uuid: string;
  repo_path: string;
  title: string;
  description: string;
  base_ref: string;
  head_ref: string;
  status: 'pending' | 'approved' | 'changes_requested' | 'merged' | 'closed';
  created_at: string;
  updated_at: string;
}

// GitHub-style status colors
const statusConfig = {
  pending: { icon: Clock, color: '#d29922', label: 'Pending Review' },
  approved: { icon: CheckCircle, color: '#238636', label: 'Approved' },
  changes_requested: { icon: XCircle, color: '#da3633', label: 'Changes Requested' },
  merged: { icon: GitMerge, color: '#8250df', label: 'Merged' },
  closed: { icon: XCircle, color: '#6e7681', label: 'Closed' },
};

export default function Home() {
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    fetchPRs();
  }, [statusFilter]);

  const fetchPRs = async () => {
    setLoading(true);
    try {
      let url = '/api/prs?limit=50';
      if (statusFilter === 'open') {
        url += '&exclude_status=closed,merged';
      } else if (statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setPrs(data.prs || []);
      setSelected(new Set());
    } catch (e) {
      console.error('Error fetching PRs:', e);
    } finally {
      setLoading(false);
    }
  };

  const isClosable = (pr: PullRequest) => pr.status !== 'merged' && pr.status !== 'closed';
  const closablePRs = prs.filter(isClosable);
  const allSelected = closablePRs.length > 0 && closablePRs.every((pr) => selected.has(pr.uuid));

  const toggleSelected = (uuid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uuid)) {
        next.delete(uuid);
      } else {
        next.add(uuid);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected(allSelected ? new Set() : new Set(closablePRs.map((pr) => pr.uuid)));
  };

  const closeSelected = async () => {
    setClosing(true);
    try {
      const res = await fetch('/api/prs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuids: Array.from(selected), status: 'closed' }),
      });
      if (!res.ok) throw new Error();
      fetchPRs();
    } catch (e) {
      alert('Error closing PRs');
    } finally {
      setClosing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getRepoName = (path: string) => {
    const parts = path.split('/');
    return parts[parts.length - 1];
  };

  return (
    <main className="container">
      {/* Header */}
      <div className="pr-list-header">
        <h1>
          <GitPullRequest size={28} />
          Pull Requests
        </h1>
        <div className="filter-bar">
          <Filter size={16} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="open">Open</option>
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="changes_requested">Changes Requested</option>
            <option value="approved">Approved</option>
            <option value="merged">Merged</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* PR List */}
      {loading ? (
        <div className="loading-state">Loading pull requests...</div>
      ) : prs.length === 0 ? (
        <div className="empty-state">
          <GitPullRequest size={48} strokeWidth={1} />
          <h2>No pull requests yet</h2>
          <p>Create a PR using the CLI:</p>
          <code>claude-reviewer create --title &quot;Your PR title&quot;</code>
        </div>
      ) : (
        <div className="pr-list">
          {closablePRs.length > 0 && (
            <div className="bulk-bar">
              <label className="bulk-select-all">
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                {selected.size > 0 ? `${selected.size} selected` : 'Select all'}
              </label>
              {selected.size > 0 && (
                <button className="btn-bulk-close" onClick={closeSelected} disabled={closing}>
                  <XCircle size={14} />
                  {closing ? 'Closing...' : `Close ${selected.size} PR${selected.size !== 1 ? 's' : ''}`}
                </button>
              )}
            </div>
          )}
          {prs.map((pr) => {
            const config = statusConfig[pr.status];
            const StatusIcon = config.icon;

            return (
              <div className="pr-row" key={pr.uuid}>
                <div className="pr-select">
                  {isClosable(pr) && (
                    <input
                      type="checkbox"
                      checked={selected.has(pr.uuid)}
                      onChange={() => toggleSelected(pr.uuid)}
                      aria-label={`Select ${pr.title}`}
                    />
                  )}
                </div>
                <Link href={`/prs/${pr.uuid}`} className="pr-card">
                  <div className="pr-card-main">
                    <div className="pr-icon">
                      <GitPullRequest size={20} />
                    </div>
                    <div className="pr-info">
                      <h3>{pr.title}</h3>
                      <div className="pr-meta">
                        <span className="pr-id">#{pr.uuid}</span>
                        <span className="pr-branch">
                          {pr.head_ref} → {pr.base_ref}
                        </span>
                        <span className="pr-repo">{getRepoName(pr.repo_path)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="pr-card-status">
                    <span
                      className="status-badge"
                      style={{ backgroundColor: config.color }}
                    >
                      <StatusIcon size={14} />
                      {config.label}
                    </span>
                    <span className="pr-time">{formatDate(pr.updated_at)}</span>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .pr-list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .pr-list-header h1 {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .filter-bar {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .filter-bar select {
          padding: 0.5rem 1rem;
          border-radius: 6px;
          border: 1px solid var(--border-color, #30363d);
          background: var(--bg-secondary, #161b22);
          color: inherit;
        }

        .loading-state,
        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: #8b949e;
        }

        .empty-state h2 {
          margin: 1rem 0 0.5rem;
          font-size: 1.25rem;
          color: #c9d1d9;
        }

        .empty-state code {
          display: inline-block;
          margin-top: 1rem;
          padding: 0.75rem 1rem;
          background: #161b22;
          border-radius: 6px;
          font-family: monospace;
        }

        .pr-list {
          display: flex;
          flex-direction: column;
          gap: 1px;
          background: var(--border-color, #30363d);
          border-radius: 8px;
          overflow: hidden;
        }

        .bulk-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          min-height: 2.75rem;
          padding: 0.5rem 1.25rem 0.5rem 0.75rem;
          background: var(--bg-tertiary, #21262d);
          font-size: 0.875rem;
          color: #8b949e;
        }

        .bulk-select-all {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
        }

        .btn-bulk-close {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.75rem;
          background: #21262d;
          border: 1px solid #30363d;
          border-radius: 6px;
          color: #e6edf3;
          font-size: 0.8rem;
          cursor: pointer;
        }

        .btn-bulk-close:hover:not(:disabled) {
          background: #30363d;
        }

        .btn-bulk-close:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .pr-row {
          display: flex;
          align-items: stretch;
          background: var(--bg-secondary, #161b22);
          transition: background 0.15s;
        }

        .pr-select {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2.5rem;
          flex-shrink: 0;
        }

        .bulk-bar input,
        .pr-select input {
          width: 1rem;
          height: 1rem;
          cursor: pointer;
        }

        :global(.pr-card) {
          flex: 1;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.25rem 1rem 0;
          background: transparent;
          text-decoration: none;
          color: inherit;
        }

        .pr-row:hover {
          background: var(--bg-tertiary, #21262d);
        }

        .pr-card-main {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }

        .pr-icon {
          color: #3fb950;
          margin-top: 2px;
        }

        .pr-info h3 {
          font-size: 1rem;
          font-weight: 600;
          margin: 0 0 0.375rem;
          color: #58a6ff;
        }

        .pr-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.875rem;
          color: #8b949e;
        }

        .pr-id {
          font-family: monospace;
        }

        .pr-branch {
          font-family: monospace;
          background: #21262d;
          padding: 0.125rem 0.5rem;
          border-radius: 4px;
        }

        .pr-card-status {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.5rem;
        }

        .status-badge {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.25rem 0.625rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 500;
          color: white;
        }

        .pr-time {
          font-size: 0.75rem;
          color: #8b949e;
        }
      `}</style>
    </main>
  );
}
