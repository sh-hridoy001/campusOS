import dotenv from 'dotenv';
dotenv.config();

import express, { type Request, type Response, type NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { GoogleGenAI, Type } from '@google/genai';
import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import {
  CAMPUS_LINKS,
  formatCampusKnowledgeForAI,
} from './src/data/campusKnowledge.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

const firebaseConfigPath = path.resolve(__dirname, 'firebase-applet-config.json');
const firebaseAppletConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8')) as {
  projectId: string;
};

const adminApp = getApps().length
  ? getApp()
  : initializeApp({ projectId: firebaseAppletConfig.projectId });
const adminAuth = getAuth(adminApp);

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface StoredNote {
  id: string;
  title: string;
  subject: string;
  department: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  base64Data: string;
  uploadedBy: string;
  uploaderName: string;
  createdAt: string;
}

interface LostFoundItem {
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

const storedNotes: StoredNote[] = [];
const lostFoundItems: LostFoundItem[] = [];

interface AuthenticatedRequest extends Request {
  authUser?: DecodedIdToken;
}

async function requireFirebaseAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    res.status(401).json({ error: 'Invalid authentication token.' });
    return;
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.authUser = decoded;
    next();
  } catch (err) {
    console.error('Firebase token verification error:', err);
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
  }
}

function isBootstrappedAdmin(user: DecodedIdToken): boolean {
  return (
    user.email === 'sazzadhossainhridoy961@gmail.com' &&
    user.email_verified === true
  );
}

const BUSY_ERROR_BANGLA =
  'সার্ভার এখন একটু ব্যস্ত আছে, অনুগ্রহ করে কয়েক সেকেন্ড পর আবার চেষ্টা করুন।';

const GEMINI_MODEL_CASCADE = [
  'gemini-4-hydrogen',
  'gemini-3.1-flash-lite',
] as const;

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getErrorDetails(err: unknown): { status: number | null; text: string } {
  const obj =
    err && typeof err === 'object' ? (err as Record<string, unknown>) : null;
  const rawStatus = obj?.status ?? obj?.code ?? obj?.httpStatus;
  const status = typeof rawStatus === 'number' ? rawStatus : null;
  const msg = err instanceof Error ? err.message : String(err ?? '');
  let serialized = msg;
  if (obj) {
    try {
      serialized = `${msg} ${JSON.stringify(obj)}`;
    } catch {
      serialized = msg;
    }
  }
  return { status, text: serialized };
}

function isNonRetryableGeminiError(err: unknown): boolean {
  const { status, text } = getErrorDetails(err);
  const upper = text.toUpperCase();
  return (
    status === 401 ||
    status === 403 ||
    upper.includes('PERMISSION_DENIED') ||
    upper.includes('API_KEY_INVALID') ||
    upper.includes('API KEY NOT VALID')
  );
}

function isModelNotFoundError(err: unknown): boolean {
  const { status, text } = getErrorDetails(err);
  const upper = text.toUpperCase();
  return (
    status === 404 ||
    upper.includes('NOT_FOUND') ||
    upper.includes('IS NOT FOUND FOR API VERSION') ||
    upper.includes('NO LONGER AVAILABLE')
  );
}

function isServiceUnavailableError(err: unknown): boolean {
  const { status, text } = getErrorDetails(err);
  const lower = text.toLowerCase();
  return (
    status === 503 ||
    status === 502 ||
    status === 504 ||
    lower.includes('503') ||
    lower.includes('unavailable') ||
    lower.includes('high demand') ||
    lower.includes('overloaded') ||
    lower.includes('temporarily unavailable') ||
    lower.includes('try again later') ||
    lower.includes('resource_exhausted') ||
    lower.includes('econnreset') ||
    lower.includes('etimedout') ||
    lower.includes('fetch failed')
  );
}

async function runGeminiWithRetry<T>(
  task: (model: string) => Promise<T>,
): Promise<T> {
  const attemptPlan: Array<{ model: string; waitAfterFailureMs: number }> = [
    { model: GEMINI_MODEL_CASCADE[0], waitAfterFailureMs: 1500 },
    { model: GEMINI_MODEL_CASCADE[0], waitAfterFailureMs: 1200 },
    { model: GEMINI_MODEL_CASCADE[1], waitAfterFailureMs: 1200 },
    { model: GEMINI_MODEL_CASCADE[1], waitAfterFailureMs: 0 },
  ];

  let lastError: unknown;
  for (let i = 0; i < attemptPlan.length; i += 1) {
    const { model, waitAfterFailureMs } = attemptPlan[i];
    try {
      return await task(model);
    } catch (err) {
      lastError = err;
      if (isNonRetryableGeminiError(err)) {
        throw err;
      }

      const isLastAttempt = i === attemptPlan.length - 1;
      if (isLastAttempt) {
        throw err;
      }

      const canRetryOrFallback =
        isServiceUnavailableError(err) || isModelNotFoundError(err);
      if (!canRetryOrFallback) {
        throw err;
      }

      const { status } = getErrorDetails(err);
      console.log(
        `Gemini transient retry on ${model} (attempt ${i + 1}/${attemptPlan.length}, status=${status ?? 'unknown'})`,
      );

      if (!isModelNotFoundError(err) && waitAfterFailureMs > 0) {
        await sleep(waitAfterFailureMs);
      }
    }
  }

  throw lastError;
}

function handleGeminiError(err: unknown, res: Response) {
  console.error('Gemini API error:', err);
  const { text } = getErrorDetails(err);
  const upper = text.toUpperCase();

  if (upper.includes('PERMISSION_DENIED') || upper.includes('API_KEY_INVALID')) {
    res.status(403).json({
      error: 'Gemini API key is invalid or missing. Check GEMINI_API_KEY in Settings > Secrets.',
    });
    return;
  }

  if (isServiceUnavailableError(err) || isModelNotFoundError(err)) {
    res.status(503).json({
      error: BUSY_ERROR_BANGLA,
    });
    return;
  }

  res.status(500).json({ error: BUSY_ERROR_BANGLA });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  // 1. Summarize Campus Notice using Gemini AI
  app.post(
    '/api/ai/summarize',
    requireFirebaseAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          error: 'GEMINI_API_KEY is not configured. Add it in Settings > Secrets.',
        });
        return;
      }

      const { title, content } = req.body ?? {};
      if (
        typeof title !== 'string' ||
        typeof content !== 'string' ||
        !title.trim() ||
        !content.trim()
      ) {
        res.status(400).json({ error: 'Notice title and content are required.' });
        return;
      }

      if (title.length > 500 || content.length > 20000) {
        res.status(400).json({ error: 'Notice content exceeds maximum allowed length.' });
        return;
      }

      try {
        const response = await runGeminiWithRetry((model) =>
          ai.models.generateContent({
            model,
            contents: `Summarize this official campus notice clearly for students and faculty.\n\nTitle: ${title.trim()}\n\nContent:\n${content.trim()}`,
            config: {
              systemInstruction:
                'You are an academic campus assistant for Bangladesh Sweden Polytechnic Institute (BSPI), Kaptai. Extract an accurate, concise summary, key bullet points, and concrete action items or deadlines from the notice. Do not invent facts not present in the notice. Write in clear, natural Bengali if the notice is in Bengali or if helpful for BSPI students, otherwise match the notice clarity concisely.',
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  summary: {
                    type: Type.STRING,
                    description: 'A crisp 1-2 sentence executive summary of the notice.',
                  },
                  keyPoints: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: '3 to 5 concise key points from the notice.',
                  },
                  actionItems: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description:
                      'Specific deadlines, required actions, or dates mentioned (empty array if none).',
                  },
                },
                required: ['summary', 'keyPoints', 'actionItems'],
              },
            },
          }),
        );

        const parsed = JSON.parse((response.text ?? '{}').trim());
        res.json(parsed);
      } catch (err) {
        handleGeminiError(err, res);
      }
    },
  );

  // 2. AI Campus Assistant Chat (grounded in live notices and class routines)
  app.post(
    '/api/ai/chat',
    requireFirebaseAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          error: 'GEMINI_API_KEY is not configured. Add it in Settings > Secrets.',
        });
        return;
      }

      const { messages, context } = req.body ?? {};
      if (!Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: 'At least one chat message is required.' });
        return;
      }

      const sanitizedMessages = messages
        .filter(
          (m): m is { role: 'user' | 'assistant'; text: string } =>
            m &&
            (m.role === 'user' || m.role === 'assistant') &&
            typeof m.text === 'string' &&
            m.text.trim().length > 0,
        )
        .slice(-20);

      const latest = sanitizedMessages[sanitizedMessages.length - 1];
      if (!latest || latest.role !== 'user') {
        res.status(400).json({ error: 'Latest message must be from the user.' });
        return;
      }

      const profileText = context?.profile
        ? `Current User: ${String(context.profile.full_name || 'Campus Member')} | Role: ${String(context.profile.role || 'student')} | Technology/Department: ${String(context.profile.department || 'General')} | Shift: ${String(context.profile.shift || 'Not specified')} | Semester: ${String(context.profile.semester || 'Not specified')}`
        : 'Current User: Campus Member';

      const noticesList = Array.isArray(context?.notices)
        ? context.notices
            .slice(0, 20)
            .map(
              (n: {
                title?: string;
                content?: string;
                category?: string;
                is_urgent?: boolean;
                created_at?: string;
              }) =>
                `- [${n.created_at ? new Date(n.created_at).toLocaleDateString() : 'Recent'}] [${n.is_urgent ? 'URGENT · ' : ''}${String(n.category || 'General')}] ${String(n.title || '')}: ${String(n.content || '').slice(0, 500)}`,
            )
            .join('\n')
        : '';

      const routinesList = Array.isArray(context?.routines)
        ? context.routines
            .slice(0, 40)
            .map(
              (r: {
                day?: string;
                time_slot?: string;
                subject?: string;
                teacher_name?: string;
                room?: string;
                department?: string;
                shift?: string;
                semester?: string;
              }) =>
                `- ${String(r.day || '')} | ${String(r.time_slot || '')} | ${String(r.subject || '')} | Instructor: ${String(r.teacher_name || '')} | Room: ${String(r.room || '')} | Tech: ${String(r.department || '')} | Shift: ${String(r.shift || '1st Shift')} | Semester: ${String(r.semester || 'N/A')}`,
            )
            .join('\n')
        : '';

      const campusKnowledge = formatCampusKnowledgeForAI();
      const nowDhaka = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Dhaka',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date());

      const systemInstruction = `You are the official BSPI AI Campus Assistant for Bangladesh Sweden Polytechnic Institute (BSPI), Kaptai (${CAMPUS_LINKS.officialWebsite}). You help BSPI students, teachers, and administrators with class routines, shift schedules (1st Shift & 2nd Shift), BTEB academic info, and official notices.

Current Date & Day in Bangladesh (Asia/Dhaka): ${nowDhaka}
${profileText}

${campusKnowledge}

Live CampusOS Notices (from Firestore):
${noticesList || 'No notices currently posted in CampusOS.'}

Live CampusOS Class Routines (from Firestore):
${routinesList || 'No class routines currently scheduled in CampusOS.'}

Language & Formatting Rules (CRITICAL):
- ALWAYS reply in simple, fluent, warm, and polite Bengali (সহজ, প্রাঞ্জল ও ভদ্র বাংলায় উত্তর দাও).
- If the user writes in Bengali OR in Banglish (Bengali written using English/Latin letters, such as "amar ajke ki class ache?", "exam notice ta bolo", "1st shift er routine dao"), understand the Banglish accurately and ALWAYS respond in Bengali script (বাংলা অক্ষরে).
- Even if the user asks a regular question in English, reply in natural Bengali unless the user EXPLICITLY requests English (e.g., "answer in English", "reply in English", "write in English").
- Use clean Markdown formatting (**bold** for times, subjects, room numbers, shifts, and important dates; clean bullet lists or numbered steps) so answers render neatly inside cards.

Source Priority & Strict Honesty Rules (MOST IMPORTANT):
1. Prioritize the BSPI Campus Knowledge Base above (including ${CAMPUS_LINKS.officialWebsite}) and the Live CampusOS Notices & Class Routines provided above as your primary source of truth.
2. When the user asks about classes or schedule, prioritize their own Technology/Department, Shift, and Semester unless they ask about another department or shift.
3. NEVER invent, guess, or fabricate any notice, exam date, form fill-up deadline, result date, class time, teacher name, or room number that is NOT explicitly present in the Live CampusOS Notices, Live Class Routines, or Campus Knowledge Base above.
4. If the requested specific notice, exam date, routine, or live campus update is missing from the data above, honestly and politely tell the user in Bengali:
   - তথ্যটি বর্তমানে CampusOS সিস্টেমে পাওয়া যায়নি (বা যুক্ত করা হয়নি)।
   - যাচাই করার জন্য সরাসরি BSPI-এর অফিশিয়াল ওয়েবসাইট [bspi.polytech.gov.bd](${CAMPUS_LINKS.officialWebsite}) (অথবা নোটিশ বোর্ড: ${CAMPUS_LINKS.officialNotices}) দেখতে এবং প্রয়োজনে সংশ্লিষ্ট ডিপার্টমেন্ট অফিসে যোগাযোগ করতে পরামর্শ দাও।`;

      try {
        const history = sanitizedMessages.slice(0, -1).map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.text.slice(0, 4000) }],
        }));

        const response = await runGeminiWithRetry(async (model) => {
          const chat = ai.chats.create({
            model,
            config: { systemInstruction },
            history,
          });

          return chat.sendMessage({
            message: latest.text.slice(0, 4000),
          });
        });

        res.json({
          reply:
            response.text?.trim() ||
            'দুঃখিত, এই মুহূর্তে উত্তর তৈরি করা যায়নি। অনুগ্রহ করে আবার প্রশ্ন করুন।',
        });
      } catch (err) {
        handleGeminiError(err, res);
      }
    },
  );

  // 3. PDF Notes Library & Gemini AI Q&A
  app.get('/api/notes', requireFirebaseAuth, (_req: AuthenticatedRequest, res: Response) => {
    const summaries = storedNotes.map(
      ({ base64Data: _omit, ...meta }) => meta,
    );
    res.json({ notes: summaries });
  });

  app.post('/api/notes', requireFirebaseAuth, (req: AuthenticatedRequest, res: Response) => {
    const { title, subject, department, fileName, mimeType, base64Data, uploaderName } =
      req.body ?? {};

    if (
      typeof title !== 'string' ||
      typeof subject !== 'string' ||
      typeof department !== 'string' ||
      typeof fileName !== 'string' ||
      typeof mimeType !== 'string' ||
      typeof base64Data !== 'string' ||
      !title.trim() ||
      !subject.trim() ||
      !base64Data.trim()
    ) {
      res.status(400).json({ error: 'Missing required study document fields.' });
      return;
    }

    const allowedMimeTypes = new Set([
      'application/pdf',
      'text/plain',
      'text/markdown',
    ]);
    if (!allowedMimeTypes.has(mimeType)) {
      res.status(400).json({
        error: 'Only PDF, plain text, and markdown files are supported.',
      });
      return;
    }

    const approxBytes = Math.floor((base64Data.length * 3) / 4);
    if (approxBytes > 15 * 1024 * 1024) {
      res.status(400).json({ error: 'File exceeds the 15 MB size limit.' });
      return;
    }

    if (storedNotes.length >= 30) {
      storedNotes.pop();
    }

    const note: StoredNote = {
      id: crypto.randomUUID(),
      title: title.trim().slice(0, 140),
      subject: subject.trim().slice(0, 100),
      department: department.trim().slice(0, 100),
      fileName: fileName.trim().slice(0, 160),
      mimeType,
      fileSize: approxBytes,
      base64Data,
      uploadedBy: req.authUser!.uid,
      uploaderName:
        typeof uploaderName === 'string' && uploaderName.trim()
          ? uploaderName.trim().slice(0, 100)
          : req.authUser!.email || 'Campus Member',
      createdAt: new Date().toISOString(),
    };

    storedNotes.unshift(note);
    const { base64Data: _omit, ...meta } = note;
    res.status(201).json({ note: meta });
  });

  app.get(
    '/api/notes/:id/file',
    requireFirebaseAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const note = storedNotes.find((n) => n.id === req.params.id);
      if (!note) {
        res.status(404).json({ error: 'Document not found.' });
        return;
      }
      const buffer = Buffer.from(note.base64Data, 'base64');
      res.setHeader('Content-Type', note.mimeType);
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${note.fileName.replace(/["\r\n]/g, '')}"`,
      );
      res.send(buffer);
    },
  );

  app.delete(
    '/api/notes/:id',
    requireFirebaseAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const idx = storedNotes.findIndex((n) => n.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ error: 'Document not found.' });
        return;
      }
      const note = storedNotes[idx];
      if (note.uploadedBy !== req.authUser!.uid && !isBootstrappedAdmin(req.authUser!)) {
        res.status(403).json({ error: 'You do not have permission to delete this note.' });
        return;
      }
      storedNotes.splice(idx, 1);
      res.json({ deleted: true });
    },
  );

  app.post(
    '/api/ai/pdf-qa',
    requireFirebaseAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          error: 'GEMINI_API_KEY is not configured. Add it in Settings > Secrets.',
        });
        return;
      }

      const { noteId, question } = req.body ?? {};
      if (typeof noteId !== 'string' || typeof question !== 'string' || !question.trim()) {
        res.status(400).json({ error: 'Document ID and question are required.' });
        return;
      }

      const note = storedNotes.find((n) => n.id === noteId);
      if (!note) {
        res.status(404).json({ error: 'Study document not found.' });
        return;
      }

      try {
        const docPart = {
          inlineData: {
            mimeType: note.mimeType,
            data: note.base64Data,
          },
        };
        const promptPart = {
          text: `Document Title: ${note.title} (${note.subject} - ${note.department})\n\nStudent Question: ${question.trim().slice(0, 3000)}`,
        };

        const response = await runGeminiWithRetry((model) =>
          ai.models.generateContent({
            model,
            contents: { parts: [docPart, promptPart] },
            config: {
              systemInstruction:
                'You are an expert academic study tutor for BSPI students. Answer questions strictly based on the attached study document. Cite specific sections, definitions, or formulas from the document when helpful, and clearly note if the document does not cover part of the question. Respond in clear, polite Bengali if the user asks in Bengali or Banglish (unless they explicitly ask for English).',
            },
          }),
        );

        res.json({
          answer:
            response.text?.trim() ||
            'দুঃখিত, ডকুমেন্ট থেকে উত্তর তৈরি করা যায়নি।',
        });
      } catch (err) {
        handleGeminiError(err, res);
      }
    },
  );

  // 4. Lost & Found Board API
  app.get(
    '/api/lost-found',
    requireFirebaseAuth,
    (_req: AuthenticatedRequest, res: Response) => {
      res.json({ items: lostFoundItems });
    },
  );

  app.post(
    '/api/lost-found',
    requireFirebaseAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const { type, title, category, description, location, contactInfo, reporterName } =
        req.body ?? {};

      if (
        (type !== 'lost' && type !== 'found') ||
        typeof title !== 'string' ||
        typeof description !== 'string' ||
        typeof location !== 'string' ||
        !title.trim() ||
        !description.trim() ||
        !location.trim()
      ) {
        res.status(400).json({ error: 'Type, title, description, and location are required.' });
        return;
      }

      const item: LostFoundItem = {
        id: crypto.randomUUID(),
        type,
        status: 'open',
        title: title.trim().slice(0, 120),
        category:
          typeof category === 'string' && category.trim()
            ? category.trim().slice(0, 60)
            : 'General',
        description: description.trim().slice(0, 1000),
        location: location.trim().slice(0, 120),
        contactInfo:
          typeof contactInfo === 'string' && contactInfo.trim()
            ? contactInfo.trim().slice(0, 140)
            : req.authUser!.email || 'Campus Helpdesk',
        createdBy: req.authUser!.uid,
        reporterName:
          typeof reporterName === 'string' && reporterName.trim()
            ? reporterName.trim().slice(0, 100)
            : req.authUser!.email || 'Campus Member',
        createdAt: new Date().toISOString(),
      };

      lostFoundItems.unshift(item);
      res.status(201).json({ item });
    },
  );

  app.patch(
    '/api/lost-found/:id',
    requireFirebaseAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const item = lostFoundItems.find((i) => i.id === req.params.id);
      if (!item) {
        res.status(404).json({ error: 'Item not found.' });
        return;
      }
      if (item.createdBy !== req.authUser!.uid && !isBootstrappedAdmin(req.authUser!)) {
        res.status(403).json({ error: 'Only the reporter or an admin can update this item.' });
        return;
      }
      const { status } = req.body ?? {};
      if (status !== 'open' && status !== 'resolved') {
        res.status(400).json({ error: 'Status must be open or resolved.' });
        return;
      }
      item.status = status;
      res.json({ item });
    },
  );

  app.delete(
    '/api/lost-found/:id',
    requireFirebaseAuth,
    (req: AuthenticatedRequest, res: Response) => {
      const idx = lostFoundItems.findIndex((i) => i.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ error: 'Item not found.' });
        return;
      }
      const item = lostFoundItems[idx];
      if (item.createdBy !== req.authUser!.uid && !isBootstrappedAdmin(req.authUser!)) {
        res.status(403).json({ error: 'Only the reporter or an admin can delete this item.' });
        return;
      }
      lostFoundItems.splice(idx, 1);
      res.json({ deleted: true });
    },
  );

  // Vite dev middleware or production static assets
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CampusOS server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start CampusOS server:', err);
  process.exit(1);
});
