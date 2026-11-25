export type UserRole = 'student' | 'teacher' | 'admin';

export interface UserProfile {
  uid: string;
  full_name: string;
  role: UserRole;
  department: string;
  email: string;
  created_at?: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
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
  | 'assistant'
  | 'notes'
  | 'lost-found';

export const DEPARTMENTS = [
  'Computer Science',
  'Electrical Engineering',
  'Business Administration',
  'Architecture',
  'Mathematics',
  'Physics',
  'Civil Engineering',
  'English & Humanities',
] as const;

export const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;
