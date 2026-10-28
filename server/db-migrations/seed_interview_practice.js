const pool = require('../config/db');

const questions = [
  {
    category: 'aptitude', difficulty: 'beginner', title: 'Practice MCQ: Percentage change',
    tags: 'subject:aptitude,format:mcq,track:general,track:company-practice,role:sde,role:data,role:ml',
    content: { format: 'mcq', prompt: 'A value increases from 80 to 100. What is the percentage increase?', options: ['20%', '25%', 'There is no increase', '125%'], answerIndex: 1, explanation: 'The increase is 20. Divide 20 by the original value 80, then multiply by 100: 25%.' },
  },
  {
    category: 'programming', difficulty: 'beginner', title: 'Practice MCQ: JavaScript value semantics',
    tags: 'subject:programming,format:mcq,track:general,track:company-practice,role:sde',
    content: { format: 'mcq', prompt: 'What does `typeof null` evaluate to in JavaScript?', options: ['"null"', '"object"', '"undefined"', 'It throws an error'], answerIndex: 1, explanation: 'This is a long-standing JavaScript language quirk: typeof null returns "object".' },
  },
  {
    category: 'technical', difficulty: 'intermediate', title: 'Practice MCQ: SQL grouping',
    tags: 'subject:dbms,format:mcq,track:general,track:company-practice,role:sde,role:data',
    content: { format: 'mcq', prompt: 'Which clause filters grouped rows after aggregate functions have been computed?', options: ['WHERE', 'ORDER BY', 'HAVING', 'DISTINCT'], answerIndex: 2, explanation: 'WHERE filters source rows before grouping; HAVING filters the resulting groups.' },
  },
  {
    category: 'technical', difficulty: 'beginner', title: 'Practice MCQ: Operating-system scheduling',
    tags: 'subject:operating-systems,format:mcq,track:general,track:company-practice,role:sde',
    content: { format: 'mcq', prompt: 'Which scheduling approach gives each ready process a fixed time slice in turn?', options: ['Round robin', 'Shortest job first', 'First come, first served only', 'Priority inheritance'], answerIndex: 0, explanation: 'Round-robin scheduling rotates through ready processes using a time quantum.' },
  },
  {
    category: 'technical', difficulty: 'beginner', title: 'Practice MCQ: TCP connection setup',
    tags: 'subject:networks,format:mcq,track:general,track:company-practice,role:sde',
    content: { format: 'mcq', prompt: 'What is the usual order of the TCP three-way handshake?', options: ['SYN, SYN-ACK, ACK', 'ACK, SYN, FIN', 'SYN, ACK, FIN', 'FIN, FIN-ACK, ACK'], answerIndex: 0, explanation: 'The client sends SYN, the server responds with SYN-ACK, and the client completes setup with ACK.' },
  },
  {
    category: 'programming', difficulty: 'beginner', title: 'Practice MCQ: OOP substitution',
    tags: 'subject:oop,format:mcq,track:general,track:company-practice,role:sde',
    content: { format: 'mcq', prompt: 'Which principle says a subtype should be usable wherever its base type is expected without breaking correctness?', options: ['Encapsulation', 'Liskov substitution', 'Singleton', 'Memoization'], answerIndex: 1, explanation: 'The Liskov substitution principle requires subtypes to honor the behavioral contract expected of their base type.' },
  },
  {
    category: 'technical', difficulty: 'intermediate', title: 'Practice MCQ: Classification metrics',
    tags: 'subject:ai-ml,format:mcq,track:general,track:company-practice,role:data,role:ml',
    content: { format: 'mcq', prompt: 'When false negatives are especially costly, which metric should a team watch closely?', options: ['Recall', 'Specificity only', 'Training accuracy only', 'Mean absolute error'], answerIndex: 0, explanation: 'Recall measures the share of actual positive cases that the model identifies.' },
  },
  {
    category: 'technical', difficulty: 'intermediate', title: 'Practice MCQ: Data leakage',
    tags: 'subject:ai-ml,format:mcq,track:general,track:company-practice,role:data,role:ml',
    content: { format: 'mcq', prompt: 'A preprocessing step learns statistics from the full dataset before train/test splitting. What is the main risk?', options: ['Data leakage into evaluation', 'The model becomes deterministic', 'The test set becomes larger', 'The labels are automatically balanced'], answerIndex: 0, explanation: 'Information from the future test set can influence training transformations and make evaluation optimistic.' },
  },
  {
    category: 'dsa', difficulty: 'beginner', title: 'Coding practice: Pair sum in a sorted array',
    tags: 'format:coding,track:general,track:company-practice,role:sde',
    content: { format: 'coding', prompt: 'Given a sorted integer array and a target, return the indices of two distinct values whose sum equals the target, or an empty array if no pair exists.', examples: [{ input: 'values=[2, 7, 11, 15], target=9', output: '[0, 1]' }], constraints: 'Use zero-based indices. The array is sorted in nondecreasing order. Aim for O(n) time and O(1) extra space.', solution: 'Use two pointers at the ends. If the sum is too small, move the left pointer right; if too large, move the right pointer left. Return when the sum matches.', explanation: 'The sorted order means each pointer movement safely eliminates values that cannot form the target.' },
  },
  {
    category: 'dsa', difficulty: 'intermediate', title: 'Coding practice: First non-repeating character',
    tags: 'format:coding,track:general,track:company-practice,role:sde',
    content: { format: 'coding', prompt: 'Return the index of the first character that appears exactly once in a string, or -1 if every character repeats.', examples: [{ input: '"swiss"', output: '0' }], constraints: 'Target O(n) time. State whether character matching is case-sensitive and handle an empty string.', solution: 'Count each character in one pass, then scan the string from left to right and return the first index whose count is one.', explanation: 'The first pass records frequencies; the second preserves the original order.' },
  },
  {
    category: 'dsa', difficulty: 'intermediate', title: 'Coding practice: Longest substring without repeats',
    tags: 'format:coding,track:general,track:company-practice,role:sde',
    content: { format: 'coding', prompt: 'Given a string, return the length of its longest substring that contains no repeated characters.', examples: [{ input: '"abcabcbb"', output: '3 ("abc")' }, { input: '"bbbbb"', output: '1' }], constraints: 'Substrings must be contiguous. Target O(n) time and explain how the left boundary moves.', solution: 'Use a sliding window and map each character to its most recent index. When a repeated character is inside the current window, move the left boundary just past its previous index; update the maximum window length.', explanation: 'Each character is processed a constant number of times, so the scan remains linear.' },
  },
  {
    category: 'dsa', difficulty: 'beginner', title: 'Coding practice: Balanced brackets',
    tags: 'format:coding,track:general,track:company-practice,role:sde',
    content: { format: 'coding', prompt: 'Return whether a string containing only (), {}, and [] has correctly nested and matched brackets.', examples: [{ input: '"{[()]}"', output: 'true' }, { input: '"([)]"', output: 'false' }], constraints: 'An empty string is valid. Target O(n) time and O(n) auxiliary space.', solution: 'Push opening brackets onto a stack. For each closing bracket, require the stack top to be its matching opener and pop it. Return true only if no mismatch occurred and the stack is empty at the end.', explanation: 'A stack enforces last-opened, first-closed nesting.' },
  },
  {
    category: 'dsa', difficulty: 'intermediate', title: 'Coding practice: Merge overlapping intervals',
    tags: 'format:coding,track:general,track:company-practice,role:sde',
    content: { format: 'coding', prompt: 'Given intervals represented by start and end values, merge every overlapping pair and return the merged intervals sorted by start.', examples: [{ input: '[[1,3],[2,6],[8,10],[15,18]]', output: '[[1,6],[8,10],[15,18]]' }], constraints: 'Assume start is less than or equal to end. Target O(n log n) time due to sorting.', solution: 'Sort by start. Add the first interval to the result; for each next interval, extend the last result interval when they overlap, otherwise append a new interval.', explanation: 'Sorting puts possible overlaps next to each other, allowing one linear merge pass.' },
  },
  {
    category: 'hr', difficulty: 'beginner', title: 'Practice HR: Explain a learning challenge',
    tags: 'format:short-answer,track:general,track:company-practice,role:all',
    content: { format: 'short-answer', prompt: 'Describe a skill you had to learn for a project. What steps did you take, and how did you check your result?', solution: 'Use a specific example: context, actions, evidence of the outcome, and what you would improve. Avoid claiming work you did not do.', explanation: 'A clear example shows how you learn, communicate, and validate your work.' },
  },
  {
    category: 'hr', difficulty: 'intermediate', title: 'Practice HR: Discuss a team disagreement',
    tags: 'format:short-answer,track:general,track:company-practice,role:all',
    content: { format: 'short-answer', prompt: 'Tell me about a disagreement on a team and how you handled it.', solution: 'Explain the shared goal, how you listened, what evidence or compromise helped, and the outcome. Keep other people’s private details out of the story.', explanation: 'Strong answers show respectful collaboration and learning, not blame.' },
  },
];

async function main() {
  let inserted = 0;
  for (const item of questions) {
    const [result] = await pool.execute(
      `INSERT INTO interview_topics (category,title,difficulty,content,tags)
       SELECT ?,?,?,?,? FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM interview_topics WHERE title=? LIMIT 1)`,
      [item.category, item.title, item.difficulty, JSON.stringify(item.content), item.tags, item.title]
    );
    inserted += result.affectedRows;
  }
  console.log(`Added ${inserted} original practice questions (existing titles preserved).`);
}

main().catch(error => { console.error('Practice seed failed:', error.message); process.exitCode = 1; }).finally(() => pool.end());
