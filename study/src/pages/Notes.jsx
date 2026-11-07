import React, { useState, useEffect } from "react";
import { Plus, Search, Pencil, Trash2, BookOpen, X, Save, Printer } from "lucide-react";
import "./Notes.css";
import BackButton from "../components/BackButton";
import { notesAPI } from "../services/api";

function Notes() {
  const [notes, setNotes] = useState(() => {
    try {
      const savedNotes = localStorage.getItem("studyBuddyNotes");
      return savedNotes ? JSON.parse(savedNotes) : [];
    } catch (error) {
      console.error("Error loading notes:", error);
      return [];
    }
  });

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");

  // Load from backend on mount
  useEffect(() => {
    const fetchBackendNotes = async () => {
      try {
        const res = await notesAPI.getAll();
        if (res.success && Array.isArray(res.data)) {
          const formatted = res.data.map((n) => ({
            id: n._id || n.id,
            title: n.title,
            subject: n.subject,
            content: n.content,
            date: n.date || "Recent",
          }));
          setNotes(formatted);
          localStorage.setItem("studyBuddyNotes", JSON.stringify(formatted));
        }
      } catch (err) {
        console.warn("Using offline notes cache:", err);
      }
    };

    fetchBackendNotes();
  }, []);

  // Save notes to localStorage as backup
  useEffect(() => {
    localStorage.setItem("studyBuddyNotes", JSON.stringify(notes));
  }, [notes]);

  const filteredNotes = notes.filter((note) =>
    `${note.title} ${note.subject} ${note.content}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const openNewNote = () => {
    setEditingId(null);
    setTitle("");
    setSubject("");
    setContent("");
    setShowForm(true);
  };

  const editNote = (note) => {
    setEditingId(note.id);
    setTitle(note.title);
    setSubject(note.subject);
    setContent(note.content);
    setShowForm(true);
  };

  const saveNote = async (e) => {
    e.preventDefault();

    if (!title.trim() || !subject.trim() || !content.trim()) {
      alert("Please fill all fields");
      return;
    }

    if (editingId !== null) {
      // Update in backend
      try {
        await notesAPI.update(editingId, { title, subject, content });
      } catch (err) {
        console.warn("Backend update skipped:", err);
      }

      setNotes((prevNotes) =>
        prevNotes.map((note) =>
          note.id === editingId
            ? { ...note, title, subject, content }
            : note
        )
      );
    } else {
      // Create in backend
      let newId = Date.now();
      try {
        const res = await notesAPI.create({
          title: title.trim(),
          subject: subject.trim(),
          content: content.trim(),
        });
        if (res.success && res.data?._id) {
          newId = res.data._id;
        }
      } catch (err) {
        console.warn("Backend create skipped, saving locally:", err);
      }

      const newNote = {
        id: newId,
        title: title.trim(),
        subject: subject.trim(),
        content: content.trim(),
        date: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      };

      setNotes((prevNotes) => [newNote, ...prevNotes]);
    }

    setShowForm(false);
    setEditingId(null);
    setTitle("");
    setSubject("");
    setContent("");
  };

  const deleteNote = async (id) => {
    if (window.confirm("Are you sure you want to delete this note?")) {
      try {
        await notesAPI.delete(id);
      } catch (err) {
        console.warn("Backend delete skipped:", err);
      }

      setNotes((prevNotes) => prevNotes.filter((note) => note.id !== id));
    }
  };

  const printNote = (note) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.print();
      return;
    }
    const displayDate = note.date || "Today";
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${note.title} - AI Study Buddy Notes</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; line-height: 1.6; }
            .header { border-bottom: 2px solid #7047eb; padding-bottom: 15px; margin-bottom: 25px; }
            .badge { background: #efeaff; color: #7047eb; font-weight: bold; font-size: 12px; padding: 4px 10px; border-radius: 4px; display: inline-block; }
            h1 { font-size: 26px; margin: 10px 0 5px; color: #0f172a; }
            .meta { color: #64748b; font-size: 13px; }
            .content { white-space: pre-wrap; font-size: 15px; margin-top: 20px; }
            .footer { margin-top: 50px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="header">
            <span class="badge">AI STUDY BUDDY NOTES</span>
            <h1>${note.title}</h1>
            <div class="meta">Subject: ${note.subject || "General"} &bull; Date: ${displayDate}</div>
          </div>
          <div class="content">${note.content}</div>
          <div class="footer">
            <span>Printed from AI Study Buddy</span>
            <span>Personal Study Collection</span>
          </div>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="notes-page">
      <BackButton />

      <div className="notes-header">
        <div>
          <h1>My Notes</h1>
          <p>Save and organize your study notes.</p>
        </div>

        <button className="add-note-btn" onClick={openNewNote}>
          <Plus size={19} /> New Note
        </button>
      </div>

      <div className="notes-search">
        <Search size={20} />
        <input
          type="text"
          placeholder="Search your notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="notes-summary">
        <div className="notes-summary-icon">
          <BookOpen size={25} />
        </div>
        <div>
          <h3>{notes.length} Notes</h3>
          <p>Your personal study collection</p>
        </div>
      </div>

      {showForm && (
        <div className="note-modal">
          <form className="note-form" onSubmit={saveNote}>
            <div className="form-heading">
              <h2>{editingId !== null ? "Edit Note" : "Create New Note"}</h2>
              <button
                type="button"
                className="close-note"
                onClick={() => setShowForm(false)}
              >
                <X size={22} />
              </button>
            </div>

            <label>Note Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter note title"
            />

            <label>Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter subject"
            />

            <label>Note Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your notes here..."
              rows="6"
            />

            <button type="submit" className="save-note-btn">
              <Save size={18} />
              {editingId !== null ? "Update Note" : "Save Note"}
            </button>
          </form>
        </div>
      )}

      <div className="notes-grid">
        {filteredNotes.map((note) => (
          <div className="note-card" key={note.id}>
            <div className="note-card-top">
              <span className="note-subject">{note.subject}</span>
              <BookOpen size={22} />
            </div>

            <h3>{note.title}</h3>
            <p className="note-content">{note.content}</p>

            <div className="note-card-bottom">
              <span>{note.date}</span>

              <div className="note-actions">
                <button
                  type="button"
                  onClick={() => printNote(note)}
                  title="Print / Save Note as PDF"
                >
                  <Printer size={17} />
                </button>

                <button onClick={() => editNote(note)} title="Edit">
                  <Pencil size={17} />
                </button>

                <button
                  onClick={() => deleteNote(note.id)}
                  title="Delete"
                  className="delete-note"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredNotes.length === 0 && (
        <div className="empty-notes">
          <BookOpen size={45} />
          <h3>No Notes Found</h3>
          <p>Try another search or create a new note.</p>
        </div>
      )}
    </div>
  );
}

export default Notes;
