import React, { useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Building2,
  GraduationCap,
  Lock,
  Mail,
  ShieldCheck,
  User,
} from 'lucide-react';
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
import { DEPARTMENTS, type UserRole } from '../types';

interface AuthScreenProps {
  onProfileCreated?: () => void;
}

const ROLE_OPTIONS: Array<{
  value: UserRole;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    value: 'student',
    label: 'Student',
    description: 'View schedules, AI notice summaries & PDF study tools',
    icon: GraduationCap,
  },
  {
    value: 'teacher',
    label: 'Teacher',
    description: 'Publish notices, manage class routines & share notes',
    icon: BookOpen,
  },
  {
    value: 'admin',
    label: 'Admin',
    description: 'Full campus oversight across departments & boards',
    icon: ShieldCheck,
  },
];

export function AuthScreen({ onProfileCreated }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [department, setDepartment] = useState<string>(DEPARTMENTS[0]);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  async function handleGoogleSignIn() {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError(formatFirebaseError(err));
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
            role,
            department,
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

        onProfileCreated?.();
      }
    } catch (err) {
      setError(formatFirebaseError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 items-stretch bg-slate-50">
      {/* Left Form Panel */}
      <div className="flex flex-col justify-between px-6 py-8 sm:px-12 lg:px-16 xl:px-24 bg-white border-r border-slate-200">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center font-display font-bold text-sm">
              C
            </div>
            <span className="font-display font-bold text-lg tracking-tight text-slate-900 whitespace-nowrap">
              CampusOS
            </span>
          </div>
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
            Academic Portal
          </span>
        </div>

        <div className="w-full max-w-md mx-auto my-10">
          <div className="mb-7">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
              {mode === 'login'
                ? 'Sign in to your campus workspace'
                : 'Create your campus account'}
            </h1>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              {mode === 'login'
                ? 'Access department routines, official notices, and Gemini AI study tools.'
                : 'Select your academic role and department to personalize your workspace.'}
            </p>
          </div>

          {/* Segmented Mode Switch */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`py-2 px-4 text-sm font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className={`py-2 px-4 text-sm font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                mode === 'signup'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Google Sign-In */}
          <button
            type="button"
            onClick={() => void handleGoogleSignIn()}
            disabled={googleLoading || loading}
            className="w-full py-2.5 px-4 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 transition-colors flex items-center justify-center gap-2.5 cursor-pointer"
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
            <span>or with university email</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
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
                    placeholder="Dr. Ayesha Rahman"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
                  />
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="auth-email"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                University Email
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
                  placeholder="name@university.edu"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
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
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
                />
              </div>
            </div>

            {mode === 'signup' && (
              <>
                <div>
                  <span className="block text-sm font-medium text-slate-700 mb-1.5">
                    Campus Role
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {ROLE_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      const active = role === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setRole(option.value)}
                          className={`flex flex-col items-start p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                            active
                              ? 'border-blue-700 bg-blue-50/70 text-blue-900'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <Icon
                            className={`w-4 h-4 mb-1.5 ${
                              active ? 'text-blue-700' : 'text-slate-500'
                            }`}
                          />
                          <span className="text-xs font-semibold whitespace-nowrap">
                            {option.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">
                    {ROLE_OPTIONS.find((r) => r.value === role)?.description}
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="auth-department"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Department
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <select
                      id="auth-department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
                    >
                      {DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full py-2.5 px-4 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {loading
                ? mode === 'login'
                  ? 'Signing in...'
                  : 'Creating account...'
                : mode === 'login'
                  ? 'Sign In'
                  : 'Create Campus Account'}
            </button>
          </form>
        </div>

        <p className="text-xs text-slate-500">
          CampusOS · Intelligent Campus Ecosystem
        </p>
      </div>

      {/* Right Architectural Showcase */}
      <div className="hidden lg:block relative overflow-hidden bg-slate-900">
        {!imgFailed ? (
          <img
            src="/src/assets/images/campus_architecture_hero_1795622865695.jpg"
            alt="Modern university library and campus courtyard"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-slate-950/15" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-white">
          <p className="text-xs font-medium text-blue-200 tracking-wide mb-3">
            Unified Academic Operations
          </p>
          <h2 className="text-3xl font-bold tracking-tight leading-snug max-w-lg text-balance">
            Routines, official notices, and AI-guided study tools in one calm workspace.
          </h2>
          <div className="mt-6 pt-6 border-t border-white/15 grid grid-cols-3 gap-6 max-w-lg text-sm">
            <div>
              <p className="font-semibold text-white">Smart Notices</p>
              <p className="text-xs text-slate-300 mt-1">Instant AI key takeaways</p>
            </div>
            <div>
              <p className="font-semibold text-white">Live Routines</p>
              <p className="text-xs text-slate-300 mt-1">Sorted by day & department</p>
            </div>
            <div>
              <p className="font-semibold text-white">PDF Study Q&A</p>
              <p className="text-xs text-slate-300 mt-1">Ask questions on lecture PDFs</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
