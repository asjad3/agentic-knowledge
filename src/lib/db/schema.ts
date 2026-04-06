export const schema = `
CREATE TABLE IF NOT EXISTS notes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path       TEXT    NOT NULL UNIQUE,
  title           TEXT    NOT NULL DEFAULT '',
  slug            TEXT    NOT NULL,
  created_at      TEXT    NOT NULL,
  modified_at     TEXT    NOT NULL,
  content_preview TEXT    NOT NULL DEFAULT '',
  word_count      INTEGER NOT NULL DEFAULT 0,
  category        TEXT    NOT NULL DEFAULT 'inbox',
  source          TEXT    NOT NULL DEFAULT 'manual',
  source_url      TEXT    NOT NULL DEFAULT '',
  pinned          INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tags (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT    NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS note_tags (
  note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);

CREATE TABLE IF NOT EXISTS rules (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  description   TEXT    NOT NULL DEFAULT '',
  condition     TEXT    NOT NULL,
  action        TEXT    NOT NULL,
  enabled       INTEGER NOT NULL DEFAULT 1,
  priority      INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  source        TEXT    NOT NULL,
  status        TEXT    NOT NULL,
  last_sync     TEXT    NOT NULL,
  error_msg     TEXT    DEFAULT '',
  items_synced  INTEGER NOT NULL DEFAULT 0
);

CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
  title,
  content,
  tokenize='porter unicode61'
);
`;
