const mysql = require('mysql2/promise');

async function addColumnIfMissing(conn, table, column, definition) {
  const [[row]] = await conn.execute(
    `SELECT COUNT(*) AS found FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [table, column]
  );
  if (!row.found) {
    await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    console.log(`Added ${table}.${column}`);
  }
}

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  try {
    await addColumnIfMissing(conn, 'opportunity_applications', 'resume_original_name', 'VARCHAR(255) DEFAULT NULL');
    await addColumnIfMissing(conn, 'opportunity_applications', 'resume_storage_key', 'CHAR(64) DEFAULT NULL');
    await addColumnIfMissing(conn, 'opportunity_applications', 'reviewer_feedback', 'TEXT DEFAULT NULL');
    await addColumnIfMissing(conn, 'opportunity_applications', 'reviewed_by', 'INT DEFAULT NULL');
    await addColumnIfMissing(conn, 'opportunity_applications', 'reviewed_at', 'DATETIME DEFAULT NULL');

    await conn.query(`ALTER TABLE opportunity_applications
      MODIFY status ENUM('interested','applied','submitted','under_review','shortlisted','interview','rejected','selected')
      NOT NULL DEFAULT 'interested'`);

    const [[fk]] = await conn.execute(
      `SELECT COUNT(*) AS found FROM information_schema.table_constraints
       WHERE constraint_schema = DATABASE() AND table_name = 'opportunity_applications'
         AND constraint_name = 'fk_oa_reviewer'`
    );
    if (!fk.found) {
      await conn.query(`ALTER TABLE opportunity_applications
        ADD CONSTRAINT fk_oa_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL`);
    }

    await conn.query(`CREATE TABLE IF NOT EXISTS interview_attempts (
      id INT NOT NULL AUTO_INCREMENT,
      student_id INT NOT NULL,
      topic_id INT NOT NULL,
      attempt_count INT NOT NULL DEFAULT 0,
      correct_count INT NOT NULL DEFAULT 0,
      last_answer TEXT DEFAULT NULL,
      last_is_correct TINYINT(1) DEFAULT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT uq_interview_attempt UNIQUE (student_id, topic_id),
      CONSTRAINT fk_ia_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_ia_topic FOREIGN KEY (topic_id) REFERENCES interview_topics(id) ON DELETE CASCADE
    )`);
    await conn.query('ALTER TABLE interview_attempts MODIFY last_is_correct TINYINT(1) DEFAULT NULL');
    await conn.query(`CREATE TABLE IF NOT EXISTS interview_quiz_attempts (
      id INT NOT NULL AUTO_INCREMENT,
      student_id INT NOT NULL,
      total_questions INT NOT NULL,
      correct_count INT NOT NULL,
      score_percent DECIMAL(5,2) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_iqa_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
    console.log('Functional workflow migration complete.');
  } finally {
    await conn.end();
  }
}

run().catch(error => { console.error('Functional workflow migration failed:', error.message); process.exitCode = 1; });
