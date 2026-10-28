-- ═══════════════════════════════════════════════════════════════════════════
-- 001_faculty_tables.sql — Faculty Module Schema Migration
--
-- SAFE TO RUN MULTIPLE TIMES: uses CREATE TABLE IF NOT EXISTS.
-- Does NOT drop or alter any existing tables or data.
--
-- HOW TO RUN (from MySQL Workbench or MySQL CLI):
--   USE unione_db;
--   SOURCE /path/to/server/db-migrations/001_faculty_tables.sql;
--
-- Or via Node.js helper:
--   node --env-file=.env db-migrations/run_migration.js
-- ═══════════════════════════════════════════════════════════════════════════

USE unione_db;

-- ─── 1. Faculty Classes ──────────────────────────────────────────────────────
-- Each row is one class/course taught by a faculty member.
-- faculty_id references users.id (role = 'faculty').
CREATE TABLE IF NOT EXISTS faculty_classes (
  id           INT          NOT NULL AUTO_INCREMENT,
  faculty_id   INT          NOT NULL,
  subject_name VARCHAR(150) NOT NULL,
  subject_code VARCHAR(50)  DEFAULT NULL,
  semester     VARCHAR(20)  DEFAULT NULL,
  department   VARCHAR(100) DEFAULT NULL,
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_fc_faculty
    FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── 2. Class Enrollments ────────────────────────────────────────────────────
-- Links student user accounts (users.role = 'student') to a class.
-- student_user_id is a real FK to users.id — no invented student records.
-- UNIQUE (class_id, student_user_id) prevents duplicate enrollments.
CREATE TABLE IF NOT EXISTS class_enrollments (
  id              INT         NOT NULL AUTO_INCREMENT,
  class_id        INT         NOT NULL,
  student_user_id INT         NOT NULL,
  roll_number     VARCHAR(50) DEFAULT NULL,
  PRIMARY KEY (id),
  CONSTRAINT uq_enrollment
    UNIQUE (class_id, student_user_id),
  CONSTRAINT fk_ce_class
    FOREIGN KEY (class_id)        REFERENCES faculty_classes(id) ON DELETE CASCADE,
  CONSTRAINT fk_ce_student
    FOREIGN KEY (student_user_id) REFERENCES users(id)           ON DELETE CASCADE
);

-- ─── 3. Attendance Records ──────────────────────────────────────────────────
-- One row per (enrollment, date) pair.
-- UNIQUE (class_id, enrollment_id, date) prevents double-marking.
-- ON DUPLICATE KEY UPDATE is used for safe upserts on re-submission.
CREATE TABLE IF NOT EXISTS attendance_records (
  id            INT  NOT NULL AUTO_INCREMENT,
  class_id      INT  NOT NULL,
  enrollment_id INT  NOT NULL,
  date          DATE NOT NULL,
  status        ENUM('present','absent','late') NOT NULL DEFAULT 'absent',
  marked_by     INT  NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_attendance
    UNIQUE (class_id, enrollment_id, date),
  CONSTRAINT fk_ar_class
    FOREIGN KEY (class_id)      REFERENCES faculty_classes(id)   ON DELETE CASCADE,
  CONSTRAINT fk_ar_enroll
    FOREIGN KEY (enrollment_id) REFERENCES class_enrollments(id) ON DELETE CASCADE,
  CONSTRAINT fk_ar_marker
    FOREIGN KEY (marked_by)     REFERENCES users(id)
);

-- ─── 4. Assignments ─────────────────────────────────────────────────────────
-- One assignment per class. faculty_id is stored for quick ownership checks
-- without joining through faculty_classes.
CREATE TABLE IF NOT EXISTS assignments (
  id           INT          NOT NULL AUTO_INCREMENT,
  class_id     INT          NOT NULL,
  faculty_id   INT          NOT NULL,
  title        VARCHAR(200) NOT NULL,
  description  TEXT         DEFAULT NULL,
  due_date     DATE         DEFAULT NULL,
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_asgn_class
    FOREIGN KEY (class_id)   REFERENCES faculty_classes(id) ON DELETE CASCADE,
  CONSTRAINT fk_asgn_faculty
    FOREIGN KEY (faculty_id) REFERENCES users(id)
);

-- ─── 5. Announcements ───────────────────────────────────────────────────────
-- class_id is optional (NULL = general announcement not tied to a class).
-- ON DELETE SET NULL allows the class to be deleted without losing the announcement.
CREATE TABLE IF NOT EXISTS announcements (
  id         INT          NOT NULL AUTO_INCREMENT,
  faculty_id INT          NOT NULL,
  class_id   INT          DEFAULT NULL,
  title      VARCHAR(200) NOT NULL,
  content    TEXT         NOT NULL,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_ann_faculty
    FOREIGN KEY (faculty_id) REFERENCES users(id),
  CONSTRAINT fk_ann_class
    FOREIGN KEY (class_id)   REFERENCES faculty_classes(id) ON DELETE SET NULL
);
