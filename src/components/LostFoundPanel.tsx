import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  MapPin,
  PackageSearch,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type { LostFoundReport, UserProfile } from '../types';
import {
  createLostFoundItem,
  deleteLostFoundItem,
  updateLostFoundStatus,
} from '../lib/api';
import { CardsGridSkeleton } from './Skeletons';
import { useToast } from './ToastProvider';

interface LostFoundPanelProps {
  profile: UserProfile;
  accessToken: string;
  items: LostFoundReport[];
  loading: boolean;
  onRefresh: () => Promise<void>;
}

const CATEGORIES = [
  'ID Card & Admit Card',
  'Electronics & Calculators',
  'Books & Lab Manuals',
  'Keys & Wallets',
  'Bags & Accessories',
  'Other',
];

export function LostFoundPanel({
  profile,
  accessToken,
  items,
  loading,
  onRefresh,
}: LostFoundPanelProps) {
  const { showToast } = useToast();
  const [filter, setFilter] = useState<'all' | 'lost' | 'found' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [type, setType] = useState<'lost' | 'found'>('lost');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [location, setLocation] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (filter === 'lost' && (item.type !== 'lost' || item.status !== 'open')) {
        return false;
      }
      if (filter === 'found' && (item.type !== 'found' || item.status !== 'open')) {
        return false;
      }
      if (filter === 'resolved' && item.status !== 'resolved') {
        return false;
      }
      if (q) {
        return (
          item.title.toLowerCase().includes(q) ||
          item.location.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, filter, searchQuery]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !location.trim() || !description.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const created = await createLostFoundItem(accessToken, {
        type,
        title: title.trim(),
        category,
        description: description.trim(),
        location: location.trim(),
        contactInfo: contactInfo.trim() || 'BSPI Registrar / Security Desk',
        reporterName: profile.full_name,
      });

      showToast({
        type: 'success',
        title: type === 'lost' ? 'Lost item reported' : 'Found item posted',
        description: created.title,
      });
      setTitle('');
      setLocation('');
      setContactInfo('');
      setDescription('');
      setShowForm(false);
      await onRefresh();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Unable to post Lost & Found report.';
      setError(msg);
      showToast({ type: 'error', title: 'Report failed', description: msg });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(item: LostFoundReport) {
    setError(null);
    const nextStatus = item.status === 'open' ? 'resolved' : 'open';
    try {
      await updateLostFoundStatus(accessToken, item.id, nextStatus);
      await onRefresh();
      showToast({
        type: 'success',
        title: nextStatus === 'resolved' ? 'Marked as resolved' : 'Report reopened',
        description: item.title,
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Unable to update item status.';
      setError(msg);
      showToast({ type: 'error', title: 'Status update failed', description: msg });
    }
  }

  async function handleDelete(item: LostFoundReport) {
    setError(null);
    try {
      await deleteLostFoundItem(accessToken, item.id);
      await onRefresh();
      showToast({
        type: 'info',
        title: 'Report removed',
        description: item.title,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to delete item.';
      setError(msg);
      showToast({ type: 'error', title: 'Delete failed', description: msg });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500">
            BSPI Kaptai · Campus Helpdesk & Workshops
          </p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">
            Campus Lost & Found
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Report misplaced ID cards, calculators, or items turned in across workshops and buildings.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-medium hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Report Item
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-xs p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              Submit Lost & Found Report
            </h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              aria-label="Close report form"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <span className="block text-xs font-medium text-slate-700 mb-1.5">
                Report Type
              </span>
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setType('lost')}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    type === 'lost'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  Lost Item
                </button>
                <button
                  type="button"
                  onClick={() => setType('found')}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    type === 'found'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  Found Item
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="lf-title"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Item Name
              </label>
              <input
                id="lf-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Casio fx-991EX Calculator"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
              />
            </div>

            <div>
              <label
                htmlFor="lf-category"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Category
              </label>
              <select
                id="lf-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="lf-location"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Last Seen / Found Location
              </label>
              <input
                id="lf-location"
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="CST Lab 02 or Swedish Mechanical Workshop"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
              />
            </div>

            <div>
              <label
                htmlFor="lf-contact"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Contact / Pickup Desk
              </label>
              <input
                id="lf-contact"
                type="text"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                placeholder="BSPI Security Desk or Dept. Office"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="lf-desc"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Description & Identifying Details
            </label>
            <textarea
              id="lf-desc"
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Color, roll number sticker, or shift timing when noticed..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
            />
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
              {submitting ? 'Submitting...' : 'Post Report'}
            </button>
          </div>
        </form>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white/85 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit overflow-x-auto">
          {(
            [
              { key: 'all', label: 'All Items' },
              { key: 'lost', label: 'Lost' },
              { key: 'found', label: 'Found' },
              { key: 'resolved', label: 'Resolved' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                filter === tab.key
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items or locations..."
            className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
          />
        </div>
      </div>

      {/* Items List */}
      {loading ? (
        <CardsGridSkeleton />
      ) : filteredItems.length === 0 ? (
        <div className="bg-white/85 backdrop-blur-md border border-slate-200/90 rounded-xl p-12 text-center">
          <PackageSearch className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-slate-900">
            No Lost & Found reports in this view
          </h2>
          <p className="mt-1.5 text-sm text-slate-500 max-w-md mx-auto">
            Report a misplaced item or something found on campus so BSPI students and staff can reconnect with it quickly.
          </p>
          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="mt-4 px-4 py-2 rounded-lg bg-blue-700 text-white text-xs font-medium hover:bg-blue-800 cursor-pointer"
            >
              Submit First Report
            </button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filteredItems.map((item) => {
            const canModify =
              item.createdBy === profile.uid || profile.role === 'admin';
            return (
              <article
                key={item.id}
                className="bg-white/85 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-xs p-5 flex flex-col justify-between gap-4 transition-all duration-150 hover:border-slate-300"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold">
                        <span
                          className={
                            item.status === 'resolved'
                              ? 'text-emerald-700'
                              : item.type === 'lost'
                                ? 'text-red-700'
                                : 'text-blue-700'
                          }
                        >
                          {item.status === 'resolved'
                            ? 'Resolved'
                            : item.type === 'lost'
                              ? 'Lost'
                              : 'Found'}
                        </span>
                        <span className="text-slate-400 mx-1.5">·</span>
                        <span className="text-slate-500 font-normal">
                          {item.category}
                        </span>
                      </p>
                      <h3 className="mt-1 text-base font-semibold text-slate-900">
                        {item.title}
                      </h3>
                    </div>

                    {canModify && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => void handleToggleStatus(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          {item.status === 'open' ? 'Mark Resolved' : 'Reopen'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                          title="Delete report"
                          aria-label="Delete report"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                  <p className="flex items-center gap-1.5 text-slate-700 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{item.location}</span>
                  </p>
                  <p className="tabular-nums">
                    Contact: {item.contactInfo} · Posted by {item.reporterName} ·{' '}
                    {new Date(item.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
