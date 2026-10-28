/**
 * create_student_tables.js
 * Creates all student module tables and seeds initial data.
 * Uses parameterized queries — safe against all apostrophe/encoding issues.
 * Run: node --env-file=.env db-migrations/create_student_tables.js
 */

const mysql = require('mysql2/promise');

const TABLES = [
  ['resources', `
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
    )`],
  ['interview_topics', `
    CREATE TABLE IF NOT EXISTS interview_topics (
      id         INT          NOT NULL AUTO_INCREMENT,
      category   ENUM('dsa','aptitude','technical','programming','hr','other') NOT NULL DEFAULT 'other',
      title      VARCHAR(200) NOT NULL,
      difficulty ENUM('beginner','intermediate','advanced') NOT NULL DEFAULT 'beginner',
      content    TEXT         NOT NULL,
      tags       VARCHAR(500) DEFAULT NULL,
      created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    )`],
  ['interview_progress', `
    CREATE TABLE IF NOT EXISTS interview_progress (
      id         INT NOT NULL AUTO_INCREMENT,
      student_id INT NOT NULL,
      topic_id   INT NOT NULL,
      is_done    TINYINT(1) NOT NULL DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT uq_iprog       UNIQUE (student_id, topic_id),
      CONSTRAINT fk_ip_student  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_ip_topic    FOREIGN KEY (topic_id)   REFERENCES interview_topics(id) ON DELETE CASCADE
    )`],
  ['opportunities', `
    CREATE TABLE IF NOT EXISTS opportunities (
      id             INT          NOT NULL AUTO_INCREMENT,
      posted_by      INT          NOT NULL,
      type           ENUM('internship','job','scholarship','competition','other') NOT NULL,
      title          VARCHAR(200) NOT NULL,
      company_or_org VARCHAR(150) DEFAULT NULL,
      description    TEXT         DEFAULT NULL,
      eligibility    TEXT         DEFAULT NULL,
      skills         VARCHAR(300) DEFAULT NULL,
      location       VARCHAR(150) DEFAULT NULL,
      work_mode      ENUM('remote','onsite','hybrid') DEFAULT NULL,
      stipend        VARCHAR(100) DEFAULT NULL,
      deadline       DATE         DEFAULT NULL,
      apply_url      VARCHAR(500) DEFAULT NULL,
      is_verified    TINYINT(1)   NOT NULL DEFAULT 0,
      created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_opp_poster FOREIGN KEY (posted_by) REFERENCES users(id)
    )`],
  ['saved_opportunities', `
    CREATE TABLE IF NOT EXISTS saved_opportunities (
      id             INT       NOT NULL AUTO_INCREMENT,
      student_id     INT       NOT NULL,
      opportunity_id INT       NOT NULL,
      created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT uq_saved_opp  UNIQUE (student_id, opportunity_id),
      CONSTRAINT fk_so_student FOREIGN KEY (student_id)     REFERENCES users(id)         ON DELETE CASCADE,
      CONSTRAINT fk_so_opp     FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE
    )`],
  ['opportunity_applications', `
    CREATE TABLE IF NOT EXISTS opportunity_applications (
      id             INT NOT NULL AUTO_INCREMENT,
      student_id     INT NOT NULL,
      opportunity_id INT NOT NULL,
      status         ENUM('interested','applied','shortlisted','rejected','selected') NOT NULL DEFAULT 'interested',
      applied_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT uq_opp_app    UNIQUE (student_id, opportunity_id),
      CONSTRAINT fk_oa_student FOREIGN KEY (student_id)     REFERENCES users(id)         ON DELETE CASCADE,
      CONSTRAINT fk_oa_opp     FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE
    )`],
  ['events', `
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
    )`],
  ['event_interests', `
    CREATE TABLE IF NOT EXISTS event_interests (
      id         INT NOT NULL AUTO_INCREMENT,
      student_id INT NOT NULL,
      event_id   INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT uq_ev_interest UNIQUE (student_id, event_id),
      CONSTRAINT fk_ei_student  FOREIGN KEY (student_id) REFERENCES users(id)  ON DELETE CASCADE,
      CONSTRAINT fk_ei_event    FOREIGN KEY (event_id)   REFERENCES events(id) ON DELETE CASCADE
    )`],
  ['roadmaps', `
    CREATE TABLE IF NOT EXISTS roadmaps (
      id          INT          NOT NULL AUTO_INCREMENT,
      title       VARCHAR(200) NOT NULL,
      category    VARCHAR(100) NOT NULL,
      icon        VARCHAR(10)  DEFAULT NULL,
      overview    TEXT         DEFAULT NULL,
      stages_json JSON         NOT NULL,
      created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    )`],
  ['roadmap_progress', `
    CREATE TABLE IF NOT EXISTS roadmap_progress (
      id                    INT NOT NULL AUTO_INCREMENT,
      student_id            INT NOT NULL,
      roadmap_id            INT NOT NULL,
      completed_stages_json JSON DEFAULT NULL,
      updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT uq_rp        UNIQUE (student_id, roadmap_id),
      CONSTRAINT fk_rp_student FOREIGN KEY (student_id) REFERENCES users(id)    ON DELETE CASCADE,
      CONSTRAINT fk_rp_roadmap FOREIGN KEY (roadmap_id) REFERENCES roadmaps(id) ON DELETE CASCADE
    )`],
  ['findback_items', `
    CREATE TABLE IF NOT EXISTS findback_items (
      id                   INT          NOT NULL AUTO_INCREMENT,
      reported_by          INT          NOT NULL,
      type                 ENUM('lost','found') NOT NULL,
      title                VARCHAR(200) NOT NULL,
      description          TEXT         DEFAULT NULL,
      category             ENUM('electronics','clothing','accessories','books','id_cards','keys','bags','other') NOT NULL DEFAULT 'other',
      campus_location      VARCHAR(200) DEFAULT NULL,
      item_date            DATE         DEFAULT NULL,
      image_url            VARCHAR(500) DEFAULT NULL,
      status               ENUM('open','resolved','closed') NOT NULL DEFAULT 'open',
      contact_via_platform TINYINT(1)   NOT NULL DEFAULT 1,
      created_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_fb_reporter FOREIGN KEY (reported_by) REFERENCES users(id)
    )`],
  ['student_projects', `
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
    )`],
  ['campus_requests', `
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
    )`],
  ['community_posts', `
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
    )`],
  ['community_comments', `
    CREATE TABLE IF NOT EXISTS community_comments (
      id         INT  NOT NULL AUTO_INCREMENT,
      post_id    INT  NOT NULL,
      student_id INT  NOT NULL,
      content    TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_cc_post    FOREIGN KEY (post_id)    REFERENCES community_posts(id) ON DELETE CASCADE,
      CONSTRAINT fk_cc_student FOREIGN KEY (student_id) REFERENCES users(id)           ON DELETE CASCADE
    )`],
  ['notifications', `
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
    )`],
];

// Portfolio columns for student_profiles
const PROFILE_COLS = [
  ['bio',                 'TEXT DEFAULT NULL'],
  ['skills_json',         'JSON DEFAULT NULL'],
  ['linkedin_url',        'VARCHAR(255) DEFAULT NULL'],
  ['github_url',          'VARCHAR(255) DEFAULT NULL'],
  ['certifications_json', 'JSON DEFAULT NULL'],
  ['achievements_json',   'JSON DEFAULT NULL'],
  ['internship_exp_json', 'JSON DEFAULT NULL'],
];

// Interview topics seed data
const TOPICS = [
  ['dsa','Arrays & Strings','beginner','Master array manipulation, two-pointer technique, sliding window, and string operations. Practice problems like two-sum, maximum subarray, and anagram detection.','arrays,strings,two-pointer'],
  ['dsa','Linked Lists','beginner',"Understand singly and doubly linked lists. Practice reversal, cycle detection (Floyd's algorithm), merging sorted lists, and finding the middle node.",'linked-list,pointers'],
  ['dsa','Stacks & Queues','beginner','Learn LIFO and FIFO structures. Practice valid parentheses, next greater element, sliding window maximum, and implementing queues using stacks.','stack,queue'],
  ['dsa','Binary Search','intermediate','Apply binary search beyond sorted arrays. Practice search in rotated array, find peak element, aggressive cows, and book allocation.','binary-search'],
  ['dsa','Trees & BST','intermediate','Learn tree traversals (inorder, preorder, postorder), height, diameter, LCA, and BST operations. Practice zigzag traversal and balanced tree checks.','trees,bst,recursion'],
  ['dsa','Graphs','advanced','Understand BFS, DFS, topological sort, Dijkstra, and Union-Find. Practice shortest path, cycle detection, and minimum spanning tree problems.','graphs,bfs,dfs'],
  ['dsa','Dynamic Programming','advanced','Master memoization and tabulation. Practice 0/1 knapsack, LCS, LIS, coin change, edit distance, and matrix chain multiplication.','dp,recursion'],
  ['aptitude','Number Systems & Quantitative','beginner','Practice HCF/LCM, percentages, profit/loss, time-speed-distance, simple and compound interest, ratios, and number series.','quant,arithmetic'],
  ['aptitude','Logical Reasoning','beginner','Improve pattern recognition, syllogisms, blood relations, seating arrangements, coding-decoding, and direction sense.','reasoning,logic'],
  ['aptitude','Verbal Ability','beginner','Strengthen reading comprehension, sentence correction, vocabulary, fill in the blanks, and para jumbles for aptitude tests.','verbal,english'],
  ['technical','OOP Concepts','beginner','Explain encapsulation, inheritance, polymorphism, and abstraction with real-world examples. Understand method overloading vs overriding.','oop,java,python'],
  ['technical','DBMS & SQL','intermediate','Master normalization (1NF to 3NF), ER diagrams, joins, subqueries, indexing, transactions, and ACID properties. Practice SQL queries.','dbms,sql,database'],
  ['technical','Operating Systems','intermediate','Understand process management, scheduling algorithms, memory management, paging, deadlocks, and file systems.','os,operating-systems'],
  ['technical','Computer Networks','intermediate','Learn OSI model, TCP/IP, HTTP/HTTPS, DNS, routing, subnetting, and common networking protocols.','networks,tcp-ip'],
  ['programming','Python Fundamentals','beginner','Lists, dictionaries, comprehensions, file I/O, exception handling, and basic OOP in Python.','python'],
  ['programming','Java Core Concepts','beginner','Classes, interfaces, generics, collections (ArrayList, HashMap), streams, and exception handling in Java.','java'],
  ['programming','JavaScript & Web Basics','beginner','Variables, closures, promises, async/await, DOM manipulation, and modern ES6+ syntax.','javascript,web'],
  ['hr','Behavioural Questions','beginner','Prepare STAR-format answers for common HR questions: teamwork, leadership, conflict resolution, strengths and weaknesses, and career goals.','hr,behavioural'],
];

// Roadmaps seed data
const ROADMAPS = [
  {
    title: 'Full-Stack Web Developer', category: 'Technology', icon: '🌐',
    overview: 'Learn to build complete web applications from frontend UI to backend APIs and databases.',
    stages: [
      { stage: 1, title: 'Web Fundamentals', topics: ['HTML5','CSS3','JavaScript ES6+'], resources: 'MDN Web Docs, freeCodeCamp', project: 'Personal portfolio website' },
      { stage: 2, title: 'Frontend Framework', topics: ['React.js','Component design','State management'], resources: 'React docs, Scrimba', project: 'Todo/Notes app with React' },
      { stage: 3, title: 'Backend & APIs', topics: ['Node.js','Express.js','REST APIs','Authentication'], resources: 'Node.js docs, Postman', project: 'RESTful API with CRUD operations' },
      { stage: 4, title: 'Databases', topics: ['MySQL','MongoDB basics','ORM/Query builders'], resources: 'MySQL Tutorial', project: 'Full-stack CRUD app with database' },
      { stage: 5, title: 'Deployment & DevOps', topics: ['Git/GitHub','Linux basics','Cloud deployment'], resources: 'GitHub Docs, Render/Vercel', project: 'Deploy your full-stack app online' },
    ],
  },
  {
    title: 'Data Science & ML', category: 'Technology', icon: '📊',
    overview: 'Build skills to analyse data, create visualisations, and train machine learning models.',
    stages: [
      { stage: 1, title: 'Python for Data Science', topics: ['Python basics','NumPy','Pandas'], resources: 'Kaggle Learn, Colab', project: 'EDA on a public dataset' },
      { stage: 2, title: 'Data Visualisation', topics: ['Matplotlib','Seaborn','Plotly'], resources: 'Matplotlib docs', project: 'Visualise a COVID or sales dataset' },
      { stage: 3, title: 'Statistics & Math', topics: ['Probability','Linear algebra','Statistics'], resources: 'Khan Academy, 3Blue1Brown', project: 'Statistical analysis report' },
      { stage: 4, title: 'Machine Learning', topics: ['Scikit-learn','Regression','Classification','Clustering'], resources: 'fast.ai, Kaggle', project: 'Prediction model with real dataset' },
      { stage: 5, title: 'Deep Learning', topics: ['Neural networks','TensorFlow/PyTorch','CNNs','NLP basics'], resources: 'DeepLearning.AI', project: 'Image classifier or NLP model' },
    ],
  },
  {
    title: 'Android / Mobile Developer', category: 'Technology', icon: '📱',
    overview: 'Learn to design and build mobile applications for Android using Kotlin or cross-platform tools.',
    stages: [
      { stage: 1, title: 'Kotlin Basics', topics: ['Kotlin syntax','OOP','Null safety'], resources: 'Kotlin Playground, JetBrains', project: 'CLI calculator in Kotlin' },
      { stage: 2, title: 'Android Fundamentals', topics: ['Activities','Fragments','Layouts','XML'], resources: 'Android Developers docs', project: 'Simple To-Do Android app' },
      { stage: 3, title: 'Architecture & State', topics: ['MVVM','ViewModel','LiveData/Flow'], resources: 'Android Architecture guide', project: 'Notes app with local DB' },
      { stage: 4, title: 'Networking & Firebase', topics: ['Retrofit','REST APIs','Firebase Auth & Firestore'], resources: 'Firebase docs', project: 'Real-time chat or news app' },
      { stage: 5, title: 'Publish & Polish', topics: ['UI/UX best practices','Google Play publishing','Testing'], resources: 'Google Play Console', project: 'Publish an app on Play Store' },
    ],
  },
  {
    title: 'Cybersecurity Analyst', category: 'Technology', icon: '🔒',
    overview: 'Develop skills in network security, ethical hacking, and security analysis.',
    stages: [
      { stage: 1, title: 'Networking Foundations', topics: ['OSI Model','TCP/IP','DNS','HTTP/S','Firewalls'], resources: 'Professor Messer, CompTIA', project: 'Build a simple home network diagram' },
      { stage: 2, title: 'Linux & Command Line', topics: ['Linux CLI','File permissions','Bash scripting'], resources: 'OverTheWire Bandit', project: 'Automate a security scan script' },
      { stage: 3, title: 'Ethical Hacking Basics', topics: ['Recon','Vulnerability scanning','Metasploit basics'], resources: 'TryHackMe, Hack The Box', project: 'Complete 5 TryHackMe rooms' },
      { stage: 4, title: 'Web Application Security', topics: ['OWASP Top 10','SQL injection','XSS','Burp Suite'], resources: 'PortSwigger Web Academy', project: 'Find and document vulns in a test app' },
      { stage: 5, title: 'Certifications & SOC', topics: ['CompTIA Security+','CEH basics','SIEM tools'], resources: 'CompTIA study guide', project: 'Simulate a SOC analyst workflow' },
    ],
  },
];

// Sample opportunities (clearly marked as Sample)
const OPPORTUNITIES = [
  { type: 'internship', title: 'Web Development Intern', company_or_org: 'TechSpark Solutions (Sample)', description: 'Work on React and Node.js projects for real clients. 3-month internship with certificate.', eligibility: 'B.Tech 2nd or 3rd year students', skills: 'HTML,CSS,JavaScript,React', location: 'Hyderabad', work_mode: 'hybrid', stipend: '₹8,000/month', deadline: '2026-12-31', apply_url: '#' },
  { type: 'competition', title: 'Smart India Hackathon 2026', company_or_org: 'Ministry of Education (Sample)', description: 'National level hackathon for engineering students. Team of 6. Prizes up to Rs.1 lakh.', eligibility: 'Any engineering student', skills: 'Problem solving,Teamwork', location: 'Pan India', work_mode: 'onsite', stipend: null, deadline: '2026-11-30', apply_url: '#' },
  { type: 'scholarship', title: 'NBKR Merit Scholarship', company_or_org: 'NBKRIST (Sample)', description: 'Merit-based scholarship for top-performing students with CGPA above 8.5.', eligibility: 'CGPA >= 8.5, active student', skills: null, location: null, work_mode: null, stipend: '₹25,000/year', deadline: '2026-12-15', apply_url: '#' },
];

// Sample events
const EVENTS = [
  { title: 'Annual Tech Symposium 2026 (Sample)', description: 'Join us for a day of tech talks, project exhibitions, and networking with industry professionals.', event_type: 'seminar', venue: 'NBKRIST Main Auditorium', event_date: '2026-12-10 09:00:00', registration_deadline: '2026-12-05', registration_url: '#', is_online: 0 },
  { title: 'Python Bootcamp (Sample)', description: '2-day hands-on workshop on Python for data science. Beginner friendly, laptops required.', event_type: 'workshop', venue: 'CSE Lab Block B', event_date: '2026-11-20 10:00:00', registration_deadline: '2026-11-18', registration_url: '#', is_online: 0 },
  { title: 'Online Ideathon (Sample)', description: 'Present your innovative ideas in a 1-hour online competition. Top ideas get mentorship.', event_type: 'competition', venue: 'Online (Google Meet)', event_date: '2026-11-25 14:00:00', registration_deadline: '2026-11-22', registration_url: '#', is_online: 1 },
];

async function run() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    // 1. Create tables
    console.log('\n▶  Creating student module tables...');
    for (const [name, sql] of TABLES) {
      await conn.execute(sql);
      console.log(`  ✓ ${name}`);
    }

    // 2. Add portfolio columns to student_profiles
    console.log('\n▶  Extending student_profiles for portfolio...');
    const [existingCols] = await conn.execute(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'student_profiles'`
    );
    const colSet = new Set(existingCols.map(r => r.COLUMN_NAME));
    for (const [col, def] of PROFILE_COLS) {
      if (!colSet.has(col)) {
        await conn.execute(`ALTER TABLE student_profiles ADD COLUMN \`${col}\` ${def}`);
        console.log(`  + Added: ${col}`);
      } else {
        console.log(`  = Exists: ${col}`);
      }
    }

    // 3. Seed interview topics
    console.log('\n▶  Seeding interview topics...');
    const [existTopics] = await conn.execute('SELECT COUNT(*) AS c FROM interview_topics');
    if (existTopics[0].c === 0) {
      for (const [cat, title, diff, content, tags] of TOPICS) {
        await conn.execute(
          'INSERT INTO interview_topics (category, title, difficulty, content, tags) VALUES (?,?,?,?,?)',
          [cat, title, diff, content, tags]
        );
      }
      console.log(`  ✓ Inserted ${TOPICS.length} interview topics`);
    } else {
      console.log(`  = Already seeded (${existTopics[0].c} topics)`);
    }

    // 4. Seed roadmaps
    console.log('\n▶  Seeding career roadmaps...');
    const [existRoadmaps] = await conn.execute('SELECT COUNT(*) AS c FROM roadmaps');
    if (existRoadmaps[0].c === 0) {
      for (const r of ROADMAPS) {
        await conn.execute(
          'INSERT INTO roadmaps (title, category, icon, overview, stages_json) VALUES (?,?,?,?,?)',
          [r.title, r.category, r.icon, r.overview, JSON.stringify(r.stages)]
        );
      }
      console.log(`  ✓ Inserted ${ROADMAPS.length} roadmaps`);
    } else {
      console.log(`  = Already seeded (${existRoadmaps[0].c} roadmaps)`);
    }

    // 5. Seed opportunities (uses admin user id=2)
    console.log('\n▶  Seeding sample opportunities...');
    const [existOpp] = await conn.execute('SELECT COUNT(*) AS c FROM opportunities');
    if (existOpp[0].c === 0) {
      for (const o of OPPORTUNITIES) {
        await conn.execute(
          `INSERT INTO opportunities (posted_by, type, title, company_or_org, description, eligibility,
            skills, location, work_mode, stipend, deadline, apply_url, is_verified)
           VALUES (2,?,?,?,?,?,?,?,?,?,?,?,0)`,
          [o.type, o.title, o.company_or_org, o.description, o.eligibility,
           o.skills, o.location, o.work_mode, o.stipend, o.deadline, o.apply_url]
        );
      }
      console.log(`  ✓ Inserted ${OPPORTUNITIES.length} sample opportunities`);
    } else {
      console.log(`  = Already seeded (${existOpp[0].c} opportunities)`);
    }

    // 6. Seed events
    console.log('\n▶  Seeding sample events...');
    const [existEv] = await conn.execute('SELECT COUNT(*) AS c FROM events');
    if (existEv[0].c === 0) {
      for (const e of EVENTS) {
        await conn.execute(
          `INSERT INTO events (posted_by, title, description, event_type, venue, event_date,
            registration_deadline, registration_url, is_online)
           VALUES (2,?,?,?,?,?,?,?,?)`,
          [e.title, e.description, e.event_type, e.venue, e.event_date,
           e.registration_deadline, e.registration_url, e.is_online]
        );
      }
      console.log(`  ✓ Inserted ${EVENTS.length} sample events`);
    } else {
      console.log(`  = Already seeded (${existEv[0].c} events)`);
    }

    console.log('\n✅  Student module setup complete!\n');
  } catch (err) {
    console.error('\n❌  Setup failed:', err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

run();
