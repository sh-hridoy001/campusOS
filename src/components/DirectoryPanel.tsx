import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Building2,
  CalendarDays,
  Clock,
  ExternalLink,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Search,
} from 'lucide-react';
import {
  BSPI_DIRECTORY,
  BSPI_INSTITUTE,
  SHIFT_SCHEDULES,
} from '../data/bspi';
import {
  SEMESTERS,
  SHIFTS,
  type ActiveTab,
  type ShiftType,
  type UserProfile,
} from '../types';

interface DirectoryPanelProps {
  profile: UserProfile;
  onNavigateWithDepartment: (tab: ActiveTab, department?: string) => void;
}

export function DirectoryPanel({
  profile,
  onNavigateWithDepartment,
}: DirectoryPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShift, setSelectedShift] = useState<ShiftType>(
    profile.shift ?? '1st Shift',
  );

  const filteredDepartments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return BSPI_DIRECTORY;
    return BSPI_DIRECTORY.filter(
      (dept) =>
        dept.name.toLowerCase().includes(q) ||
        dept.shortCode.toLowerCase().includes(q) ||
        dept.code.toLowerCase().includes(q) ||
        dept.wing.toLowerCase().includes(q) ||
        dept.highlights.some((h) => h.toLowerCase().includes(q)),
    );
  }, [searchQuery]);

  const shiftInfo = SHIFT_SCHEDULES[selectedShift];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200/80">
        <div>
          <p className="text-xs font-medium text-slate-500">
            {BSPI_INSTITUTE.fullName} · Institute Code {BSPI_INSTITUTE.instituteCode}
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Academic & Campus Directory
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 max-w-2xl">
            Official BSPI Kaptai technologies, shift period timings, BTEB Probidhan-2022 syllabus portals, and department contact desks.
          </p>
        </div>

        <a
          href={BSPI_INSTITUTE.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-medium hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
        >
          <span>Official BSPI Website</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Quick Portals & Institute Overview */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 cols: Quick Official Links + Shift Periods */}
        <div className="lg:col-span-7 space-y-6">
          <section className="bg-white/85 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Official Academic Resources
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Direct links to BSPI Kaptai & Bangladesh Technical Education Board (BTEB)
                </p>
              </div>
              <GraduationCap className="w-4 h-4 text-slate-400 shrink-0" />
            </div>

            <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80">
              <div className="divide-y divide-slate-200/80">
                <a
                  href={BSPI_INSTITUTE.noticesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/90 transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                      BSPI Official Notice Archive
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      bspi.polytech.gov.bd/site/view/notices
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-700 shrink-0" />
                </a>

                <button
                  type="button"
                  onClick={() => onNavigateWithDepartment('routines')}
                  className="w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-slate-50/90 transition-colors group cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                      Interactive Class Routines
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Filter by department, 1st/2nd shift & semester
                    </p>
                  </div>
                  <CalendarDays className="w-4 h-4 text-slate-400 group-hover:text-blue-700 shrink-0" />
                </button>
              </div>

              <div className="divide-y divide-slate-200/80">
                <a
                  href={BSPI_INSTITUTE.syllabusUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/90 transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                      BTEB Diploma Syllabus (Probidhan-2022)
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      bteb.gov.bd · Curriculum & book lists
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-700 shrink-0" />
                </a>

                <button
                  type="button"
                  onClick={() => onNavigateWithDepartment('notes')}
                  className="w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-slate-50/90 transition-colors group cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                      Department PDF Notes & AI Q&A
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Read handouts & ask Gemini study questions
                    </p>
                  </div>
                  <BookOpen className="w-4 h-4 text-slate-400 group-hover:text-blue-700 shrink-0" />
                </button>
              </div>
            </div>
          </section>

          {/* Shift Period Schedule Card */}
          <section className="bg-white/85 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Daily Shift & Period Structure
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sunday – Thursday · 7 daily periods per shift
                </p>
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
                {SHIFTS.map((shift) => (
                  <button
                    key={shift}
                    type="button"
                    onClick={() => setSelectedShift(shift)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      selectedShift === shift
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {shift}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 pb-3 border-b border-slate-200/80">
              <span className="font-semibold text-slate-800">{shiftInfo.label}</span>
              <span className="font-mono tabular-nums text-blue-800 font-medium">
                {shiftInfo.window}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {shiftInfo.periods.map((period, idx) => (
                <div
                  key={period}
                  className="px-3.5 py-2.5 rounded-lg border border-slate-200/80 bg-slate-50/70 flex items-center justify-between text-xs"
                >
                  <span className="font-medium text-slate-700 tabular-nums">
                    Period {idx + 1}
                  </span>
                  <span className="font-mono text-slate-900 tabular-nums">
                    {period}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-500">{shiftInfo.notes}</p>
          </section>
        </div>

        {/* Right 5 cols: Campus Contact & Semester Info */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-white/85 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-xs p-5 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                BSPI Campus Administration
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Established {BSPI_INSTITUTE.established} · {BSPI_INSTITUTE.board}
              </p>
            </div>

            <div className="space-y-3 text-sm text-slate-700 pt-1">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-900">Campus Location</p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {BSPI_INSTITUTE.location}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-900">Office Hours</p>
                  <p className="text-xs text-slate-600 mt-0.5 tabular-nums">
                    {BSPI_INSTITUTE.officeHours}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-900">Principal & Registrar Office</p>
                  <p className="text-xs font-mono text-slate-600 mt-0.5 tabular-nums">
                    {BSPI_INSTITUTE.phone}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-900">Official Email</p>
                  <p className="text-xs font-mono text-slate-600 mt-0.5">
                    {BSPI_INSTITUTE.email}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white/85 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-xs p-5 space-y-3">
            <h2 className="text-base font-semibold text-slate-900">
              4-Year Diploma Structure
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Academic progression spans 8 semesters (6 months each), ending with Industrial Attachment in the 8th Semester under BTEB guidelines.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {SEMESTERS.map((sem, idx) => (
                <div
                  key={sem}
                  className={`px-3 py-2 rounded-lg border text-xs flex items-center justify-between tabular-nums ${
                    profile.semester === sem
                      ? 'border-blue-300 bg-blue-50/70 text-blue-900 font-semibold'
                      : 'border-slate-200/80 bg-slate-50/60 text-slate-700'
                  }`}
                >
                  <span>{sem}</span>
                  <span className="text-slate-400 font-normal">
                    {idx === 7 ? 'Attachment' : `Yr ${Math.floor(idx / 2) + 1}`}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Technologies & Department Directory */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              BSPI Technologies & Department Contacts
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select a department to view its class routine or study materials
            </p>
          </div>

          <div className="relative sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search technology, code, or lab..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white/90 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {filteredDepartments.map((dept) => {
            const isUserDept =
              dept.name.toLowerCase() === profile.department.toLowerCase();
            return (
              <article
                key={dept.name}
                className={`bg-white/85 backdrop-blur-md border rounded-xl p-5 flex flex-col justify-between gap-4 transition-all duration-150 hover:shadow-sm hover:border-slate-300 ${
                  isUserDept ? 'border-blue-300' : 'border-slate-200/90'
                }`}
              >
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-slate-500 tabular-nums">
                      {dept.shortCode} · Code {dept.code} · {dept.shifts}
                      {isUserDept ? ' · Your Technology' : ''}
                    </p>
                    <h3 className="mt-1 text-base font-bold text-slate-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-700 shrink-0" />
                      <span>{dept.name}</span>
                    </h3>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1">
                    <p>
                      <span className="font-semibold text-slate-800">Location:</span>{' '}
                      {dept.wing}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-800">Desk:</span>{' '}
                      {dept.headTitle} ({dept.contactDesk})
                    </p>
                  </div>

                  <ul className="space-y-1 text-xs text-slate-600 pt-1">
                    {dept.highlights.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="text-blue-700 font-bold" aria-hidden="true">
                          ·
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-3 border-t border-slate-200/80 flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => onNavigateWithDepartment('routines', dept.name)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Class Routine</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateWithDepartment('notes', dept.name)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Study PDFs</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
