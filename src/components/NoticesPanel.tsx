import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  db,
  formatFirebaseError,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import type { Notice, NoticeSummary, UserProfile } from '../types';
import { summarizeNoticeWithAI } from '../lib/api';

interface NoticesPanelProps {
  profile: UserProfile;
  accessToken: string;
  notices: Notice[];
  loading: boolean;
}

export function NoticesPanel({
  profile,
  accessToken,
  notices,
  loading,
}: NoticesPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showComposer, setShowComposer] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [summarizingId, setSummarizingId] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, NoticeSummary>>({});
  const [error, setError] = useState<string | null>(null);

  const canPublish = profile.role === 'teacher' || profile.role === 'admin';

  const filteredNotices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return notices;
    return notices.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        (n.author_name || '').toLowerCase().includes(q) ||
        (n.author_department || '').toLowerCase().includes(q),
    );
  }, [notices, searchQuery]);

  async function handleCreateNotice(e: React.FormEvent) {
    e.preventDefault();
    const cleanTitle = title.trim().slice(0, 240);
    const cleanContent = content.trim().slice(0, 10000);
    if (!cleanTitle || !cleanContent) return;

    setSubmitting(true);
    setError(null);
    try {
      try {
        await addDoc(collection(db, 'notices'), {
          title: cleanTitle,
          content: cleanContent,
          created_by: profile.uid,
          author_name: profile.full_name.slice(0, 120),
          author_role: profile.role,
          author_department: profile.department.slice(0, 100),
          created_at: serverTimestamp(),
        });
      } catch (firestoreErr) {
        handleFirestoreError(firestoreErr, OperationType.CREATE, 'notices');
      }
      setTitle('');
      setContent('');
      setShowComposer(false);
    } catch (err) {
      setError(formatFirebaseError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteNotice(id: string) {
    setDeletingId(id);
    setError(null);
    const path = `notices/${id}`;
    try {
      try {
        await deleteDoc(doc(db, 'notices', id));
      } catch (firestoreErr) {
        handleFirestoreError(firestoreErr, OperationType.DELETE, path);
      }
    } catch (err) {
      setError(formatFirebaseError(err));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSummarize(notice: Notice) {
    if (summaries[notice.id]) {
      setSummaries((prev) => {
        const copy = { ...prev };
        delete copy[notice.id];
        return copy;
      });
      return;
    }

    setSummarizingId(notice.id);
    setError(null);
    try {
      const summary = await summarizeNoticeWithAI(
        accessToken,
        notice.title,
        notice.content,
      );
      setSummaries((prev) => ({ ...prev, [notice.id]: summary }));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to summarize this notice.',
      );
    } finally {
      setSummarizingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Smart Notices Board
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Official campus announcements with instant Gemini AI key-point extraction.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notices..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
            />
          </div>
          {canPublish && (
            <button
              type="button"
              onClick={() => setShowComposer((v) => !v)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-medium hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Notice
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Teacher / Admin Notice Composer */}
      {canPublish && showComposer && (
        <form
          onSubmit={handleCreateNotice}
          className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              Publish Official Notice
            </h2>
            <button
              type="button"
              onClick={() => setShowComposer(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              aria-label="Close composer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label
              htmlFor="notice-title"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Notice Title
            </label>
            <input
              id="notice-title"
              type="text"
              required
              maxLength={240}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Fall Semester Midterm Examination Schedule & Room Guidelines"
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
            />
          </div>

          <div>
            <label
              htmlFor="notice-content"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Announcement Details
            </label>
            <textarea
              id="notice-content"
              required
              rows={5}
              maxLength={10000}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write the full announcement including dates, deadlines, eligible departments, and instructions..."
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setShowComposer(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-medium hover:bg-blue-800 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Publishing...' : 'Publish Notice'}
            </button>
          </div>
        </form>
      )}

      {/* Notices Feed */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white border border-slate-200 rounded-xl p-6 animate-pulse space-y-3"
            >
              <div className="h-5 bg-slate-200 rounded w-1/3" />
              <div className="h-3 bg-slate-100 rounded w-1/4" />
              <div className="h-16 bg-slate-100 rounded w-full" />
            </div>
          ))}
        </div>
      ) : filteredNotices.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-base font-semibold text-slate-900">
            {searchQuery ? 'No matching notices found' : 'No notices published yet'}
          </p>
          <p className="mt-1.5 text-sm text-slate-500 max-w-md mx-auto">
            {searchQuery
              ? 'Try clearing your search filter to view all campus announcements.'
              : canPublish
                ? 'Create the first campus notice for students and faculty.'
                : 'Check back soon for updates from your department and campus office.'}
          </p>
          {canPublish && !showComposer && !searchQuery && (
            <button
              type="button"
              onClick={() => setShowComposer(true)}
              className="mt-4 px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-medium hover:bg-blue-800 cursor-pointer"
            >
              Publish First Notice
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotices.map((notice) => {
            const summary = summaries[notice.id];
            const isSummarizing = summarizingId === notice.id;
            const canDelete =
              profile.role === 'admin' ||
              (profile.role === 'teacher' && notice.created_by === profile.uid);

            return (
              <article
                key={notice.id}
                className="bg-white border border-slate-200 rounded-xl p-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {notice.title}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500 tabular-nums">
                      {notice.author_name || 'Faculty / Administration'} ·{' '}
                      {notice.author_role
                        ? notice.author_role.charAt(0).toUpperCase() +
                          notice.author_role.slice(1)
                        : 'Staff'}{' '}
                      · {notice.author_department || 'Campus-Wide'} ·{' '}
                      {new Date(notice.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSummarize(notice)}
                      disabled={isSummarizing}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-800 text-xs font-semibold text-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-blue-700" />
                      {isSummarizing
                        ? 'Summarizing...'
                        : summary
                          ? 'Hide AI Summary'
                          : 'Summarize with AI'}
                    </button>

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDeleteNotice(notice.id)}
                        disabled={deletingId === notice.id}
                        className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-red-700 hover:border-red-200 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
                        title="Delete notice"
                        aria-label="Delete notice"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {notice.content}
                </div>

                {summary && (
                  <div className="mt-5 pt-4 border-t border-slate-200 bg-slate-50/70 -mx-6 -mb-6 px-6 py-4 rounded-b-xl">
                    <div className="flex items-center gap-2 text-xs font-semibold text-blue-800 mb-2">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>AI Summary</span>
                    </div>
                    <p className="text-sm font-medium text-slate-900 leading-relaxed">
                      {summary.summary}
                    </p>

                    {summary.keyPoints.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-slate-700 mb-1.5">
                          Key Points
                        </p>
                        <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
                          {summary.keyPoints.map((point, index) => (
                            <li key={index}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {summary.actionItems.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-slate-700 mb-1.5">
                          Deadlines & Action Items
                        </p>
                        <ul className="space-y-1 text-sm text-slate-800">
                          {summary.actionItems.map((action, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
