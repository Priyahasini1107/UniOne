// Add original practice questions and career paths without deleting or replacing user data.
// Safe to rerun: questions are matched by exact title and roadmaps by exact title.
require('dotenv').config();
const pool = require('../config/db');

const QUESTIONS = [
  // Five direct DSA questions (existing rows are topic summaries).
  ['dsa','DSA: Find two numbers that sum to a target','beginner','For each value, check whether target minus that value is already in a hash set. If it is, the pair is found; otherwise store the value. This is O(n) expected time and O(n) extra space.','arrays,hash-map,practice'],
  ['dsa','DSA: When would you use a stack?','beginner','A stack is useful when the most recently added item must be handled first (LIFO). Examples include undo history, parsing nested brackets, and depth-first search. Push and pop are O(1).','stack,practice'],
  ['dsa','DSA: Queue versus stack','beginner','A queue is FIFO: the earliest added item leaves first. A stack is LIFO: the latest added item leaves first. Queues model task lines; stacks model nested calls or undo steps.','queue,stack,practice'],
  ['dsa','DSA: How does binary search work?','beginner','On sorted input, compare with the middle item and discard the half that cannot contain the target. Repeat until found or empty. Runtime is O(log n); sorted input is required.','binary-search,practice'],
  ['dsa','DSA: When is breadth-first search useful?','intermediate','BFS explores a graph one distance layer at a time using a queue. In an unweighted graph it finds a shortest path by edge count. With adjacency lists its runtime is O(V+E).','graphs,bfs,practice'],
  // Add direct Q&A entries rather than topic-summary headings.
  ['aptitude','Aptitude: Work rate with two workers','beginner','If A completes a task in 6 days and B in 3 days, how long together?\n\nAnswer: A does 1/6 of the task per day and B does 1/3. Together they do 1/2 per day, so the task takes 2 days.','work-rate,practice'],
  ['aptitude','Aptitude: Probability of drawing an ace','beginner','A standard deck has 52 cards and 4 aces. The probability is 4/52 = 1/13, assuming a well-shuffled deck and one draw.','probability,practice'],
  ['aptitude','Aptitude: Find 15% of 240','beginner','10% of 240 is 24 and 5% is 12. Add them: 24 + 12 = 36.','percentages,practice'],
  ['aptitude','Aptitude: Divide 64 in the ratio 3:5','beginner','There are 8 parts; each is 64/8=8. The amounts are 24 and 40, which sum to 64.','ratios,practice'],
  ['aptitude','Aptitude: Complete 2, 6, 12, 20, ?','beginner','The differences are 4, 6, and 8, so the next difference is 10 and the answer is 30. The terms also follow n(n+1).','number-series,practice'],
  // Programming fundamentals.
  ['programming','Programming: What is a variable and a data type?','beginner','A variable is a named place to store a value. Its data type describes the kind of value and the operations allowed, such as integer, string, or Boolean. For example, age = 20 stores an integer.','fundamentals,practice'],
  ['programming','Programming: What is the difference between a compiler and an interpreter?','beginner','A compiler translates a program into another form before execution, while an interpreter executes instructions through a runtime. Many modern languages use a mix, such as compiling to bytecode and then running it on a virtual machine.','fundamentals,practice'],
  ['programming','Programming: What is a function and why use one?','beginner','A function is a named unit of work that may accept inputs and return a result. It makes behavior reusable and gives code clear boundaries. A good function has one understandable responsibility.','fundamentals,practice'],
  ['programming','Programming: What is exception handling?','beginner','Exception handling lets a program respond to an error without failing unexpectedly. Catch errors you can handle, provide useful feedback, and avoid hiding failures with empty catch blocks.','fundamentals,practice'],
  ['programming','Programming: == versus === in JavaScript','beginner','== may coerce values before comparing; === compares without that coercion. For example, 0 == "0" is true while 0 === "0" is false. Prefer strict equality when possible.','javascript,fundamentals,practice'],
  // General technical questions.
  ['technical','Technical: What happens when you open a web page?','beginner','The browser resolves the domain through DNS, connects to the server, negotiates TLS for HTTPS, sends an HTTP request, receives a response, and parses HTML, CSS, and JavaScript to render the page.','web,practice'],
  ['technical','Technical: What is an API?','beginner','An API is a defined interface through which software components communicate. A web API may accept an HTTP method, path, and data, then return a status and JSON response.','api,practice'],
  ['technical','Technical: Why are automated tests useful?','beginner','Tests check expected behavior and catch regressions. Unit tests cover small pieces; integration tests cover interactions. Tests help but cannot prove software has no defects.','testing,practice'],
  ['technical','Technical: What is version control?','beginner','Version control records changes so a team can review, compare, and combine work. Git commits form history; branches let work proceed separately before review and merge.','git,practice'],
  ['technical','Technical: Authentication versus authorization','beginner','Authentication establishes who a user is. Authorization decides what that user may do. Protected actions should check both identity and permission.','security,practice'],
  // HR / behavioural questions.
  ['hr','HR: Tell me about yourself.','beginner','Give a concise 60–90 second summary: your current study or role, one or two relevant strengths demonstrated through work, and what kind of opportunity you are seeking. Keep personal details brief.','behavioural,practice'],
  ['hr','HR: Describe a challenge and how you handled it.','beginner','Use the STAR structure: Situation, Task, Action, Result. Explain your own actions, what you learned, and a measurable or concrete outcome without blaming others.','behavioural,star,practice'],
  ['hr','HR: How do you respond to feedback?','beginner','Explain how you listen, clarify the expected change, apply the feedback, and check whether the result improved. Give a real example if available.','behavioural,practice'],
  ['hr','HR: What would you do if you disagreed with a teammate?','beginner','First understand their reasoning, then compare options against the shared goal and evidence. Agree on a small test or ask for a decision from the responsible owner if the team remains stuck.','teamwork,practice'],
  ['hr','HR: What skill are you working to improve?','beginner','Choose a genuine, manageable skill and explain concrete steps you are taking to improve it. Show reflection and follow-through rather than disguising a strength as a weakness.','self-awareness,practice'],
  // DBMS / SQL (stored as technical with a subject tag supported by the existing schema).
  ['technical','DBMS: What is a primary key?','beginner','A primary key uniquely identifies each row in a table and cannot be NULL. A table has one primary-key constraint, which may contain one or multiple columns. Example: student_id in Students.','subject:dbms,sql,practice'],
  ['technical','DBMS: What is a foreign key?','beginner','A foreign key references a key in another table and enforces a relationship. For example, Orders.customer_id can reference Customers.id, preventing an order from pointing to a nonexistent customer.','subject:dbms,sql,practice'],
  ['technical','SQL: INNER JOIN versus LEFT JOIN','beginner','INNER JOIN returns rows with a match on both sides. LEFT JOIN keeps every row from the left table and fills right-side columns with NULL when no match exists. Use LEFT JOIN to find records that may lack a related row.','subject:dbms,sql,practice'],
  ['technical','DBMS: What is normalization?','intermediate','Normalization organizes related data to reduce duplication and update anomalies. For example, storing each department name once in a Departments table avoids inconsistent copies in every student row. Normalize for integrity, then measure before denormalizing for performance.','subject:dbms,normalization,practice'],
  ['technical','SQL: How do you find duplicate values?','beginner','Group by the value and keep groups with more than one row. Example: SELECT email, COUNT(*) FROM Users GROUP BY email HAVING COUNT(*) > 1. Decide which row to retain before deleting duplicates.','subject:dbms,sql,practice'],
  // Operating systems.
  ['technical','Operating Systems: Process versus thread','beginner','A process has its own address space and resources. Threads run within a process and share its memory, while each has its own execution state and stack. Threads are lighter to coordinate but shared memory needs synchronization.','subject:operating-systems,practice'],
  ['technical','Operating Systems: What is a context switch?','beginner','A context switch saves the running task state and restores another task state so the CPU can switch work. It enables multitasking, but too many switches add overhead.','subject:operating-systems,practice'],
  ['technical','Operating Systems: What is virtual memory?','beginner','Virtual memory gives each process an address space that the OS maps to physical memory. Pages can be moved between RAM and storage, allowing isolation and flexible memory use; excessive paging makes a system slow.','subject:operating-systems,practice'],
  ['technical','Operating Systems: What is a deadlock?','intermediate','A deadlock occurs when tasks wait forever for resources held by one another. The classic conditions are mutual exclusion, hold-and-wait, no preemption, and circular wait. Breaking at least one condition can prevent it.','subject:operating-systems,practice'],
  ['technical','Operating Systems: Mutex versus semaphore','intermediate','A mutex provides exclusive ownership of a critical section, usually released by the owner. A semaphore is a counter used to control access to a number of resources or to signal between tasks.','subject:operating-systems,practice'],
  // Computer networks.
  ['technical','Networks: What is the difference between TCP and UDP?','beginner','TCP establishes a connection and provides ordered, retransmitted delivery. UDP sends independent datagrams with less overhead but no built-in delivery guarantee. File transfer often uses TCP; real-time media may prefer UDP.','subject:networks,practice'],
  ['technical','Networks: What does DNS do?','beginner','DNS maps human-readable domain names to records such as IP addresses. A resolver checks caches and queries DNS servers as needed, allowing a browser to locate the host for a domain.','subject:networks,practice'],
  ['technical','Networks: What is the difference between HTTP and HTTPS?','beginner','HTTPS is HTTP carried over TLS. TLS authenticates the server and encrypts data in transit, helping protect confidentiality and detect tampering. It does not prove that a website’s claims are trustworthy.','subject:networks,practice'],
  ['technical','Networks: Explain the client-server model.','beginner','A client requests a service and a server responds. A browser requesting a page from a web server is one example. A single machine can act as both a client and server in different interactions.','subject:networks,practice'],
  ['technical','Networks: What is an IP address and a subnet?','beginner','An IP address identifies an interface on an IP network. A subnet prefix marks which bits identify the network, helping devices decide whether to send traffic locally or through a router.','subject:networks,practice'],
  // Object-oriented programming.
  ['technical','OOP: What are the four common object-oriented principles?','beginner','Encapsulation groups data with operations and controls access; abstraction exposes useful behavior while hiding details; inheritance reuses or specializes a type; polymorphism lets different types respond through a common interface.','subject:oop,practice'],
  ['technical','OOP: Composition versus inheritance','intermediate','Composition builds a type from collaborating objects (“has-a”), while inheritance creates a subtype (“is-a”). Prefer composition when behavior can be assembled flexibly; use inheritance when the subtype truly satisfies the parent contract.','subject:oop,practice'],
  ['technical','OOP: What is polymorphism?','beginner','Polymorphism lets code call the same interface on different types while each type supplies its behavior. For example, Shape.draw() can be implemented differently by Circle and Rectangle.','subject:oop,practice'],
  ['technical','OOP: What is encapsulation?','beginner','Encapsulation keeps an object’s internal state behind a controlled interface. A BankAccount can expose deposit and withdraw methods rather than allowing arbitrary code to set its balance.','subject:oop,practice'],
  ['technical','OOP: What is an interface or abstract type useful for?','intermediate','It defines behavior that callers may rely on without tying them to one implementation. A PaymentMethod interface lets checkout work with card or wallet implementations and makes testing with a fake implementation easier.','subject:oop,practice'],
  // AI and machine learning interview basics.
  ['technical','AI/ML: Supervised versus unsupervised learning','beginner','Supervised learning trains from examples with labels, such as images tagged with categories. Unsupervised learning looks for structure without target labels, such as grouping customers by behavior.','subject:ai-ml,practice'],
  ['technical','AI/ML: What is overfitting?','beginner','Overfitting is when a model learns training-specific noise and performs poorly on new examples. Use validation data, simpler models, regularization, more representative data, or early stopping to reduce it.','subject:ai-ml,practice'],
  ['technical','AI/ML: Why split data into train, validation, and test sets?','beginner','Training data fits the model, validation data guides choices such as hyperparameters, and test data estimates final performance. Keep the test set separate until the end to reduce optimistic bias.','subject:ai-ml,practice'],
  ['technical','AI/ML: Precision versus recall','beginner','Precision is the fraction of predicted positives that are correct; recall is the fraction of actual positives found. In spam detection, high precision reduces legitimate mail marked as spam, while high recall catches more spam.','subject:ai-ml,practice'],
  ['technical','AI/ML: What is data leakage?','intermediate','Data leakage occurs when training uses information that would not be available at prediction time, or information from the evaluation target. It can make validation scores look strong while real-world performance fails.','subject:ai-ml,practice'],
];

const CAREER_PATHS = [
  {
    title: 'AI and Machine Learning Engineer', category: 'Technology', icon: '🤖',
    overview: 'Prerequisites: basic algebra, comfort with Python, and willingness to practice with data. Learn the stages in order; deep learning is an optional specialization after the foundations.',
    stages: [
      { stage:1,title:'Programming and data foundations',topics:['Python','Git','NumPy','Pandas','basic probability'],essential:['Python functions, collections, testing','Git branches and readable commits','Linear algebra and descriptive statistics'],optional:['Linux shell'],tools:['Python','Jupyter','GitHub'],project:'Explore and clean a public tabular dataset; document assumptions and missing values.',resources:'Python docs, Kaggle Learn',portfolio:'Publish a notebook with a clear README, data source, and reproducible steps.',interview:'Practice Python fundamentals, arrays, dictionaries, and explaining data cleaning.',readiness:'Can write small tested Python functions and explain the dataset.'},
      { stage:2,title:'Classical machine learning',topics:['train/validation/test','regression','classification','metrics','leakage'],essential:['Scikit-learn pipelines','Cross-validation','Precision, recall, F1, and baseline comparison'],optional:['XGBoost or LightGBM after fundamentals'],tools:['Scikit-learn','Pandas'],project:'Compare a baseline and two models on a public classification or regression dataset.',resources:'Scikit-learn user guide',portfolio:'Record metrics, model limitations, and a reproducible environment.',interview:'Explain overfitting, leakage, regularization, and metric choice.',readiness:'Can evaluate on held-out data and explain trade-offs.'},
      { stage:3,title:'Data engineering and model delivery',topics:['SQL','data validation','REST APIs','model serialization','monitoring'],essential:['SQL joins and aggregation','Input validation','Model versioning and reproducibility'],optional:['Docker','Cloud deployment'],tools:['MySQL or PostgreSQL','FastAPI or Flask','Git'],project:'Wrap a small model in an API with input checks and example requests.',resources:'SQL documentation, framework documentation',portfolio:'Include API usage, test examples, and known limitations.',interview:'Practice SQL, API design, and how to detect data drift.',readiness:'Can explain how data reaches a model and how predictions are checked.'},
      { stage:4,title:'Choose a specialization and build',topics:['NLP or computer vision','feature engineering','error analysis','responsible AI'],essential:['Choose one problem area','Compare model errors across meaningful slices'],optional:['PyTorch or TensorFlow','Transformers'],tools:['One deep-learning framework if needed','Experiment tracking'],project:'Build an end-to-end prototype for a narrowly scoped real problem.',resources:'Official framework tutorials',portfolio:'Document data permissions, evaluation, failure cases, and next steps.',interview:'Explain the model and its errors to both technical and nontechnical listeners.',readiness:'Can defend scope, metrics, and limitations without claiming production readiness.'},
      { stage:5,title:'Interview and internship readiness',topics:['Python problem solving','ML fundamentals','SQL','project discussion','collaboration'],essential:['Practice coding and ML concepts','Prepare two project walkthroughs','Review resume and GitHub'],optional:['MLOps tools based on the target role'],tools:['Practice notebook','GitHub portfolio'],project:'Polish one project into a reproducible demo and concise case study.',resources:'Role descriptions and public practice questions',portfolio:'Pin projects with setup instructions, results, and honest caveats.',interview:'Run mock coding, ML, and behavioral interviews.',checklist:['Resume links to working, documented projects','Can explain evaluation and limitations','Can demonstrate Python, SQL, and collaboration'],readiness:'Can explain choices, trade-offs, teamwork, and what would be improved next.'},
    ],
  },
  {
    title: 'Software Development Engineer', category: 'Technology', icon: '💻',
    overview: 'Prerequisites: one programming language and basic computer use. Build strong fundamentals before specializing in backend, frontend, mobile, or systems.',
    stages: [
      { stage:1,title:'Programming and problem solving',topics:['one language','functions','collections','complexity','debugging'],essential:['Choose Python, Java, C++, or JavaScript','Write small readable programs','Use Git'],optional:['Competitive programming contests'],tools:['Language runtime','IDE','GitHub'],project:'Build a command-line application with input validation and tests.',resources:'Official language tutorial',portfolio:'Show a README, tests, and meaningful commit history.',interview:'Practice arrays, strings, hash maps, and explaining complexity.',readiness:'Can solve small problems and describe edge cases.'},
      { stage:2,title:'Data structures and algorithms',topics:['arrays','linked lists','stacks','queues','trees','graphs','sorting','search'],essential:['Choose data structures by operations','Analyze time and space complexity'],optional:['Advanced dynamic programming'],tools:['Language test runner'],project:'Implement and test a small set of data structures or algorithms.',resources:'Open course notes and practice problems',portfolio:'Explain correctness and complexity in project notes.',interview:'Practice timed easy and medium problems, then review mistakes.',readiness:'Can reason from a brute-force idea to a suitable solution.'},
      { stage:3,title:'Computer science and software design',topics:['OOP','operating systems','networks','DBMS','HTTP'],essential:['Processes and memory basics','SQL and transactions','Interfaces and modular design'],optional:['Distributed systems fundamentals'],tools:['MySQL','API client','debugger'],project:'Design and document a small service with a relational data model.',resources:'Course notes and official documentation',portfolio:'Include a simple architecture diagram and trade-offs.',interview:'Review SQL joins, HTTP, concurrency, and object-oriented design.',readiness:'Can explain how a request flows through an application.'},
      { stage:4,title:'Build and ship a complete project',topics:['requirements','testing','code review','deployment basics','observability'],essential:['Break work into tasks','Handle errors','Write tests and documentation'],optional:['Containerization'],tools:['Existing stack or one focused framework'],project:'Build a small useful application with persistence and clear user flows.',resources:'Framework and database docs',portfolio:'Deploy only if suitable; include screenshots or a local setup guide.',interview:'Practice project deep-dives and debugging scenarios.',readiness:'Can describe design decisions and limitations.'},
      { stage:5,title:'Job and internship readiness',topics:['coding interviews','behavioral examples','resume','GitHub','teamwork'],essential:['Review core CS','Prepare concise project stories','Apply to roles matching current skills'],optional:['Role-specific frameworks'],tools:['Resume','GitHub'],project:'Polish one project and resolve its highest-impact issues.',resources:'Public practice interviews and job descriptions',portfolio:'Pin finished work with setup steps and ownership clearly stated.',interview:'Practice coding, fundamentals, and behavioral questions.',checklist:['Resume reflects skills demonstrated in projects','GitHub projects have setup and usage notes','Can explain decisions and ask clarifying questions'],readiness:'Can communicate clearly and ask clarifying questions during interviews.'},
    ],
  },
];

const FULL_STACK_GUIDE = [
  {essential:['HTML semantics','CSS layout','JavaScript basics'],optional:['TypeScript later'],tools:['Browser devtools','Git'],portfolio:'Publish a simple responsive portfolio with readable code.',interview:'Explain browser requests, JavaScript values, and basic accessibility.',readiness:'Can build and explain a small responsive page.'},
  {essential:['React components and state','Forms and validation','Accessible UI'],optional:['A state library only when needed'],tools:['React','Vite','Browser devtools'],portfolio:'Build a small searchable application with loading, empty, and error states.',interview:'Practice component design, props, state, and rendering.',readiness:'Can explain how data flows through the UI.'},
  {essential:['HTTP methods and status codes','REST patterns','Server-side validation','Authentication basics'],optional:['WebSockets'],tools:['Node.js','Express','API client'],portfolio:'Create a documented API with validation and authorization.',interview:'Explain an HTTP request from UI to server and back.',readiness:'Can protect an endpoint and handle errors deliberately.'},
  {essential:['Relational modeling','SQL CRUD and joins','Parameterized queries','Transactions'],optional:['A second database only after understanding trade-offs'],tools:['MySQL','Database client'],portfolio:'Connect the API to a relational schema and document its relationships.',interview:'Practice joins, keys, indexes, and transaction basics.',readiness:'Can explain how data remains consistent.'},
  {essential:['Testing','Git review workflow','Configuration and secrets','Basic deployment concepts'],optional:['Containers and cloud services based on project needs'],tools:['GitHub','Existing stack','Deployment platform if appropriate'],portfolio:'Provide setup steps, tests, screenshots, and limitations.',interview:'Walk through architecture, debugging, and trade-offs.',checklist:['Resume links to a working, documented project','Can explain UI, API, database, and security choices','Can demonstrate testing and debugging'],readiness:'Can run the project from documented instructions and discuss it clearly.'},
];

const DATA_ANALYST_GUIDE = [
  {essential:['Python basics','Spreadsheets','Data types and tidy tables'],optional:['Command-line tools'],tools:['Python','Jupyter','Spreadsheet software'],portfolio:'Write a short data dictionary and clean a small public dataset.',interview:'Explain missing values, duplicates, and data quality checks.',readiness:'Can describe where a dataset came from and its limitations.'},
  {essential:['SQL SELECT, JOIN, GROUP BY, filters'],optional:['Window functions after core SQL'],tools:['MySQL or PostgreSQL'],portfolio:'Answer a set of business questions with reproducible SQL.',interview:'Practice joins, aggregation, NULL behavior, and query reasoning.',readiness:'Can derive a result and sanity-check its row counts.'},
  {essential:['Descriptive statistics','Probability basics','Sampling and bias'],optional:['Inference and regression as role requires'],tools:['Python Pandas','NumPy'],portfolio:'Produce an analysis notebook that separates facts from assumptions.',interview:'Explain mean versus median, correlation, and selection bias.',readiness:'Can state what an analysis does and does not support.'},
  {essential:['Clear charts','Audience-aware explanation','Metric definitions'],optional:['Interactive dashboards'],tools:['Matplotlib or Seaborn','A dashboard tool if relevant'],portfolio:'Create a concise report with labeled charts and recommendations.',interview:'Practice explaining an insight to a nontechnical audience.',readiness:'Can tie each chart to a question and avoid misleading scales.'},
  {essential:['Case study practice','Portfolio review','Communication'],optional:['Introductory machine learning for data-science roles'],tools:['GitHub','Notebook environment'],portfolio:'Publish two polished analyses with sources, methods, and limitations.',interview:'Practice SQL, statistics, product sense, and behavioral examples.',checklist:['Resume and project links are current','Can discuss SQL, metrics, and data quality','Portfolio states sources, methods, and limitations'],readiness:'Resume, project links, and role-specific skills are easy to verify.'},
];

const PREREQUISITES = {
  'Full-Stack Web Developer':'Prerequisites: basic computer use and curiosity about how websites work. No prior framework experience is required.',
  'Data Analyst / Data Scientist':'Prerequisites: school-level algebra and willingness to learn Python. Statistics and machine learning are introduced step by step.',
  'Cybersecurity Analyst':'Prerequisites: basic computer use and interest in systems. Practice only in owned or explicitly authorized labs.',
};

async function main() {
  let questionCount = 0;
  for (const [category, title, difficulty, content, tags] of QUESTIONS) {
    const [existing] = await pool.execute('SELECT id FROM interview_topics WHERE title=? LIMIT 1', [title]);
    if (!existing.length) {
      await pool.execute('INSERT INTO interview_topics (category,title,difficulty,content,tags) VALUES (?,?,?,?,?)', [category,title,difficulty,content,tags]);
      questionCount++;
    }
  }

  // Give the existing data path a student-facing title without changing its ID or progress rows.
  await pool.execute("UPDATE roadmaps SET title='Data Analyst / Data Scientist' WHERE title='Data Science & ML'");
  const existingTitles = new Set();
  const [rows] = await pool.execute('SELECT id,title,stages_json FROM roadmaps');
  for (const row of rows) existingTitles.add(row.title);
  let roadmapCount = 0;
  for (const path of CAREER_PATHS) {
    if (existingTitles.has(path.title)) continue;
    await pool.execute('INSERT INTO roadmaps (title,category,icon,overview,stages_json) VALUES (?,?,?,?,?)', [path.title,path.category,path.icon,path.overview,JSON.stringify(path.stages)]);
    roadmapCount++;
  }

  // Enrich only the known starter paths, retaining their current stage titles,
  // topics, projects and resources. Custom or already-enriched paths are kept.
  const enrichment = {
    'Full-Stack Web Developer': FULL_STACK_GUIDE,
    'Data Analyst / Data Scientist': DATA_ANALYST_GUIDE,
    'Cybersecurity Analyst': [
      {essential:['TCP/IP, DNS, HTTP and network segmentation','Linux and command-line fundamentals'],optional:['Python scripting'],tools:['Linux VM','Wireshark in a lab'],portfolio:'Network diagram and a short, safe lab report.',interview:'Review networking and operating-system basics.',readiness:'Can explain a packet flow and basic Linux permissions.'},
      {essential:['Linux users, permissions and logs','Python or shell scripting'],optional:['Windows administration'],tools:['Linux','Git'],portfolio:'Publish a small log-analysis script with sample data.',interview:'Practice command-line troubleshooting.',readiness:'Can investigate a simple system issue methodically.'},
      {essential:['Threat modeling','Vulnerability concepts','Responsible disclosure'],optional:['CTF platforms in authorized labs only'],tools:['OWASP Juice Shop or another intentionally vulnerable local lab'],portfolio:'Write a remediation-focused report for a lab finding.',interview:'Explain risk, impact, and mitigation without testing real systems.',readiness:'Uses only authorized environments and documents scope.'},
      {essential:['OWASP Top 10 concepts','Secure coding','Authentication and access control'],optional:['Burp Suite Community in a local lab'],tools:['Local test app','Git'],portfolio:'Fix a vulnerability in your own demo app and explain the change.',interview:'Practice explaining common web risks and defenses.',readiness:'Can describe safe testing boundaries and remediation.'},
      {essential:['Triage and incident notes','Basic SIEM concepts','Communication'],optional:['Role-relevant certification after reviewing job requirements'],tools:['Public sample logs','Open-source SIEM lab'],portfolio:'Create a sanitized incident timeline from sample logs.',interview:'Practice incident prioritization and behavioral examples.',checklist:['Resume lists only skills you can demonstrate','Portfolio uses authorized, sanitized lab data','Can explain evidence, uncertainty, and next steps'],readiness:'Can explain evidence, uncertainty, and next steps.'},
    ],
  };
  for (const row of rows) {
    const guide = enrichment[row.title];
    if (!guide) continue;
    const stages = typeof row.stages_json === 'string' ? JSON.parse(row.stages_json) : row.stages_json;
    let changed = false;
    const enriched = stages.map((stage, index) => {
      const merged = { ...stage };
      for (const [field, value] of Object.entries(guide[index] || {})) {
        if (merged[field] == null) { merged[field] = value; changed = true; }
      }
      return merged;
    });
    const overview = PREREQUISITES[row.title]
      ? `${PREREQUISITES[row.title]} ${row.overview || ''}`.trim()
      : row.overview;
    if (overview !== row.overview) changed = true;
    if (changed) await pool.execute('UPDATE roadmaps SET stages_json=?, overview=? WHERE id=?', [JSON.stringify(enriched), overview, row.id]);
  }
  console.log(`Added ${questionCount} practice questions and ${roadmapCount} new roadmap paths; preserved existing progress and user records.`);
}

main().catch(error => { console.error('Learning content seed failed:', error.message); process.exitCode = 1; }).finally(() => pool.end());
