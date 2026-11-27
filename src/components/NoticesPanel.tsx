import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpDown,
  Bookmark,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import {
  db,
  formatFirebaseError,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import { BSPI_INSTITUTE } from '../data/bspi';
import {
  NOTICE_CATEGORIES,
  type Notice,
  type NoticeCategory,
  type NoticeSummary,
  type UserProfile,
} from '../types';
import { summarizeNoticeWithAI } from '../lib/api';
import { NoticesSkeleton } from './Skeletons';
import { useToast } from './ToastProvider';

interface NoticesPanelProps {
  profile: UserProfile;
  accessToken: string;
  notices: Notice[];
  loading: boolean;
}

type CategoryFilter = 'All' | 'Bookmarked' | NoticeCategory;
type SortMode = 'newest' | 'urgent-first';

export function NoticesPanel({
  profile,
  accessToken,
  notices,
  loading,
}: NoticesPanelProps) {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('All');
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [showComposer, setShowComposer] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<NoticeCategory>('Academic');
  const [isUrgent, setIsUrgent] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bookmarkingId, setBookmarkingId] = useState<string | null>(null);
  const [summarizingId, setSummarizingId] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, NoticeSummary>>({});
  const [error, setError] = useState<string | null>(null);

  const canPublish = profile.role === 'teacher' || profile.role === 'admin';
  const bookmarkedIds = useMemo(
    () => new Set(profile.bookmarked_notices ?? []),
    [profile.bookmarked_notices],
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryFilter, number> = {
      All: notices.length,
      Bookmarked: notices.filter((n) => bookmarkedIds.has(n.id)).length,
      Academic: 0,
      Exam: 0,
      Admission: 0,
      'Stipend/Upobritti': 0,
      General: 0,
    };
    for (const n of notices) {
      if (n.category in counts) {
        counts[n.category] += 1;
      }
    }
    return counts;
  }, [notices, bookmarkedIds]);

  const urgentCount = useMemo(
    () => notices.filter((n) => n.is_urgent).length,
    [notices],
  );

  const filteredNotices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = notices.filter((n) => {
      if (selectedCategory === 'Bookmarked' && !bookmarkedIds.has(n.id)) {
        return false;
      }
      if (
        selectedCategory !== 'All' &&
        selectedCategory !== 'Bookmarked' &&
        n.category !== selectedCategory
      ) {
        return false;
      }
      if (urgentOnly && !n.is_urgent) {
        return false;
      }
      if (q) {
        return (
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.category.toLowerCase().includes(q) ||
          (n.author_name || '').toLowerCase().includes(q) ||
          (n.author_department || '').toLowerCase().includes(q)
        );
      }
      return true;
    });

    if (sortMode === 'urgent-first') {
      return [...list].sort((a, b) => {
        if (a.is_urgent !== b.is_urgent) return a.is_urgent ? -1 : 1;
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });
    }
    return list;
  }, [notices, selectedCategory, urgentOnly, searchQuery, bookmarkedIds, sortMode]);

  async function handleCopyNotice(notice: Notice) {
    try {
      await navigator.clipboard.writeText(`${notice.title}\n\n${notice.content}`);
      setCopiedId(notice.id);
      window.setTimeout(() => {
        setCopiedId((curr) => (curr === notice.id ? null : curr));
      }, 1800);
      showToast({
        type: 'success',
        title: 'Notice copied',
        description: notice.title,
      });
    } catch {
      showToast({
        type: 'error',
        title: 'Copy failed',
        description: 'Clipboard permission was unavailable.',
      });
    }
  }

  async function handleToggleBookmark(notice: Notice) {
    if (bookmarkingId) return;
    setBookmarkingId(notice.id);
    setError(null);

    const existing = profile.bookmarked_notices ?? [];
    const alreadySaved = existing.includes(notice.id);
    const updated = alreadySaved
      ? existing.filter((id) => id !== notice.id)
      : [notice.id, ...existing.filter((id) => id !== notice.id)].slice(0, 100);

    const profilePath = `profiles/${profile.uid}`;
    try {
      try {
        await updateDoc(doc(db, 'profiles', profile.uid), {
          bookmarked_notices: updated,
        });
      } catch (firestoreErr) {
        handleFirestoreError(firestoreErr, OperationType.UPDATE, profilePath);
      }

      showToast({
        type: 'success',
        title: alreadySaved ? 'Bookmark removed' : 'Notice bookmarked',
        description: notice.title,
      });
    } catch (err) {
      const msg = formatFirebaseError(err);
      setError(msg);
      showToast({ type: 'error', title: 'Bookmark update failed', description: msg });
    } finally {
      setBookmarkingId(null);
    }
  }

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
          category,
          is_urgent: isUrgent,
          created_by: profile.uid,
          author_name: profile.full_name.slice(0, 120),
          author_role: profile.role,
          author_department: profile.department.slice(0, 100),
          created_at: serverTimestamp(),
        });
      } catch (firestoreErr) {
        handleFirestoreError(firestoreErr, OperationType.CREATE, 'notices');
      }

      showToast({
        type: 'success',
        title: 'Notice published',
        description: `${category}${isUrgent ? ' (Urgent)' : ''} · ${cleanTitle}`,
      });
      setTitle('');
      setContent('');
      setCategory('Academic');
      setIsUrgent(false);
      setShowComposer(false);
    } catch (err) {
      const msg = formatFirebaseError(err);
      setError(msg);
      showToast({ type: 'error', title: 'Publish failed', description: msg });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteNotice(notice: Notice) {
    setDeletingId(notice.id);
    setError(null);
    const path = `notices/${notice.id}`;
    try {
      try {
        await deleteDoc(doc(db, 'notices', notice.id));
      } catch (firestoreErr) {
        handleFirestoreError(firestoreErr, OperationType.DELETE, path);
      }
      showToast({
        type: 'info',
        title: 'Notice deleted',
        description: notice.title,
      });
    } catch (err) {
      const msg = formatFirebaseError(err);
      setError(msg);
      showToast({ type: 'error', title: 'Delete failed', description: msg });
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
      showToast({
        type: 'success',
        title: 'AI summary ready',
        description: notice.title,
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Unable to summarize this notice.';
      setError(msg);
      showToast({ type: 'error', title: 'Summarization failed', description: msg });
    } finally {
      setSummarizingId(null);
    }
  }

  const filterTabs: Array<{ key: CategoryFilter; label: string }> = [
    { key: 'All', label: 'All' },
    { key: 'Bookmarked', label: 'Saved' },
    ...NOTICE_CATEGORIES.map((c) => ({ key: c, label: c })),
  ];

  const hasActiveFilter =
    Boolean(searchQuery) || selectedCategory !== 'All' || urgentOnly;

  return (
    <div className="space-y-6">
      {/* Header & Official Portal Actions */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-slate-200/80">
        <div>
          <p className="text-xs font-medium text-slate-500">
            {BSPI_INSTITUTE.shortName} · Official Circulars & Board Notices
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Smart Notices Board
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 max-w-2xl">
            Browse categorized campus notices, bookmark important circulars, and verify live announcements directly on BSPI and BTEB portals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={BSPI_INSTITUTE.noticesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white/95 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-150 active:scale-[0.98] whitespace-nowrap shrink-0"
          >
            <span>BSPI Official Notices</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </a>

          <a
            href={BSPI_INSTITUTE.btebNoticesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white/95 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-150 active:scale-[0.98] whitespace-nowrap shrink-0"
          >
            <span>BTEB Board Notices</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </a>

          {canPublish && (
            <button
              type="button"
              onClick={() => setShowComposer((v) => !v)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-medium hover:bg-blue-800 transition-all duration-150 active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Notice
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Strip, Sort & Search */}
      <div className="bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-xs p-3.5 space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100/90 rounded-lg overflow-x-auto no-scrollbar">
            {filterTabs.map((tab) => {
              const active = selectedCategory === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedCategory(tab.key)}
                  className={`relative px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                    active
                      ? 'text-slate-900'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="notices-filter-tab"
                      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute inset-0 rounded-md bg-white shadow-xs"
                      aria-hidden="true"
                    />
                  )}
                  <span className="relative z-10">
                    {tab.label} ({categoryCounts[tab.key]})
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setSortMode((m) => (m === 'newest' ? 'urgent-first' : 'newest'))
              }
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all duration-150 active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer"
              title="Toggle sort order"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span>{sortMode === 'urgent-first' ? 'Urgent First' : 'Newest First'}</span>
            </button>

            <button
              type="button"
              onClick={() => setUrgentOnly((v) => !v)}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-all duration-150 active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                urgentOnly
                  ? 'border-red-300 bg-red-50 text-red-800'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <AlertTriangle
                className={`w-3.5 h-3.5 ${
                  urgentOnly ? 'text-red-600' : 'text-slate-400'
                }`}
              />
              <span>Urgent ({urgentCount})</span>
            </button>

            <div className="relative flex-1 sm:w-64 sm:flex-initial min-w-[180px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title, exam, stipend..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Teacher / Admin Notice Composer */}
      <AnimatePresence>
        {canPublish && showComposer && (
          <motion.form
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onSubmit={handleCreateNotice}
            className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-xs p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">
                Publish Official BSPI Notice
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

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
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
                  placeholder="e.g., BTEB 4th & 6th Semester Mid-Term Exam Schedule & Upobritti Form Notice"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
                />
              </div>

              <div>
                <label
                  htmlFor="notice-category"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Category
                </label>
                <select
                  id="notice-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as NoticeCategory)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
                >
                  {NOTICE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
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
                placeholder="Include exact dates, eligible technologies/semesters, shift timings, and required documents..."
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isUrgent}
                  onChange={(e) => setIsUrgent(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-600"
                />
                <span className="font-medium">
                  Highlight as urgent / time-sensitive circular
                </span>
              </label>

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
                  className="px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-medium hover:bg-blue-800 disabled:opacity-50 active:scale-[0.98] transition-all duration-150 cursor-pointer"
                >
                  {submitting ? 'Publishing...' : 'Publish Notice'}
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Notices Feed */}
      {loading ? (
        <NoticesSkeleton />
      ) : filteredNotices.length === 0 ? (
        <div className="bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-xl p-10 text-center">
          <p className="text-base font-semibold text-slate-900">
            {hasActiveFilter ? 'No matching notices found' : 'No notices published yet'}
          </p>
          <p className="mt-1.5 text-sm text-slate-500 max-w-md mx-auto">
            {selectedCategory === 'Bookmarked'
              ? 'Bookmark important notices using the save icon to keep them handy here.'
              : hasActiveFilter
                ? 'Try clearing your category or search filter to see all campus notices.'
                : canPublish
                  ? 'Publish the first BSPI campus notice for students and instructors.'
                  : 'Check back soon or open the official BSPI and BTEB notice archives above.'}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            {hasActiveFilter && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setUrgentOnly(false);
                }}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Reset Filters
              </button>
            )}
            {canPublish && !showComposer && selectedCategory === 'All' && !searchQuery && (
              <button
                type="button"
                onClick={() => setShowComposer(true)}
                className="px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-medium hover:bg-blue-800 cursor-pointer"
              >
                Publish First Notice
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotices.map((notice) => {
            const summary = summaries[notice.id];
            const isSummarizing = summarizingId === notice.id;
            const isBookmarked = bookmarkedIds.has(notice.id);
            const isCopied = copiedId === notice.id;
            const isLong = notice.content.length > 360;
            const isExpanded = Boolean(expandedIds[notice.id]);
            const canDelete =
              profile.role === 'admin' ||
              (profile.role === 'teacher' && notice.created_by === profile.uid);

            return (
              <article
                key={notice.id}
                className={`bg-white/90 backdrop-blur-md border rounded-xl p-6 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${
                  notice.is_urgent
                    ? 'border-red-300/90 hover:border-red-400 hover:shadow-red-950/[0.05]'
                    : 'border-slate-200/90 hover:border-blue-300/80 hover:shadow-blue-950/[0.045]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs mb-1.5 tabular-nums">
                      {notice.is_urgent && (
                        <>
                          <span className="inline-flex items-center gap-1 font-semibold text-red-700">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            Urgent
                          </span>
                          <span className="text-slate-300" aria-hidden="true">
                            ·
                          </span>
                        </>
                      )}
                      <span className="font-semibold text-blue-800">
                        {notice.category}
                      </span>
                      <span className="text-slate-300" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-slate-500">
                        {notice.author_name || 'BSPI Administration'}
                      </span>
                      <span className="text-slate-300" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-slate-500">
                        {notice.author_department || 'Campus Office'}
                      </span>
                      <span className="text-slate-300" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-slate-500">
                        {new Date(notice.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <h2 className="text-lg font-semibold text-slate-900 leading-snug">
                      {notice.title}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => void handleCopyNotice(notice)}
                      className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all duration-150 active:scale-95 cursor-pointer"
                      title="Copy notice text"
                      aria-label="Copy notice text"
                    >
                      {isCopied ? (
                        <Check className="w-4 h-4 text-emerald-700" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleToggleBookmark(notice)}
                      disabled={bookmarkingId === notice.id}
                      className={`p-2 rounded-lg border transition-all duration-150 active:scale-95 cursor-pointer disabled:opacity-50 ${
                        isBookmarked
                          ? 'border-blue-300 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-500 hover:text-blue-700 hover:border-blue-200'
                      }`}
                      title={isBookmarked ? 'Remove bookmark' : 'Bookmark notice'}
                      aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark notice'}
                    >
                      <Bookmark
                        className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleSummarize(notice)}
                      disabled={isSummarizing}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-800 text-xs font-semibold text-slate-700 transition-all duration-150 active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
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
                        onClick={() => void handleDeleteNotice(notice)}
                        disabled={deletingId === notice.id}
                        className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-red-700 hover:border-red-200 hover:bg-red-50 transition-all duration-150 active:scale-95 cursor-pointer disabled:opacity-50"
                        title="Delete notice"
                        aria-label="Delete notice"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-3.5 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {isLong && !isExpanded
                    ? `${notice.content.slice(0, 360)}...`
                    : notice.content}
                </div>

                {isLong && (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedIds((prev) => ({
                        ...prev,
                        [notice.id]: !prev[notice.id],
                      }))
                    }
                    className="mt-2 text-xs font-semibold text-blue-700 hover:text-blue-800 cursor-pointer"
                  >
                    {isExpanded ? 'Show less' : 'Read full circular'}
                  </button>
                )}

                <AnimatePresence>
                  {summary && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                      className="mt-5 pt-4 border-t border-slate-200/80 bg-slate-50/75 -mx-6 -mb-6 px-6 py-4 rounded-b-xl"
                    >
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
