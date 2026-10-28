// Idempotent demo content for Academic Resources, ProjectVault, FindBack, and
// Smart Campus Services. Demo rows are owned by an active admin, never a student.
const pool = require('../config/db');

const RESOURCES = [
  ['[DEMO] Python Programming — Unit 1 revision notes','Python Programming','1','notes','Demo study outline covering variables, control flow, functions, and basic debugging. Unit 1 sample content; no file is attached.'],
  ['[DEMO] Engineering Mathematics — Unit 2 practice notes','Engineering Mathematics','1','notes','Sample revision outline for matrices, limits, and problem-solving practice. Unit 2 demo content; no file is attached.'],
  ['[DEMO] Data Structures — Unit 1 arrays and complexity','Data Structures and Algorithms','3','notes','Unit 1 sample notes on arrays, strings, complexity analysis, and edge cases. Demo only; no file is attached.'],
  ['[DEMO] Data Structures — Unit 2 stacks and queues','Data Structures and Algorithms','3','notes','Unit 2 revision outline with stack and queue operations and hand-worked examples. Demo only; no file is attached.'],
  ['[DEMO] Algorithms — Unit 3 sorting and searching','Data Structures and Algorithms','4','reference','Unit 3 quick-reference outline comparing sorting and searching approaches. Demo only; no file is attached.'],
  ['[DEMO] DBMS — Unit 1 relational model and keys','Database Management Systems','3','notes','Unit 1 sample revision notes covering relations, keys, constraints, and normalization vocabulary. Demo only; no file is attached.'],
  ['[DEMO] SQL — Unit 2 query practice','Database Management Systems','3','other','Unit 2 practice prompts for SELECT, joins, grouping, and NULL handling. Demo prompts only; no database script is attached.'],
  ['[DEMO] Operating Systems — Unit 2 processes and scheduling','Operating Systems','4','notes','Unit 2 revision outline for process states, scheduling, and context switching. Demo only; no file is attached.'],
  ['[DEMO] Computer Networks — Unit 1 reference sheet','Computer Networks','4','reference','Unit 1 sample reference for OSI/TCP-IP layers, addressing, and common protocols. Demo only; no file is attached.'],
  ['[DEMO] Web Development — HTML and CSS lab preparation','Web Development','2','other','Lab preparation checklist for semantic HTML, responsive CSS, and browser developer tools. Demo only; no lab PDF is attached.'],
  ['[DEMO] Full Stack Development — API and database practice','Full Stack Development','5','other','Practice outline for a small React, Express, and SQL workflow, including input validation and parameterized queries. Demo only.'],
  ['[DEMO] Artificial Intelligence — search methods revision','Artificial Intelligence','5','notes','Sample unit outline for state spaces, search strategies, and evaluating solution paths. Demo only; no file is attached.'],
  ['[DEMO] Machine Learning — model evaluation notes','Artificial Intelligence and Machine Learning','5','notes','Revision outline for train/validation/test splits, overfitting, and classification metrics. Demo only; no file is attached.'],
  ['[DEMO] Data Science — Pandas and data cleaning exercises','Data Science','5','other','Practice tasks for inspecting, cleaning, and documenting a tabular dataset. Demo only; no notebook file is attached.'],
  ['[DEMO] Previous Semester — sample DSA question paper','Data Structures and Algorithms','3','question_paper','Illustrative question-paper format for interface demonstration. This is not an actual university previous-semester paper and no PDF is attached.'],
  ['[DEMO] Previous Semester — sample DBMS question paper','Database Management Systems','3','question_paper','Illustrative question-paper format for interface demonstration. This is not an actual university previous-semester paper and no PDF is attached.'],
  ['[DEMO] Previous Semester — sample Operating Systems paper','Operating Systems','4','question_paper','Illustrative question-paper format for interface demonstration. This is not an actual university previous-semester paper and no PDF is attached.'],
  ['[DEMO] Python lab manual — functions and file handling','Python Programming','2','reference','Sample practical checklist for functions, exceptions, and safe file handling. Demo only; no lab manual PDF is attached.'],
  ['[DEMO] SQL lab manual — joins and aggregation','Database Management Systems','3','reference','Sample practical checklist for joins, grouping, and validating query results. Demo only; no lab manual PDF is attached.'],
  ['[DEMO] Machine Learning lab — baseline model workflow','Artificial Intelligence and Machine Learning','5','reference','Sample practical checklist for baselines, held-out evaluation, and documenting limitations. Demo only; no lab manual PDF is attached.'],
];

const PROJECTS = [
  ['SpendWise — Expense Tracking and Budgeting','DEMO PROJECT. A personal finance prototype for recording expenses, grouping spending, and setting monthly budgets. No repository or live demo is attached.','React, Node.js, MySQL','Web Development'],
  ['UniOne — Integrated Student Platform','DEMO PROJECT. A student platform concept combining study resources, career preparation, campus services, and student tools. No repository or live demo is attached.','React, Express, MySQL','Full Stack Development'],
  ['Student Performance Analysis','DEMO PROJECT. An exploratory analysis concept that summarizes anonymized course outcomes and documents limitations. No dataset or model is attached.','Python, Pandas, scikit-learn','AI & Data Science'],
  ['Fake News Detection with NLP','DEMO PROJECT. An NLP learning prototype concept for text preprocessing and model evaluation; not intended as a fact-checking service. No model or live demo is attached.','Python, NLP, scikit-learn','AI & Data Science'],
  ['Campus Event Management System','DEMO PROJECT. A campus event workflow concept for publishing events, viewing details, and recording interest. No repository or live demo is attached.','React, Express, MySQL','Web Development'],
  ['Lost-and-Found Management System','DEMO PROJECT. A privacy-aware lost-and-found concept with item reports and owner-only status updates. No repository or live demo is attached.','React, Node.js, MySQL','Web Development'],
  ['Resume Analyzer and Career Practice Assistant','DEMO PROJECT. A career-preparation concept for organizing resume feedback and practice activities. No resume files or external AI service are attached.','React, Node.js','Career Tools'],
  ['Student Attendance Analytics','DEMO PROJECT. An analytics concept that summarizes attendance data and clearly distinguishes observations from assumptions. No real student data is included.','Python, SQL, Data Visualization','AI & Data Science'],
  ['Data Visualization Dashboard','DEMO PROJECT. A dashboard concept for exploring a public or synthetic dataset with documented measures and caveats. No dataset or live demo is attached.','JavaScript, D3.js, Python','Data Visualization'],
  ['Smart Campus Issue Reporting System','DEMO PROJECT. A service-request concept with categories, locations, and status updates. No repository or live demo is attached.','React, Express, MySQL','Campus Services'],
];

const FINDBACK = [
  ['lost','Student ID card','id_cards','Library entrance — sample location','DEMO listing. This item was not actually lost. Example report for demonstrating a student ID listing; use the in-app claim action only for real listings.'],
  ['found','Water bottle','other','Block A — sample location','DEMO listing. This bottle was not actually found. Example report for demonstrating a found item; no real claimant is expected.'],
  ['lost','Spiral notebook','books','Lecture hall corridor — sample location','DEMO listing. This notebook was not actually lost. Example report for demonstrating a notebook listing.'],
  ['found','Scientific calculator','electronics','Engineering lab lobby — sample location','DEMO listing. This calculator was not actually found. Example report for demonstrating a calculator listing.'],
  ['lost','USB flash drive','electronics','Computer lab — sample location','DEMO listing. This drive was not actually lost. Do not use this record to claim a real device.'],
  ['found','Set of keys','keys','Cafeteria seating — sample location','DEMO listing. These keys were not actually found. Example report for demonstrating a safe claim workflow.'],
  ['lost','Wired earphones','electronics','Auditorium — sample location','DEMO listing. These earphones were not actually lost. Example listing only.'],
  ['found','Backpack','bags','Sports complex reception — sample location','DEMO listing. This backpack was not actually found. Example listing only.'],
  ['lost','Library book','books','Library study area — sample location','DEMO listing. This book was not actually lost. Example listing only.'],
  ['found','Phone charger','electronics','Student centre — sample location','DEMO listing. This charger was not actually found. Example listing only.'],
];

const CAMPUS = [
  ['maintenance','DEMO: Classroom light maintenance','Block A, sample room 101','[DEMO:UNIONE-CAMPUS] Sample request only: a classroom light is described as flickering. No real issue has been reported.'],
  ['maintenance','DEMO: Water supply and plumbing','Sample wash area','[DEMO:UNIONE-CAMPUS] Sample request only: a tap is described as needing inspection. No real issue has been reported.'],
  ['cleanliness','DEMO: Classroom cleanliness','Sample classroom 204','[DEMO:UNIONE-CAMPUS] Sample request only: demonstrate a classroom cleaning request. No real issue has been reported.'],
  ['it_support','DEMO: Wi-Fi and network support','Sample library floor 2','[DEMO:UNIONE-CAMPUS] Sample request only: demonstrate reporting a Wi-Fi connection problem. No real issue has been reported.'],
  ['facilities','DEMO: Library assistance','Sample library help desk','[DEMO:UNIONE-CAMPUS] Sample request only: demonstrate a library facility assistance request. No real request was made.'],
  ['maintenance','DEMO: Laboratory equipment issue','Sample computing lab','[DEMO:UNIONE-CAMPUS] Sample request only: demonstrate reporting equipment for inspection. No real issue has been reported.'],
  ['cleanliness','DEMO: Washroom maintenance','Sample campus washroom','[DEMO:UNIONE-CAMPUS] Sample request only: demonstrate a washroom maintenance request. No real issue has been reported.'],
  ['facilities','DEMO: Campus facility assistance','Sample student centre','[DEMO:UNIONE-CAMPUS] Sample request only: demonstrate a campus facility request. No real request was made.'],
  ['other','DEMO: General student support','Sample student services desk','[DEMO:UNIONE-CAMPUS] Sample request only: demonstrate a general student support request. No real request was made.'],
];

async function addSampleRows(conn, table, rows, sql, valuesForRow, existenceQuery, keyForRow) {
  let added = 0;
  for (const row of rows) {
    const [existing] = await conn.execute(existenceQuery, [keyForRow(row)]);
    if (existing.length) continue;
    await conn.execute(sql, valuesForRow(row));
    added++;
  }
  console.log(`${table}: added ${added} demo records`);
}

async function main() {
  const conn = await pool.getConnection();
  try {
    const [[owner]] = await conn.execute(
      `SELECT id FROM users WHERE role='admin' AND account_status='active' ORDER BY id LIMIT 1`
    );
    if (!owner) throw new Error('No active admin account is available to own clearly labeled demo records; no rows were seeded.');
    await conn.beginTransaction();

    await addSampleRows(conn, 'resources', RESOURCES,
      `INSERT INTO resources (uploaded_by,title,subject,department,semester,academic_year,resource_type,description,file_url)
       SELECT ?,?,?,?,?,?,?,?,NULL FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM resources WHERE title=? LIMIT 1)`,
      row => [owner.id,row[0],row[1],'AI & Data Science',row[2],'Demo',row[3],row[4],row[0]],
      'SELECT id FROM resources WHERE title=? LIMIT 1', row => row[0]);

    await addSampleRows(conn, 'student_projects', PROJECTS,
      `INSERT INTO student_projects (student_id,title,description,technologies,category,github_url,demo_url)
       SELECT ?,?,?,?,?,NULL,NULL FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM student_projects WHERE title=? LIMIT 1)`,
      row => [owner.id,`[DEMO] ${row[0]}`,`[DEMO:UNIONE-PROJECT] ${row[1]}`,row[2],row[3],`[DEMO] ${row[0]}`],
      'SELECT id FROM student_projects WHERE title=? LIMIT 1', row => `[DEMO] ${row[0]}`);

    await addSampleRows(conn, 'findback_items', FINDBACK,
      `INSERT INTO findback_items (reported_by,type,title,description,category,campus_location,item_date,image_url,status,contact_via_platform)
       SELECT ?,?,?,?,?,?,CURDATE(),NULL,'open',1 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM findback_items WHERE title=? LIMIT 1)`,
      row => [owner.id,row[0],`[DEMO] ${row[1]}`,row[4],row[2],row[3],`[DEMO] ${row[1]}`],
      'SELECT id FROM findback_items WHERE title=? LIMIT 1', row => `[DEMO] ${row[1]}`);

    await addSampleRows(conn, 'campus_requests', CAMPUS,
      `INSERT INTO campus_requests (student_id,category,description,location,status,admin_note)
       SELECT ?,?,?,?,'submitted',NULL FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM campus_requests WHERE description=? LIMIT 1)`,
      row => [owner.id,row[0],row[3],row[2],row[3]],
      'SELECT id FROM campus_requests WHERE description=? LIMIT 1', row => row[3]);

    await conn.commit();
    console.log('Four-module demo seed complete; all rows are owned by the active admin and marked as demo content.');
  } catch (error) {
    await conn.rollback().catch(() => {});
    throw error;
  } finally { conn.release(); }
}

main().catch(error => { console.error('Four-module demo seed failed:', error.message); process.exitCode = 1; }).finally(() => pool.end());
