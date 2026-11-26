/**
 * BSPI AI Campus Assistant — সহজ ক্যাম্পাস জ্ঞান ফাইল (Campus Knowledge Base)
 * ---------------------------------------------------------------------------
 * বাংলাদেশ সুইডেন পলিটেকনিক ইনস্টিটিউট (BSPI), কাপ্তাই-এর গুরুত্বপূর্ণ তথ্য,
 * অফিশিয়াল ওয়েবসাইট লিংক, নিয়মাবলি ও সাধারণ প্রশ্নোত্তর (FAQ) এখানে সংরক্ষিত আছে।
 *
 * আপনি যেকোনো সময় এই ফাইলের লেখা বাংলায় আপডেট করতে বা নতুন তথ্য/FAQ যোগ করতে পারবেন।
 * AI Campus Assistant প্রতিটি উত্তরে এই ফাইল এবং অ্যাপের লাইভ Notices ও Routines ব্যবহার করে।
 */

export interface CampusFaqItem {
  question: string;
  answer: string;
}

export const CAMPUS_LINKS = {
  officialWebsite: 'https://bspi.polytech.gov.bd/',
  officialNotices: 'https://bspi.polytech.gov.bd/site/view/notices',
  btebWebsite: 'https://bteb.gov.bd/',
  btebSyllabus: 'https://bteb.gov.bd/site/page/4c512445-3d44-4c8d-90ea-e3c20d7a022f',
} as const;

export const CAMPUS_BASIC_INFO = {
  instituteNameBn: 'বাংলাদেশ সুইডেন পলিটেকনিক ইনস্টিটিউট (BSPI)',
  instituteNameEn: 'Bangladesh Sweden Polytechnic Institute (BSPI)',
  location: 'কাপ্তাই, রাঙ্গামাটি-৪৫৩২, বাংলাদেশ',
  established: '১৯৬৩ সাল',
  instituteCode: '70048',
  board: 'বাংলাদেশ কারিগরি শিক্ষা বোর্ড (BTEB)',
  curriculum: 'ডিপ্লোমা-ইন-ইঞ্জিনিয়ারিং (BTEB Probidhan-2022, ৮ সেমিস্টার / ৪ বছর)',
  officePhone: '+880 3529-56213',
  officeEmail: 'principal@bspi.polytech.gov.bd',
  officeHours: 'রবিবার থেকে বৃহস্পতিবার, সকাল ৮:০০টা – বিকাল ৫:০০টা',
  weeklyHoliday: 'শুক্রবার ও শনিবার',
  shifts: [
    '১ম শিফট (1st Shift - Morning): সকাল ৮:০০টা থেকে দুপুর ১:১৫টা (সকাল ১১:০০টায় ১৫ মিনিট বিরতি)',
    '২য় শিফট (2nd Shift - Afternoon): দুপুর ১:৩০টা থেকে সন্ধ্যা ৬:৪৫টা (বিকাল ৪:৩০টায় ১৫ মিনিট বিরতি)',
  ],
  departments: [
    'Computer Science & Technology (CST) — কোড: 685 / 85',
    'Civil Technology — কোড: 664 / 64',
    'Electrical Technology (ET) — কোড: 667 / 67',
    'Mechanical Technology (MT) — কোড: 670 / 70',
    'Automobile Technology (AT) — কোড: 662 / 62',
    'Construction Technology (CT) — কোড: 688 / 88',
    'Wood Technology (WT) — কোড: 683 / 83 (শুধুমাত্র ১ম শিফট)',
  ],
} as const;

export const CAMPUS_RULES: string[] = [
  'সব শিক্ষার্থীকে নিজ নিজ নির্ধারিত শিফট (১ম বা ২য় শিফট) ও সেমিস্টারের সময়সূচি অনুযায়ী ক্লাস ও ব্যবহারিক (Lab/Workshop) সেশনে নিয়মিত উপস্থিত থাকতে হবে।',
  'বাংলাদেশ কারিগরি শিক্ষা বোর্ড (BTEB)-এর নিয়ম অনুযায়ী বোর্ড পরীক্ষায় অংশগ্রহণের জন্য নির্ধারিত ক্লাস উপস্থিতি ও ফর্ম ফিলাপের শর্ত পূরণ বাধ্যতামূলক।',
  'ক্যাম্পাসে অবস্থানকালে শিক্ষার্থীর বৈধ স্টুডেন্ট আইডি কার্ড সাথে রাখা এবং ওয়ার্কশপ/ল্যাবে নিরাপত্তা নির্দেশনা মেনে চলা আবশ্যক।',
  'ভর্তি, সেমিস্টার ফাইনাল, ফর্ম ফিলাপ, রেজিস্ট্রেশন ও উপবৃত্তি (Stipend/Upobritti) সংক্রান্ত সব চূড়ান্ত তারিখ ও নির্দেশনা শুধুমাত্র BSPI-এর অফিশিয়াল নোটিশ বোর্ড (https://bspi.polytech.gov.bd/) এবং CampusOS-এর লাইভ Notices সেকশন থেকে যাচাই করতে হবে।',
];

export const CAMPUS_FAQ: CampusFaqItem[] = [
  {
    question: 'BSPI-এর অফিশিয়াল ওয়েবসাইট ও নোটিশ বোর্ডের লিংক কী?',
    answer:
      'বাংলাদেশ সুইডেন পলিটেকনিক ইনস্টিটিউট (BSPI), কাপ্তাই-এর অফিশিয়াল ওয়েবসাইট হলো https://bspi.polytech.gov.bd/ এবং অফিশিয়াল নোটিশ পেজ হলো https://bspi.polytech.gov.bd/site/view/notices ।',
  },
  {
    question: 'BSPI-এর ১ম ও ২য় শিফটের ক্লাস সময়সূচি কখন?',
    answer:
      '১ম শিফট (Morning) চলে সকাল ৮:০০টা থেকে দুপুর ১:১৫টা পর্যন্ত এবং ২য় শিফট (Afternoon) চলে দুপুর ১:৩০টা থেকে সন্ধ্যা ৬:৪৫টা পর্যন্ত (রবিবার থেকে বৃহস্পতিবার)।',
  },
  {
    question: 'BSPI কাপ্তাই-তে কোন কোন ডিপার্টমেন্ট (Technology) রয়েছে?',
    answer:
      'মোট ৭টি ডিপ্লোমা ইঞ্জিনিয়ারিং টেকনোলজি রয়েছে: Computer Science & Technology (CST), Civil, Electrical, Mechanical, Automobile, Construction এবং Wood Technology (Wood Technology কেবল ১ম শিফটে পরিচালিত হয়)।',
  },
  {
    question: 'BSPI-এর ইনস্টিটিউট কোড ও যোগাযোগের তথ্য কী?',
    answer:
      'ইনস্টিটিউট কোড: 70048। ঠিকানা: কাপ্তাই, রাঙ্গামাটি-৪৫৩২। ইমেইল: principal@bspi.polytech.gov.bd এবং অফিস ফোন: +880 3529-56213।',
  },
  {
    question: 'অ্যাপের ভেতরে কোনো পরীক্ষার তারিখ বা নতুন নোটিশ না থাকলে কোথায় দেখব?',
    answer:
      'যদি কোনো সাম্প্রতিক পরীক্ষার তারিখ, ফর্ম ফিলাপ বা সরকারি সার্কুলার CampusOS-এর Notices বা Routines-এ পাওয়া না যায়, তবে অনুগ্রহ করে https://bspi.polytech.gov.bd/ ওয়েবসাইট ভিজিট করুন অথবা আপনার নিজ ডিপার্টমেন্টের চিফ ইনস্ট্রাক্টর / একাডেমিক অফিসে যোগাযোগ করুন।',
  },
];

/**
 * এই ফাংশনটি উপরের সব তথ্যকে একত্রিত করে AI Assistant-এর সিস্টেম প্রম্পটে পাঠায়।
 */
export function formatCampusKnowledgeForAI(): string {
  const faqText = CAMPUS_FAQ.map(
    (item, idx) => `${idx + 1}. প্রশ্ন: ${item.question}\n   উত্তর: ${item.answer}`,
  ).join('\n');

  const rulesText = CAMPUS_RULES.map((rule) => `- ${rule}`).join('\n');

  return `
=== BSPI CAMPUS KNOWLEDGE BASE (Official Reference) ===
প্রতিষ্ঠান: ${CAMPUS_BASIC_INFO.instituteNameBn} (${CAMPUS_BASIC_INFO.instituteNameEn})
অবস্থান: ${CAMPUS_BASIC_INFO.location} | প্রতিষ্ঠা: ${CAMPUS_BASIC_INFO.established} | ইনস্টিটিউট কোড: ${CAMPUS_BASIC_INFO.instituteCode}
বোর্ড ও কারিকুলাম: ${CAMPUS_BASIC_INFO.board} — ${CAMPUS_BASIC_INFO.curriculum}
অফিশিয়াল ওয়েবসাইট: ${CAMPUS_LINKS.officialWebsite}
অফিশিয়াল নোটিশ পেজ: ${CAMPUS_LINKS.officialNotices}
BTEB ওয়েবসাইট: ${CAMPUS_LINKS.btebWebsite}
অফিস সময়: ${CAMPUS_BASIC_INFO.officeHours} (সাপ্তাহিক ছুটি: ${CAMPUS_BASIC_INFO.weeklyHoliday})
অফিস যোগাযোগ: ফোন ${CAMPUS_BASIC_INFO.officePhone} | ইমেইল ${CAMPUS_BASIC_INFO.officeEmail}

শিফট সময়সূচি:
${CAMPUS_BASIC_INFO.shifts.map((s) => `- ${s}`).join('\n')}

টেকনোলজি/ডিপার্টমেন্টসমূহ:
${CAMPUS_BASIC_INFO.departments.map((d) => `- ${d}`).join('\n')}

ক্যাম্পাস নিয়মাবলি:
${rulesText}

সাধারণ প্রশ্নোত্তর (BSPI FAQ):
${faqText}
=== END OF CAMPUS KNOWLEDGE BASE ===
`.trim();
}
