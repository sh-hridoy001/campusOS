import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  FileText,
  Megaphone,
  MessageSquare,
  PackageSearch,
  Plus,
  Sparkles,
  Users,
} from 'lucide-react';
import type {
  ActiveTab,
  ClassRoutine,
  LostFoundReport,
  Notice,
  NoticeSummary,
  StudyNoteMeta,
  UserProfile,
} from '../types';
import { summarizeNoticeWithAI } from '../lib/api';

interface OverviewPanelProps {
  profile: UserProfile;
  accessToken: string;
  notices: Notice[];
  routines: ClassRoutine[];
  notes: StudyNoteMeta[];
  lostFound: LostFoundReport[];
  directoryProfiles: UserProfile[];
  onNavigate: (tab: ActiveTab) => void;
  onQuickPromptAssistant: (prompt: string) => void;
}

export function OverviewPanel({
  profile,
  accessToken,
  notices,
  routines,
  notes,
  lostFound,
  directoryProfiles,
  onNavigate,
  onQuickPromptAssistant,
}: OverviewPanelProps) {
  const [summaries, setSummaries] = useState<Record<string, NoticeSummary>>({});
  const [summarizingId, setSummarizingId] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const todayName = useMemo(() => {
    return new Date().toLocaleDateString('en-US', { weekday: 'long' });
  }, []);

  const todaysClasses = useMemo(() => {
    return routines.filter((r) => {
      const sameDay = r.day.toLowerCase() === todayName.toLowerCase();
      if (!sameDay) return false;
      if (profile.role === 'admin') return true;
      return r.department.toLowerCase() === profile.department.toLowerCase();
    });
  }, [routines, todayName, profile.role, profile.department]);

  const deptRoutineCount = useMemo(() => {
    if (profile.role === 'admin') return routines.length;
    return routines.filter(
      (r) => r.department.toLowerCase() === profile.department.toLowerCase(),
    ).length;
  }, [routines, profile.role, profile.department]);

  const openLostCount = useMemo(
    () => lostFound.filter((item) => item.status === 'open').length,
    [lostFound],
  );

  async function handleQuickSummarize(notice: Notice) {
    if (summaries[notice.id]) {
      setSummaries((prev) => {
        const next = { ...prev };
        delete next[notice.id];
        return next;
      });
      return;
    }

    setSummarizingId(notice.id);
    setSummaryError(null);
    try {
      const result = await summarizeNoticeWithAI(
        accessToken,
        notice.title,
        notice.content,
      );
      setSummaries((prev) => ({ ...prev, [notice.id]: result }));
    } catch (err) {
      setSummaryError(
        err instanceof Error ? err.message : 'Unable to summarize notice.',
      );
    } finally {
      setSummarizingId(null);
    }
  }

  const roleHeadline =
    profile.role === 'admin'
      ? 'Campus Operations Overview'
      : profile.role === 'teacher'
        ? 'Faculty Teaching & Notices Hub'
        : 'Student Academic Hub';

  const roleSubtitle =
    profile.role === 'admin'
      ? 'Monitor schedules, official notices, and campus activity across all departments.'
      : profile.role === 'teacher'
        ? `Manage ${profile.department} class slots, broadcast announcements, and share study PDFs.`
        : `Your ${profile.department} classes, summarized announcements, and study materials for ${todayName}.`;

  return (
    <div className="space-y-8">
      {/* Header Welcome Band */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-medium text-slate-500">
            {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)} ·{' '}
            {profile.department} · {todayName}
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Welcome back, {profile.full_name}
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 max-w-2xl">
            <span className="font-medium text-slate-800">{roleHeadline}:</span>{' '}
            {roleSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {(profile.role === 'teacher' || profile.role === 'admin') && (
            <button
              type="button"
              onClick={() => onNavigate('notices')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm font-medium hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Post Notice
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigate('assistant')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-medium hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            Ask AI Assistant
          </button>
        </div>
      </div>

      {/* 4-Column Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        <div className="p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>{todayName} Classes</span>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            {todaysClasses.length}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {deptRoutineCount} weekly slots total
          </p>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Official Notices</span>
            <Megaphone className="w-4 h-4 text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            {notices.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">AI summarization ready</p>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Study PDFs</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            {notes.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">Interactive document Q&A</p>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            {profile.role === 'admin' ? (
              <>
                <span>Campus Members</span>
                <Users className="w-4 h-4 text-slate-400" />
              </>
            ) : (
              <>
                <span>Lost & Found Open</span>
                <PackageSearch className="w-4 h-4 text-slate-400" />
              </>
            )}
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            {profile.role === 'admin' ? directoryProfiles.length : openLostCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {profile.role === 'admin'
              ? `${openLostCount} open lost & found`
              : `${lostFound.length} total board posts`}
          </p>
        </div>
      </div>

      {/* Two-column Workspace Grid */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 cols: Latest Notices */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Recent Campus Notices
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Latest announcements from faculty and administration
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('notices')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0 cursor-pointer"
            >
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {summaryError && (
            <div className="mx-5 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {summaryError}
            </div>
          )}

          {notices.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-medium text-slate-700">No notices published yet</p>
              <p className="mt-1 text-xs text-slate-500">
                {profile.role === 'student'
                  ? 'Official faculty and admin notices will appear here once posted.'
                  : 'Publish your first campus announcement from the Notices board.'}
              </p>
              {(profile.role === 'teacher' || profile.role === 'admin') && (
                <button
                  type="button"
                  onClick={() => onNavigate('notices')}
                  className="mt-4 px-4 py-2 rounded-lg bg-blue-700 text-white text-xs font-medium hover:bg-blue-800 transition-colors cursor-pointer"
                >
                  Create First Notice
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {notices.slice(0, 4).map((notice) => {
                const summary = summaries[notice.id];
                const isSummarizing = summarizingId === notice.id;
                return (
                  <article key={notice.id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-slate-900">
                          {notice.title}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500 tabular-nums">
                          {notice.author_name || 'Campus Office'} ·{' '}
                          {notice.author_department || 'Administration'} ·{' '}
                          {new Date(notice.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleQuickSummarize(notice)}
                        disabled={isSummarizing}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-800 text-xs font-medium text-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-blue-700" />
                        {isSummarizing
                          ? 'Summarizing...'
                          : summary
                            ? 'Hide Summary'
                            : 'Summarize with AI'}
                      </button>
                    </div>

                    <p className="mt-2.5 text-sm text-slate-600 line-clamp-2 leading-relaxed">
                      {notice.content}
                    </p>

                    {summary && (
                      <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-700 space-y-2">
                        <p className="font-medium text-slate-900">{summary.summary}</p>
                        {summary.keyPoints.length > 0 && (
                          <ul className="list-disc pl-4 space-y-1 text-slate-600">
                            {summary.keyPoints.map((pt, i) => (
                              <li key={i}>{pt}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Right 5 cols: Today's Routine & Role Shortcuts */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-white border border-slate-200 rounded-xl">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {todayName} Schedule
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {profile.role === 'admin' ? 'All departments' : profile.department}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('routines')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Full timetable
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {todaysClasses.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-sm font-medium text-slate-700">
                  No classes scheduled for {todayName}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Switch to the Routines tab to inspect other weekdays or add classes.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {todaysClasses.slice(0, 5).map((slot) => (
                  <div
                    key={slot.id}
                    className="px-5 py-3.5 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {slot.subject}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {slot.teacher_name} · {slot.department}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-mono font-medium text-slate-900 tabular-nums">
                        {slot.time_slot}
                      </p>
                      <p className="text-xs font-mono text-slate-500 mt-0.5">
                        Room {slot.room}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* AI Assistant Quick Launch */}
          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-900">
              AI Campus Assistant Prompts
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Ask Gemini using your live campus notices and class routines.
            </p>
            <div className="mt-3.5 space-y-2">
              {[
                `What classes are scheduled for ${profile.department} this week?`,
                'Summarize the most important deadlines from recent notices.',
                profile.role === 'teacher'
                  ? 'Draft a concise exam preparation notice for my students.'
                  : 'Help me plan my study week around my current class schedule.',
              ].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => onQuickPromptAssistant(prompt)}
                  className="w-full text-left px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 text-xs font-medium text-slate-700 hover:text-blue-900 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                >
                  <span className="truncate">{prompt}</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                </button>
              ))}
            </div>
          </section>

          {/* Admin-only Directory Snapshot */}
          {profile.role === 'admin' && directoryProfiles.length > 0 && (
            <section className="bg-white border border-slate-200 rounded-xl">
              <div className="px-5 py-4 border-b border-slate-200">
                <h2 className="text-sm font-semibold text-slate-900">
                  Registered Campus Profiles
                </h2>
              </div>
              <div className="divide-y divide-slate-200 max-h-60 overflow-y-auto">
                {directoryProfiles.slice(0, 8).map((member) => (
                  <div
                    key={member.uid}
                    className="px-5 py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="font-medium text-slate-800 truncate">
                      {member.full_name}
                    </span>
                    <span className="text-slate-500 shrink-0">
                      {member.role} · {member.department}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
