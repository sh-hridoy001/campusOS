import React, { useState } from 'react';
import {
  AlertCircle,
  Building2,
  Clock,
  ExternalLink,
  GraduationCap,
  Lock,
  Mail,
  User,
} from 'lucide-react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  auth,
  db,
  formatFirebaseError,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import { BSPI_INSTITUTE } from '../data/bspi';
import {
  BSPI_DEPARTMENTS,
  SEMESTERS,
  SHIFTS,
  type SemesterType,
  type ShiftType,
} from '../types';
import { useToast } from './ToastProvider';

interface AuthScreenProps {
  onProfileCreated?: () => void;
}

export function AuthScreen({ onProfileCreated }: AuthScreenProps) {
  const { showToast } = useToast();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState<string>(BSPI_DEPARTMENTS[0]);
  const [shift, setShift] = useState<ShiftType>('1st Shift');
  const [semester, setSemester] = useState<SemesterType>('1st Semester');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  async function handleGoogleSignIn() {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      showToast({
        type: 'success',
        title: 'Signed in with Google',
        description: 'Loading your BSPI Kaptai workspace.',
      });
    } catch (err) {
      const msg = formatFirebaseError(err);
      setError(msg);
      showToast({ type: 'error', title: 'Google Sign-In failed', description: msg });
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    if (mode === 'signup' && !fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        showToast({
          type: 'success',
          title: 'Welcome back to CampusOS',
          description: 'Signed in to BSPI Kaptai portal.',
        });
      } else {
        const cleanName = fullName.trim().slice(0, 120);
        const cleanEmail = email.trim().slice(0, 200);
        const credential = await createUserWithEmailAndPassword(
          auth,
          cleanEmail,
          password,
        );

        await updateProfile(credential.user, {
          displayName: cleanName,
        });

        const profilePath = `profiles/${credential.user.uid}`;
        try {
          await setDoc(doc(db, 'profiles', credential.user.uid), {
            uid: credential.user.uid,
            full_name: cleanName,
            role: 'student',
            department,
            shift,
            semester,
            bookmarked_notices: [],
            email: cleanEmail,
            created_at: serverTimestamp(),
          });
        } catch (firestoreErr) {
          handleFirestoreError(
            firestoreErr,
            OperationType.CREATE,
            profilePath,
          );
        }

        showToast({
          type: 'success',
          title: 'Campus account created',
          description: `${department} · ${shift}`,
        });
        onProfileCreated?.();
      }
    } catch (err) {
      const msg = formatFirebaseError(err);
      setError(msg);
      showToast({
        type: 'error',
        title: mode === 'login' ? 'Sign-in failed' : 'Registration failed',
        description: msg,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen grid lg:grid-cols-2 items-stretch bg-slate-50 relative overflow-hidden">
        {/* Left Form Panel */}
        <div className="relative flex flex-col justify-between px-6 py-8 sm:px-12 lg:px-16 xl:px-20 bg-white/90 backdrop-blur-md border-r border-slate-200/80 overflow-hidden">
          {/* Lightweight Animated Ambient Mesh */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-28 -left-28 w-96 h-96 rounded-full bg-blue-600/[0.06] blur-3xl animate-mesh-drift"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 -right-24 w-96 h-96 rounded-full bg-cyan-600/[0.05] blur-3xl animate-mesh-drift"
          />

          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center font-display font-bold text-sm shadow-xs">
                C
              </div>
              <span className="font-display font-bold text-lg tracking-tight text-slate-900 whitespace-nowrap">
                CampusOS
              </span>
            </div>
            <a
              href={BSPI_INSTITUTE.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-blue-700 font-medium whitespace-nowrap transition-colors"
            >
              <span>BSPI Kaptai</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-md mx-auto my-8"
          >
            {/* Compact Mobile Academic Card */}
            <div className="lg:hidden mb-6 p-4 rounded-xl border border-slate-200/90 bg-slate-50/85 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-blue-700">
                    Institute Code {BSPI_INSTITUTE.instituteCode} · Est. {BSPI_INSTITUTE.established}
                  </p>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">
                    {BSPI_INSTITUTE.shortName} Academic Portal
                  </p>
                </div>
                <GraduationCap className="w-5 h-5 text-blue-700 shrink-0" />
              </div>
            </div>

            <div className="mb-6">
              <p className="text-xs font-medium text-blue-700 mb-1">
                {BSPI_INSTITUTE.fullName} · {BSPI_INSTITUTE.location}
              </p>
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                >
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
                    {mode === 'login'
                      ? 'Sign in to your campus workspace'
                      : 'Create your BSPI student account'}
                  </h1>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                    {mode === 'login'
                      ? 'Access 1st & 2nd shift routines, official notices, BTEB resources, and AI study tools.'
                      : 'Choose your technology, shift, and semester to personalize your academic dashboard.'}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Segmented Mode Switch */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg mb-5">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className={`relative py-2 px-4 text-sm font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer active:scale-[0.98] ${
                  mode === 'login'
                    ? 'text-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode === 'login' && (
                  <motion.span
                    layoutId="auth-mode-tab"
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-0 rounded-md bg-white shadow-xs"
                    aria-hidden="true"
                  />
                )}
                <span className="relative z-10">Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                }}
                className={`relative py-2 px-4 text-sm font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer active:scale-[0.98] ${
                  mode === 'signup'
                    ? 'text-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode === 'signup' && (
                  <motion.span
                    layoutId="auth-mode-tab"
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-0 rounded-md bg-white shadow-xs"
                    aria-hidden="true"
                  />
                )}
                <span className="relative z-10">Create Account</span>
              </button>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.16 }}
                  className="mb-5 p-3.5 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm flex items-start gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Google Sign-In */}
            <button
              type="button"
              onClick={() => void handleGoogleSignIn()}
              disabled={googleLoading || loading}
              className="w-full py-2.5 px-4 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm font-semibold hover:bg-slate-50 hover:border-slate-400 hover:shadow-xs disabled:opacity-50 transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                />
              </svg>
              <span>
                {googleLoading ? 'Connecting with Google...' : 'Continue with Google'}
              </span>
            </button>

            <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
              <div className="flex-1 h-px bg-slate-200" />
              <span>or with email</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence initial={false}>
                {mode === 'signup' && (
                  <motion.div
                    key="signup-fullname"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <label
                      htmlFor="auth-full-name"
                      className="block text-sm font-medium text-slate-700 mb-1.5"
                    >
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="auth-full-name"
                        type="text"
                        required
                        maxLength={120}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g., Tanvir Ahmed"
                        className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700 transition-colors"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <label
                  htmlFor="auth-email"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-email"
                    type="email"
                    required
                    maxLength={200}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@bspi.polytech.gov.bd"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="auth-password"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700 transition-colors"
                  />
                </div>
              </div>

              <AnimatePresence initial={false}>
                {mode === 'signup' && (
                  <motion.div
                    key="signup-academic-fields"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-4"
                  >
                    <div>
                      <label
                        htmlFor="auth-department"
                        className="block text-sm font-medium text-slate-700 mb-1.5"
                      >
                        Technology / Department
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <select
                          id="auth-department"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700 transition-colors"
                        >
                          {BSPI_DEPARTMENTS.map((dept) => (
                            <option key={dept} value={dept}>
                              {dept}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="auth-shift"
                          className="block text-xs font-medium text-slate-700 mb-1.5"
                        >
                          Shift
                        </label>
                        <div className="relative">
                          <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <select
                            id="auth-shift"
                            value={shift}
                            onChange={(e) => setShift(e.target.value as ShiftType)}
                            className="w-full pl-8 pr-2.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700 transition-colors"
                          >
                            {SHIFTS.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="auth-semester"
                          className="block text-xs font-medium text-slate-700 mb-1.5"
                        >
                          Semester
                        </label>
                        <select
                          id="auth-semester"
                          value={semester}
                          onChange={(e) => setSemester(e.target.value as SemesterType)}
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700 transition-colors"
                        >
                          {SEMESTERS.map((sem) => (
                            <option key={sem} value={sem}>
                              {sem}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full py-2.5 px-4 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-[0.98] cursor-pointer"
              >
                {loading
                  ? mode === 'login'
                    ? 'Signing in...'
                    : 'Creating account...'
                  : mode === 'login'
                    ? 'Sign In'
                    : 'Create Student Account'}
              </button>
            </form>
          </motion.div>

          <p className="relative z-10 text-xs text-slate-500">
            CampusOS · {BSPI_INSTITUTE.shortName} ({BSPI_INSTITUTE.board})
          </p>
        </div>

        {/* Right Architectural Showcase with Academic Hero Card */}
        <div className="hidden lg:flex relative overflow-hidden bg-slate-900 items-end">
          {!imgFailed ? (
            <img
              src="/src/assets/images/campus_architecture_hero_1795622865695.jpg"
              alt="Modern polytechnic campus library and courtyard"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900" />
          )}

          {/* Scrim + Subtle Ambient Gradient Mesh */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/92 via-slate-950/55 to-slate-950/25" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-24 w-[28rem] h-[28rem] rounded-full bg-blue-500/20 blur-3xl animate-mesh-drift"
          />

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full p-10 xl:p-12"
          >
            <div className="max-w-xl rounded-2xl bg-slate-950/65 backdrop-blur-md border border-white/15 p-8 text-white shadow-2xl">
              <p className="text-xs font-medium text-blue-200 tracking-wide mb-2.5 tabular-nums">
                Est. {BSPI_INSTITUTE.established} · Kaptai, Rangamati · Code{' '}
                {BSPI_INSTITUTE.instituteCode}
              </p>
              <h2 className="text-2xl xl:text-3xl font-bold tracking-tight leading-snug text-balance">
                Bangladesh Sweden Polytechnic Institute, unified in one calm academic portal.
              </h2>
              <p className="mt-2.5 text-sm text-slate-300 leading-relaxed">
                Live class routines for 1st & 2nd shifts, official BSPI & BTEB circulars, and Gemini AI study support.
              </p>

              <div className="mt-6 pt-5 border-t border-white/15 grid grid-cols-3 gap-5 text-sm">
                <div>
                  <p className="font-semibold text-white">6 Technologies</p>
                  <p className="text-xs text-slate-300 mt-1">
                    CST, Electrical, Mechanical, Automobile, Construction & Civil (Wood)
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-white">1st & 2nd Shift</p>
                  <p className="text-xs text-slate-300 mt-1">
                    Live period & semester tracking
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-white">BTEB & AI Tools</p>
                  <p className="text-xs text-slate-300 mt-1">
                    Probidhan-2022, notices & PDF Q&A
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </MotionConfig>
  );
}
