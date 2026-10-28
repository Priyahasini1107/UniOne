-- ═══════════════════════════════════════════════════════════════════════════
-- 002_student_tables.sql — Student Module Tables
-- Safe to run multiple times (CREATE TABLE IF NOT EXISTS).
-- Does NOT touch existing tables.
-- ═══════════════════════════════════════════════════════════════════════════

USE unione_db;

-- ─── Extend student_profiles for portfolio data ───────────────────────────
-- NOTE: Columns are added by run_migration.js using information_schema checks.
-- (Inline stored procedures with DELIMITER are incompatible with multipleStatements mode.)

-- ─── Academic Resources ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resources (
  id            INT          NOT NULL AUTO_INCREMENT,
  uploaded_by   INT          NOT NULL,
  title         VARCHAR(200) NOT NULL,
  subject       VARCHAR(150) DEFAULT NULL,
  department    VARCHAR(100) DEFAULT NULL,
  semester      VARCHAR(20)  DEFAULT NULL,
  academic_year VARCHAR(20)  DEFAULT NULL,
  resource_type ENUM('notes','textbook','question_paper','reference','other') NOT NULL DEFAULT 'other',
  description   TEXT         DEFAULT NULL,
  file_url      VARCHAR(500) DEFAULT NULL,
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_res_uploader FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- ─── Interview Prep Topics ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS interview_topics (
  id         INT          NOT NULL AUTO_INCREMENT,
  category   ENUM('dsa','aptitude','technical','programming','hr','other') NOT NULL DEFAULT 'other',
  title      VARCHAR(200) NOT NULL,
  difficulty ENUM('beginner','intermediate','advanced') NOT NULL DEFAULT 'beginner',
  content    TEXT         NOT NULL,
  tags       VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- Student progress on interview topics
CREATE TABLE IF NOT EXISTS interview_progress (
  id         INT NOT NULL AUTO_INCREMENT,
  student_id INT NOT NULL,
  topic_id   INT NOT NULL,
  is_done    TINYINT(1) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_iprog UNIQUE (student_id, topic_id),
  CONSTRAINT fk_ip_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ip_topic   FOREIGN KEY (topic_id)   REFERENCES interview_topics(id) ON DELETE CASCADE
);

-- ─── Opportunities (Internships + Scholarships combined) ──────────────────
CREATE TABLE IF NOT EXISTS opportunities (
  id              INT          NOT NULL AUTO_INCREMENT,
  posted_by       INT          NOT NULL,
  type            ENUM('internship','job','scholarship','competition','other') NOT NULL,
  title           VARCHAR(200) NOT NULL,
  company_or_org  VARCHAR(150) DEFAULT NULL,
  description     TEXT         DEFAULT NULL,
  eligibility     TEXT         DEFAULT NULL,
  skills          VARCHAR(300) DEFAULT NULL,
  location        VARCHAR(150) DEFAULT NULL,
  work_mode       ENUM('remote','onsite','hybrid') DEFAULT NULL,
  stipend         VARCHAR(100) DEFAULT NULL,
  deadline        DATE         DEFAULT NULL,
  apply_url       VARCHAR(500) DEFAULT NULL,
  is_verified     TINYINT(1)   NOT NULL DEFAULT 0,
  created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_opp_poster FOREIGN KEY (posted_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS saved_opportunities (
  id             INT       NOT NULL AUTO_INCREMENT,
  student_id     INT       NOT NULL,
  opportunity_id INT       NOT NULL,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_saved_opp UNIQUE (student_id, opportunity_id),
  CONSTRAINT fk_so_student FOREIGN KEY (student_id)     REFERENCES users(id)         ON DELETE CASCADE,
  CONSTRAINT fk_so_opp     FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS opportunity_applications (
  id             INT  NOT NULL AUTO_INCREMENT,
  student_id     INT  NOT NULL,
  opportunity_id INT  NOT NULL,
  status         ENUM('interested','applied','shortlisted','rejected','selected') NOT NULL DEFAULT 'interested',
  applied_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_opp_app   UNIQUE (student_id, opportunity_id),
  CONSTRAINT fk_oa_student FOREIGN KEY (student_id)     REFERENCES users(id)         ON DELETE CASCADE,
  CONSTRAINT fk_oa_opp     FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE
);

-- ─── Events ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id                    INT          NOT NULL AUTO_INCREMENT,
  posted_by             INT          NOT NULL,
  title                 VARCHAR(200) NOT NULL,
  description           TEXT         DEFAULT NULL,
  event_type            ENUM('fest','workshop','seminar','hackathon','competition','webinar','other') NOT NULL DEFAULT 'other',
  venue                 VARCHAR(200) DEFAULT NULL,
  event_date            DATETIME     NOT NULL,
  registration_deadline DATE         DEFAULT NULL,
  registration_url      VARCHAR(500) DEFAULT NULL,
  is_online             TINYINT(1)   NOT NULL DEFAULT 0,
  created_at            TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_ev_poster FOREIGN KEY (posted_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS event_interests (
  id         INT NOT NULL AUTO_INCREMENT,
  student_id INT NOT NULL,
  event_id   INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_ev_interest UNIQUE (student_id, event_id),
  CONSTRAINT fk_ei_student  FOREIGN KEY (student_id) REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_ei_event    FOREIGN KEY (event_id)   REFERENCES events(id)   ON DELETE CASCADE
);

-- ─── Career Roadmaps ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roadmaps (
  id          INT          NOT NULL AUTO_INCREMENT,
  title       VARCHAR(200) NOT NULL,
  category    VARCHAR(100) NOT NULL,
  icon        VARCHAR(10)  DEFAULT '🗺️',
  overview    TEXT         DEFAULT NULL,
  stages_json JSON         NOT NULL,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS roadmap_progress (
  id                    INT NOT NULL AUTO_INCREMENT,
  student_id            INT NOT NULL,
  roadmap_id            INT NOT NULL,
  completed_stages_json JSON DEFAULT NULL,
  updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_rp UNIQUE (student_id, roadmap_id),
  CONSTRAINT fk_rp_student FOREIGN KEY (student_id) REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_rp_roadmap FOREIGN KEY (roadmap_id) REFERENCES roadmaps(id) ON DELETE CASCADE
);

-- ─── FindBack (Lost & Found) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS findback_items (
  id                  INT          NOT NULL AUTO_INCREMENT,
  reported_by         INT          NOT NULL,
  type                ENUM('lost','found') NOT NULL,
  title               VARCHAR(200) NOT NULL,
  description         TEXT         DEFAULT NULL,
  category            ENUM('electronics','clothing','accessories','books','id_cards','keys','bags','other') NOT NULL DEFAULT 'other',
  campus_location     VARCHAR(200) DEFAULT NULL,
  item_date           DATE         DEFAULT NULL,
  image_url           VARCHAR(500) DEFAULT NULL,
  status              ENUM('open','resolved','closed') NOT NULL DEFAULT 'open',
  contact_via_platform TINYINT(1) NOT NULL DEFAULT 1,
  created_at          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_fb_reporter FOREIGN KEY (reported_by) REFERENCES users(id)
);

-- ─── ProjectVault ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_projects (
  id           INT          NOT NULL AUTO_INCREMENT,
  student_id   INT          NOT NULL,
  title        VARCHAR(200) NOT NULL,
  description  TEXT         DEFAULT NULL,
  technologies VARCHAR(400) DEFAULT NULL,
  category     VARCHAR(100) DEFAULT NULL,
  github_url   VARCHAR(500) DEFAULT NULL,
  demo_url     VARCHAR(500) DEFAULT NULL,
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_sp_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── Smart Campus Services ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campus_requests (
  id          INT          NOT NULL AUTO_INCREMENT,
  student_id  INT          NOT NULL,
  category    ENUM('maintenance','cleanliness','facilities','it_support','safety','other') NOT NULL DEFAULT 'other',
  description TEXT         NOT NULL,
  location    VARCHAR(200) DEFAULT NULL,
  status      ENUM('submitted','in_progress','resolved','rejected') NOT NULL DEFAULT 'submitted',
  admin_note  TEXT         DEFAULT NULL,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_cr_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── Student Community ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_posts (
  id         INT          NOT NULL AUTO_INCREMENT,
  student_id INT          NOT NULL,
  title      VARCHAR(200) NOT NULL,
  content    TEXT         NOT NULL,
  category   ENUM('discussion','question','resource','opportunity','general') NOT NULL DEFAULT 'general',
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_cp_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS community_comments (
  id         INT  NOT NULL AUTO_INCREMENT,
  post_id    INT  NOT NULL,
  student_id INT  NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_cc_post    FOREIGN KEY (post_id)    REFERENCES community_posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_cc_student FOREIGN KEY (student_id) REFERENCES users(id)           ON DELETE CASCADE
);

-- ─── Notifications ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         INT          NOT NULL AUTO_INCREMENT,
  student_id INT          NOT NULL,
  type       VARCHAR(50)  NOT NULL DEFAULT 'info',
  title      VARCHAR(200) NOT NULL,
  message    TEXT         DEFAULT NULL,
  module     VARCHAR(50)  DEFAULT NULL,
  is_read    TINYINT(1)   NOT NULL DEFAULT 0,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_notif_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);


-- Seed data is inserted by server/db-migrations/seed_student_data.js
-- using parameterized queries (avoids SQL escaping issues with apostrophes).

