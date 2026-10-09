import User from '../models/User';
import {
  AssessmentAttempt,
  AssessmentGrowth,
  AssessmentPaper,
  CatalogMaterial,
  type WorkQuestion,
} from '../models/assessmentWork';

const TUTOR_EMAIL = 'tharushi.perera@unimentor.test';
const ADMIN_EMAIL = 'lic.admin@unimentor.test';

async function ensureTutor() {
  const existing = await User.findOne({ email: TUTOR_EMAIL });
  if (existing) return existing;
  return User.create({
    name: 'Tharushi Perera',
    email: TUTOR_EMAIL,
    password: 'Password123',
    role: 'mentor',
    subjects: ['Data Structures', 'Algorithms', 'Software Architecture'],
    bio: 'Senior student tutor for algorithms and discrete math.',
    rating: 4.9,
    reviewCount: 28,
  });
}

async function ensureAdmin() {
  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (existing) return existing;
  return User.create({
    name: 'Faculty LIC',
    email: ADMIN_EMAIL,
    password: 'Password123',
    role: 'lic',
    bio: 'Campus admin and lecturer-in-charge reviewer.',
  });
}

function papersFor(tutorId: unknown, tutorName: string) {
  const mcq: WorkQuestion = {
    id: 'bfs',
    kind: 'mcq',
    prompt: 'Which of the following data structures is typically used to implement Breadth-First Search (BFS) in an unweighted graph?',
    marks: 2,
    topic: 'Graph Traversal',
    hint: 'Auto-saving response to session cache. You can review and modify your selection at any time before final submission.',
    choices: [
      { id: 'a', label: 'Stack (LIFO)', detail: 'Last-in, first-out linear container' },
      { id: 'b', label: 'Queue (FIFO)', detail: 'First-in, first-out level order exploration' },
      { id: 'c', label: 'Priority Queue (Min-Heap)', detail: 'Weighted greedy ordering mechanism' },
      { id: 'd', label: 'Hash Map', detail: 'Associative direct lookup table' },
    ],
    codeSnippet: {
      filename: 'bfs_graph_algo.py',
      lines: [
        'def traverse(graph, start):',
        '    visited = set([start])',
        '    frontier = ???()  # select correct ADT',
        '    frontier.append(start)',
      ],
    },
    key: { choiceIds: ['b'] },
  };

  const poisson: WorkQuestion = {
    id: 'poisson',
    kind: 'short_answer',
    prompt: 'Calculate the expected value E[X] for a discrete random variable X having Poisson distribution with parameter λ = 4.5.',
    marks: 3,
    topic: 'Discrete Distributions',
    hint: 'State your final answer rounded to 1 decimal place.',
    formula: 'P(X = k) = (λ^k · e^(-λ)) / k!',
    remember: 'For a Poisson process X ~ Poisson(λ), the mean E[X] = λ and Var(X) = λ.',
    key: { text: '4.5', tolerance: 0.05 },
  };

  const tf: WorkQuestion = {
    id: 'avl',
    kind: 'true_false',
    prompt: 'Statement to evaluate',
    marks: 1.5,
    topic: 'Binary Search Trees',
    statement: 'In an AVL Tree, the balance factor of any node must strictly be between -1, 0, or +1. If it deviates after an insertion, a tree rotation is mandatory.',
    definition: 'AVL Balance Factor Definition: Height(Left) - Height(Right)',
    trueDetail: 'The balance factor constraint preserves O(log n) height invariant across operations.',
    falseDetail: 'Nodes may exceed balance factor ±1 temporarily in standard AVL specifications.',
    hint: 'Selection auto-saved locally. You can modify this answer before final submission.',
    key: { boolean: true },
  };

  const fill: WorkQuestion = {
    id: 'dijkstra',
    kind: 'fill_blank',
    prompt: "Complete the statement regarding Dijkstra's Shortest Path Algorithm:",
    marks: 2.5,
    topic: 'Single Source Shortest Path',
    segments: [
      { text: "Dijkstra's algorithm finds the shortest path from a single source node in a graph with " },
      { blankId: 'b1' },
      { text: ' edge weights. When implemented using a ' },
      { blankId: 'b2' },
      { text: ', its total time complexity evaluates to O((V + E) log V).' },
    ],
    bank: ['non-negative', 'priority queue (Min-Heap)', 'negative cycle', 'adjacency matrix', 'Bellman-Ford', 'FIFO queue'],
    hint: 'Review Module 4: Graph Traversals & Shortest Paths',
    key: {
      blanks: {
        b1: ['non-negative', 'nonnegative'],
        b2: ['priority queue (min-heap)', 'priority queue', 'min-heap'],
      },
    },
  };

  const matching: WorkQuestion = {
    id: 'acid',
    kind: 'matching',
    prompt: 'Match each database anomaly on the left with its formal ACID definition or mitigation mechanism on the right.',
    marks: 3,
    topic: 'Concurrency',
    hint: 'Tap an item in Column A, then tap its partner in Column B to link.',
    left: [
      { id: 'l1', title: 'Dirty Read', meta: 'Concurrency Issue' },
      { id: 'l2', title: 'Phantom Read', meta: 'Range Predicate' },
      { id: 'l3', title: 'Non-Repeatable Read', meta: 'Fuzzy Read Anomaly' },
      { id: 'l4', title: 'Write Skew', meta: 'Snapshot Isolation' },
    ],
    right: [
      { id: 'r1', title: 'Read Uncommitted', meta: 'Transactions read uncommitted modifications from concurrent transactions.' },
      { id: 'r2', title: 'Requires Serializable', meta: 'Re-executing a query returns new rows meeting the WHERE filter added by another transaction.' },
      { id: 'r3', title: 'Row value changed', meta: 'Re-reading the same row yields modified data values committed by another transaction.' },
      { id: 'r4', title: 'Disjoint writes', meta: 'Concurrent transactions read intersecting data but write disjoint data, violating an invariant.' },
    ],
    key: { matches: { l1: 'r1', l2: 'r2', l3: 'r3', l4: 'r4' } },
  };

  const ordering: WorkQuestion = {
    id: 'oauth',
    kind: 'ordering',
    prompt: 'Order the steps of the OAuth 2.0 Authorization Code Grant Flow from initiation to protected resource access.',
    marks: 2.5,
    topic: 'Sequential Process Execution',
    hint: 'Use the arrows to shift steps up or down.',
    steps: [
      { id: 's3', title: 'Stage 3 · Crucial Pivot', body: 'Authorization Server redirects back to the client callback URI containing a temporary authorization code.' },
      { id: 's1', title: 'Stage 1', body: 'Client redirects the User Agent to the Authorization Server login prompt with client_id and redirect_uri.' },
      { id: 's5', title: 'Stage 5', body: 'Authorization Server validates credentials and returns an Access Token and Refresh Token payload in JSON.' },
      { id: 's2', title: 'Stage 2', body: 'User authenticates and grants explicit scope consent to the requested client application.' },
      { id: 's4', title: 'Stage 4', body: 'Client sends a backend POST with the authorization code and client_secret to the Token Endpoint.' },
    ],
    key: { order: ['s1', 's2', 's3', 's4', 's5'] },
  };

  const drag: WorkQuestion = {
    id: 'osi',
    kind: 'drag_drop',
    prompt: 'Sort each network protocol token into its OSI / TCP-IP layer container.',
    marks: 3.5,
    topic: 'Protocol Categorization by OSI Layer',
    hint: 'Tap a token, then tap the layer it belongs to.',
    buckets: [
      { id: 'l4', title: 'Layer 4 · Transport', subtitle: 'Host-to-Host' },
      { id: 'l7', title: 'Layer 7 · Application', subtitle: 'Process-to-Process' },
    ],
    tokens: [
      { id: 'tcp', label: 'TCP (Transmission Control Protocol)' },
      { id: 'udp', label: 'UDP (User Datagram Protocol)' },
      { id: 'https', label: 'HTTPS / TLS' },
      { id: 'dns', label: 'DNS (Domain Name System)' },
      { id: 'sctp', label: 'SCTP (Stream Control)' },
      { id: 'ws', label: 'WebSocket' },
    ],
    key: { placements: { tcp: 'l4', udp: 'l4', sctp: 'l4', https: 'l7', dns: 'l7', ws: 'l7' } },
  };

  const essay: WorkQuestion = {
    id: 'ethics',
    kind: 'essay',
    prompt: 'Audit demographic bias in a high-risk hiring model and align your argument with the EU AI Act.',
    marks: 6,
    topic: 'AI Ethics & Governance',
    tags: ['#DataSovereignty', '#DemographicBias', '#EU-AI-Act'],
    minWords: 120,
    maxWords: 750,
    starter: 'A hiring classifier that treats false-positive rate gaps as acceptable collateral will encode demographic bias into every shortlist. Buolamwini and Gebru showed that commercial vision systems already fail unevenly across skin tone and gender. The same measurement duty applies here: report subgroup error, not a single accuracy number. Under the EU AI Act, employment screening sits in the high-risk Annex III list, so Article 9 risk management and GDPR accountability both apply. I will ground the claim in a recorded audit, then show how a human appeal path and a documented threshold change reduce harm without pretending the model is neutral.',
    rubric: [
      { title: '1. Conceptual Rigor & Bias', detail: 'Deep audit of false-positive rate variances across demographic subgroups.', points: '2.0 pts' },
      { title: '2. Regulatory Alignment', detail: 'Classification under EU AI Act High-Risk Annex III and GDPR accountability.', points: '1.5 pts' },
      { title: '3. Empirical Case Evidence', detail: 'Ground the argument in recorded incidents and verified audit studies.', points: '1.5 pts' },
      { title: '4. Structural Clarity & Citation', detail: 'Cohesive thesis, academic citations, and logical transitions.', points: '1.0 pts' },
    ],
    manual: true,
  };

  const coding: WorkQuestion = {
    id: 'lru',
    kind: 'coding',
    prompt: 'Implement an LRU Cache with O(1) Get and Put',
    marks: 5,
    topic: 'Programming',
    hint: 'Design a data structure that follows Least Recently Used cache constraints. Couple a doubly linked list with a hash map so get and put stay amortized O(1).',
    languages: ['Python 3.11', 'Java 17', 'C++ 20', 'TypeScript 5.2'],
    filename: 'Solution.py',
    constraints: ['Time: O(1)', 'Space: O(capacity)', '1 ≤ cap ≤ 3000'],
    starterCode: [
      'class Node:',
      '    def __init__(self, key: int, val: int):',
      '        self.key, self.val = key, val',
      '        self.prev = self.next = None',
      '',
      'class LRUCache:',
      '    def __init__(self, capacity: int):',
      '        self.cap = capacity',
      '        self.cache = {}  # key to Node',
      '',
      '    def get(self, key: int) -> int:',
      '        if key in self.cache:',
      '            self._remove(self.cache[key])',
      '            self._insert(self.cache[key])',
      '            return self.cache[key].val',
      '        return -1',
      '',
      '    def put(self, key: int, value: int) -> None:',
      '        # move or insert, then evict the least recently used node',
      '        pass',
    ].join('\n'),
    tests: [
      { name: 'Basic Eviction on Max Capacity', detail: 'put beyond capacity drops the oldest key' },
      { name: 'Update Existing Key Value', detail: 'put on an existing key refreshes recency' },
      { name: 'High Volume Stress Capacity (N=3000)', detail: 'operations stay within the cap bound' },
    ],
    key: { includes: ['def get', 'def put', 'capacity', 'cache'] },
  };

  const fileQ: WorkQuestion = {
    id: 'capstone',
    kind: 'file_project',
    prompt: 'Milestone 2 Deliverable: Resilient Event-Driven Order Processing System',
    marks: 10,
    topic: 'Capstone Artifact Submission',
    hint: 'Weight: 25% Final Exam',
    checklist: [
      { label: 'Dockerfile & docker-compose.yml', done: true },
      { label: 'Kafka/RabbitMQ Event Schema', done: true },
      { label: 'Unit & Integration Tests (>80% cov)', done: true },
      { label: 'Architectural RFC PDF', done: false },
    ],
    accept: '.zip or .tar.gz archives · Max 50 MB',
    maxMb: 50,
    manual: true,
  };

  const scenario: WorkQuestion = {
    id: 'flash',
    kind: 'scenario',
    prompt: 'Identify the root cause and select the mitigation that keeps strict ACID inventory allocation at 25,000 req/sec.',
    marks: 4.5,
    topic: 'Distributed Systems',
    scenarioTitle: 'High-Concurrency Flash Sale Architecture Bottleneck',
    scenarioBody: 'Kuppiya SuperMart cloud-hosted backend is hitting database deadlocks and lock-wait timeouts during the midnight flash campaign.',
    incident: 'Incident Sev-1: 99.4% write contention spike',
    pipeline: [
      { label: 'Clients', value: '25k req/s' },
      { label: 'Cloudflare', value: 'Edge CDN' },
      { label: 'Order service', value: '3 replicas' },
      { label: 'RDS PG', value: 'CPU 99%' },
    ],
    metrics: [
      { label: 'Lock Timeout', value: '504s', note: 'Row lock on inventory_sku' },
      { label: 'Throughput Drop', value: '88.6%', note: 'Failed transactions' },
      { label: 'Avg DB Latency', value: '4,280ms', note: 'Baseline under 45ms' },
    ],
    trace: [
      '00:00.012 [INFO] POST /api/v1/orders HTTP/2',
      '00:00.045 [SVC] reserveStockSku(item_id=9802)',
      '00:04.912 [FATAL] deadlock detected on relation "inventory"',
      'Detail: Process 4192 waits for ShareLock on transaction 881023; blocked by process 4210.',
    ],
    objective: 'Guarantee strict ACID consistency for flash-sale inventory while sustaining 25,000 req/sec.',
    choices: [
      { id: 'a', label: 'Proposal A · Redis OCC + queue', detail: 'Distributed Redis with optimistic concurrency (Lua) and an async checkout queue. Sub-5ms latency, absorbs the burst, keeps ACID via the script.' },
      { id: 'b', label: 'Proposal B · Vertical scale', detail: 'Scale the primary RDS instance and raise max_connections to 5,000. Lock-manager contention remains.' },
      { id: 'c', label: 'Proposal C · NoSQL pivot', detail: 'Move inventory to unpartitioned DynamoDB with eventual consistency. Breaks isolation and can oversell.' },
      { id: 'd', label: 'Proposal D · Client backoff', detail: 'Client-side exponential backoff only. Amplifies retry storms and tail latency.' },
    ],
    key: { choiceIds: ['a'] },
  };

  const norm: WorkQuestion = {
    id: 'norm',
    kind: 'mcq',
    prompt: 'Which normal form removes transitive dependencies between non-key attributes?',
    marks: 100,
    topic: 'Relational Design',
    choices: [
      { id: 'a', label: '1NF', detail: 'Atomic values only' },
      { id: 'b', label: '2NF', detail: 'No partial key dependency' },
      { id: 'c', label: '3NF', detail: 'No transitive dependency' },
      { id: 'd', label: 'BCNF', detail: 'Every determinant is a candidate key' },
    ],
    key: { choiceIds: ['c'] },
  };

  const oop: WorkQuestion = {
    id: 'oop',
    kind: 'matching',
    prompt: 'Match each OOP idea with the distinction Tharushi asked you to defend.',
    marks: 100,
    topic: 'Software Paradigms',
    left: [
      { id: 'p1', title: 'Abstract class', meta: 'Can hold state' },
      { id: 'p2', title: 'Interface', meta: 'Contract only' },
      { id: 'p3', title: 'Polymorphism', meta: 'One call, many forms' },
    ],
    right: [
      { id: 'a1', title: 'Shared fields and a partial implementation', meta: 'Constructors and protected state are allowed.' },
      { id: 'a2', title: 'A pure contract with no instance fields', meta: 'Implementations live entirely in the concrete type.' },
      { id: 'a3', title: 'Runtime method dispatch', meta: 'The caller does not need the concrete class.' },
    ],
    key: { matches: { p1: 'a1', p2: 'a2', p3: 'a3' } },
  };

  const rows = [
    {
      seedKey: 'paper-prob-mock',
      title: 'Probability & Statistics: Mid-Term Mock',
      moduleCode: 'MA2010',
      moduleName: 'Probability & Statistics',
      kind: 'short_answer' as const,
      kindLabel: 'Mock Exam',
      marks: 100,
      durationMin: 90,
      chips: ['Mock Exam', '90 Mins', 'Weight: 20%'],
      dueLabel: 'Due Tomorrow, 11:59 PM',
      detail: 'MCQ + Short Answer',
      status: 'published' as const,
      urgent: true,
      gradesReleased: true,
      questions: [poisson, { ...mcq, id: 'prob-mcq', prompt: 'For X ~ Poisson(λ), which identity is always true?', topic: 'Probability', marks: 2, choices: [
        { id: 'a', label: 'E[X] = λ', detail: 'Mean equals the rate parameter' },
        { id: 'b', label: 'Var(X) = λ²', detail: 'Variance would grow with the square of the rate' },
        { id: 'c', label: 'E[X] = 1/λ', detail: 'That is the exponential-distribution mean' },
        { id: 'd', label: 'E[X] = 0', detail: 'Only if the rate is zero' },
      ], codeSnippet: undefined, key: { choiceIds: ['a'] } }],
    },
    {
      seedKey: 'paper-coding-lru',
      title: 'Data Structures: Tree Traversals Challenge',
      moduleCode: 'CS2040',
      moduleName: 'Data Structures',
      kind: 'coding' as const,
      kindLabel: 'Coding / Practical',
      marks: 20,
      durationMin: 60,
      chips: ['Coding / Practical', 'Python / Java', 'Auto-Graded'],
      dueLabel: 'In progress',
      detail: '2 / 4 test cases passed',
      status: 'published' as const,
      urgent: false,
      gradesReleased: true,
      questions: [coding],
    },
    {
      seedKey: 'paper-scenario',
      title: 'Software Architecture: Microservices Study',
      moduleCode: 'SE3020',
      moduleName: 'Distributed Systems',
      kind: 'scenario' as const,
      kindLabel: 'Scenario / Case Study',
      marks: 25,
      durationMin: 40,
      chips: ['Scenario / Case Study', 'Peer Reviewed'],
      dueLabel: 'Due in 4 days',
      detail: 'Group Evaluation: Team Sigma',
      status: 'published' as const,
      urgent: false,
      gradesReleased: true,
      questions: [scenario],
    },
    {
      seedKey: 'paper-tf',
      title: 'IT2040: AVL Tree True / False',
      moduleCode: 'IT2040',
      moduleName: 'Data Structures',
      kind: 'true_false' as const,
      kindLabel: 'True / False',
      marks: 15,
      durationMin: 20,
      chips: ['True / False', '20 Mins'],
      dueLabel: 'Due Friday, 6:00 PM',
      detail: 'Balance-factor statements',
      status: 'published' as const,
      urgent: true,
      gradesReleased: true,
      questions: [tf],
    },
    {
      seedKey: 'paper-fill',
      title: "Dijkstra Fill-in-the-Blanks",
      moduleCode: 'CS2020',
      moduleName: 'Computer Networks & Graphs',
      kind: 'fill_blank' as const,
      kindLabel: 'Fill in the Blanks',
      marks: 10,
      durationMin: 15,
      chips: ['Word Bank', 'Auto-Graded'],
      dueLabel: 'Due in 2 days',
      detail: '2 blanks · shortest paths',
      status: 'published' as const,
      urgent: true,
      gradesReleased: true,
      questions: [fill],
    },
    {
      seedKey: 'paper-drag',
      title: 'OSI Protocol Drag & Drop',
      moduleCode: 'CS2040',
      moduleName: 'Computer Networks',
      kind: 'drag_drop' as const,
      kindLabel: 'Drag & Drop',
      marks: 10,
      durationMin: 20,
      chips: ['Interactive', 'Multi-bucket'],
      dueLabel: 'Open this week',
      detail: 'Sort protocols by layer',
      status: 'published' as const,
      urgent: false,
      gradesReleased: true,
      questions: [drag],
    },
    {
      seedKey: 'paper-order',
      title: 'OAuth 2.0 Ordering Challenge',
      moduleCode: 'SE2010',
      moduleName: 'Software Engineering Architecture',
      kind: 'ordering' as const,
      kindLabel: 'Ordering',
      marks: 10,
      durationMin: 20,
      chips: ['Sequence', 'Intermediate'],
      dueLabel: 'Open this week',
      detail: 'Authorization Code Grant',
      status: 'published' as const,
      urgent: false,
      gradesReleased: true,
      questions: [ordering],
    },
    {
      seedKey: 'paper-match',
      title: 'ACID Anomaly Matching',
      moduleCode: 'CS3020',
      moduleName: 'Advanced Database Systems',
      kind: 'matching' as const,
      kindLabel: 'Matching Pairs',
      marks: 15,
      durationMin: 25,
      chips: ['4 Pairs', 'Interactive'],
      dueLabel: 'Open this week',
      detail: 'Link each anomaly to its definition',
      status: 'published' as const,
      urgent: false,
      gradesReleased: true,
      questions: [matching],
    },
    {
      seedKey: 'paper-mcq',
      title: 'Data Structures: Tree & Graph Quiz',
      moduleCode: 'IT2040',
      moduleName: 'Data Structures',
      kind: 'mcq' as const,
      kindLabel: 'Quiz (MCQ)',
      marks: 20,
      durationMin: 45,
      chips: ['MCQ', '45 Mins', 'Auto-Graded'],
      dueLabel: 'Closes Sunday',
      detail: 'Graph traversal and ADTs',
      status: 'published' as const,
      urgent: false,
      gradesReleased: true,
      questions: [mcq],
    },
    {
      seedKey: 'paper-essay',
      title: 'AI Ethics Long-Form Essay',
      moduleCode: 'CS4010',
      moduleName: 'AI Ethics & Governance',
      kind: 'essay' as const,
      kindLabel: 'Essay & Rubric',
      marks: 25,
      durationMin: 90,
      chips: ['Rubric', 'Turnitin'],
      dueLabel: 'Due in 6 days',
      detail: '500–750 words · 4 criteria',
      status: 'published' as const,
      urgent: false,
      gradesReleased: false,
      questions: [essay],
    },
    {
      seedKey: 'paper-file',
      title: 'Distributed Microservices Capstone',
      moduleCode: 'SE4050',
      moduleName: 'Distributed Microservices',
      kind: 'file_project' as const,
      kindLabel: 'File / Project',
      marks: 40,
      durationMin: 0,
      chips: ['Project Upload', 'GitHub'],
      dueLabel: 'Milestone 2 open',
      detail: 'Zip + RFC + repository',
      status: 'published' as const,
      urgent: false,
      gradesReleased: false,
      questions: [fileQ],
    },
    {
      seedKey: 'paper-norm',
      title: 'Database Systems: Normalization Quiz',
      moduleCode: 'IT2040',
      moduleName: 'Relational Design',
      kind: 'mcq' as const,
      kindLabel: 'Graded Quiz',
      marks: 100,
      durationMin: 30,
      chips: ['Completed'],
      dueLabel: 'Graded on Oct 24',
      detail: '3NF and BCNF',
      status: 'closed' as const,
      urgent: false,
      gradesReleased: true,
      questions: [norm],
    },
    {
      seedKey: 'paper-oop',
      title: 'OOP Principles: Matching & Concept Check',
      moduleCode: 'SE3010',
      moduleName: 'Software Paradigms',
      kind: 'matching' as const,
      kindLabel: 'Concept Check',
      marks: 100,
      durationMin: 20,
      chips: ['Completed'],
      dueLabel: 'Graded on Oct 19',
      detail: 'Polymorphism, abstract classes, interfaces',
      status: 'closed' as const,
      urgent: false,
      gradesReleased: true,
      questions: [oop],
    },
    {
      seedKey: 'paper-pending-essay',
      title: 'Microservices Trade-off Essay',
      moduleCode: 'SE1020',
      moduleName: 'OOP & Software Ethics',
      kind: 'essay' as const,
      kindLabel: 'Essay & Rubric',
      marks: 25,
      durationMin: 60,
      chips: ['Awaiting LIC'],
      dueLabel: 'Not scheduled',
      detail: 'Submitted by tutor for faculty review',
      status: 'pending_review' as const,
      urgent: false,
      gradesReleased: false,
      questions: [essay],
    },
    {
      seedKey: 'paper-pending-mcq',
      title: 'Year 2 Finals MCQ Pack',
      moduleCode: 'IT2040',
      moduleName: 'Data Structures',
      kind: 'mcq' as const,
      kindLabel: 'Quiz (MCQ)',
      marks: 20,
      durationMin: 45,
      chips: ['Awaiting LIC'],
      dueLabel: 'Not scheduled',
      detail: 'Needs an answer key check before publish',
      status: 'pending_review' as const,
      urgent: false,
      gradesReleased: false,
      questions: [mcq],
    },
  ];

  return rows.map((row) => ({ ...row, tutorId, tutorName }));
}

export async function ensureAssessmentCatalog(): Promise<void> {
  const tutor = await ensureTutor();
  await ensureAdmin();
  const ready = await AssessmentPaper.exists({ seedKey: 'paper-prob-mock' });
  if (!ready) {
    await AssessmentPaper.insertMany(papersFor(tutor._id, tutor.name));
  }
  const catalogReady = await CatalogMaterial.exists({ seedKey: 'pack-se3010' });
  if (catalogReady) return;
  await CatalogMaterial.insertMany([
    {
      seedKey: 'pack-se3010',
      moduleCode: 'SE3010',
      badge: 'Premium Pack',
      title: 'Full Stack Microservices Master Pack (Video + Code Repos)',
      author: 'By Tutor Kasun J. · Updated 2 days ago',
      priceLabel: 'LKR 1,800',
      meta: '142 Purchases',
      tier: 'premium',
      detail: 'Royalty split · Tutor 90% (LKR 1,620) · Pool 10% (LKR 180)',
    },
    {
      seedKey: 'pack-avl',
      moduleCode: 'IT2040',
      badge: 'Open Access Cheatsheet',
      title: 'AVL Tree Rotations & Balancing Step-by-Step Cheatsheet',
      author: 'Faculty LIC / Tutor Tharushi P.',
      priceLabel: 'FREE',
      meta: '2,450 Downloads',
      tier: 'free',
      detail: 'Access scope: all undergrads · v3.1 PDF · campus public',
    },
    {
      seedKey: 'pack-cram',
      moduleCode: 'IT2040',
      badge: '20% Midterm Deal',
      title: 'Algorithms Exam Cram Kit & 2025 Past Paper Solutions',
      author: 'Lead Peer Tutor Tharushi P.',
      priceLabel: 'LKR 950',
      strike: 'LKR 1,200',
      meta: '318 Sales',
      tier: 'deal',
      detail: 'Student Pass perk · included in Study Plus · active campaign',
    },
    {
      seedKey: 'pack-math',
      moduleCode: 'MA2010',
      badge: 'Community Upload',
      title: 'Discrete Mathematics Lecture Summaries & Formula Sheet',
      author: 'Uploaded by Peer Community Rep · 580 Downloads',
      priceLabel: 'Creative Commons',
      meta: 'LIC Vetted',
      tier: 'community',
      detail: 'Faculty approved · visibility campus-wide',
    },
  ]);
}

export async function ensureStudentAssessmentExtras(studentId: string): Promise<void> {
  await ensureAssessmentCatalog();
  const existingGrowth = await AssessmentGrowth.exists({ studentId });
  if (!existingGrowth) {
    await AssessmentGrowth.create({
      studentId,
      semester: 'Semester 2 · 2026',
      weekLabel: 'Week 12 of 14',
      growth: '+18.4%',
      growthDetail: 'Starting 68.0% (W1) → Currently 86.4% Mastery',
      cohortRank: 'Top 8% Cohort',
      stats: { assessments: 14, hours: '32 hrs', gpa: '3.78' },
      target: 90,
      modules: ['All Modules', 'IT2040 Data Structures', 'SE3010 Architecture', 'MA2010 Stats'],
      points: [
        { label: 'Jul (W1)', value: 68 },
        { label: 'Aug (W4)', value: 74 },
        { label: 'Sep (W8)', value: 80 },
        { label: 'Oct (W10)', value: 84 },
        { label: 'Now (W12)', value: 86 },
      ],
      competencies: [
        { title: 'Problem Solving & Logic', delta: '+14% MoM', score: 92, detail: 'Mastered · Tree traversals, recursion, graph logic' },
        { title: 'Code Quality & Optimization', delta: '+18% MoM', score: 86, detail: 'Advanced · Big-O space complexity and refactoring' },
        { title: 'Mathematical Proofs', delta: '+8% MoM', score: 84, detail: 'Solid · Induction, probability distributions' },
        { title: 'System Design & Architecture', delta: '+24% MoM', score: 79, detail: 'Growing · Microservices, REST contracts and caching' },
      ],
      timeline: [
        {
          id: 'tl-btree',
          moduleCode: 'IT2040',
          moduleName: 'Data Structures',
          title: 'Algorithms & B-Trees Practical',
          dateLabel: 'Completed on 14 August 2026',
          delta: '+16%',
          beforeLabel: 'Initial Mock',
          beforeScore: '78 / 100',
          midLabel: 'Kuppiya Sessions',
          midValue: '3 Sessions',
          afterLabel: 'Official Score',
          afterScore: '94 / 100',
          quote: 'Flawless mastery on tree rotations and balance factor calculations!',
          person: 'Tharushi Perera',
          role: 'Verified Tutor',
          paperSeed: 'paper-norm',
        },
        {
          id: 'tl-poisson',
          moduleCode: 'MA2010',
          moduleName: 'Discrete Math & Stats',
          title: 'Probability & Poisson Mock Exam',
          dateLabel: 'Completed on 02 August 2026',
          delta: '+22%',
          beforeLabel: 'Pre-Kuppiya Diagnostic',
          beforeScore: '66 / 100',
          midLabel: 'Tutor Hours',
          midValue: '4.5 hrs',
          afterLabel: 'Mock Score',
          afterScore: '88 / 100',
          quote: 'Huge turnaround in handling joint probability mass functions.',
          person: 'Kavindu Silva',
          role: 'Peer Senior',
        },
        {
          id: 'tl-oop',
          moduleCode: 'SE3010',
          moduleName: 'Software Architecture',
          title: 'OOP & Microservices Architecture',
          dateLabel: 'Completed on 18 July 2026',
          delta: '+10%',
          beforeLabel: 'Assignment 1',
          beforeScore: '75 / 100',
          midLabel: 'Sessions',
          midValue: '2 Group',
          afterLabel: 'Assignment 2',
          afterScore: '85 / 100',
          quote: 'Endorsed by Faculty Moderator',
          person: 'Faculty Moderator',
          role: 'LIC',
          paperSeed: 'paper-oop',
        },
      ],
      focus: {
        title: 'Graph Dynamic Programming',
        detail: 'Personalized recommendation for Finals',
        boost: '+6% GPA boost with 2 targeted tutor sessions',
      },
      momentum: {
        avgScore: 84,
        completed: 14,
        pending: 3,
        urgent: 1,
        percentile: 'Top 15% of peer learning cohort',
        spotlightTitle: 'Mid-Term Mock: Probability & Stats',
        spotlightDetail: 'Live exam opens in 18 hours',
      },
    });
  }

  const closed = await AssessmentPaper.find({ seedKey: { $in: ['paper-norm', 'paper-oop'] } });
  for (const paper of closed) {
    const attempt = await AssessmentAttempt.findOne({ paperId: paper._id, studentId });
    if (attempt) continue;
    const score = paper.seedKey === 'paper-norm' ? 92 : 88;
    const feedback = paper.seedKey === 'paper-norm'
      ? 'Flawless 3NF breakdown! Review your notes on BCNF edge cases before the finals.'
      : 'Solid grasp of polymorphism. Just clarify the difference between abstract classes and interfaces.';
    await AssessmentAttempt.create({
      paperId: paper._id,
      studentId,
      answers: {},
      flagged: [],
      questionIndex: 0,
      status: 'graded',
      score,
      maxScore: 100,
      feedback,
      gradeLabel: score >= 90 ? 'Grade A' : 'Grade B+',
      progress: 100,
      submittedAt: new Date('2026-10-24T09:00:00.000Z'),
      startedAt: new Date('2026-10-24T08:20:00.000Z'),
      breakdown: (paper.questions as WorkQuestion[]).map((question) => ({
        questionId: question.id,
        prompt: question.prompt,
        awarded: score,
        max: 100,
        correct: true,
        note: feedback,
        expected: 'Marked by tutor',
        given: 'Submitted answer',
      })),
    });
  }

  const coding = await AssessmentPaper.findOne({ seedKey: 'paper-coding-lru' });
  if (coding) {
    const attempt = await AssessmentAttempt.findOne({ paperId: coding._id, studentId });
    if (!attempt) {
      const question = (coding.questions as WorkQuestion[])[0];
      await AssessmentAttempt.create({
        paperId: coding._id,
        studentId,
        answers: { [question.id]: { text: question.starterCode ?? '' } },
        flagged: [],
        questionIndex: 0,
        status: 'in_progress',
        score: null,
        maxScore: coding.marks,
        progress: 50,
        startedAt: new Date(Date.now() - 3 * 60 * 1000),
      });
    }
  }

  const filePaper = await AssessmentPaper.findOne({ seedKey: 'paper-file' });
  if (filePaper) {
    const attempt = await AssessmentAttempt.findOne({ paperId: filePaper._id, studentId });
    if (!attempt) {
      const question = (filePaper.questions as WorkQuestion[])[0];
      await AssessmentAttempt.create({
        paperId: filePaper._id,
        studentId,
        answers: {
          [question.id]: {
            files: [
              { name: 'microservices-order-service-v2.1.zip', sizeMb: 24.2 },
              { name: 'System_Architecture_RFC_Doc.pdf', sizeMb: 3.8 },
            ],
            repoUrl: 'github.com/kuppiya/order-service · main · a8f91c0',
          },
        },
        flagged: [],
        questionIndex: 0,
        status: 'in_progress',
        score: null,
        maxScore: filePaper.marks,
        progress: 66,
        startedAt: new Date(Date.now() - 8 * 60 * 1000),
      });
    }
  }
}
