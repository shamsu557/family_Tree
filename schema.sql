-- ══════════════════════════════════════════════════════
--  Liman Family Tree — MySQL Schema
-- ══════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS liman_family CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE liman_family;

-- ── ADMINS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  username    VARCHAR(80)  NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,          -- bcrypt hash
  role        ENUM('superadmin','admin') NOT NULL DEFAULT 'admin',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── FAMILY MEMBERS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS members (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  first_name  VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100) DEFAULT '',
  surname     VARCHAR(100) NOT NULL,
  nickname    VARCHAR(100) DEFAULT '',        -- displayed in brackets
  gender      ENUM('Male','Female') NOT NULL,
  dob         DATE         DEFAULT NULL,
  state       VARCHAR(100) DEFAULT '',
  lga         VARCHAR(100) DEFAULT '',
  address     TEXT         DEFAULT '',
  photo       VARCHAR(255) DEFAULT '',        -- filename stored in uploads/
  parent_id   INT          DEFAULT NULL,      -- NULL = head (gen 1)
  generation  INT          NOT NULL DEFAULT 1,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES members(id) ON DELETE SET NULL
);

-- ── HISTORY ENTRIES ──────────────────────────────────
CREATE TABLE IF NOT EXISTS history (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  year_label  VARCHAR(50)  NOT NULL,
  title       VARCHAR(200) NOT NULL,
  body        TEXT         NOT NULL,
  sort_order  INT          DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default history entries (placeholder — update later)
INSERT INTO history (year_label, title, body, sort_order) VALUES
  ('Founding',      'The Liman Lineage',          'Liman Usman establishes himself as a respected community leader and family patriarch. A man of deep faith, wisdom and generosity, his name becomes synonymous with integrity and honour across the community.', 1),
  ('First Sons',    'Liman Mamuda & Makama Aminu', 'Two sons are born — Liman Mamuda and Makama Aminu — each inheriting their father''s values of hard work, faith and community responsibility. They grow into pillars of the family.', 2),
  ('More Children', 'Growing the Family',          'More children follow, completing the family of Liman Usman. Each is raised with strong values of faith, discipline and service. The family continues to grow and take root across the community.', 3),
  ('New Roots',     'The Next Generation',         'Grandchildren arrive across both branches — sons and daughters carry the Liman spirit forward, deeply connected to their roots while building their own stories and families.', 4),
  ('Today',         'A Living Legacy',             'This digital archive is created to preserve the Liman family story — recording names, faces and connections so that future generations always know where they come from and who they belong to.', 5);
