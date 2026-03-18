import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AddBooks.css';

export default function AddBooks() {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [toast, setToast] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const API_BASE = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : `${window.location.protocol}//${window.location.hostname}:5000`);
  const [apiBase, setApiBase] = useState(API_BASE);
  const [syncing, setSyncing] = useState(false);

  const [form, setForm] = useState({ title: '', author: '', category: 'Fiction', id: '', count: 1 });
  const [editing, setEditing] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const categories = ['Fiction', 'Science', 'History', 'Technical', 'Biography', 'General'];

  useEffect(() => { fetchBooks(); }, []);

  // Try to fetch from apiBase; if fails, try fallback ports (5001).
  async function fetchBooks() {
    const candidates = [apiBase, 'http://localhost:5000', 'http://localhost:5001'];
    for (const base of candidates) {
      try {
        const res = await fetch(`${base}/api/library/books`);
        if (!res.ok) {
          // try next
          continue;
        }
        const data = await res.json();
        if (data && data.success) {
          setApiBase(base);
          setBooks(data.books || []);
          return;
        }
      } catch (e) {
        // ignore and try next
        continue;
      }
    }
    console.error('fetchBooks error: no API endpoint responded');
    setBooks([]);
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function resetForm() {
    setForm({ title: '', author: '', category: 'Fiction', id: '', count: 1 });
    setEditing(null);
    setShowModal(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const payload = { title: form.title, author: form.author, category: form.category, id: form.id || undefined, count: Number(form.count || 0) };
      let res, data;
      if (editing) {
  const ref = editing._id || editing.id;
  res = await fetch(`${apiBase}/api/library/books/${ref}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`Update failed: ${res.status} ${txt}`);
        }
        data = await res.json();
        showToast('Book updated successfully!');
      } else {
  res = await fetch(`${apiBase}/api/library/books`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`Create failed: ${res.status} ${txt}`);
        }
        data = await res.json();
        showToast('Book added successfully!');
      }

      // Refresh list from server to reflect server-assigned ids and ordering
      await fetchBooks();
      resetForm();
    } catch (err) {
      console.error('submit error', err);
      alert(err.message || 'Could not save book');
    }
  }

  function openEdit(b) {
    setEditing(b);
    setForm({ title: b.title || '', author: b.author || '', category: b.category || 'General', id: b.id || '', count: b.count || 0 });
    setShowModal(true);
  }

  async function handleDelete(b) {
    const ok = window.confirm(`Delete "${b.title}"? This cannot be undone.`);
    if (!ok) return;
    try {
  const ref = b._id || b.id;
  const res = await fetch(`${apiBase}/api/library/books/${ref}`, { method: 'DELETE' });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Delete failed: ${res.status} ${txt}`);
      }
      showToast('Book deleted');
      await fetchBooks();
    } catch (err) {
      console.error('delete error', err);
      alert(err.message || 'Could not delete book');
    }
  }

  async function syncToServer() {
    if (!books || books.length === 0) { showToast('No books to sync'); return; }
    if (syncing) return;
    setSyncing(true);
    let success = 0, failed = 0;
    const updated = [...books];
    for (let i = 0; i < books.length; i++) {
      const b = books[i];
      try {
        const payload = { title: b.title, author: b.author, category: b.category, id: b.id, count: b.count };
        const res = await fetch('/api/library/books', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (!res.ok) {
          failed++;
          console.error('sync error', data);
        } else {
          success++;
          // store DB id if returned
          const dbId = data?.book?._id || data?.book?.id;
          updated[i] = { ...b, _dbId: dbId };
        }
      } catch (e) {
        failed++;
        console.error('sync exception', e);
      }
    }
    setBooks(updated);
    saveToStorage(updated);
    setSyncing(false);
    showToast(`Sync complete: ${success} succeeded, ${failed} failed`);
  }

  // derive filtered books based on selectedCategory
  const filteredBooks = selectedCategory === 'All' ? books : books.filter(b => String(b.category || 'General') === String(selectedCategory));

  return (
    <div className="addbooks-page">
      <div className="addbooks-container">
        <div className="addbooks-topbar">
          <button onClick={() => navigate('/library')} className="addbooks-back">← Back to Library Dashboard</button>
        </div>

        <div className="addbooks-hero">
          <p className="addbooks-kicker">Campus Library</p>
          <h1 className="addbooks-title">Add New Book</h1>
          <p className="addbooks-sub">Capture book details, maintain stock, and keep your collection clean and searchable.</p>
        </div>

        <div className="addbooks-card">
          <form onSubmit={handleSubmit} className="addbooks-form">
            <div className="field field-span-2">
              <label className="field-label">Book Title</label>
              <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Enter book title" className="form-input" />
            </div>

            <div className="field">
              <label className="field-label">Author Name</label>
              <input required value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} placeholder="Author name" className="form-input" />
            </div>

            <div className="field">
              <label className="field-label">Category / Genre</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="form-input form-select">
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="field">
              <label className="field-label">Book ID / ISBN</label>
              <input value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value }))} placeholder="Optional ISBN or internal ID" className="form-input" />
            </div>

            <div className="field">
              <label className="field-label">Quantity Available</label>
              <input type="number" min="0" value={form.count} onChange={e => setForm(f => ({ ...f, count: Number(e.target.value) }))} className="form-input" />
            </div>

            <div className="form-actions field-span-2">
              <button type="submit" className="primary-btn">{editing ? 'Update Book' : 'Add Book'}</button>
            </div>
          </form>
        </div>

        <div className="books-card">
          <div className="table-toolbar">
            <h2 className="books-heading">Library Collection</h2>
            <div className="filter-container">
              <label className="filter-label">Filter by Category</label>
              <select className="filter-select" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                <option value="All">All</option>
                {/* prefer a fixed order for main categories then any others from stored books */}
                <option value="Fiction">Fiction</option>
                <option value="Non-Fiction">Non-Fiction</option>
                <option value="Science">Science</option>
                <option value="History">History</option>
                <option value="Technical">Technical</option>
                <option value="Biography">Biography</option>
                <option value="General">General</option>
              </select>
            </div>
          </div>
          <div className="table-wrap">
            <table className="books-table">
              <thead>
                <tr>
                  <th>Book Title</th>
                  <th>Author</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th className="align-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBooks.map((b, idx) => {
                  const key = b._id || b.id || b._localId || `${b.title}-${b.author}-${idx}`;
                  return (
                    <tr key={key}>
                      <td>{b.title}</td>
                      <td>{b.author}</td>
                      <td>{b.category}</td>
                      <td>{b.count}</td>
                      <td className="align-right">
                        <button onClick={() => openEdit(b)} className="action-link edit">Edit</button>
                        <button onClick={() => handleDelete(b)} className="action-link delete">Delete</button>
                      </td>
                    </tr>
                  );
                })}
                {filteredBooks.length === 0 && (
                  <tr><td colSpan={5} className="no-books">No books found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Simple modal-like edit (using same form) */}
        {showModal && (
          <div className="edit-modal-overlay">
            <div className="edit-modal-card">
              <h3 className="edit-modal-title">Edit Book</h3>
              <form onSubmit={handleSubmit} className="edit-modal-form">
                <div className="field">
                  <label className="field-label">Book Title</label>
                  <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="form-input" />
                </div>
                <div className="field">
                  <label className="field-label">Author</label>
                  <input required value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} className="form-input" />
                </div>
                <div className="edit-actions">
                  <button type="button" onClick={() => { resetForm(); }} className="modal-btn modal-btn-muted">Cancel</button>
                  <button type="submit" className="modal-btn modal-btn-primary">Save</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {toast && (
          <div className="page-toast">{toast}</div>
        )}
      </div>
    </div>
  );
}
