import type { ClassRoutine, ShiftType } from '../types';

export const BSPI_INSTITUTE = {
  shortName: 'BSPI Kaptai',
  fullName: 'Bangladesh Sweden Polytechnic Institute',
  location: 'Kaptai, Rangamati-4532, Bangladesh',
  established: '1963',
  board: 'Bangladesh Technical Education Board (BTEB)',
  instituteCode: '70048',
  websiteUrl: 'https://bspi.polytech.gov.bd/',
  noticesUrl: 'https://bspi.polytech.gov.bd/site/view/notices',
  btebUrl: 'https://bteb.gov.bd/',
  syllabusUrl: 'https://bteb.gov.bd/site/page/4c512445-3d44-4c8d-90ea-e3c20d7a022f',
  email: 'principal@bspi.polytech.gov.bd',
  phone: '+880 3529-56213',
  officeHours: 'Sunday – Thursday · 08:00 AM – 05:00 PM',
} as const;

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
    code: '685 / 85',
    shortCode: 'CST',
    wing: 'Academic Building · 2nd & 3rd Floor Labs',
    shifts: '1st Shift & 2nd Shift',
    headTitle: 'Chief Instructor (CST)',
    contactDesk: 'CST Dept. Office · Software & Networking Lab Wing',
    highlights: [
      'Software Development, Web & Mobile Apps',
      'Computer Networking, Hardware & Microprocessor Labs',
      'BTEB Probidhan-2022 · 8 Semesters',
    ],
  },
  {
    name: 'Civil Technology',
    code: '664 / 64',
    shortCode: 'Civil',
    wing: 'Civil & Survey Block · Ground Floor',
    shifts: '1st Shift & 2nd Shift',
    headTitle: 'Chief Instructor (Civil)',
    contactDesk: 'Civil Dept. Office · Soil & Materials Testing Lab',
    highlights: [
      'Structural Design, AutoCAD & Estimating',
      'Surveying Fieldwork, Hydraulics & Materials Testing',
      'BTEB Probidhan-2022 · 8 Semesters',
    ],
  },
  {
    name: 'Electrical Technology',
    code: '667 / 67',
    shortCode: 'ET',
    wing: 'Electrical Workshop & Machine Wing',
    shifts: '1st Shift & 2nd Shift',
    headTitle: 'Chief Instructor (Electrical)',
    contactDesk: 'Electrical Dept. Office · Power & Machine Lab',
    highlights: [
      'Electrical Machines, Power Generation & Distribution',
      'Industrial Wiring, PLC Automation & Electronics',
      'BTEB Probidhan-2022 · 8 Semesters',
    ],
  },
  {
    name: 'Mechanical Technology',
    code: '670 / 70',
    shortCode: 'MT',
    wing: 'Swedish Mechanical Workshop Complex',
    shifts: '1st Shift & 2nd Shift',
    headTitle: 'Chief Instructor (Mechanical)',
    contactDesk: 'Mechanical Dept. Office · Machine & Foundry Shop',
    highlights: [
      'Machining, CNC Operations & Metallurgy',
      'Thermodynamics, Fluid Mechanics & CAD/CAM',
      'BTEB Probidhan-2022 · 8 Semesters',
    ],
  },
  {
    name: 'Automobile Technology',
    code: '662 / 62',
    shortCode: 'AT',
    wing: 'Automobile Hangar & Engine Bay',
    shifts: '1st Shift & 2nd Shift',
    headTitle: 'Chief Instructor (Automobile)',
    contactDesk: 'Automobile Dept. Office · Chassis & Diagnostics Bay',
    highlights: [
      'Internal Combustion Engines, EFI & Hybrid Systems',
      'Transmission, Suspension & Vehicle Diagnostics',
      'BTEB Probidhan-2022 · 8 Semesters',
    ],
  },
  {
    name: 'Construction Technology',
    code: '688 / 88',
    shortCode: 'CT',
    wing: 'Construction & Drafting Wing',
    shifts: '1st Shift & 2nd Shift',
    headTitle: 'Chief Instructor (Construction)',
    contactDesk: 'Construction Dept. Office · Masonry & Drafting Lab',
    highlights: [
      'Building Construction Management & Site Supervision',
      'Quantity Surveying, Foundation Engineering & CAD',
      'BTEB Probidhan-2022 · 8 Semesters',
    ],
  },
  {
    name: 'Wood Technology',
    code: '683 / 83',
    shortCode: 'WT',
    wing: 'Swedish Wood & Joinery Workshop',
    shifts: '1st Shift',
    headTitle: 'Chief Instructor (Wood)',
    contactDesk: 'Wood Technology Office · Seasoning & Timber Lab',
    highlights: [
      'Timber Seasoning, Furniture Design & Joinery',
      'Wood Machining, Finishing & Industrial Production',
      'Heritage Department of BSPI Kaptai',
    ],
  },
  {
    name: 'General / Non-Tech',
    code: 'RS / Admin',
    shortCode: 'Non-Tech',
    wing: 'Administrative & Main Academic Building',
    shifts: '1st Shift & 2nd Shift',
    headTitle: 'Chief Instructor (Related Subjects)',
    contactDesk: 'Academic Registrar & Student Helpdesk',
    highlights: [
      'Mathematics, Physics, Chemistry & Communicative English',
      'Social Science, Entrepreneurship & Industrial Management',
      'Supports all 7 Diploma Engineering Technologies',
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
