import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
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
  DEPARTMENTS,
  WEEKDAYS,
  type ClassRoutine,
  type UserProfile,
} from '../types';

interface RoutinesPanelProps {
  profile: UserProfile;
  routines: ClassRoutine[];
  loading: boolean;
}

export function RoutinesPanel({
  profile,
  routines,
  loading,
}: RoutinesPanelProps) {
  const [selectedDay, setSelectedDay] = useState<string>('All');
  const [selectedDept, setSelectedDept] = useState<string>(
    profile.role === 'admin' ? 'All' : profile.department,
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [day, setDay] = useState<string>(WEEKDAYS[0]);
  const [timeSlot, setTimeSlot] = useState('09:00 AM - 10:30 AM');
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

  const availableDepartments = useMemo(() => {
    const fromData = new Set(routines.map((r) => r.department).filter(Boolean));
    for (const d of DEPARTMENTS) fromData.add(d);
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
        if (q) {
          return (
            r.subject.toLowerCase().includes(q) ||
            r.teacher_name.toLowerCase().includes(q) ||
            r.room.toLowerCase().includes(q) ||
            r.department.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        const dayOrderA = WEEKDAYS.findIndex(
          (w) => w.toLowerCase() === a.day.toLowerCase(),
        );
        const dayOrderB = WEEKDAYS.findIndex(
          (w) => w.toLowerCase() === b.day.toLowerCase(),
        );
        if (dayOrderA !== dayOrderB) return dayOrderA - dayOrderB;
        return a.time_slot.localeCompare(b.time_slot);
      });
  }, [routines, selectedDay, selectedDept, searchQuery]);

  function openNewForm() {
    setEditingId(null);
    setDay(selectedDay === 'All' ? WEEKDAYS[0] : selectedDay);
    setTimeSlot('09:00 AM - 10:30 AM');
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
          });
        } catch (firestoreErr) {
          handleFirestoreError(firestoreErr, OperationType.UPDATE, path);
        }
      } else {
        try {
          await addDoc(collection(db, 'routines'), {
            day,
            time_slot: cleanTime,
            subject: cleanSubject,
            teacher_name: cleanTeacher,
            room: cleanRoom,
            department: cleanDept,
            created_by: profile.uid,
            created_at: serverTimestamp(),
          });
        } catch (firestoreErr) {
          handleFirestoreError(firestoreErr, OperationType.CREATE, 'routines');
        }
      }

      setShowForm(false);
      setEditingId(null);
    } catch (err) {
      setError(formatFirebaseError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteRoutine(id: string) {
    setDeletingId(id);
    setError(null);
    const path = `routines/${id}`;
    try {
      try {
        await deleteDoc(doc(db, 'routines', id));
      } catch (firestoreErr) {
        handleFirestoreError(firestoreErr, OperationType.DELETE, path);
      }
    } catch (err) {
      setError(formatFirebaseError(err));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Class Routine Manager
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Weekly academic schedules organized by day and department.
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
          className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              {editingId ? 'Edit Class Slot' : 'Add Class Routine Slot'}
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

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                placeholder="09:00 AM - 10:30 AM"
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
              />
            </div>

            <div>
              <label
                htmlFor="routine-dept"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Department
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
                placeholder="CSE-301 · Operating Systems"
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
                placeholder="Prof. Tariq Hasan"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
              />
            </div>

            <div>
              <label
                htmlFor="routine-room"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Room / Lab
              </label>
              <input
                id="routine-room"
                type="text"
                required
                maxLength={60}
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="AB-402"
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
              />
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
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Day Segmented Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            {['All', ...WEEKDAYS].map((d) => (
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
                {d === 'All' ? 'All Days' : d.slice(0, 3)}
              </button>
            ))}
          </div>

          {/* Department & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <select
              aria-label="Filter by department"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
            >
              <option value="All">All Departments</option>
              {availableDepartments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <div className="relative sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Subject, teacher, room..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Routine Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        ) : filteredRoutines.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-semibold text-slate-900">
              No classes match this filter
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Try switching to All Days or All Departments
              {canManage ? ', or add a new class slot above.' : '.'}
            </p>
            {canManage && !showForm && (
              <button
                type="button"
                onClick={openNewForm}
                className="mt-4 px-4 py-2 rounded-lg bg-blue-700 text-white text-xs font-medium hover:bg-blue-800 cursor-pointer"
              >
                Add First Class Slot
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Day</th>
                  <th className="py-3 px-4">Time Slot</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Instructor</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-right">Room</th>
                  {canManage && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredRoutines.map((slot) => (
                  <tr
                    key={slot.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                      {slot.day}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                      {slot.time_slot}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {slot.subject}
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {slot.teacher_name}
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {slot.department}
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
                            onClick={() => handleDeleteRoutine(slot.id)}
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
