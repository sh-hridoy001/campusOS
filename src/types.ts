export type UserRole = 'student' | 'teacher' | 'admin';

export const BSPI_DEPARTMENTS = [
  'Computer Science & Technology',
  'Electrical Technology',
  'Mechanical Technology',
  'Automobile Technology',
  'Construction Technology',
  'Civil (Wood) Technology',
] as const;

export type BspiDepartmentName = (typeof BSPI_DEPARTMENTS)[number];
export const DEPARTMENTS = BSPI_DEPARTMENTS;

export type BtebSubjectCategory = 'Core' | 'Related' | 'Attachment';

export interface BtebSubjectItem {
  code: string;
  nameEn: string;
  nameBn: string;
  credits: number;
  category: BtebSubjectCategory;
}

export interface TechnologyBooklist {
  department: BspiDepartmentName;
  nameBn: string;
  techCode: string;
  shortCode: string;
  booklistUrl: string;
  semesterNotes?: Partial<Record<SemesterType, string>>;
  semesters: Record<SemesterType, BtebSubjectItem[]>;
}

export const SHIFTS = ['1st Shift', '2nd Shift'] as const;
export type ShiftType = (typeof SHIFTS)[number];

export const SEMESTERS = [
  '1st Semester',
  '2nd Semester',
  '3rd Semester',
  '4th Semester',
  '5th Semester',
  '6th Semester',
  '7th Semester',
  '8th Semester',
] as const;
export type SemesterType = (typeof SEMESTERS)[number];

export const NOTICE_CATEGORIES = [
  'Academic',
  'Exam',
  'Admission',
  'Stipend/Upobritti',
  'General',
] as const;
export type NoticeCategory = (typeof NOTICE_CATEGORIES)[number];

export const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Saturday',
  'Friday',
] as const;

export interface UserProfile {
  uid: string;
  full_name: string;
  role: UserRole;
  department: string;
  shift?: ShiftType;
  semester?: SemesterType;
  bookmarked_notices?: string[];
  email: string;
  created_at?: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  category: NoticeCategory;
  is_urgent: boolean;
  created_by: string;
  author_name: string;
  author_role: UserRole;
  author_department: string;
  created_at: string;
}

export interface NoticeSummary {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
}

export interface ClassRoutine {
  id: string;
  day: string;
  time_slot: string;
  subject: string;
  teacher_name: string;
  room: string;
  department: string;
  shift: ShiftType;
  semester: SemesterType;
  created_by: string;
  created_at?: string;
}

export interface StudyNoteMeta {
  id: string;
  title: string;
  subject: string;
  department: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedBy: string;
  uploaderName: string;
  createdAt: string;
}

export interface LostFoundReport {
  id: string;
  type: 'lost' | 'found';
  status: 'open' | 'resolved';
  title: string;
  category: string;
  description: string;
  location: string;
  contactInfo: string;
  createdBy: string;
  reporterName: string;
  createdAt: string;
}

export type ActiveTab =
  | 'overview'
  | 'notices'
  | 'routines'
  | 'directory'
  | 'assistant'
  | 'notes'
  | 'lost-found';
