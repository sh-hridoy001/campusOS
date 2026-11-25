import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Eye,
  FileText,
  Send,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  DEPARTMENTS,
  type StudyNoteMeta,
  type UserProfile,
} from '../types';
import {
  askPdfQuestion,
  deleteStudyNote,
  fetchStudyNoteBlobUrl,
  uploadStudyNote,
} from '../lib/api';

interface NotesPanelProps {
  profile: UserProfile;
  accessToken: string;
  notes: StudyNoteMeta[];
  loading: boolean;
  onRefresh: () => Promise<void>;
}

interface QaEntry {
  id: string;
  question: string;
  answer: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(new Error('Failed to read selected file.'));
    reader.readAsDataURL(file);
  });
}

export function NotesPanel({
  profile,
  accessToken,
  notes,
  loading,
  onRefresh,
}: NotesPanelProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [department, setDepartment] = useState(profile.department);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeNote, setActiveNote] = useState<StudyNoteMeta | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [qaHistory, setQaHistory] = useState<Record<string, QaEntry[]>>({});

  useEffect(() => {
    if (!activeNote && notes.length > 0) {
      setActiveNote(notes[0]);
    } else if (activeNote && !notes.some((n) => n.id === activeNote.id)) {
      setActiveNote(notes[0] ?? null);
    }
  }, [notes, activeNote]);

  useEffect(() => {
    let revoked = false;
    let currentUrl: string | null = null;

    async function loadPreview() {
      if (!activeNote) {
        setPreviewUrl(null);
        return;
      }
      setLoadingPreview(true);
      try {
        const url = await fetchStudyNoteBlobUrl(accessToken, activeNote.id);
        if (revoked) {
          URL.revokeObjectURL(url);
          return;
        }
        currentUrl = url;
        setPreviewUrl(url);
      } catch {
        setPreviewUrl(null);
      } finally {
        if (!revoked) setLoadingPreview(false);
      }
    }

    void loadPreview();
    return () => {
      revoked = true;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [activeNote?.id, accessToken]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile || !title.trim() || !subject.trim()) return;

    setUploading(true);
    setError(null);
    try {
      const base64Data = await fileToBase64(selectedFile);
      const mimeType =
        selectedFile.type ||
        (selectedFile.name.endsWith('.md')
          ? 'text/markdown'
          : selectedFile.name.endsWith('.txt')
            ? 'text/plain'
            : 'application/pdf');

      const created = await uploadStudyNote(accessToken, {
        title: title.trim(),
        subject: subject.trim(),
        department,
        fileName: selectedFile.name,
        mimeType,
        base64Data,
        uploaderName: profile.full_name,
      });

      setTitle('');
      setSubject('');
      setSelectedFile(null);
      setShowUpload(false);
      await onRefresh();
      setActiveNote(created);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to upload study document.',
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      await deleteStudyNote(accessToken, id);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete document.');
    }
  }

  async function handleAskQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!activeNote || !question.trim() || asking) return;
    const qText = question.trim();
    setAsking(true);
    setError(null);

    try {
      const answer = await askPdfQuestion(accessToken, activeNote.id, qText);
      setQaHistory((prev) => ({
        ...prev,
        [activeNote.id]: [
          ...(prev[activeNote.id] ?? []),
          { id: `${Date.now()}`, question: qText, answer },
        ],
      }));
      setQuestion('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to analyze document with Gemini AI.',
      );
    } finally {
      setAsking(false);
    }
  }

  const activeQa = activeNote ? qaHistory[activeNote.id] ?? [] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            PDF Notes & Study Q&A
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Upload lecture PDFs or study handouts, preview them inline, and ask Gemini AI targeted questions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowUpload((v) => !v)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-medium hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          Upload Study PDF
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {showUpload && (
        <form
          onSubmit={handleUpload}
          className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              Upload Study Document
            </h2>
            <button
              type="button"
              onClick={() => setShowUpload(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              aria-label="Close upload form"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="note-title"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Document Title
              </label>
              <input
                id="note-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Week 4: Graph Algorithms"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
              />
            </div>

            <div>
              <label
                htmlFor="note-subject"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Subject / Course
              </label>
              <input
                id="note-subject"
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="CSE-220 Data Structures"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
              />
            </div>

            <div>
              <label
                htmlFor="note-dept"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Department
              </label>
              <select
                id="note-dept"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="note-file"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Select PDF, TXT, or Markdown File (max 15 MB)
            </label>
            <input
              id="note-file"
              type="file"
              required
              accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border file:border-slate-300 file:text-xs file:font-semibold file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setShowUpload(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-medium hover:bg-blue-800 disabled:opacity-50 cursor-pointer"
            >
              {uploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 animate-pulse h-64" />
      ) : notes.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-slate-900">
            No study PDFs uploaded yet
          </h2>
          <p className="mt-1.5 text-sm text-slate-500 max-w-md mx-auto">
            Upload a lecture slide deck, syllabus, or textbook chapter in PDF format to view it inline and ask Gemini AI questions about its contents.
          </p>
          <button
            type="button"
            onClick={() => setShowUpload(true)}
            className="mt-4 px-4 py-2 rounded-lg bg-blue-700 text-white text-xs font-medium hover:bg-blue-800 cursor-pointer"
          >
            Upload First Study PDF
          </button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          {/* Left 4 cols: Library List */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3.5 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-900 tabular-nums">
                Study Library ({notes.length})
              </h2>
            </div>
            <div className="divide-y divide-slate-200 max-h-[600px] overflow-y-auto">
              {notes.map((note) => {
                const isSelected = activeNote?.id === note.id;
                const canDelete =
                  note.uploadedBy === profile.uid ||
                  profile.role === 'admin' ||
                  profile.role === 'teacher';
                return (
                  <div
                    key={note.id}
                    className={`p-4 transition-colors ${
                      isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveNote(note)}
                        className="text-left min-w-0 flex-1 cursor-pointer"
                      >
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {note.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 truncate">
                          {note.subject} · {note.department}
                        </p>
                        <p className="mt-1 text-xs text-slate-400 tabular-nums">
                          {formatBytes(note.fileSize)} · {note.uploaderName}
                        </p>
                      </button>

                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => void handleDelete(note.id)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-red-700 hover:bg-red-50 transition-colors shrink-0 cursor-pointer"
                          title="Delete document"
                          aria-label="Delete document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right 8 cols: Viewer + AI Q&A */}
          {activeNote && (
            <div className="lg:col-span-8 space-y-6">
              {/* Document Preview */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-slate-900 truncate">
                      {activeNote.title}
                    </h2>
                    <p className="text-xs text-slate-500 truncate">
                      {activeNote.fileName} · {activeNote.subject}
                    </p>
                  </div>
                  {previewUrl && (
                    <a
                      href={previewUrl}
                      download={activeNote.fileName}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Download
                    </a>
                  )}
                </div>

                <div className="h-[340px] bg-slate-100 flex items-center justify-center">
                  {loadingPreview ? (
                    <p className="text-xs text-slate-500">Loading document preview...</p>
                  ) : previewUrl ? (
                    <iframe
                      title={activeNote.title}
                      src={previewUrl}
                      className="w-full h-full border-0 bg-white"
                    />
                  ) : (
                    <div className="text-center p-6">
                      <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-xs text-slate-600">
                        Preview unavailable, but AI Q&A is active below.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Document AI Q&A */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Ask Gemini AI about this document
                  </h3>
                </div>

                <div className="p-5 space-y-4 max-h-80 overflow-y-auto bg-slate-50/40">
                  {activeQa.length === 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500">
                        Try asking a question about key definitions, summaries, or practice problems from {activeNote.title}:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          'Summarize the main concepts covered in this document.',
                          'List key definitions or formulas from this material.',
                          'Create 3 practice quiz questions with answers from these notes.',
                        ].map((sample) => (
                          <button
                            key={sample}
                            type="button"
                            onClick={() => setQuestion(sample)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-200 text-xs font-medium text-slate-700 transition-colors cursor-pointer"
                          >
                            {sample}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    activeQa.map((entry) => (
                      <div key={entry.id} className="space-y-2">
                        <p className="text-xs font-semibold text-slate-900">
                          Q: {entry.question}
                        </p>
                        <div className="p-3.5 rounded-lg bg-white border border-slate-200 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {entry.answer}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <form
                  onSubmit={handleAskQuestion}
                  className="p-4 border-t border-slate-200 bg-white flex items-center gap-2.5"
                >
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder={`Ask a question about ${activeNote.title}...`}
                    disabled={asking}
                    className="flex-1 px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
                  />
                  <button
                    type="submit"
                    disabled={asking || !question.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-medium hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    {asking ? 'Analyzing...' : 'Ask AI'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
