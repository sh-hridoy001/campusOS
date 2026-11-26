import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bookmark,
  Building2,
  Calendar,
  Clock,
  ExternalLink,
  FileText,
  Megaphone,
  MessageSquare,
  PackageSearch,
  Plus,
  Sparkles,
  Users,
} from 'lucide-react';
import { BSPI_INSTITUTE, getRoutineLiveStatus } from '../data/bspi';
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
import { useToast } from './ToastProvider';

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
  onToggleBookmark: (notice: Notice) => Promise<void>;
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
  onToggleBookmark,
}: OverviewPanelProps) {
  const { showToast } = useToast();
  const [summaries, setSummaries] = useState<Record<string, NoticeSummary>>({});
  const [summarizingId, setSummarizingId] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const todayName = useMemo(() => {
    return now.toLocaleDateString('en-US', { weekday: 'long' });
  }, [now]);

  const bookmarkedIds = useMemo(
    () => new Set(profile.bookmarked_notices ?? []),
    [profile.bookmarked_notices],
  );

  const todaysClasses = useMemo(() => {
    return routines
      .filter((r) => {
        if (r.day.toLowerCase() !== todayName.toLowerCase()) return false;
        if (profile.role === 'admin') return true;
        if (r.department.toLowerCase() !== profile.department.toLowerCase()) {
          return false;
        }
        if (profile.role === 'student') {
          if (profile.shift && r.shift !== profile.shift) return false;
          if (profile.semester && r.semester !== profile.semester) return false;
        }
        return true;
      })
      .map((slot) => ({
        slot,
        status: getRoutineLiveStatus(slot, now),
      }))
      .sort((a, b) => {
        if (
          a.status.startMinutes !== null &&
          b.status.startMinutes !== null &&
          a.status.startMinutes !== b.status.startMinutes
        ) {
          return a.status.startMinutes - b.status.startMinutes;
        }
        return a.slot.time_slot.localeCompare(b.slot.time_slot);
      });
  }, [routines, todayName, profile, now]);

  const activeOrNextClass = useMemo(() => {
    const live = todaysClasses.find((entry) => entry.status.state === 'live');
    if (live) return live;
    return todaysClasses.find((entry) => entry.status.state === 'upcoming') ?? null;
  }, [todaysClasses]);

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
      showToast({
        type: 'success',
        title: 'AI summary generated',
        description: notice.title,
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Unable to summarize notice.';
      setSummaryError(msg);
      showToast({ type: 'error', title: 'Summarization failed', description: msg });
    } finally {
      setSummarizingId(null);
    }
  }

  const roleHeadline =
    profile.role === 'admin'
      ? 'BSPI Campus Operations Overview'
      : profile.role === 'teacher'
        ? 'Faculty Instruction & Notices Hub'
        : 'Student Academic Workspace';

  const roleSubtitle =
    profile.role === 'admin'
      ? 'Oversee schedules, categorized circulars, and campus activity across all BSPI technologies.'
      : profile.role === 'teacher'
        ? `Manage ${profile.department} shift routines, post official notices, and share BTEB study PDFs.`
        : `Your ${profile.department} classes${profile.shift ? ` (${profile.shift}` : ''}${profile.semester ? ` · ${profile.semester})` : profile.shift ? ')' : ''}, saved notices, and study materials for ${todayName}.`;

  return (
    <div className="space-y-8">
      {/* Header Welcome Band */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-slate-200/80">
        <div>
          <p className="text-xs font-medium text-slate-500">
            {BSPI_INSTITUTE.shortName} ·{' '}
            {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)} ·{' '}
            {profile.department}
            {profile.shift ? ` · ${profile.shift}` : ''}
            {profile.semester ? ` · ${profile.semester}` : ''} · {todayName}
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Welcome back, {profile.full_name}
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 max-w-2xl">
            <span className="font-medium text-slate-800">{roleHeadline}:</span>{' '}
            {roleSubtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <a
            href={BSPI_INSTITUTE.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white/90 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            <span>BSPI Portal</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </a>

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

      {/* 4-Column Glass Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 bg-white/85 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-xs divide-y lg:divide-y-0 lg:divide-x divide-slate-200/80">
        <button
          type="button"
          onClick={() => onNavigate('routines')}
          className="p-5 text-left hover:bg-slate-50/80 transition-colors rounded-tl-xl lg:rounded-l-xl cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>{todayName} Classes</span>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            {todaysClasses.length}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {deptRoutineCount} weekly department slots
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('notices')}
          className="p-5 text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Official Notices</span>
            <Megaphone className="w-4 h-4 text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            {notices.length}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {bookmarkedIds.size} saved · AI summary ready
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('notes')}
          className="p-5 text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Study PDFs</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            {notes.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">Interactive Gemini Q&A</p>
        </button>

        <button
          type="button"
          onClick={() =>
            onNavigate(profile.role === 'admin' ? 'directory' : 'lost-found')
          }
          className="p-5 text-left hover:bg-slate-50/80 transition-colors rounded-br-xl lg:rounded-r-xl cursor-pointer"
        >
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
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {profile.role === 'admin'
              ? `${openLostCount} open lost & found`
              : `${lostFound.length} total board posts`}
          </p>
        </button>
      </div>

      {/* Two-column Workspace Grid */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 cols: Latest Notices */}
        <section className="lg:col-span-7 bg-white/85 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-xs">
          <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Recent BSPI Notices
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Academic, exam, admission, and stipend announcements
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
              <p className="text-sm font-medium text-slate-700">
                No notices published yet
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {profile.role === 'student'
                  ? 'Official faculty and admin circulars will appear here once posted.'
                  : 'Publish your first BSPI announcement from the Notices board.'}
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
            <div className="divide-y divide-slate-200/80">
              {notices.slice(0, 4).map((notice) => {
                const summary = summaries[notice.id];
                const isSummarizing = summarizingId === notice.id;
                const isBookmarked = bookmarkedIds.has(notice.id);
                return (
                  <article key={notice.id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500 mb-1 flex flex-wrap items-center gap-x-1.5 tabular-nums">
                          {notice.is_urgent && (
                            <>
                              <span className="inline-flex items-center gap-1 font-semibold text-red-700">
                                <AlertTriangle className="w-3 h-3" />
                                Urgent
                              </span>
                              <span aria-hidden="true">·</span>
                            </>
                          )}
                          <span className="font-semibold text-blue-800">
                            {notice.category}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{notice.author_department || 'Administration'}</span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {new Date(notice.created_at).toLocaleDateString(
                              'en-US',
                              {
                                month: 'short',
                                day: 'numeric',
                              },
                            )}
                          </span>
                        </p>
                        <h3 className="text-sm font-semibold text-slate-900">
                          {notice.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => void onToggleBookmark(notice)}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            isBookmarked
                              ? 'border-blue-300 bg-blue-50 text-blue-700'
                              : 'border-slate-200 bg-white text-slate-500 hover:text-blue-700'
                          }`}
                          title={isBookmarked ? 'Remove bookmark' : 'Bookmark notice'}
                          aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark notice'}
                        >
                          <Bookmark
                            className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleQuickSummarize(notice)}
                          disabled={isSummarizing}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-800 text-xs font-medium text-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-blue-700" />
                          {isSummarizing
                            ? 'Summarizing...'
                            : summary
                              ? 'Hide Summary'
                              : 'Summarize'}
                        </button>
                      </div>
                    </div>

                    <p className="mt-2 text-sm text-slate-600 line-clamp-2 leading-relaxed">
                      {notice.content}
                    </p>

                    {summary && (
                      <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-700 space-y-2">
                        <p className="font-medium text-slate-900">
                          {summary.summary}
                        </p>
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

        {/* Right 5 cols: Today's Routine, BSPI Directory Shortcut & Assistant */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-white/85 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-xs">
            <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {todayName} Schedule
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {profile.role === 'admin'
                    ? 'All BSPI technologies'
                    : `${profile.department}${profile.shift ? ` · ${profile.shift}` : ''}`}
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

            {activeOrNextClass && (
              <div
                className={`px-5 py-3 border-b border-slate-200/80 flex items-center justify-between gap-3 ${
                  activeOrNextClass.status.state === 'live'
                    ? 'bg-emerald-50/70'
                    : 'bg-blue-50/60'
                }`}
              >
                <div className="min-w-0">
                  <p
                    className={`text-xs font-semibold flex items-center gap-1.5 tabular-nums ${
                      activeOrNextClass.status.state === 'live'
                        ? 'text-emerald-700'
                        : 'text-blue-700'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>{activeOrNextClass.status.label}</span>
                  </p>
                  <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">
                    {activeOrNextClass.slot.subject}
                  </p>
                </div>
                <span className="font-mono text-xs font-semibold text-slate-800 shrink-0">
                  Room {activeOrNextClass.slot.room}
                </span>
              </div>
            )}

            {todaysClasses.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-sm font-medium text-slate-700">
                  No classes scheduled for {todayName}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Open Class Routines to switch shift, semester, or browse Sunday–Thursday slots.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200/80">
                {todaysClasses.slice(0, 5).map(({ slot, status }) => (
                  <div
                    key={slot.id}
                    className="px-5 py-3.5 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {slot.subject}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate tabular-nums">
                        {slot.teacher_name} · {slot.semester}
                        {status.state === 'live' || status.state === 'upcoming'
                          ? ` · ${status.label}`
                          : ''}
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

          {/* BSPI Directory Quick Card */}
          <section className="bg-white/85 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-xs p-5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">
                BSPI Campus Directory
              </p>
              <h2 className="text-sm font-semibold text-slate-900 mt-0.5">
                Technologies, Shift Timings & BTEB Syllabus
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Explore CST, Civil, Electrical, Mechanical, Automobile, Construction & Wood labs.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('directory')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-blue-700" />
              <span>Open Directory</span>
            </button>
          </section>

          {/* AI Assistant Quick Launch */}
          <section className="bg-white/85 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-xs p-5">
            <h2 className="text-sm font-semibold text-slate-900">
              AI Campus Assistant (বাংলা সাপোর্ট)
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              লাইভ বিএসপিআই নোটিশ ও শিফট রুটিন থেকে বাংলায় তাৎক্ষণিক উত্তর পান।
            </p>
            <div className="mt-3.5 space-y-2">
              {[
                `${profile.department}${profile.shift ? ` (${profile.shift})` : ''}-এ এই সপ্তাহে আমার কী কী ক্লাস আছে?`,
                'সাম্প্রতিক জরুরি, পরীক্ষা ও উপবৃত্তি নোটিশগুলোর মূল পয়েন্ট বলো।',
                profile.role === 'teacher'
                  ? 'শিক্ষার্থীদের ল্যাব ও উপস্থিতির জন্য একটি সংক্ষিপ্ত বিএসপিআই নোটিশ লিখে দাও।'
                  : 'আমার বর্তমান শিফট রুটিন অনুযায়ী বিটিইবি পড়াশোনার একটি সাপ্তাহিক পরিকল্পনা সাজিয়ে দাও।',
              ].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => onQuickPromptAssistant(prompt)}
                  className="w-full text-left px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50/80 hover:bg-blue-50 hover:border-blue-200 text-xs font-medium text-slate-700 hover:text-blue-900 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                >
                  <span className="truncate">{prompt}</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                </button>
              ))}
            </div>
          </section>

          {/* Admin-only Directory Snapshot */}
          {profile.role === 'admin' && directoryProfiles.length > 0 && (
            <section className="bg-white/85 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-xs">
              <div className="px-5 py-4 border-b border-slate-200/80">
                <h2 className="text-sm font-semibold text-slate-900">
                  Registered BSPI Profiles
                </h2>
              </div>
              <div className="divide-y divide-slate-200/80 max-h-60 overflow-y-auto">
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
