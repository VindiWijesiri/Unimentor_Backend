import User from '../models/User';
import { PodConversation } from '../models/pod';
import { LibraryMaterial } from '../models/library';
import { memoizeSeed } from './seedCache';

const LIBRARY_KEYS = ['lib-bfs-video', 'lib-avl-pdf', 'lib-dijkstra-audio', 'lib-dp-quiz', 'lib-graph-code', 'lib-bayes-pdf'];

async function seedLibraryDataOnce(userId: string): Promise<void> {
  try {
    const existing = await LibraryMaterial.findOne({ seedKey: 'lib-bfs-video' }).select('savedBy');
    if (existing) {
      const alreadySaved = existing.savedBy.some((id) => String(id) === userId);
      if (!alreadySaved) {
        await LibraryMaterial.updateMany(
          { seedKey: { $in: LIBRARY_KEYS } },
          { $addToSet: { savedBy: userId } },
        );
      }
      return;
    }

    const owner = await User.findById(userId);
    if (!owner) return;
    const tutor = await User.findOne({ email: 'tharushi.perera@unimentor.test' });
    const kasun = await User.findOne({ email: 'kasun.jayawardena@unimentor.test' });
    const squad = await PodConversation.findOne({ seedKey: 'pod-dsa-squad' });
    const circle = await PodConversation.findOne({ seedKey: 'pod-stats-circle' });
    const ownerId = tutor?._id ?? owner._id;

    const fromLabels: Record<string, string> = {
      'lib-bfs-video': 'FROM: LIVE KUPPIYA • THARUSHI (TUTOR)',
      'lib-avl-pdf': 'FROM: DSA REVISION SQUAD (STUDY GROUP)',
      'lib-dijkstra-audio': 'FROM: POD SESSION • THARUSHI',
      'lib-dp-quiz': 'FROM: PROF. KUMARA • LESSON 3',
      'lib-graph-code': 'FROM: COMPLETE DSA MASTERY PACK',
      'lib-bayes-pdf': 'FROM: STATS CIRCLE (STUDY GROUP)',
    };

    await LibraryMaterial.insertMany([
      {
        seedKey: 'lib-bfs-video',
        kind: 'video',
        source: 'live',
        title: 'Graph Traversal (BFS & DFS) Full Recording & Timecodes',
        subtitle: 'Includes real past paper walk-throughs, adjacency matrix vs list tradeoffs, and recursion stack.',
        fromLabel: fromLabels['lib-bfs-video'],
        description: 'Auto-synced with Tharushi’s Kuppiya & Flash Records.',
        body: 'Timecode 0:00 Intro · 4:20 BFS queue · 12:10 DFS recursion · 21:40 visited-set pitfalls · 33:00 past-paper Q4.',
        moduleCode: 'IT2040',
        moduleName: 'Data Structures',
        durationLabel: '1:12:40',
        sizeLabel: 'HD · 1080p',
        downloads: 190,
        owner: ownerId,
        conversation: squad?._id,
        savedBy: [userId],
        tags: ['BFS', 'DFS', 'Graphs'],
      },
      {
        seedKey: 'lib-avl-pdf',
        kind: 'pdf',
        source: 'group',
        title: 'Binary Trees & AVL Balancing Master Cheatsheet',
        subtitle: 'Hand-annotated step-by-step LL/RR/LR/RL rotation algorithms with 12 solved exam edge-cases.',
        fromLabel: fromLabels['lib-avl-pdf'],
        description: 'Saved to device · Shared by Kasun.',
        body: 'AVL rotations: LL rotate right, RR rotate left, LR rotate left-child then right, RL rotate right-child then left. Keep balance factor in {-1,0,1}.',
        moduleCode: 'IT2040',
        moduleName: 'Data Structures',
        pageCount: 42,
        sizeLabel: 'PDF · 42 Pages',
        downloads: 84,
        owner: kasun?._id ?? ownerId,
        conversation: squad?._id,
        savedBy: [userId],
        tags: ['Exam Ready', 'AVL'],
      },
      {
        seedKey: 'lib-dijkstra-audio',
        kind: 'audio',
        source: 'session',
        title: 'Dijkstra Shortest Path: Intuition & Priority Queue Logic',
        subtitle: 'Voice walkthrough of decrease-key vs lazy Dijkstra and why BFS fails with weights.',
        fromLabel: fromLabels['lib-dijkstra-audio'],
        description: 'Curated explanation from a tutor session.',
        body: 'Use a min-heap. Relax edges. Never re-process a finalized node. Uniform weights collapse to BFS.',
        moduleCode: 'IT2040',
        moduleName: 'Algorithms Recap',
        durationLabel: '12:40',
        sizeLabel: '2.4 MB',
        owner: ownerId,
        conversation: squad?._id,
        savedBy: [userId],
        tags: ['Dijkstra', 'Priority Queue'],
      },
      {
        seedKey: 'lib-dp-quiz',
        kind: 'quiz',
        source: 'session',
        title: 'DP Memoization & Tabulation Midterm Practice Quiz',
        subtitle: '20 mixed questions on overlapping subproblems, state design, and grid paths.',
        fromLabel: fromLabels['lib-dp-quiz'],
        description: 'Best Score: 17/20 (85%). Completed 2 days ago.',
        body: 'Review wrong answers after submit. Tabulation fills bottom-up; memoization caches recursion.',
        moduleCode: 'IT2040',
        moduleName: 'Dynamic Programming',
        questionCount: 4,
        owner: ownerId,
        conversation: squad?._id,
        savedBy: [userId],
        tags: ['20 Questions'],
        questions: [
          { prompt: 'Memoization stores results of which calls?', options: ['Every recursive call', 'Overlapping subproblems', 'Only the base case', 'Only the final answer'], answer: 1, explanation: 'Memoization caches overlapping subproblems.' },
          { prompt: 'Tabulation typically iterates:', options: ['Top-down', 'Bottom-up', 'Random order', 'Only on leaves'], answer: 1, explanation: 'Tabulation fills a table from smaller states up.' },
          { prompt: 'A DP state should capture:', options: ['The full recursion stack', 'Enough to continue uniquely', 'Only the input size n', 'The source code path'], answer: 1, explanation: 'The state must uniquely continue the remaining work.' },
          { prompt: 'Grid path DP recurrence uses:', options: ['Only diagonal cells', 'Left and above cells', 'BFS layers', 'AVL rotations'], answer: 1, explanation: 'Usually dp[i][j] = dp[i-1][j] + dp[i][j-1].' },
        ],
      },
      {
        seedKey: 'lib-graph-code',
        kind: 'code',
        source: 'library',
        title: 'Graph Algorithms Starter Boilerplate & Tested Test-Cases',
        subtitle: 'Includes input/output file handlers, adjacency-list templates, and JUnit tests for exam practice.',
        fromLabel: fromLabels['lib-graph-code'],
        description: 'COMET · Added 8h · OFFLINE ready.',
        body: 'Starter templates for BFS, DFS, and Dijkstra with sample tests.',
        moduleCode: 'IT2040',
        moduleName: 'C++ / Java 17',
        fileCount: 14,
        sizeLabel: '14 Source Files',
        owner: ownerId,
        savedBy: [userId],
        tags: ['C++', 'Java 17'],
        files: [
          {
            name: 'bfs.cpp',
            language: 'cpp',
            content: '#include <bits/stdc++.h>\nusing namespace std;\nvector<int> bfs(int n, vector<vector<int>>& g, int s){\n  vector<int> dist(n, -1); queue<int> q; dist[s]=0; q.push(s);\n  while(!q.empty()){ int u=q.front(); q.pop();\n    for(int v: g[u]) if(dist[v]<0){ dist[v]=dist[u]+1; q.push(v);} }\n  return dist;\n}\n',
          },
          {
            name: 'Dijkstra.java',
            language: 'java',
            content: 'class Dijkstra {\n  static int[] shortest(List<int[]>[] g, int s) {\n    int n = g.length; int[] d = new int[n]; Arrays.fill(d, Integer.MAX_VALUE/4); d[s]=0;\n    PriorityQueue<int[]> pq = new PriorityQueue<>(Comparator.comparingInt(a -> a[0]));\n    pq.add(new int[]{0,s});\n    while(!pq.isEmpty()){ int[] cur=pq.poll(); int dist=cur[0], u=cur[1]; if(dist!=d[u]) continue;\n      for(int[] e: g[u]){ int v=e[0], w=e[1]; if(d[u]+w<d[v]){ d[v]=d[u]+w; pq.add(new int[]{d[v], v}); } }\n    } return d;\n  }\n}\n',
          },
        ],
      },
      {
        seedKey: 'lib-bayes-pdf',
        kind: 'pdf',
        source: 'group',
        title: 'Probability Distributions & Bayes Theorem Formula Summary',
        subtitle: 'Curated by 3rd year Dean’s list mentors for rapid revision before the upcoming mock exam.',
        fromLabel: fromLabels['lib-bayes-pdf'],
        description: 'Added yesterday.',
        body: 'Bayes: P(A|B) = P(B|A)P(A) / P(B). Keep the law of total probability in the denominator. Binomial, Poisson, and Normal CDFs included.',
        moduleCode: 'MA2010',
        moduleName: 'Probability & Stats',
        pageCount: 18,
        sizeLabel: 'PDF · 18 Pages',
        owner: ownerId,
        conversation: circle?._id,
        savedBy: [userId],
        tags: ['Bayes', 'Distributions'],
      },
    ]);
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
  }
}

export const seedLibraryData = memoizeSeed(seedLibraryDataOnce);
