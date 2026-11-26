import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Building2,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  PackageSearch,
  RefreshCw,
  X,
} from 'lucide-react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { onIdTokenChanged, signOut, type User } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  auth,
  db,
  formatFirebaseError,
  handleFirestoreError,
  OperationType,
  testConnection,
  timestampToIso,
} from './lib/firebase';
import { fetchLostFoundItems, fetchStudyNotes } from './lib/api';
import { BSPI_INSTITUTE } from './data/bspi';
import {
  BSPI_DEPARTMENTS,
  NOTICE_CATEGORIES,
  SEMESTERS,
  SHIFTS,
  type ActiveTab,
  type ClassRoutine,
  type LostFoundReport,
  type Notice,
  type NoticeCategory,
  type SemesterType,
  type ShiftType,
  type StudyNoteMeta,
  type UserProfile,
  type UserRole,
} from './types';
import { AuthScreen } from './components/AuthScreen';
import { OverviewPanel } from './components/OverviewPanel';
import { NoticesPanel } from './components/NoticesPanel';
import { RoutinesPanel } from './components/RoutinesPanel';
import { DirectoryPanel } from './components/DirectoryPanel';
import { AssistantPanel } from './components/AssistantPanel';
import { NotesPanel } from './components/NotesPanel';
import { LostFoundPanel } from './components/LostFoundPanel';
import { useToast } from './components/ToastProvider';

const BOOTSTRAPPED_ADMIN_EMAIL = 'sazzadhossainhridoy961@gmail.com';

const NAV_ITEMS: Array<{
  id: ActiveTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'overview', label: 'Overview', shortLabel: 'Home', icon: LayoutDashboard },
  { id: 'notices', label: 'Notices', shortLabel: 'Notices', icon: Megaphone },
  { id: 'routines', label: 'Class Routines', shortLabel: 'Routine', icon: CalendarDays },
  { id: 'directory', label: 'BSPI Directory', shortLabel: 'Directory', icon: Building2 },
  { id: 'assistant', label: 'AI Assistant', shortLabel: 'AI Chat', icon: MessageSquare },
  { id: 'notes', label: 'PDF Notes', shortLabel: 'PDFs', icon: BookOpen },
  { id: 'lost-found', label: 'Lost & Found', shortLabel: 'Lost/Found', icon: PackageSearch },
];

const MOBILE_BOTTOM_TABS: ActiveTab[] = [
  'overview',
  'notices',
  'routines',
  'directory',
  'assistant',
];

function safeHandleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): string {
  try {
    handleFirestoreError(error, operationType, path);
  } catch (err) {
    return formatFirebaseError(err);
  }
  return formatFirebaseError(error);
}

function normalizeShift(val: unknown): ShiftType | undefined {
  return val === '1st Shift' || val === '2nd Shift' ? val : undefined;
}

function normalizeSemester(val: unknown): SemesterType | undefined {
  return typeof val === 'string' &&
    (SEMESTERS as readonly string[]).includes(val)
    ? (val as SemesterType)
    : undefined;
}

function normalizeNoticeCategory(val: unknown): NoticeCategory {
  return typeof val === 'string' &&
    (NOTICE_CATEGORIES as readonly string[]).includes(val)
    ? (val as NoticeCategory)
    : 'General';
}

export default function App() {
  const { showToast } = useToast();
  const [booting, setBooting] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState('');

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [assistantInitialPrompt, setAssistantInitialPrompt] = useState<string | null>(
    null,
  );
  const [routineDeptPrefill, setRoutineDeptPrefill] = useState<string | null>(null);
  const [notesDeptPrefill, setNotesDeptPrefill] = useState<string | null>(null);

  const [notices, setNotices] = useState<Notice[]>([]);
  const [routines, setRoutines] = useState<ClassRoutine[]>([]);
  const [notes, setNotes] = useState<StudyNoteMeta[]>([]);
  const [lostFound, setLostFound] = useState<LostFoundReport[]>([]);
  const [directoryProfiles, setDirectoryProfiles] = useState<UserProfile[]>([]);

  const [firestoreLoading, setFirestoreLoading] = useState(false);
  const [serverLoading, setServerLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // Onboarding fallback state for first-time Google Sign-In
  const [onboardName, setOnboardName] = useState('');
  const [onboardRole, setOnboardRole] = useState<UserRole>('student');
  const [onboardDept, setOnboardDept] = useState<string>(BSPI_DEPARTMENTS[0]);
  const [onboardShift, setOnboardShift] = useState<ShiftType>('1st Shift');
  const [onboardSemester, setOnboardSemester] =
    useState<SemesterType>('1st Semester');
  const [onboardSaving, setOnboardSaving] = useState(false);

  const onboardingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    void testConnection();
  }, []);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      if (!user) {
        if (onboardingTimerRef.current) {
          window.clearTimeout(onboardingTimerRef.current);
          onboardingTimerRef.current = null;
        }
        setFirebaseUser(null);
        setAccessToken('');
        setProfile(null);
        setProfileLoading(false);
        setNeedsOnboarding(false);
        setNotices([]);
        setRoutines([]);
        setNotes([]);
        setLostFound([]);
        setDirectoryProfiles([]);
        setDataError(null);
        setBooting(false);
        return;
      }

      try {
        const token = await user.getIdToken();
        setAccessToken(token);
      } catch (err) {
        setDataError(formatFirebaseError(err));
      }
      setFirebaseUser(user);
      setBooting(false);
    });

    return () => unsubscribe();
  }, []);

  // Listen to authenticated user's profile document in Firestore
  useEffect(() => {
    if (!firebaseUser) return;

    setProfileLoading(true);
    const profilePath = `profiles/${firebaseUser.uid}`;
    const unsubscribe = onSnapshot(
      doc(db, 'profiles', firebaseUser.uid),
      (snap) => {
        if (onboardingTimerRef.current) {
          window.clearTimeout(onboardingTimerRef.current);
          onboardingTimerRef.current = null;
        }

        if (snap.exists()) {
          const raw = snap.data();
          const loadedProfile: UserProfile = {
            uid: typeof raw.uid === 'string' ? raw.uid : firebaseUser.uid,
            full_name:
              typeof raw.full_name === 'string'
                ? raw.full_name
                : firebaseUser.displayName || 'BSPI Member',
            role:
              raw.role === 'teacher' || raw.role === 'admin'
                ? raw.role
                : 'student',
            department:
              typeof raw.department === 'string'
                ? raw.department
                : BSPI_DEPARTMENTS[0],
            shift: normalizeShift(raw.shift),
            semester: normalizeSemester(raw.semester),
            bookmarked_notices: Array.isArray(raw.bookmarked_notices)
              ? raw.bookmarked_notices.filter(
                  (id): id is string => typeof id === 'string',
                )
              : [],
            email:
              typeof raw.email === 'string'
                ? raw.email
                : firebaseUser.email || '',
            created_at: timestampToIso(raw.created_at),
          };
          setProfile(loadedProfile);
          setNeedsOnboarding(false);
          setProfileLoading(false);
          setDataError(null);
        } else {
          setProfile(null);
          setOnboardName(
            firebaseUser.displayName ||
              firebaseUser.email?.split('@')[0] ||
              'BSPI Member',
          );
          onboardingTimerRef.current = window.setTimeout(() => {
            setNeedsOnboarding(true);
            setProfileLoading(false);
          }, 750);
        }
      },
      (err) => {
        setProfileLoading(false);
        setDataError(
          safeHandleFirestoreError(err, OperationType.GET, profilePath),
        );
      },
    );

    return () => {
      if (onboardingTimerRef.current) {
        window.clearTimeout(onboardingTimerRef.current);
        onboardingTimerRef.current = null;
      }
      unsubscribe();
    };
  }, [firebaseUser]);

  // Listen to notices & routines only after authentication + profile are ready
  useEffect(() => {
    if (!firebaseUser || !profile) return;

    setFirestoreLoading(true);
    let noticesLoaded = false;
    let routinesLoaded = false;
    const markReady = () => {
      if (noticesLoaded && routinesLoaded) {
        setFirestoreLoading(false);
      }
    };

    const noticesQuery = query(
      collection(db, 'notices'),
      orderBy('created_at', 'desc'),
    );
    const unsubNotices = onSnapshot(
      noticesQuery,
      (snapshot) => {
        const items: Notice[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: String(data.title ?? ''),
            content: String(data.content ?? ''),
            category: normalizeNoticeCategory(data.category),
            is_urgent: Boolean(data.is_urgent),
            created_by: String(data.created_by ?? ''),
            author_name: String(data.author_name ?? 'BSPI Administration'),
            author_role:
              data.author_role === 'teacher' || data.author_role === 'admin'
                ? data.author_role
                : 'teacher',
            author_department: String(
              data.author_department ?? 'Administration',
            ),
            created_at: timestampToIso(data.created_at),
          };
        });
        setNotices(items);
        noticesLoaded = true;
        markReady();
      },
      (err) => {
        noticesLoaded = true;
        markReady();
        setDataError(
          safeHandleFirestoreError(err, OperationType.LIST, 'notices'),
        );
      },
    );

    const routinesQuery = query(
      collection(db, 'routines'),
      orderBy('created_at', 'desc'),
    );
    const unsubRoutines = onSnapshot(
      routinesQuery,
      (snapshot) => {
        const items: ClassRoutine[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            day: String(data.day ?? 'Sunday'),
            time_slot: String(data.time_slot ?? ''),
            subject: String(data.subject ?? ''),
            teacher_name: String(data.teacher_name ?? ''),
            room: String(data.room ?? ''),
            department: String(data.department ?? BSPI_DEPARTMENTS[0]),
            shift: normalizeShift(data.shift) ?? '1st Shift',
            semester: normalizeSemester(data.semester) ?? '1st Semester',
            created_by: String(data.created_by ?? ''),
            created_at: timestampToIso(data.created_at),
          };
        });
        setRoutines(items);
        routinesLoaded = true;
        markReady();
      },
      (err) => {
        routinesLoaded = true;
        markReady();
        setDataError(
          safeHandleFirestoreError(err, OperationType.LIST, 'routines'),
        );
      },
    );

    const isTokenAdmin =
      firebaseUser.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL &&
      firebaseUser.emailVerified === true;

    let unsubProfiles: (() => void) | null = null;
    if (isTokenAdmin) {
      unsubProfiles = onSnapshot(
        collection(db, 'profiles'),
        (snapshot) => {
          const members: UserProfile[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              uid: String(data.uid ?? d.id),
              full_name: String(data.full_name ?? 'BSPI Member'),
              role:
                data.role === 'teacher' || data.role === 'admin'
                  ? data.role
                  : 'student',
              department: String(data.department ?? BSPI_DEPARTMENTS[0]),
              shift: normalizeShift(data.shift),
              semester: normalizeSemester(data.semester),
              email: String(data.email ?? ''),
              created_at: timestampToIso(data.created_at),
            };
          });
          setDirectoryProfiles(members);
        },
        (err) => {
          setDataError(
            safeHandleFirestoreError(err, OperationType.LIST, 'profiles'),
          );
        },
      );
    } else {
      setDirectoryProfiles([profile]);
    }

    return () => {
      unsubNotices();
      unsubRoutines();
      unsubProfiles?.();
    };
  }, [firebaseUser, profile]);

  const loadServerWorkspaceData = useCallback(async (token: string) => {
    if (!token) return;
    setServerLoading(true);
    try {
      const [fetchedNotes, fetchedLostFound] = await Promise.all([
        fetchStudyNotes(token).catch(() => []),
        fetchLostFoundItems(token).catch(() => []),
      ]);
      setNotes(fetchedNotes);
      setLostFound(fetchedLostFound);
    } finally {
      setServerLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!accessToken || !profile) return;
    void loadServerWorkspaceData(accessToken);
  }, [accessToken, profile, loadServerWorkspaceData]);

  async function handleCompleteOnboarding(e: React.FormEvent) {
    e.preventDefault();
    if (!firebaseUser || !onboardName.trim()) return;

    setOnboardSaving(true);
    setDataError(null);
    const cleanName = onboardName.trim().slice(0, 120);
    const cleanEmail = (
      firebaseUser.email || `${firebaseUser.uid}@campus.local`
    ).slice(0, 200);
    const profilePath = `profiles/${firebaseUser.uid}`;

    try {
      try {
        await setDoc(doc(db, 'profiles', firebaseUser.uid), {
          uid: firebaseUser.uid,
          full_name: cleanName,
          role: onboardRole,
          department: onboardDept,
          shift: onboardShift,
          semester: onboardSemester,
          bookmarked_notices: [],
          email: cleanEmail,
          created_at: serverTimestamp(),
        });
      } catch (firestoreErr) {
        handleFirestoreError(firestoreErr, OperationType.CREATE, profilePath);
      }
      setNeedsOnboarding(false);
      showToast({
        type: 'success',
        title: 'BSPI profile saved',
        description: `${onboardDept} · ${onboardShift}`,
      });
    } catch (err) {
      const msg = formatFirebaseError(err);
      setDataError(msg);
      showToast({ type: 'error', title: 'Profile save failed', description: msg });
    } finally {
      setOnboardSaving(false);
    }
  }

  async function handleToggleBookmark(notice: Notice) {
    if (!profile) return;
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
      setDataError(msg);
      showToast({ type: 'error', title: 'Bookmark failed', description: msg });
    }
  }

  async function handleSignOut() {
    await signOut(auth);
    showToast({
      type: 'info',
      title: 'Signed out',
      description: 'You have exited your CampusOS session.',
    });
  }

  async function handleSyncWorkspace() {
    if (!firebaseUser) return;
    setDataError(null);
    try {
      const freshToken = await firebaseUser.getIdToken(true);
      setAccessToken(freshToken);
      await loadServerWorkspaceData(freshToken);
      showToast({
        type: 'success',
        title: 'Workspace synced',
        description: 'Latest BSPI notices, routines, and files loaded.',
      });
    } catch (err) {
      const msg = formatFirebaseError(err);
      setDataError(msg);
      showToast({ type: 'error', title: 'Sync failed', description: msg });
    }
  }

  async function refreshNotesOnly() {
    if (!accessToken) return;
    const updated = await fetchStudyNotes(accessToken);
    setNotes(updated);
  }

  async function refreshLostFoundOnly() {
    if (!accessToken) return;
    const updated = await fetchLostFoundItems(accessToken);
    setLostFound(updated);
  }

  function handleQuickPromptAssistant(prompt: string) {
    setAssistantInitialPrompt(prompt);
    setActiveTab('assistant');
  }

  function handleNavigateWithDepartment(tab: ActiveTab, department?: string) {
    if (tab === 'routines' && department) {
      setRoutineDeptPrefill(department);
    } else if (tab === 'notes' && department) {
      setNotesDeptPrefill(department);
    }
    setActiveTab(tab);
  }

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-sm bg-white/85 backdrop-blur-md border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-700 text-white flex items-center justify-center font-display font-bold shrink-0">
              C
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="h-4 bg-slate-200 rounded w-32 animate-pulse" />
              <div className="h-3 bg-slate-100 rounded w-44 animate-pulse" />
            </div>
          </div>
          <div className="space-y-2 pt-2">
            <div className="h-3 bg-slate-100 rounded w-full animate-pulse" />
            <div className="h-3 bg-slate-100 rounded w-4/5 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return <AuthScreen />;
  }

  if (profileLoading && !needsOnboarding && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-sm bg-white/85 backdrop-blur-md border border-slate-200 rounded-xl p-6 space-y-3 text-center">
          <div className="w-9 h-9 rounded-lg bg-blue-700 text-white flex items-center justify-center font-display font-bold mx-auto">
            C
          </div>
          <p className="text-sm font-semibold text-slate-800">
            Loading your BSPI Kaptai workspace...
          </p>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full w-1/2 bg-blue-600/70 rounded-full animate-pulse mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  if (needsOnboarding || !profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <form
          onSubmit={handleCompleteOnboarding}
          className="w-full max-w-md bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-xs p-6 space-y-4"
        >
          <div>
            <p className="text-xs font-medium text-blue-700">
              {BSPI_INSTITUTE.fullName}
            </p>
            <h1 className="mt-1 text-xl font-bold text-slate-900">
              Complete your Campus Profile
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Select your technology, shift, and semester to personalize your BSPI dashboard.
            </p>
          </div>

          {dataError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {dataError}
            </div>
          )}

          <div>
            <label
              htmlFor="onboard-name"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Full Name
            </label>
            <input
              id="onboard-name"
              type="text"
              required
              maxLength={120}
              value={onboardName}
              onChange={(e) => setOnboardName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="onboard-role"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Role
              </label>
              <select
                id="onboard-role"
                value={onboardRole}
                onChange={(e) => setOnboardRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="onboard-shift"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Shift
              </label>
              <select
                id="onboard-shift"
                value={onboardShift}
                onChange={(e) => setOnboardShift(e.target.value as ShiftType)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
              >
                {SHIFTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="onboard-dept"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Technology
              </label>
              <select
                id="onboard-dept"
                value={onboardDept}
                onChange={(e) => setOnboardDept(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
              >
                {BSPI_DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="onboard-semester"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Semester
              </label>
              <select
                id="onboard-semester"
                value={onboardSemester}
                onChange={(e) =>
                  setOnboardSemester(e.target.value as SemesterType)
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
              >
                {SEMESTERS.map((sem) => (
                  <option key={sem} value={sem}>
                    {sem}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Sign out
            </button>
            <button
              type="submit"
              disabled={onboardSaving}
              className="px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-medium hover:bg-blue-800 disabled:opacity-50 cursor-pointer"
            >
              {onboardSaving ? 'Saving...' : 'Continue to CampusOS'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  const currentNavLabel =
    NAV_ITEMS.find((item) => item.id === activeTab)?.label ?? 'Overview';
  const workspaceLoading = firestoreLoading || serverLoading;

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 bg-white/90 backdrop-blur-md border-r border-slate-200/80 sticky top-0 h-screen">
          <div className="px-5 h-16 border-b border-slate-200/80 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-700 text-white flex items-center justify-center font-display font-bold text-sm">
              C
            </div>
            <span className="font-display font-bold text-base tracking-tight text-slate-900 whitespace-nowrap">
              CampusOS
            </span>
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-blue-50 text-blue-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      active ? 'text-blue-700' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Bottom User Profile & BSPI Campus Marker */}
          <div className="p-4 border-t border-slate-200/80 space-y-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {profile.full_name}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)} ·{' '}
                {profile.department}
              </p>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {BSPI_INSTITUTE.shortName}
                {profile.shift ? ` · ${profile.shift}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Mobile Drawer Sidebar */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            <aside className="relative w-72 max-w-[82vw] bg-white h-full flex flex-col border-r border-slate-200 z-10">
              <div className="px-5 h-14 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-700 text-white flex items-center justify-center font-display font-bold text-sm">
                    C
                  </div>
                  <span className="font-display font-bold text-base text-slate-900">
                    CampusOS
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
                  aria-label="Close navigation menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-blue-50 text-blue-800'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          active ? 'text-blue-700' : 'text-slate-400'
                        }`}
                      />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-slate-200 space-y-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {profile.full_name}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)} ·{' '}
                    {profile.department}
                  </p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {BSPI_INSTITUTE.shortName}
                    {profile.shift ? ` · ${profile.shift}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Main Content Viewport */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Top Bar */}
          <header className="h-14 lg:h-16 bg-white/85 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-20">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 text-sm text-slate-500 truncate">
                <span className="font-medium text-slate-400">BSPI Kaptai</span>
                <span aria-hidden="true">/</span>
                <span className="font-semibold text-slate-900 truncate">
                  {currentNavLabel}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => void handleSyncWorkspace()}
                disabled={workspaceLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${workspaceLoading ? 'animate-spin' : ''}`}
                />
                Sync
              </button>
            </div>
          </header>

          {/* Main Workspace */}
          <main className="flex-1 p-4 sm:p-8 pb-20 lg:pb-8 max-w-7xl w-full mx-auto">
            {dataError && (
              <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{dataError}</span>
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              >
                {activeTab === 'overview' && (
                  <OverviewPanel
                    profile={profile}
                    accessToken={accessToken}
                    notices={notices}
                    routines={routines}
                    notes={notes}
                    lostFound={lostFound}
                    directoryProfiles={directoryProfiles}
                    onNavigate={setActiveTab}
                    onQuickPromptAssistant={handleQuickPromptAssistant}
                    onToggleBookmark={handleToggleBookmark}
                  />
                )}

                {activeTab === 'notices' && (
                  <NoticesPanel
                    profile={profile}
                    accessToken={accessToken}
                    notices={notices}
                    loading={firestoreLoading}
                  />
                )}

                {activeTab === 'routines' && (
                  <RoutinesPanel
                    profile={profile}
                    routines={routines}
                    loading={firestoreLoading}
                    initialDepartmentFilter={routineDeptPrefill}
                    onClearInitialDepartment={() => setRoutineDeptPrefill(null)}
                  />
                )}

                {activeTab === 'directory' && (
                  <DirectoryPanel
                    profile={profile}
                    onNavigateWithDepartment={handleNavigateWithDepartment}
                  />
                )}

                {activeTab === 'assistant' && (
                  <AssistantPanel
                    profile={profile}
                    accessToken={accessToken}
                    notices={notices}
                    routines={routines}
                    initialPrompt={assistantInitialPrompt}
                    onClearInitialPrompt={() => setAssistantInitialPrompt(null)}
                  />
                )}

                {activeTab === 'notes' && (
                  <NotesPanel
                    profile={profile}
                    accessToken={accessToken}
                    notes={notes}
                    loading={serverLoading}
                    onRefresh={refreshNotesOnly}
                    initialDepartmentFilter={notesDeptPrefill}
                    onClearInitialDepartment={() => setNotesDeptPrefill(null)}
                  />
                )}

                {activeTab === 'lost-found' && (
                  <LostFoundPanel
                    profile={profile}
                    accessToken={accessToken}
                    items={lostFound}
                    loading={serverLoading}
                    onRefresh={refreshLostFoundOnly}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <nav
          aria-label="Mobile quick navigation"
          className="lg:hidden fixed bottom-0 inset-x-0 z-30 h-14 bg-white/95 backdrop-blur-md border-t border-slate-200/80 grid grid-cols-5"
        >
          {MOBILE_BOTTOM_TABS.map((tabId) => {
            const item = NAV_ITEMS.find((n) => n.id === tabId)!;
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  active ? 'text-blue-700' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    active ? 'text-blue-700' : 'text-slate-400'
                  }`}
                />
                <span>{item.shortLabel}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </MotionConfig>
  );
}
