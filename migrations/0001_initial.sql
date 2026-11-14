CREATE TABLE users (
  github_id INTEGER PRIMARY KEY,
  login TEXT NOT NULL COLLATE NOCASE UNIQUE,
  display_name TEXT,
  avatar_url TEXT NOT NULL,
  github_url TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE themes (
  id TEXT PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(github_id),
  latest_version TEXT NOT NULL,
  latest_major TEXT NOT NULL,
  latest_minor TEXT NOT NULL,
  latest_patch TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  name_json TEXT NOT NULL,
  description_json TEXT,
  search_text TEXT NOT NULL,
  primary_color TEXT NOT NULL,
  dark_primary_color TEXT NOT NULL,
  surface_color TEXT NOT NULL,
  dark_surface_color TEXT NOT NULL,
  has_backdrop INTEGER NOT NULL DEFAULT 0 CHECK (has_backdrop IN (0, 1)),
  backdrop_dim REAL,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden', 'deleted')),
  downloads INTEGER NOT NULL DEFAULT 0 CHECK (downloads >= 0),
  likes INTEGER NOT NULL DEFAULT 0 CHECK (likes >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE theme_versions (
  theme_id TEXT NOT NULL REFERENCES themes(id),
  version TEXT NOT NULL,
  major TEXT NOT NULL,
  minor TEXT NOT NULL,
  patch TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  package_key TEXT NOT NULL UNIQUE,
  preview_key TEXT,
  preview_content_type TEXT,
  backdrop_key TEXT,
  backdrop_content_type TEXT,
  metadata_json TEXT NOT NULL,
  sha256 TEXT NOT NULL CHECK (length(sha256) = 64),
  byte_size INTEGER NOT NULL CHECK (byte_size > 0),
  created_at TEXT NOT NULL,
  PRIMARY KEY (theme_id, version)
);

CREATE TABLE likes (
  user_id INTEGER NOT NULL REFERENCES users(github_id),
  theme_id TEXT NOT NULL REFERENCES themes(id),
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, theme_id)
);

CREATE TABLE favorites (
  user_id INTEGER NOT NULL REFERENCES users(github_id),
  theme_id TEXT NOT NULL REFERENCES themes(id),
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, theme_id)
);

CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  theme_id TEXT NOT NULL REFERENCES themes(id),
  author_id INTEGER NOT NULL REFERENCES users(github_id),
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  status TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'hidden', 'deleted')),
  created_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('theme', 'comment')),
  target_id TEXT NOT NULL,
  reporter_id INTEGER NOT NULL REFERENCES users(github_id),
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'malware', 'copyright', 'other')),
  details TEXT NOT NULL DEFAULT '' CHECK (length(details) <= 1000),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  handled_by INTEGER REFERENCES users(github_id),
  handled_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE rate_limits (
  user_id INTEGER NOT NULL REFERENCES users(github_id),
  action TEXT NOT NULL,
  window_key TEXT NOT NULL,
  count INTEGER NOT NULL CHECK (count >= 0),
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, action, window_key)
);

CREATE INDEX themes_catalog_latest ON themes(status, created_at DESC, id DESC);
CREATE INDEX themes_catalog_downloads ON themes(status, downloads DESC, id DESC);
CREATE INDEX themes_catalog_likes ON themes(status, likes DESC, id DESC);
CREATE INDEX themes_owner ON themes(owner_id, created_at DESC);
CREATE INDEX themes_search ON themes(status, search_text);
CREATE INDEX versions_created ON theme_versions(theme_id, created_at DESC);
CREATE INDEX likes_theme ON likes(theme_id);
CREATE INDEX favorites_user ON favorites(user_id, created_at DESC);
CREATE INDEX comments_theme ON comments(theme_id, created_at DESC, id DESC);
CREATE INDEX reports_queue ON reports(status, created_at ASC);
CREATE UNIQUE INDEX one_pending_report ON reports(reporter_id, target_type, target_id) WHERE status = 'pending';
CREATE INDEX rate_limits_expiry ON rate_limits(expires_at);
