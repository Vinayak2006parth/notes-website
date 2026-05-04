import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./App.css";

const quickTags = ["dbms", "os", "dsa", "pyq", "cn", "java"];

function App() {
  const [query, setQuery] = useState("");
  const [notes, setNotes] = useState([]);
  const [activeTag, setActiveTag] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  const stats = useMemo(() => {
    const subjects = new Set(
      notes.map((note) => note.subject?.trim()).filter(Boolean),
    ).size;
    const downloads = notes.reduce(
      (total, note) => total + (note.downloads ?? 0),
      0,
    );

    return {
      totalNotes: notes.length,
      subjectCount: subjects,
      totalDownloads: downloads,
    };
  }, [notes]);

  async function fetchNotes(searchText = "") {
    setLoading(true);
    setError("");

    try {
      const response = await axios.get("/api/notes", {
        params: searchText ? { search: searchText } : {},
      });
      setNotes(response.data);
    } catch {
      setError("We could not load notes right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNotes();
  }, []);

  useEffect(() => {
    const searchText = query.trim();

    if (!searchText) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      return undefined;
    }

    const timerId = window.setTimeout(async () => {
      try {
        const response = await axios.get("/api/suggestions", {
          params: { search: searchText },
        });

        setSuggestions(response.data);
        setSuggestionsOpen(response.data.length > 0);
      } catch {
        setSuggestions([]);
        setSuggestionsOpen(false);
      }
    }, 180);

    return () => window.clearTimeout(timerId);
  }, [query]);

  function handleSearchSubmit(event) {
    event.preventDefault();
    setActiveTag("");
    setSuggestionsOpen(false);
    fetchNotes(query.trim());
  }

  function handleTagClick(tag) {
    setActiveTag(tag);
    setQuery(tag);
    setSuggestionsOpen(false);
    fetchNotes(tag);
  }

  function handleClearFilters() {
    setQuery("");
    setActiveTag("");
    setSuggestions([]);
    setSuggestionsOpen(false);
    fetchNotes();
  }

  function handleSuggestionSelect(value) {
    setQuery(value);
    setActiveTag("");
    setSuggestionsOpen(false);
    fetchNotes(value);
  }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Academic Notes Library</p>
          <h1>Find the right note pack in a few seconds.</h1>
          <p className="hero-text">
            Search by subject, topic, or tag and jump straight to the files you
            need for revision, assignments, and exam prep.  
          </p>

          <form className="search-form" onSubmit={handleSearchSubmit}>
            <div className="search-input-wrap">
              <label className="sr-only" htmlFor="note-search">
                Search notes
              </label>
              <input
                id="note-search"
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onFocus={() => setSuggestionsOpen(suggestions.length > 0)} 
                onBlur={() => {
                  window.setTimeout(() => setSuggestionsOpen(false), 120);
                }}
                placeholder="Try DBMS, Operating Systems, Trees, PYQ..."
                autoComplete="off"
              />

              {suggestionsOpen && (
                <div className="suggestion-panel">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="suggestion-item"
                      onMouseDown={() => handleSuggestionSelect(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button type="submit">Search Notes</button>
          </form>

          <div className="tag-row" aria-label="Quick filters">
            {quickTags.map((tag) => (
              <button
                key={tag}
                type="button"
                className={tag === activeTag ? "tag-chip active" : "tag-chip"}
                onClick={() => handleTagClick(tag)}
              >
                #{tag.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="hero-card">
          <p className="card-label">Library snapshot</p>
          <div className="stat-grid">
            <article>
              <strong>{stats.totalNotes}</strong>
              <span>Notes found</span>
            </article>
            <article>
              <strong>{stats.subjectCount}</strong>
              <span>Subjects covered</span>
            </article>
            <article>
              <strong>{stats.totalDownloads}</strong>
              <span>Total downloads</span>
            </article>
          </div>
          <p className="hero-card-footer">
            Clean search, quick tags, and direct downloads all in one place.
          </p>
        </div>
      </section>

      <section className="results-panel">
        <div className="results-header">
          <div>
            <p className="section-kicker">Results</p>
            <h2>
              {query || activeTag
                ? `Showing matches for "${query || activeTag}"`
                : "Browse all notes"}
            </h2>
          </div>

          {(query || activeTag) && (
            <button
              type="button"
              className="secondary-button"
              onClick={handleClearFilters}
            >
              Clear filters
            </button>
          )}
        </div>

        {loading && <div className="state-card">Loading notes...</div>}

        {!loading && error && <div className="state-card error">{error}</div>}

        {!loading && !error && notes.length === 0 && (
          <div className="state-card">
            <h3>No notes found</h3>
            <p>Try a different keyword or use one of the quick tags above.</p>
          </div>
        )}

        {!loading && !error && notes.length > 0 && (
          <div className="notes-grid">
            {notes.map((note) => (
              <article className="note-card" key={note._id}>
                <div className="note-card-top">
                  <span className="subject-badge">
                    {note.subject || "General"}
                  </span>
                  <span className="download-count">
                    {note.downloads ?? 0} downloads
                  </span>
                </div>

                <h3>{note.title}</h3>

                <div className="tag-list">
                  {note.tags?.map((tag) => (
                    <span key={tag} className="note-tag">
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="card-actions">
                  <a
                    className="primary-link"
                    href={`/download/${note._id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Download
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default App;
