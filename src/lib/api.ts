import type {
  ClassRoutine,
  LostFoundReport,
  Notice,
  NoticeSummary,
  StudyNoteMeta,
  UserProfile,
} from '../types';

async function apiRequest<T>(
  url: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.error === 'string'
        ? data.error
        : `Request failed with status ${res.status}`,
    );
  }
  return data as T;
}

export async function summarizeNoticeWithAI(
  token: string,
  title: string,
  content: string,
): Promise<NoticeSummary> {
  return apiRequest<NoticeSummary>('/api/ai/summarize', token, {
    method: 'POST',
    body: JSON.stringify({ title, content }),
  });
}

export async function sendCampusChatMessage(
  token: string,
  messages: Array<{ role: 'user' | 'assistant'; text: string }>,
  context: {
    profile: UserProfile;
    notices: Notice[];
    routines: ClassRoutine[];
  },
): Promise<{ reply: string }> {
  return apiRequest<{ reply: string }>('/api/ai/chat', token, {
    method: 'POST',
    body: JSON.stringify({ messages, context }),
  });
}

export async function fetchStudyNotes(token: string): Promise<StudyNoteMeta[]> {
  const data = await apiRequest<{ notes: StudyNoteMeta[] }>('/api/notes', token);
  return data.notes;
}

export async function uploadStudyNote(
  token: string,
  payload: {
    title: string;
    subject: string;
    department: string;
    fileName: string;
    mimeType: string;
    base64Data: string;
    uploaderName: string;
  },
): Promise<StudyNoteMeta> {
  const data = await apiRequest<{ note: StudyNoteMeta }>('/api/notes', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.note;
}

export async function deleteStudyNote(token: string, id: string): Promise<void> {
  await apiRequest<{ deleted: boolean }>(`/api/notes/${encodeURIComponent(id)}`, token, {
    method: 'DELETE',
  });
}

export async function fetchStudyNoteBlobUrl(
  token: string,
  id: string,
): Promise<string> {
  const res = await fetch(`/api/notes/${encodeURIComponent(id)}/file`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error('Unable to load document file.');
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function askPdfQuestion(
  token: string,
  noteId: string,
  question: string,
): Promise<string> {
  const data = await apiRequest<{ answer: string }>('/api/ai/pdf-qa', token, {
    method: 'POST',
    body: JSON.stringify({ noteId, question }),
  });
  return data.answer;
}

export async function fetchLostFoundItems(
  token: string,
): Promise<LostFoundReport[]> {
  const data = await apiRequest<{ items: LostFoundReport[] }>(
    '/api/lost-found',
    token,
  );
  return data.items;
}

export async function createLostFoundItem(
  token: string,
  payload: {
    type: 'lost' | 'found';
    title: string;
    category: string;
    description: string;
    location: string;
    contactInfo: string;
    reporterName: string;
  },
): Promise<LostFoundReport> {
  const data = await apiRequest<{ item: LostFoundReport }>('/api/lost-found', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.item;
}

export async function updateLostFoundStatus(
  token: string,
  id: string,
  status: 'open' | 'resolved',
): Promise<LostFoundReport> {
  const data = await apiRequest<{ item: LostFoundReport }>(
    `/api/lost-found/${encodeURIComponent(id)}`,
    token,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
  );
  return data.item;
}

export async function deleteLostFoundItem(
  token: string,
  id: string,
): Promise<void> {
  await apiRequest<{ deleted: boolean }>(
    `/api/lost-found/${encodeURIComponent(id)}`,
    token,
    {
      method: 'DELETE',
    },
  );
}
