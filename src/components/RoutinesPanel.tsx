import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  Clock,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
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
import {
  BSPI_INSTITUTE,
  getRoutineLiveStatus,
  SHIFT_SCHEDULES,
} from '../data/bspi';
import {
  BSPI_DEPARTMENTS,
  SEMESTERS,
  SHIFTS,
  WEEKDAYS,
  type ClassRoutine,
  type SemesterType,
  type ShiftType,
  type UserProfile,
} from '../types';
import { RoutinesSkeleton } from './Skeletons';
import { useToast } from './ToastProvider';

interface RoutinesPanelProps {
  profile: UserProfile;
  routines: ClassRoutine[];
  loading: boolean;
  initialDepartmentFilter?: string | null;
  onClearInitialDepartment?: () => void;
}

export function RoutinesPanel({
  profile,
  routines,
  loading,
  initialDepartmentFilter,
  onClearInitialDepartment,
}: RoutinesPanelProps) {
  const { showToast } = useToast();
  const [now, setNow] = useState<Date>(() => new Date());

  const todayName = useMemo(
    () => now.toLocaleDateString('en-US', { weekday: 'long' }),
    [now],
  );

  const [selectedDay, setSelectedDay] = useState<string>('All');
  const [selectedDept, setSelectedDept] = useState<string>(
    initialDepartmentFilter ||
      (profile.role === 'admin' ? 'All' : profile.department),
  );
  const [selectedShift, setSelectedShift] = useState<string>(
    profile.role === 'student' && profile.shift ? profile.shift : 'All',
  );
  const [selectedSemester, setSelectedSemester] = useState<string>(
    profile.role === 'student' && profile.semester ? profile.semester : 'All',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [day, setDay] = useState<string>(WEEKDAYS[0]);
  const [shift, setShift] = useState<ShiftType>(profile.shift ?? '1st Shift');
  const [semester, setSemester] = useState<SemesterType>(
    profile.semester ?? '1st Semester',
  );
  const [timeSlot, setTimeSlot] = useState(SHIFT_SCHEDULES['1st Shift'].periods[0]);
  const [subject, setSubject] = useState('');
  const [teacherName, setTeacherName] = useState(
    profile.role === 'teacher' ? profile.full_name : '',
  );
  const [room, setRoom] = useState('');
  const [department, setDepartment] = useState(profile.department);

  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canManage = profile.role === 'teacher' || profile.role === 'admin';

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (initialDepartmentFilter) {
      setSelectedDept(initialDepartmentFilter);
      setSelectedShift('All');
      setSelectedSemester('All');
      onClearInitialDepartment?.();
    }
  }, [initialDepartmentFilter, onClearInitialDepartment]);

  const availableDepartments = useMemo(() => {
    const fromData = new Set(routines.map((r) => r.department).filter(Boolean));
    for (const d of BSPI_DEPARTMENTS) fromData.add(d);
    if (profile.department) fromData.add(profile.department);
    return Array.from(fromData).sort();
  }, [routines, profile.department]);

  const filteredRoutines = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return routines
      .filter((r) => {
        if (selectedDay !== 'All' && r.day.toLowerCase() !== selectedDay.toLowerCase()) {
          return false;
        }
        if (
          selectedDept !== 'All' &&
          r.department.toLowerCase() !== selectedDept.toLowerCase()
        ) {
          return false;
        }
        if (selectedShift !== 'All' && r.shift !== selectedShift) {
          return false;
        }
        if (selectedSemester !== 'All' && r.semester !== selectedSemester) {
          return false;
        }
        if (q) {
          return (
            r.subject.toLowerCase().includes(q) ||
            r.teacher_name.toLowerCase().includes(q) ||
            r.room.toLowerCase().includes(q) ||
            r.department.toLowerCase().includes(q) ||
            r.semester.toLowerCase().includes(q) ||
            r.shift.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .map((slot) => ({
        slot,
        status: getRoutineLiveStatus(slot, now),
      }))
      .sort((a, b) => {
        const dayOrderA = WEEKDAYS.findIndex(
          (w) => w.toLowerCase() === a.slot.day.toLowerCase(),
        );
        const dayOrderB = WEEKDAYS.findIndex(
          (w) => w.toLowerCase() === b.slot.day.toLowerCase(),
        );
        if (dayOrderA !== dayOrderB) return dayOrderA - dayOrderB;
        if (
          a.status.startMinutes !== null &&
          b.status.startMinutes !== null &&
          a.status.startMinutes !== b.status.startMinutes
        ) {
          return a.status.startMinutes - b.status.startMinutes;
        }
        return a.slot.time_slot.localeCompare(b.slot.time_slot);
      });
  }, [
    routines,
    selectedDay,
    selectedDept,
    selectedShift,
    selectedSemester,
    searchQuery,
    now,
  ]);

  // Identify live class or nearest upcoming class today from filtered list (or user's dept/shift)
  const highlightedSlot = useMemo(() => {
    const live = filteredRoutines.find((entry) => entry.status.state === 'live');
    if (live) return live;
    const upcoming = filteredRoutines
      .filter((entry) => entry.status.state === 'upcoming')
      .sort(
        (a, b) =>
          (a.status.minutesUntil ?? 9999) - (b.status.minutesUntil ?? 9999),
      );
    return upcoming[0] ?? null;
  }, [filteredRoutines]);

  function openNewForm() {
    const defaultShift: ShiftType =
      selectedShift === '2nd Shift' ? '2nd Shift' : profile.shift ?? '1st Shift';
    const defaultSem: SemesterType =
      selectedSemester !== 'All'
        ? (selectedSemester as SemesterType)
        : profile.semester ?? '1st Semester';

    setEditingId(null);
    setDay(selectedDay === 'All' ? (WEEKDAYS.includes(todayName as (typeof WEEKDAYS)[number]) ? todayName : WEEKDAYS[0]) : selectedDay);
    setShift(defaultShift);
    setSemester(defaultSem);
    setTimeSlot(SHIFT_SCHEDULES[defaultShift].periods[0]);
    setSubject('');
    setTeacherName(profile.role === 'teacher' ? profile.full_name : '');
    setRoom('');
    setDepartment(selectedDept === 'All' ? profile.department : selectedDept);
    setError(null);
    setShowForm(true);
  }

  function openEditForm(slot: ClassRoutine) {
    setEditingId(slot.id);
    setDay(slot.day);
    setShift(slot.shift);
    setSemester(slot.semester);
    setTimeSlot(slot.time_slot);
    setSubject(slot.subject);
    setTeacherName(slot.teacher_name);
    setRoom(slot.room);
    setDepartment(slot.department);
    setError(null);
    setShowForm(true);
  }

  async function handleSaveRoutine(e: React.FormEvent) {
    e.preventDefault();
    const cleanTime = timeSlot.trim().slice(0, 60);
    const cleanSubject = subject.trim().slice(0, 140);
    const cleanTeacher = teacherName.trim().slice(0, 120);
    const cleanRoom = room.trim().slice(0, 60);
    const cleanDept = department.trim().slice(0, 100);

    if (!cleanSubject || !cleanTime || !cleanTeacher || !cleanRoom) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (editingId) {
        const path = `routines/${editingId}`;
        try {
          await updateDoc(doc(db, 'routines', editingId), {
            day,
            time_slot: cleanTime,
            subject: cleanSubject,
            teacher_name: cleanTeacher,
            room: cleanRoom,
            department: cleanDept,
            shift,
            semester,
          });
        } catch (firestoreErr) {
          handleFirestoreError(firestoreErr, OperationType.UPDATE, path);
        }
        showToast({
          type: 'success',
          title: 'Class slot updated',
          description: `${day} · ${cleanSubject} (${shift})`,
        });
      } else {
        try {
          await addDoc(collection(db, 'routines'), {
            day,
            time_slot: cleanTime,
            subject: cleanSubject,
            teacher_name: cleanTeacher,
            room: cleanRoom,
            department: cleanDept,
            shift,
            semester,
            created_by: profile.uid,
            created_at: serverTimestamp(),
          });
        } catch (firestoreErr) {
          handleFirestoreError(firestoreErr, OperationType.CREATE, 'routines');
        }
        showToast({
          type: 'success',
          title: 'Class routine saved',
          description: `${day} · ${cleanSubject} · Room ${cleanRoom}`,
        });
      }

      setShowForm(false);
      setEditingId(null);
    } catch (err) {
      const msg = formatFirebaseError(err);
      setError(msg);
      showToast({ type: 'error', title: 'Save routine failed', description: msg });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteRoutine(slot: ClassRoutine) {
    setDeletingId(slot.id);
    setError(null);
    const path = `routines/${slot.id}`;
    try {
      try {
        await deleteDoc(doc(db, 'routines', slot.id));
      } catch (firestoreErr) {
        handleFirestoreError(firestoreErr, OperationType.DELETE, path);
      }
      showToast({
        type: 'info',
        title: 'Class slot removed',
        description: `${slot.subject} (${slot.day})`,
      });
    } catch (err) {
      const msg = formatFirebaseError(err);
      setError(msg);
      showToast({ type: 'error', title: 'Delete failed', description: msg });
    } finally {
      setDeletingId(null);
    }
  }

  function resetFilters() {
    setSelectedDay('All');
    setSelectedDept('All');
    setSelectedShift('All');
    setSelectedSemester('All');
    setSearchQuery('');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500">
            {BSPI_INSTITUTE.shortName} · Sunday – Thursday Academic Timetable
          </p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">
            Class Routine Manager
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Filter by technology, 1st/2nd shift, and semester with automatic live class highlighting.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={openNewForm}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-medium hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Class Slot
          </button>
        )}
      </div>

      {/* Live / Upcoming Class Highlight Strip */}
      {highlightedSlot && (
        <div
          className={`bg-white/90 backdrop-blur-md border rounded-xl p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${
            highlightedSlot.status.state === 'live'
              ? 'border-emerald-300'
              : 'border-blue-300'
          }`}
        >
          <div className="min-w-0">
            <p
              className={`text-xs font-semibold flex items-center gap-1.5 tabular-nums ${
                highlightedSlot.status.state === 'live'
                  ? 'text-emerald-700'
                  : 'text-blue-700'
              }`}
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>
                {highlightedSlot.status.state === 'live'
                  ? highlightedSlot.status.label
                  : `Up Next · ${highlightedSlot.status.label}`}
              </span>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <span className="text-slate-600 font-normal">
                {highlightedSlot.slot.shift} · {highlightedSlot.slot.semester}
              </span>
            </p>
            <p className="mt-1 text-base font-bold text-slate-900 truncate">
              {highlightedSlot.slot.subject}
            </p>
            <p className="text-xs text-slate-600 mt-0.5 truncate">
              {highlightedSlot.slot.teacher_name} · {highlightedSlot.slot.department}
            </p>
          </div>

          <div className="sm:text-right shrink-0">
            <p className="text-xs font-mono font-semibold text-slate-900 tabular-nums">
              {highlightedSlot.slot.time_slot}
            </p>
            <p className="text-xs font-mono text-slate-500 mt-0.5 tabular-nums">
              Room {highlightedSlot.slot.room}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Add / Edit Class Form */}
      {canManage && showForm && (
        <form
          onSubmit={handleSaveRoutine}
          className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-xs p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              {editingId ? 'Edit Class Slot' : 'Add BSPI Class Routine Slot'}
            </h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              aria-label="Close form"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label
                htmlFor="routine-day"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Day of Week
              </label>
              <select
                id="routine-day"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
              >
                {WEEKDAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="routine-shift"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Shift
              </label>
              <select
                id="routine-shift"
                value={shift}
                onChange={(e) => {
                  const nextShift = e.target.value as ShiftType;
                  setShift(nextShift);
                  if (!editingId) {
                    setTimeSlot(SHIFT_SCHEDULES[nextShift].periods[0]);
                  }
                }}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
              >
                {SHIFTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="routine-semester"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Semester
              </label>
              <select
                id="routine-semester"
                value={semester}
                onChange={(e) => setSemester(e.target.value as SemesterType)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
              >
                {SEMESTERS.map((sem) => (
                  <option key={sem} value={sem}>
                    {sem}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="routine-dept"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Technology / Department
              </label>
              <select
                id="routine-dept"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
              >
                {availableDepartments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="routine-time"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Time Slot
              </label>
              <input
                id="routine-time"
                type="text"
                required
                maxLength={60}
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                placeholder="08:00 AM - 08:45 AM"
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
              />
            </div>

            <div>
              <label
                htmlFor="routine-subject"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Course / Subject
              </label>
              <input
                id="routine-subject"
                type="text"
                required
                maxLength={140}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="28541 · Java Programming"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
              />
            </div>

            <div>
              <label
                htmlFor="routine-teacher"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Instructor Name
              </label>
              <input
                id="routine-teacher"
                type="text"
                required
                maxLength={120}
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="Md. Kamrul Hasan"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
              />
            </div>

            <div>
              <label
                htmlFor="routine-room"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Room / Workshop / Lab
              </label>
              <input
                id="routine-room"
                type="text"
                required
                maxLength={60}
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="CST-Lab-02"
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
              />
            </div>
          </div>

          {/* Quick BSPI Period Pickers */}
          <div className="pt-1">
            <p className="text-xs font-medium text-slate-500 mb-1.5">
              Quick {shift} Period Presets:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SHIFT_SCHEDULES[shift].periods.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTimeSlot(preset)}
                  className={`px-2.5 py-1 rounded-md border text-xs font-mono tabular-nums transition-colors cursor-pointer ${
                    timeSlot === preset
                      ? 'border-blue-700 bg-blue-50 text-blue-800 font-semibold'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-medium hover:bg-blue-800 disabled:opacity-50 cursor-pointer"
            >
              {submitting
                ? 'Saving...'
                : editingId
                  ? 'Save Changes'
                  : 'Add Class Slot'}
            </button>
          </div>
        </form>
      )}

      {/* Filter Bar */}
      <div className="bg-white/85 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-xs p-4 space-y-3">
        {/* Day Segmented Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
          {['All', ...WEEKDAYS].map((d) => {
            const isToday = d.toLowerCase() === todayName.toLowerCase();
            return (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDay(d)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedDay === d
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {d === 'All' ? 'All Days' : isToday ? `${d.slice(0, 3)} (Today)` : d.slice(0, 3)}
              </button>
            );
          })}
        </div>

        {/* Technology, Shift, Semester & Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <select
            aria-label="Filter by technology"
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
          >
            <option value="All">All Technologies</option>
            {availableDepartments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by shift"
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
          >
            <option value="All">All Shifts (1st & 2nd)</option>
            {SHIFTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by semester"
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
          >
            <option value="All">All Semesters</option>
            {SEMESTERS.map((sem) => (
              <option key={sem} value={sem}>
                {sem}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Subject, instructor, room..."
              className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
            />
          </div>
        </div>
      </div>

      {/* Routine Table / Mobile Cards */}
      <div className="bg-white/85 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <RoutinesSkeleton />
        ) : filteredRoutines.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-semibold text-slate-900">
              No classes match this filter
            </p>
            <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
              Try viewing All Days, All Shifts, or All Semesters
              {canManage ? ', or add a new BSPI class slot above.' : '.'}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Show All Classes
              </button>
              {canManage && !showForm && (
                <button
                  type="button"
                  onClick={openNewForm}
                  className="px-4 py-2 rounded-lg bg-blue-700 text-white text-xs font-medium hover:bg-blue-800 cursor-pointer"
                >
                  Add Class Slot
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/90 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">Day & Status</th>
                    <th className="py-3 px-4">Time Slot</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Technology · Shift · Sem</th>
                    <th className="py-3 px-4">Instructor</th>
                    <th className="py-3 px-4 text-right">Room</th>
                    {canManage && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 text-sm">
                  {filteredRoutines.map(({ slot, status }) => {
                    const isLive = status.state === 'live';
                    const isUpcoming = status.state === 'upcoming';
                    return (
                      <tr
                        key={slot.id}
                        className={`transition-colors ${
                          isLive
                            ? 'bg-emerald-50/60 hover:bg-emerald-50/90'
                            : isUpcoming
                              ? 'bg-blue-50/45 hover:bg-blue-50/80'
                              : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-3 px-4 whitespace-nowrap">
                          <p className="font-medium text-slate-900">{slot.day}</p>
                          {(isLive || isUpcoming) && (
                            <p
                              className={`text-xs font-semibold tabular-nums mt-0.5 ${
                                isLive ? 'text-emerald-700' : 'text-blue-700'
                              }`}
                            >
                              {status.label}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                          {slot.time_slot}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {slot.subject}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          <p className="font-medium text-slate-800">{slot.department}</p>
                          <p className="text-slate-500 mt-0.5 tabular-nums">
                            {slot.shift} · {slot.semester}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                          {slot.teacher_name}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs font-medium text-slate-900 text-right tabular-nums whitespace-nowrap">
                          {slot.room}
                        </td>
                        {canManage && (
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditForm(slot)}
                                className="p-1.5 rounded-md text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                                title="Edit class slot"
                                aria-label="Edit class slot"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteRoutine(slot)}
                                disabled={deletingId === slot.id}
                                className="p-1.5 rounded-md text-slate-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
                                title="Delete class slot"
                                aria-label="Delete class slot"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-slate-200/80">
              {filteredRoutines.map(({ slot, status }) => {
                const isLive = status.state === 'live';
                const isUpcoming = status.state === 'upcoming';
                return (
                  <div
                    key={slot.id}
                    className={`p-4 space-y-2 ${
                      isLive
                        ? 'bg-emerald-50/60'
                        : isUpcoming
                          ? 'bg-blue-50/40'
                          : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium text-slate-500 tabular-nums">
                          {slot.day} · {slot.shift} · {slot.semester}
                        </p>
                        <p className="text-sm font-bold text-slate-900 mt-0.5">
                          {slot.subject}
                        </p>
                      </div>
                      {(isLive || isUpcoming) && (
                        <span
                          className={`text-xs font-semibold tabular-nums shrink-0 ${
                            isLive ? 'text-emerald-700' : 'text-blue-700'
                          }`}
                        >
                          {status.label}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span className="truncate">{slot.teacher_name} · {slot.department}</span>
                      <span className="font-mono font-semibold text-slate-900 shrink-0 ml-2">
                        {slot.room}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="font-mono text-xs text-slate-700 tabular-nums">
                        {slot.time_slot}
                      </span>
                      {canManage && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditForm(slot)}
                            className="px-2.5 py-1 rounded-md border border-slate-200 text-xs font-medium text-slate-700"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteRoutine(slot)}
                            disabled={deletingId === slot.id}
                            className="px-2.5 py-1 rounded-md border border-red-200 text-xs font-medium text-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
