import type { ClassRoutine, ShiftType } from '../types';

export const BSPI_INSTITUTE = {
  shortName: 'BSPI Kaptai',
  fullName: 'Bangladesh Sweden Polytechnic Institute',
  fullNameBn: 'বাংলাদেশ সুইডেন পলিটেকনিক ইনস্টিটিউট (BSPI), কাপ্তাই',
  location: 'Kaptai, Rangamati-4532, Bangladesh',
  established: '1963',
  board: 'Bangladesh Technical Education Board (BTEB)',
  instituteCode: '70048',
  websiteUrl: 'https://bspi.polytech.gov.bd/',
  noticesUrl: 'https://bspi.polytech.gov.bd/site/view/notices',
  btebUrl: 'https://bteb.gov.bd/',
  btebNoticesUrl: 'https://bteb.gov.bd/site/view/notices',
  syllabusUrl: 'https://bteb.gov.bd/site/page/4c512445-3d44-4c8d-90ea-e3c20d7a022f',
  booklistsUrl: 'https://btebresultszone.com/bn/booklists',
  email: 'principal@bspi.polytech.gov.bd',
  phone: '+880 3529-56213',
  officeHours: 'Sunday – Thursday · 08:00 AM – 05:00 PM',
} as const;

export interface AcademicPortalResource {
  id: string;
  source: 'BSPI' | 'BTEB';
  category: 'Notice' | 'Result' | 'Curriculum' | 'Calendar';
  title: string;
  titleBn: string;
  description: string;
  url: string;
  hostLabel: string;
}

export const BTEB_ACADEMIC_RESOURCES: AcademicPortalResource[] = [
  {
    id: 'bteb-notices',
    source: 'BTEB',
    category: 'Notice',
    title: 'BTEB Official Notice Board',
    titleBn: 'বিটিইবি অফিশিয়াল নোটিশ বোর্ড',
    description:
      'Diploma-in-Engineering exam schedules, form fill-up circulars, and board directives.',
    url: 'https://bteb.gov.bd/site/view/notices',
    hostLabel: 'bteb.gov.bd/site/view/notices',
  },
  {
    id: 'bteb-results',
    source: 'BTEB',
    category: 'Result',
    title: 'Diploma-in-Engineering Results',
    titleBn: 'ডিপ্লোমা-ইন-ইঞ্জিনিয়ারিং রেজাল্ট',
    description:
      'Official BTEB semester-wise board exam results, GPA/CGPA sheets, and re-scrutiny notices.',
    url: 'https://bteb.gov.bd/',
    hostLabel: 'bteb.gov.bd · Result Corner',
  },
  {
    id: 'bteb-booklists',
    source: 'BTEB',
    category: 'Curriculum',
    title: 'Probidhan-2022 Booklists',
    titleBn: 'প্রবিধান ২০২২ বুকলিস্ট ও কোড',
    description:
      'সেমিস্টারভিত্তিক বইয়ের তালিকা ও বিষয় কোড (BSPI-এর ৬টি টেকনোলজির জন্য প্রযোজ্য)।',
    url: 'https://btebresultszone.com/bn/booklists',
    hostLabel: 'btebresultszone.com/bn/booklists',
  },
  {
    id: 'bteb-syllabus',
    source: 'BTEB',
    category: 'Calendar',
    title: 'Syllabus & Academic Calendar',
    titleBn: 'সিলেবাস, প্রবিধান ও ক্যালেন্ডার',
    description:
      'অফিশিয়াল সিলেবাস, ক্রেডিট কাঠামো, মার্ক ডিস্ট্রিবিউশন এবং একাডেমিক সময়সূচি।',
    url: 'https://bteb.gov.bd/site/page/4c512445-3d44-4c8d-90ea-e3c20d7a022f',
    hostLabel: 'bteb.gov.bd · Curriculum',
  },
];

export const BTEB_GRADING_SCALE = [
  { marks: '80% – 100%', grade: 'A+', gpa: '4.00' },
  { marks: '75% – 79%', grade: 'A', gpa: '3.75' },
  { marks: '70% – 74%', grade: 'A-', gpa: '3.50' },
  { marks: '65% – 69%', grade: 'B+', gpa: '3.25' },
  { marks: '60% – 64%', grade: 'B', gpa: '3.00' },
  { marks: '55% – 59%', grade: 'B-', gpa: '2.75' },
  { marks: '50% – 54%', grade: 'C+', gpa: '2.50' },
  { marks: '45% – 49%', grade: 'C', gpa: '2.25' },
  { marks: '40% – 44%', grade: 'D', gpa: '2.00' },
  { marks: 'Below 40%', grade: 'F', gpa: '0.00' },
] as const;

export const BTEB_PROBIDHAN_RULES = [
  {
    title: '4-Year / 8-Semester Structure',
    detail:
      'Semesters 1–7 cover campus theory and workshop/lab practicals; 8th Semester is dedicated to mandatory Industrial Attachment.',
  },
  {
    title: 'Continuous & Board Final Assessment',
    detail:
      'Every subject combines Theory Continuous (TC), Theory Final (TF), Practical Continuous (PC), and Practical Final (PF) per BTEB Probidhan-2022.',
  },
  {
    title: 'Class Attendance & Form Fill-up',
    detail:
      'Regular attendance in both 1st/2nd shift theory and practical sessions is mandatory for board exam form fill-up eligibility.',
  },
  {
    title: 'CGPA Weighting Across Semesters',
    detail:
      'Final Diploma CGPA combines weighted GPAs across all 8 semesters (check Probidhan-2022 circular on bteb.gov.bd for exact semester weight percentages).',
  },
] as const;

export const SHIFT_SCHEDULES: Record<
  ShiftType,
  {
    label: string;
    window: string;
    periods: string[];
    notes: string;
  }
> = {
  '1st Shift': {
    label: '1st Shift (Morning)',
    window: '08:00 AM – 01:15 PM',
    periods: [
      '08:00 AM - 08:45 AM',
      '08:45 AM - 09:30 AM',
      '09:30 AM - 10:15 AM',
      '10:15 AM - 11:00 AM',
      '11:15 AM - 12:00 PM',
      '12:00 PM - 12:45 PM',
      '12:45 PM - 01:15 PM',
    ],
    notes: 'Morning theory & practical sessions with 15-minute recess at 11:00 AM.',
  },
  '2nd Shift': {
    label: '2nd Shift (Afternoon)',
    window: '01:30 PM – 06:45 PM',
    periods: [
      '01:30 PM - 02:15 PM',
      '02:15 PM - 03:00 PM',
      '03:00 PM - 03:45 PM',
      '03:45 PM - 04:30 PM',
      '04:45 PM - 05:30 PM',
      '05:30 PM - 06:15 PM',
      '06:15 PM - 06:45 PM',
    ],
    notes: 'Afternoon theory & workshop sessions with break at 04:30 PM.',
  },
};

export interface BspiDepartmentInfo {
  name: string;
  code: string;
  shortCode: string;
  wing: string;
  shifts: string;
  headTitle: string;
  contactDesk: string;
  highlights: string[];
}

export const BSPI_DIRECTORY: BspiDepartmentInfo[] = [
  {
    name: 'Computer Science & Technology',
    code: '85',
    shortCode: 'CST',
    wing: 'একাডেমিক ভবন · ২য় ও ৩য় তলা ল্যাব',
    shifts: '1st Shift & 2nd Shift',
    headTitle: 'চিফ ইনস্ট্রাক্টর (CST)',
    contactDesk: 'সফটওয়্যার, ওয়েব ও নেটওয়ার্কিং ল্যাব উইং',
    highlights: [
      'সফটওয়্যার ডেভেলপমেন্ট, পাইথন, জাভা ও ওয়েব অ্যাপস',
      'কম্পিউটার নেটওয়ার্কিং, মাইক্রোকন্ট্রোলার ও আইওটি ল্যাব',
      'BTEB প্রবিধান-২০২২ · ৮ সেমিস্টার',
    ],
  },
  {
    name: 'Electrical Technology',
    code: '67',
    shortCode: 'ET',
    wing: 'ইলেকট্রিক্যাল ওয়ার্কশপ ও মেশিন উইং',
    shifts: '1st Shift & 2nd Shift',
    headTitle: 'চিফ ইনস্ট্রাক্টর (Electrical)',
    contactDesk: 'পাওয়ার, মেশিন ও সার্কিট ল্যাব ডেস্ক',
    highlights: [
      'ইলেকট্রিক্যাল মেশিন, পাওয়ার জেনারেশন ও ডিস্ট্রিবিউশন',
      'ইন্ডাস্ট্রিয়াল ওয়্যারিং, সুইচগিয়ার ও প্রোটেকশন ল্যাব',
      'BTEB প্রবিধান-২০২২ · ৮ সেমিস্টার',
    ],
  },
  {
    name: 'Mechanical Technology',
    code: '70',
    shortCode: 'MT',
    wing: 'সুইডিশ মেকানিক্যাল ওয়ার্কশপ কমপ্লেক্স',
    shifts: '1st Shift & 2nd Shift',
    headTitle: 'চিফ ইনস্ট্রাক্টর (Mechanical)',
    contactDesk: 'মেশিন শপ, ফাউন্ড্রি ও ওয়েল্ডিং ডেস্ক',
    highlights: [
      'মেশিনিং, ফাউন্ড্রি, মেটালার্জি ও অ্যাডভান্সড ওয়েল্ডিং',
      'থার্মোডাইনামিক্স, ফ্লুইড মেকানিক্স ও CAD/CAM',
      'BTEB প্রবিধান-২০২২ · ৮ সেমিস্টার',
    ],
  },
  {
    name: 'Automobile Technology',
    code: '62',
    shortCode: 'AT',
    wing: 'অটোমোবাইল হ্যাঙ্গার ও ইঞ্জিন বে',
    shifts: '1st Shift & 2nd Shift',
    headTitle: 'চিফ ইনস্ট্রাক্টর (Automobile)',
    contactDesk: 'ইঞ্জিন ওভারহলিং ও ডায়াগনস্টিকস বে',
    highlights: [
      'অটোমোটিভ ইঞ্জিন সিস্টেম, EFI ও হাইব্রিড টেকনোলজি',
      'সাসপেনশন, ব্রেক সিস্টেম ও ভেহিকল ডায়াগনস্টিকস',
      'BTEB প্রবিধান-২০২২ · ৮ সেমিস্টার',
    ],
  },
  {
    name: 'Construction Technology',
    code: '88',
    shortCode: 'CT',
    wing: 'কনস্ট্রাকশন ও ড্রাফটিং উইং',
    shifts: '1st Shift & 2nd Shift',
    headTitle: 'চিফ ইনস্ট্রাক্টর (Construction)',
    contactDesk: 'ম্যাসনরি, সার্ভেয়িং ও ড্রাফটিং ল্যাব',
    highlights: [
      'বিল্ডিং কনস্ট্রাকশন ম্যানেজমেন্ট ও সাইট সুপারভিশন',
      'এস্টিমেটিং, সার্ভেয়িং, ফাউন্ডেশন ও ক্যাড (CAD)',
      'BTEB প্রবিধান-২০২২ · ৮ সেমিস্টার',
    ],
  },
  {
    name: 'Civil (Wood) Technology',
    code: '65',
    shortCode: 'CWT',
    wing: 'সুইডিশ সিভিল (উড) ও জয়েনারি ওয়ার্কশপ',
    shifts: '1st Shift & 2nd Shift',
    headTitle: 'চিফ ইনস্ট্রাক্টর (Civil Wood)',
    contactDesk: 'সিভিল (উড) অফিস · টিম্বার ও স্ট্রাকচার ল্যাব',
    highlights: [
      'সিভিল স্ট্রাকচারাল ড্রয়িং, সার্ভেয়িং ও এস্টিমেটিং',
      'উড ওয়ার্কশপ, টিম্বার প্রসেসিং ও ফার্নিচার ডিজাইন',
      'BSPI কাপ্তাই-এর বিশেষায়িত ঐতিহ্যবাহী ডিপার্টমেন্ট (কোড ৬৫)',
    ],
  },
];

export interface RoutineLiveStatus {
  state: 'live' | 'upcoming' | 'completed' | 'scheduled';
  label: string;
  startMinutes: number | null;
  endMinutes: number | null;
  minutesUntil?: number;
}

function parseClockToMinutes(raw: string): number | null {
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();

  if (Number.isNaN(hours) || Number.isNaN(minutes) || minutes < 0 || minutes > 59) {
    return null;
  }

  if (meridiem === 'AM') {
    if (hours === 12) hours = 0;
  } else if (meridiem === 'PM') {
    if (hours < 12) hours += 12;
  } else if (hours > 23) {
    return null;
  }

  return hours * 60 + minutes;
}

export function parseTimeSlotRange(
  timeSlot: string,
): { startMinutes: number; endMinutes: number } | null {
  const parts = timeSlot.split(/\s*(?:-|–|to)\s*/i);
  if (parts.length < 2) return null;

  let startRaw = parts[0].trim();
  const endRaw = parts[1].trim();

  // If end has AM/PM and start omits it (e.g. "08:00 - 08:45 AM"), inherit meridiem
  const endMeridiem = endRaw.match(/(AM|PM)$/i)?.[1];
  if (endMeridiem && !/(AM|PM)$/i.test(startRaw)) {
    startRaw = `${startRaw} ${endMeridiem}`;
  }

  const startMinutes = parseClockToMinutes(startRaw);
  const endMinutes = parseClockToMinutes(endRaw);
  if (startMinutes === null || endMinutes === null) return null;

  return { startMinutes, endMinutes };
}

export function getRoutineLiveStatus(
  slot: Pick<ClassRoutine, 'day' | 'time_slot'>,
  now: Date = new Date(),
): RoutineLiveStatus {
  const todayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const range = parseTimeSlotRange(slot.time_slot);

  if (!range) {
    return {
      state: 'scheduled',
      label: slot.day,
      startMinutes: null,
      endMinutes: null,
    };
  }

  if (slot.day.toLowerCase() !== todayName.toLowerCase()) {
    return {
      state: 'scheduled',
      label: slot.day,
      startMinutes: range.startMinutes,
      endMinutes: range.endMinutes,
    };
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (nowMinutes >= range.startMinutes && nowMinutes <= range.endMinutes) {
    const remaining = Math.max(1, range.endMinutes - nowMinutes);
    return {
      state: 'live',
      label: `Live Now · ${remaining}m left`,
      startMinutes: range.startMinutes,
      endMinutes: range.endMinutes,
    };
  }

  if (nowMinutes < range.startMinutes) {
    const minutesUntil = range.startMinutes - nowMinutes;
    const hours = Math.floor(minutesUntil / 60);
    const mins = minutesUntil % 60;
    const countdown = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    return {
      state: 'upcoming',
      label: `Starts in ${countdown}`,
      startMinutes: range.startMinutes,
      endMinutes: range.endMinutes,
      minutesUntil,
    };
  }

  return {
    state: 'completed',
    label: 'Completed today',
    startMinutes: range.startMinutes,
    endMinutes: range.endMinutes,
  };
}
