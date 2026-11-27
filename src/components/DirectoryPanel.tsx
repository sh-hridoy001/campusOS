import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Building2,
  CalendarDays,
  Clock,
  ExternalLink,
  GraduationCap,
  Library,
  Mail,
  MapPin,
  Megaphone,
  Phone,
  Search,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  BSPI_DIRECTORY,
  BSPI_INSTITUTE,
  BTEB_ACADEMIC_RESOURCES,
  BTEB_GRADING_SCALE,
  BTEB_PROBIDHAN_RULES,
  SHIFT_SCHEDULES,
} from '../data/bspi';
import {
  BSPI_TECHNOLOGY_BOOKLISTS,
  BTEB_BOOKLISTS_URL,
} from '../data/booklists';
import {
  BSPI_DEPARTMENTS,
  SEMESTERS,
  SHIFTS,
  type ActiveTab,
  type BspiDepartmentName,
  type BtebSubjectCategory,
  type SemesterType,
  type ShiftType,
  type UserProfile,
} from '../types';

interface DirectoryPanelProps {
  profile: UserProfile;
  onNavigateWithDepartment: (tab: ActiveTab, department?: string) => void;
}

type BtebGuideTab = 'rules' | 'grading' | 'semesters';
type DeptShiftFilter = 'All' | ShiftType;
type SubjectCategoryFilter = 'All' | BtebSubjectCategory;

const SEMESTER_LABELS_BN: Record<SemesterType, string> = {
  '1st Semester': '১ম সেমিস্টার',
  '2nd Semester': '২য় সেমিস্টার',
  '3rd Semester': '৩য় সেমিস্টার',
  '4th Semester': '৪র্থ সেমিস্টার',
  '5th Semester': '৫ম সেমিস্টার',
  '6th Semester': '৬ষ্ঠ সেমিস্টার',
  '7th Semester': '৭ম সেমিস্টার',
  '8th Semester': '৮ম সেমিস্টার',
};

const CATEGORY_LABELS_BN: Record<BtebSubjectCategory, string> = {
  Core: 'টেকনিক্যাল বিষয়',
  Related: 'সাধারণ ও বিজ্ঞান',
  Attachment: 'ইন্ডাস্ট্রিয়াল এটাচমেন্ট',
};

function resolveInitialBooklistDept(userDepartment: string): BspiDepartmentName {
  const match = BSPI_DEPARTMENTS.find(
    (d) => d.toLowerCase() === userDepartment.toLowerCase(),
  );
  return match ?? BSPI_DEPARTMENTS[0];
}

export function DirectoryPanel({
  profile,
  onNavigateWithDepartment,
}: DirectoryPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [deptShiftFilter, setDeptShiftFilter] = useState<DeptShiftFilter>('All');
  const [selectedShift, setSelectedShift] = useState<ShiftType>(
    profile.shift ?? '1st Shift',
  );
  const [btebTab, setBtebTab] = useState<BtebGuideTab>('rules');

  // Probidhan-2022 Booklist & Subject Explorer state
  const [booklistDept, setBooklistDept] = useState<BspiDepartmentName>(() =>
    resolveInitialBooklistDept(profile.department),
  );
  const [booklistSemester, setBooklistSemester] = useState<SemesterType>(
    profile.semester ?? '1st Semester',
  );
  const [subjectSearch, setSubjectSearch] = useState('');
  const [subjectCategoryFilter, setSubjectCategoryFilter] =
    useState<SubjectCategoryFilter>('All');

  const activeTechBooklist = useMemo(
    () =>
      BSPI_TECHNOLOGY_BOOKLISTS.find((t) => t.department === booklistDept) ??
      BSPI_TECHNOLOGY_BOOKLISTS[0],
    [booklistDept],
  );

  const explorerSubjects = useMemo(() => {
    const q = subjectSearch.trim().toLowerCase();

    if (q) {
      // Search across all 8 semesters of the selected technology
      return SEMESTERS.flatMap((sem) =>
        (activeTechBooklist.semesters[sem] ?? [])
          .filter((subj) => {
            if (
              subjectCategoryFilter !== 'All' &&
              subj.category !== subjectCategoryFilter
            ) {
              return false;
            }
            return (
              subj.code.toLowerCase().includes(q) ||
              subj.nameEn.toLowerCase().includes(q) ||
              subj.nameBn.toLowerCase().includes(q)
            );
          })
          .map((subj) => ({ ...subj, semester: sem })),
      );
    }

    return (activeTechBooklist.semesters[booklistSemester] ?? [])
      .filter(
        (subj) =>
          subjectCategoryFilter === 'All' ||
          subj.category === subjectCategoryFilter,
      )
      .map((subj) => ({ ...subj, semester: booklistSemester }));
  }, [
    activeTechBooklist,
    booklistSemester,
    subjectSearch,
    subjectCategoryFilter,
  ]);

  const totalCreditsInView = useMemo(
    () => explorerSubjects.reduce((sum, s) => sum + s.credits, 0),
    [explorerSubjects],
  );

  const semesterSpecificNote =
    !subjectSearch.trim() && activeTechBooklist.semesterNotes?.[booklistSemester];

  const filteredDepartments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return BSPI_DIRECTORY.filter((dept) => {
      if (
        deptShiftFilter !== 'All' &&
        !dept.shifts.toLowerCase().includes(deptShiftFilter.toLowerCase())
      ) {
        return false;
      }
      if (!q) return true;
      return (
        dept.name.toLowerCase().includes(q) ||
        dept.shortCode.toLowerCase().includes(q) ||
        dept.code.toLowerCase().includes(q) ||
        dept.wing.toLowerCase().includes(q) ||
        dept.highlights.some((h) => h.toLowerCase().includes(q))
      );
    });
  }, [searchQuery, deptShiftFilter]);

  const shiftInfo = SHIFT_SCHEDULES[selectedShift];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-slate-200/80">
        <div>
          <p className="text-xs font-medium text-slate-500">
            {BSPI_INSTITUTE.fullNameBn} · ইনস্টিটিউট কোড {BSPI_INSTITUTE.instituteCode} · স্থাপিত{' '}
            {BSPI_INSTITUTE.established}
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            BSPI ও BTEB একাডেমিক হাব
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 max-w-2xl">
            বিএসপিআই-এর নির্ধারিত ৬টি টেকনোলজির প্রবিধান ২০২২ বুকলিস্ট, বিষয় কোড, অফিশিয়াল বিটিইবি লিংক এবং শিফট সময়সূচি।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={BTEB_BOOKLISTS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white/95 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-150 active:scale-[0.98] whitespace-nowrap shrink-0"
          >
            <span>BTEB বুকলিস্ট</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </a>

          <a
            href={BSPI_INSTITUTE.btebUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white/95 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-150 active:scale-[0.98] whitespace-nowrap shrink-0"
          >
            <span>BTEB পোর্টাল</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </a>

          <a
            href={BSPI_INSTITUTE.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-medium hover:bg-blue-800 transition-all duration-150 active:scale-[0.98] whitespace-nowrap shrink-0"
          >
            <span>BSPI ওয়েবসাইট</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Probidhan-2022 Booklist & Subject Explorer (Strictly BSPI's 6 Technologies) */}
      <section className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Library className="w-4 h-4 text-blue-700 shrink-0" />
              <span>বুকলিস্ট ও সাবজেক্ট এক্সপ্লোরার (প্রবিধান ২০২২)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              BSPI কাপ্তাই-এর নির্ধারিত ৬টি টেকনোলজির ১ম থেকে ৮ম সেমিস্টারের বিষয় ও কোড দেখুন
            </p>
          </div>

          <a
            href={BTEB_BOOKLISTS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-blue-200 bg-blue-50/70 text-xs font-semibold text-blue-800 hover:bg-blue-100/70 transition-all duration-150 active:scale-[0.98] whitespace-nowrap shrink-0 w-fit"
          >
            <span>অফিশিয়াল বুকলিস্ট (btebresultszone.com)</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="p-5 space-y-5">
          {/* 1. Technology Selector (Strictly 6 BSPI Departments) */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-700">
              ১. আপনার টেকনোলজি বাছাই করুন (BSPI-এর ৬টি ডিপার্টমেন্ট):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {BSPI_TECHNOLOGY_BOOKLISTS.map((tech) => {
                const isSelected = tech.department === booklistDept;
                const isMyDept =
                  tech.department.toLowerCase() ===
                  profile.department.toLowerCase();
                return (
                  <button
                    key={tech.department}
                    type="button"
                    onClick={() => setBooklistDept(tech.department)}
                    className={`text-left p-3 rounded-xl border transition-all duration-150 active:scale-[0.98] cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/80 shadow-xs'
                        : 'border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-blue-300/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span
                        className={`font-mono font-bold tabular-nums ${
                          isSelected ? 'text-blue-800' : 'text-slate-600'
                        }`}
                      >
                        {tech.shortCode} · কোড {tech.techCode}
                      </span>
                      {isMyDept && (
                        <span className="text-[11px] font-medium text-blue-700">
                          আপনার ডিপার্টমেন্ট
                        </span>
                      )}
                    </div>
                    <p
                      className={`mt-1 text-sm font-semibold truncate ${
                        isSelected ? 'text-slate-900' : 'text-slate-800'
                      }`}
                    >
                      {tech.department}
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {tech.nameBn}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Semester Selector + Search + Category Filter */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {SEMESTERS.map((sem) => {
                const active = !subjectSearch.trim() && booklistSemester === sem;
                return (
                  <button
                    key={sem}
                    type="button"
                    onClick={() => {
                      setBooklistSemester(sem);
                      if (subjectSearch.trim()) setSubjectSearch('');
                    }}
                    className={`relative px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                      active
                        ? 'text-slate-900'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="booklist-semester-tab"
                        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute inset-0 rounded-md bg-white shadow-xs"
                        aria-hidden="true"
                      />
                    )}
                    <span className="relative z-10">
                      {SEMESTER_LABELS_BN[sem]}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
              <select
                value={subjectCategoryFilter}
                onChange={(e) =>
                  setSubjectCategoryFilter(e.target.value as SubjectCategoryFilter)
                }
                aria-label="বিষয়ের ধরন অনুযায়ী ফিল্টার"
                className="px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
              >
                <option value="All">সব ধরন (টেকনিক্যাল ও সাধারণ)</option>
                <option value="Core">টেকনিক্যাল বিষয়</option>
                <option value="Related">সাধারণ ও বিজ্ঞান</option>
                <option value="Attachment">ইন্ডাস্ট্রিয়াল এটাচমেন্ট</option>
              </select>

              <div className="relative sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={subjectSearch}
                  onChange={(e) => setSubjectSearch(e.target.value)}
                  placeholder="বিষয়ের নাম বা কোড খুঁজুন..."
                  className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
                />
                {subjectSearch && (
                  <button
                    type="button"
                    onClick={() => setSubjectSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
                    aria-label="সার্চ মুছুন"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 3. Active Summary Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs">
            <div className="font-medium text-slate-700">
              <span className="font-semibold text-slate-900">
                {activeTechBooklist.nameBn} ({activeTechBooklist.techCode})
              </span>{' '}
              ·{' '}
              {subjectSearch.trim()
                ? `সকল সেমিস্টারে সার্চ ফলাফল`
                : SEMESTER_LABELS_BN[booklistSemester]}
            </div>
            <div className="font-mono text-slate-600 tabular-nums">
              মোট {explorerSubjects.length}টি বিষয় · {totalCreditsInView} ক্রেডিট
            </div>
          </div>

          {semesterSpecificNote && (
            <div className="px-4 py-2.5 rounded-lg bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 leading-relaxed">
              {semesterSpecificNote}
            </div>
          )}

          {/* 4. Subjects Grid */}
          {explorerSubjects.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
              <p className="text-sm font-semibold text-slate-700">
                কোনো বিষয় পাওয়া যায়নি
              </p>
              <p className="mt-1 text-xs text-slate-500">
                অনুগ্রহ করে অন্য বিষয় কোড বা নাম লিখে খুঁজুন অথবা ফিল্টার পরিবর্তন করুন।
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {explorerSubjects.map((subj) => (
                <div
                  key={`${subj.semester}-${subj.code}`}
                  className="p-4 rounded-xl border border-slate-200/90 bg-white hover:border-blue-300/80 hover:shadow-sm transition-all duration-150 flex flex-col justify-between gap-2.5"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-mono font-bold text-blue-800 tabular-nums">
                        কোড: {subj.code}
                      </span>
                      <span className="text-slate-500 tabular-nums">
                        {subj.credits} ক্রেডিট
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-sm font-semibold text-slate-900 leading-snug">
                      {subj.nameBn}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {subj.nameEn}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                    <span>{CATEGORY_LABELS_BN[subj.category]}</span>
                    {subjectSearch.trim() && (
                      <span className="font-medium text-slate-700">
                        {SEMESTER_LABELS_BN[subj.semester]}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* BTEB & BSPI Official Resource Hub */}
      <section className="bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              BTEB একাডেমিক কর্নার ও অফিশিয়াল পোর্টাল
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ডিপ্লোমা-ইন-ইঞ্জিনিয়ারিং শিক্ষার্থীদের জন্য bteb.gov.bd, btebresultszone.com ও bspi.polytech.gov.bd লিংক
            </p>
          </div>
          <span className="text-xs font-medium text-blue-800 whitespace-nowrap shrink-0">
            প্রবিধান ২০২২ কারিকুলাম
          </span>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80">
          {BTEB_ACADEMIC_RESOURCES.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-5 flex flex-col justify-between gap-3 hover:bg-blue-50/35 hover:shadow-xs transition-all duration-150 active:scale-[0.98] group"
            >
              <div>
                <p className="text-xs font-medium text-slate-500 flex items-center justify-between gap-2">
                  <span>
                    {item.source} · {item.category}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-700 transition-colors shrink-0" />
                </p>
                <h3 className="mt-1.5 text-sm font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                  {item.titleBn}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{item.title}</p>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  {item.description}
                </p>
              </div>
              <p className="text-xs font-mono text-slate-400 truncate">
                {item.hostLabel}
              </p>
            </a>
          ))}
        </div>

        {/* Quick Internal BSPI Tools Strip */}
        <div className="border-t border-slate-200/80 bg-slate-50/60 grid sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80">
          <a
            href={BSPI_INSTITUTE.noticesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-white/80 transition-colors group"
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 group-hover:text-blue-700 truncate">
                BSPI অফিশিয়াল নোটিশ
              </p>
              <p className="text-xs text-slate-500 truncate">
                bspi.polytech.gov.bd
              </p>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-700 shrink-0" />
          </a>

          <button
            type="button"
            onClick={() => onNavigateWithDepartment('notices')}
            className="px-5 py-3.5 text-left flex items-center justify-between gap-3 hover:bg-white/80 transition-colors group cursor-pointer"
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 group-hover:text-blue-700 truncate">
                ক্যাম্পাস নোটিশ বোর্ড
              </p>
              <p className="text-xs text-slate-500 truncate">
                পরীক্ষা, উপবৃত্তি ও AI সারাংশ
              </p>
            </div>
            <Megaphone className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-700 shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => onNavigateWithDepartment('routines')}
            className="px-5 py-3.5 text-left flex items-center justify-between gap-3 hover:bg-white/80 transition-colors group cursor-pointer"
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 group-hover:text-blue-700 truncate">
                শিফট ও ক্লাস রুটিন
              </p>
              <p className="text-xs text-slate-500 truncate">
                ১ম ও ২য় শিফট সময়সূচি
              </p>
            </div>
            <CalendarDays className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-700 shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => onNavigateWithDepartment('notes')}
            className="px-5 py-3.5 text-left flex items-center justify-between gap-3 hover:bg-white/80 transition-colors group cursor-pointer"
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 group-hover:text-blue-700 truncate">
                PDF নোটস ও AI প্রশ্নোত্তর
              </p>
              <p className="text-xs text-slate-500 truncate">
                হ্যান্ডআউট ও স্টাডি গাইড
              </p>
            </div>
            <BookOpen className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-700 shrink-0" />
          </button>
        </div>
      </section>

      {/* Two-Column Operational & Academic Reference */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 cols: Shift Timings + BTEB Probidhan Interactive Guide */}
        <div className="lg:col-span-7 space-y-6">
          {/* Shift Period Schedule Card */}
          <section className="bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  BSPI দৈনিক শিফট ও ক্লাস পিরিয়ড
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  রবিবার – বৃহস্পতিবার · প্রতি শিফটে ৭টি পিরিয়ড
                </p>
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
                {SHIFTS.map((shift) => {
                  const active = selectedShift === shift;
                  return (
                    <button
                      key={shift}
                      type="button"
                      onClick={() => setSelectedShift(shift)}
                      className={`relative px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="directory-shift-tab"
                          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                          className="absolute inset-0 rounded-md bg-white shadow-xs"
                          aria-hidden="true"
                        />
                      )}
                      <span className="relative z-10">{shift}</span>
                    </button>
                  );
                })}
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
                    পিরিয়ড {idx + 1}
                  </span>
                  <span className="font-mono text-slate-900 tabular-nums">
                    {period}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-500">{shiftInfo.notes}</p>
          </section>

          {/* Interactive BTEB Probidhan-2022 Guide */}
          <section className="bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-blue-700 shrink-0" />
                  <span>BTEB প্রবিধান-২০২২ নির্দেশিকা</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  একাডেমিক নিয়ম, ৪.০০ স্কেলে জিপিএ গ্রেডিং ও ৮ সেমিস্টার কাঠামো
                </p>
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit overflow-x-auto">
                {(
                  [
                    { id: 'rules', label: 'নিয়মাবলি' },
                    { id: 'grading', label: 'জিপিএ স্কেল' },
                    { id: 'semesters', label: '৮ সেমিস্টার' },
                  ] as const
                ).map((tab) => {
                  const active = btebTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setBtebTab(tab.id)}
                      className={`relative px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="bteb-guide-tab"
                          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                          className="absolute inset-0 rounded-md bg-white shadow-xs"
                          aria-hidden="true"
                        />
                      )}
                      <span className="relative z-10">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {btebTab === 'rules' && (
              <div className="divide-y divide-slate-200/80">
                {BTEB_PROBIDHAN_RULES.map((rule, idx) => (
                  <div key={rule.title} className="py-3 first:pt-0 last:pb-0">
                    <p className="text-sm font-semibold text-slate-900 tabular-nums">
                      0{idx + 1}. {rule.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                      {rule.detail}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {btebTab === 'grading' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {BTEB_GRADING_SCALE.map((row) => (
                  <div
                    key={row.grade}
                    className="px-3.5 py-2 rounded-lg border border-slate-200/80 bg-slate-50/70 flex items-center justify-between text-xs tabular-nums"
                  >
                    <span className="font-mono text-slate-600">{row.marks}</span>
                    <span className="font-semibold text-slate-900">
                      {row.grade} · {row.gpa}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {btebTab === 'semesters' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  ডিপ্লোমা-ইন-ইঞ্জিনিয়ারিং কোর্স মোট ৮ সেমিস্টারে (প্রতিটি ৬ মাস) সম্পন্ন হয় এবং ৮ম সেমিস্টারে বাধ্যতামূলক ইন্ডাস্ট্রিয়াল এটাচমেন্ট থাকে।
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {SEMESTERS.map((sem, idx) => (
                    <div
                      key={sem}
                      className={`px-3 py-2 rounded-lg border text-xs flex items-center justify-between tabular-nums ${
                        profile.semester === sem
                          ? 'border-blue-300 bg-blue-50/75 text-blue-900 font-semibold'
                          : 'border-slate-200/80 bg-slate-50/60 text-slate-700'
                      }`}
                    >
                      <span>{SEMESTER_LABELS_BN[sem]}</span>
                      <span className="text-slate-400 font-normal">
                        {idx === 7 ? 'এটাচমেন্ট' : `${Math.floor(idx / 2) + 1}ম বর্ষ`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Right 5 cols: Campus Contact & Institute Profile */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-xs p-5 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                BSPI ক্যাম্পাস প্রশাসন ও যোগাযোগ
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {BSPI_INSTITUTE.fullNameBn}
              </p>
            </div>

            <div className="space-y-3 text-sm text-slate-700 pt-1">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-900">ঠিকানা</p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {BSPI_INSTITUTE.location}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-900">অফিস সময়</p>
                  <p className="text-xs text-slate-600 mt-0.5 tabular-nums">
                    {BSPI_INSTITUTE.officeHours}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-900">অধ্যক্ষ ও রেজিস্ট্রার অফিস</p>
                  <p className="text-xs font-mono text-slate-600 mt-0.5 tabular-nums">
                    {BSPI_INSTITUTE.phone}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-900">অফিশিয়াল ইমেইল</p>
                  <p className="text-xs font-mono text-slate-600 mt-0.5">
                    {BSPI_INSTITUTE.email}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-xs p-5 space-y-3">
            <h2 className="text-base font-semibold text-slate-900">
              আপনার একাডেমিক প্রোফাইল
            </h2>
            <div className="divide-y divide-slate-200/80 text-xs">
              <div className="py-2.5 flex items-center justify-between gap-2">
                <span className="text-slate-500">টেকনোলজি</span>
                <span className="font-semibold text-slate-900 text-right">
                  {profile.department}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-2">
                <span className="text-slate-500">শিফট</span>
                <span className="font-semibold text-slate-900">
                  {profile.shift || 'সকল শিফট'}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-2">
                <span className="text-slate-500">বর্তমান সেমিস্টার</span>
                <span className="font-semibold text-slate-900">
                  {profile.semester
                    ? SEMESTER_LABELS_BN[profile.semester]
                    : 'উল্লেখ নেই'}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-2">
                <span className="text-slate-500">ইনস্টিটিউট কোড</span>
                <span className="font-mono font-semibold text-blue-800 tabular-nums">
                  {BSPI_INSTITUTE.instituteCode}
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Technologies & Department Directory (Strictly 6 BSPI Technologies) */}
      <section className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              BSPI-এর ৬টি টেকনোলজি ও ডিপার্টমেন্ট ডেস্ক
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              শিফট বা সার্চের মাধ্যমে আপনার ডিপার্টমেন্টের রুটিন, PDF নোটস বা বুকলিস্ট দেখুন
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
              {(['All', ...SHIFTS] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setDeptShiftFilter(s)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    deptShiftFilter === s
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {s === 'All' ? 'সকল শিফট' : s}
                </button>
              ))}
            </div>

            <div className="relative sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="টেকনোলজি বা কোড খুঁজুন..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-white/95 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
                  aria-label="সার্চ মুছুন"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {filteredDepartments.map((dept) => {
            const isUserDept =
              dept.name.toLowerCase() === profile.department.toLowerCase();
            return (
              <article
                key={dept.name}
                className={`bg-white/90 backdrop-blur-md border rounded-xl p-5 flex flex-col justify-between gap-4 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md hover:shadow-blue-950/[0.045] hover:border-blue-300/80 ${
                  isUserDept ? 'border-blue-300' : 'border-slate-200/90'
                }`}
              >
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-slate-500 tabular-nums">
                      {dept.shortCode} · কোড {dept.code} · {dept.shifts}
                      {isUserDept ? ' · আপনার টেকনোলজি' : ''}
                    </p>
                    <h3 className="mt-1 text-base font-bold text-slate-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-700 shrink-0" />
                      <span>{dept.name}</span>
                    </h3>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1">
                    <p>
                      <span className="font-semibold text-slate-800">অবস্থান:</span>{' '}
                      {dept.wing}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-800">দায়িত্বপ্রাপ্ত:</span>{' '}
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

                <div className="pt-3 border-t border-slate-200/80 flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => onNavigateWithDepartment('routines', dept.name)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-all duration-150 active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>ক্লাস রুটিন</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateWithDepartment('notes', dept.name)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-all duration-150 active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>স্টাডি PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const match = BSPI_DEPARTMENTS.find(
                        (d) => d === dept.name,
                      );
                      if (match) {
                        setBooklistDept(match);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50/70 text-xs font-medium text-blue-800 hover:bg-blue-100/70 transition-all duration-150 active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>বুকলিস্ট দেখুন</span>
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
