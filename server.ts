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

function handleGeminiError(err: unknown, res: Response) {
  console.error('Gemini API error:', err);
  const message =
    err instanceof Error ? err.message : 'An error occurred while contacting Gemini AI.';
  if (message.includes('PERMISSION_DENIED') || message.includes('API_KEY_INVALID')) {
    res.status(403).json({
      error: 'Gemini API key is invalid or missing. Check GEMINI_API_KEY in Settings > Secrets.',
    });
    return;
  }
  if (message.includes('RESOURCE_EXHAUSTED')) {
    res.status(429).json({
      error: 'Gemini API rate limit or quota reached. Please try again shortly.',
    });
    return;
  }
  res.status(500).json({ error: message });
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
        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `Summarize this official campus notice clearly for students and faculty.\n\nTitle: ${title.trim()}\n\nContent:\n${content.trim()}`,
          config: {
            systemInstruction:
              'You are an academic campus assistant. Extract an accurate, concise summary, key bullet points, and concrete action items or deadlines from the notice. Do not invent facts not present in the notice.',
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
        });

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
        ? `Current User: ${String(context.profile.full_name || 'Campus Member')} | Role: ${String(context.profile.role || 'student')} | Department: ${String(context.profile.department || 'General')}`
        : 'Current User: Campus Member';

      const noticesList = Array.isArray(context?.notices)
        ? context.notices
            .slice(0, 20)
            .map(
              (n: { title?: string; content?: string; created_at?: string }) =>
                `- [${n.created_at ? new Date(n.created_at).toLocaleDateString() : 'Recent'}] ${String(n.title || '')}: ${String(n.content || '').slice(0, 500)}`,
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
              }) =>
                `- ${String(r.day || '')} | ${String(r.time_slot || '')} | ${String(r.subject || '')} | Instructor: ${String(r.teacher_name || '')} | Room: ${String(r.room || '')} | Dept: ${String(r.department || '')}`,
            )
            .join('\n')
        : '';

      const systemInstruction = `You are the CampusOS AI Campus Assistant, helping students, teachers, and administrators navigate campus life, class schedules, and official announcements.

${profileText}

Current Official Notices:
${noticesList || 'No notices currently posted.'}

Current Class Routines:
${routinesList || 'No class routines currently scheduled.'}

Guidelines:
- Answer directly, clearly, and concisely using the live notices and class routines above whenever relevant.
- If the user asks about classes, prioritize their department unless they ask about another department.
- If information is not present in the live campus records, state that clearly instead of fabricating dates, room numbers, or policies.
- Use plain text or clean markdown bullet lists for readability.`;

      try {
        const history = sanitizedMessages.slice(0, -1).map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.text.slice(0, 4000) }],
        }));

        const chat = ai.chats.create({
          model: 'gemini-4-hydrogen',
          config: { systemInstruction },
          history,
        });

        const response = await chat.sendMessage({
          message: latest.text.slice(0, 4000),
        });

        res.json({ reply: response.text ?? 'No response generated.' });
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

        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: { parts: [docPart, promptPart] },
          config: {
            systemInstruction:
              'You are an expert academic study tutor. Answer questions strictly based on the attached study document. Cite specific sections, definitions, or formulas from the document when helpful, and clearly note if the document does not cover part of the question.',
          },
        });

        res.json({ answer: response.text ?? 'Unable to generate an answer.' });
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
