import { arrange, bug, fill, mc, predict, progh, tf } from "../builders";
import type { UnitSeed } from "../types";

const adjPre = "int n = 4;\nvector<vector<int>> adj(4);\nvoid addEdge(int u, int v) {\n    adj[u].push_back(v);\n    adj[v].push_back(u);\n}";
const dfsPre = "vector<vector<int>> adj(4);\nvector<bool> seen(4, false);\nvoid dfs(int v) {\n    seen[v] = true;\n    cout << v << \" \";\n    for (int to : adj[v])\n        if (!seen[to]) dfs(to);\n}";
const compPre = "vector<vector<int>> adj(5);\nvector<bool> seen(5, false);\nvoid dfs(int v) {\n    seen[v] = true;\n    for (int to : adj[v])\n        if (!seen[to]) dfs(to);\n}";
const bfsPre = "vector<vector<int>> adj(4);";
const bfsBody = "adj[0] = {1, 3};\nadj[1] = {0, 2};\nadj[2] = {1, 3};\nadj[3] = {2, 0};\nvector<int> dist(4, -1);\nqueue<int> q;\ndist[0] = 0;\nq.push(0);\nwhile (!q.empty()) {\n    int v = q.front();\n    q.pop();\n    for (int to : adj[v]) {\n        if (dist[to] == -1) {\n            dist[to] = dist[v] + 1;\n            q.push(to);\n        }\n    }\n}\nfor (int d : dist) cout << d << \" \";";
const gridBody = "int R = 3, C = 3;\nvector<string> g = {\"...\", \".#.\", \"...\"};\nvector<vector<int>> dist(R, vector<int>(C, -1));\nqueue<pair<int,int>> q;\ndist[0][0] = 0;\nq.push({0, 0});\nint dr[] = {1, -1, 0, 0};\nint dc[] = {0, 0, 1, -1};\nwhile (!q.empty()) {\n    auto [r, c] = q.front();\n    q.pop();\n    for (int k = 0; k < 4; k++) {\n        int nr = r + dr[k], nc = c + dc[k];\n        if (nr < 0 || nr >= R || nc < 0 || nc >= C) continue;\n        if (g[nr][nc] == '#' || dist[nr][nc] != -1) continue;\n        dist[nr][nc] = dist[r][c] + 1;\n        q.push({nr, nc});\n    }\n}\ncout << dist[2][2];";

export const w4unit4: UnitSeed = {
  slug: "graph-traversal",
  title: "Graphs: DFS and BFS",
  description: "Model connections with graphs, then explore them depth-first and breadth-first.",
  icon: "Network",
  lessons: [
    {
      slug: "graphs-adjacency-lists",
      title: "Graphs and Adjacency Lists",
      summary: "Vertices, edges and how to store them with vector<vector<int>>.",
      content: {
        concept: "A graph is a set of vertices (things) connected by edges (links). An adjacency list stores, for every vertex, the list of its neighbours.",
        explanation: [
          "Examples: cities and roads, people and friendships, cells of a grid and the moves between them.",
          "In an undirected graph an edge u-v works both ways. Store it twice: v in adj[u] and u in adj[v]. In a directed graph the edge u -> v is stored once, in adj[u].",
          "The degree of a vertex is its number of neighbours: adj[v].size().",
          "Dry run: n = 4 with edges 0-1, 0-2, 2-3. adj[0] = {1, 2}, adj[1] = {0}, adj[2] = {0, 3}, adj[3] = {2}. Degrees: 2 1 2 1.",
          "Memory is O(n + m) for n vertices and m edges, which suits graphs with up to about 10^5 or 10^6 vertices. Problems often number vertices 1..n: either allocate n + 1 lists or subtract 1 when reading.",
        ],
        syntax: "vector<vector<int>> adj(n);\nadj[u].push_back(v);\nadj[v].push_back(u);   // undirected",
        example: { code: progh(["vector"], "addEdge(0, 1);\naddEdge(0, 2);\naddEdge(2, 3);\nfor (int v = 0; v < n; v++) cout << adj[v].size() << \" \";", adjPre), output: "2 1 2 1", note: "Degrees of vertices 0..3." },
        commonMistakes: ["Adding only one direction of an undirected edge.", "Mixing 0-based and 1-based vertex numbers.", "Using a 2D n x n matrix when n is 10^5 (too much memory)."],
      },
      questions: [
        predict(progh(["vector"], "addEdge(0, 1);\naddEdge(0, 2);\naddEdge(2, 3);\nfor (int v = 0; v < n; v++) cout << adj[v].size() << \" \";", adjPre), ["2 1 2 1", "1 1 1 1", "3 1 2 0", "2 2 2 2"], 0, "Vertex 0 has neighbours 1 and 2, vertex 1 has 0, vertex 2 has 0 and 3, vertex 3 has 2."),
        predict(progh(["vector"], "addEdge(1, 2);\nfor (int x : adj[2]) cout << x;", adjPre), ["1", "2", "12", "none"], 0, "Edge 1-2 stores 1 in adj[2]."),
        bug(
          "The graph is undirected but BFS misses vertices. What is wrong with building it?",
          "void addEdge(int u, int v) {\n    adj[u].push_back(v);\n}",
          ["The reverse edge adj[v].push_back(u) is missing", "push_back must be insert", "adj must be a set", "u and v must be sorted"],
          0,
          "An undirected edge must be traversable from both ends.",
        ),
        mc("A graph has 10^5 vertices and 2 * 10^5 edges. Which storage is practical?", ["Adjacency list", "10^5 x 10^5 matrix of ints", "A 3D array", "A single int"], 0, "The list takes O(n + m) memory; a matrix would need 10^10 entries."),
        fill("Complete the code that counts how many neighbours vertex v has.", progh(["vector"], "vector<vector<int>> adj(3);\nadj[1] = {0, 2};\nint v = 1;\nint degree = adj[v].___();\ncout << degree;"), ["size"], "size() of the neighbour list is the degree."),
        arrange("Arrange the lines of addEdge for an undirected graph.", ["void addEdge(int u, int v) {", "    adj[u].push_back(v);", "    adj[v].push_back(u);", "}"], "Store the edge in both neighbour lists."),
        tf("In a directed graph, an edge u -> v is stored only in adj[u].", true, "Directed edges go one way only."),
      ],
    },
    {
      slug: "dfs",
      title: "Depth-First Search",
      summary: "Go as deep as possible before backing up; use a visited array.",
      content: {
        concept: "Depth-first search (DFS) explores a graph by following a path as far as it goes, then backing up to try other branches. A visited array makes sure no vertex is processed twice.",
        explanation: [
          "dfs(v): mark v visited, then call dfs on every unvisited neighbour. Recursion keeps the path on the call stack.",
          "Dry run: edges 0-1, 0-2, 1-3 with adj[0] = {1, 2}, adj[1] = {0, 3}, adj[2] = {0}, adj[3] = {1}. dfs(0) visits 0, goes to 1, from 1 goes to 3 (0 is already seen), backs up to 0 and visits 2. Order: 0 1 3 2.",
          "Cost: every vertex is visited once and every edge looked at at most twice, so O(n + m).",
          "Counting connected components: for every vertex not yet seen, start dfs and add 1. With edges 0-1, 1-2, 3-4 on 5 vertices the answer is 2.",
          "Without the visited check, a cycle would make the recursion run forever.",
          "Very deep graphs (a path of 10^6 vertices) can overflow the call stack; in that case use an explicit stack or BFS.",
        ],
        syntax: "void dfs(int v) {\n    seen[v] = true;\n    for (int to : adj[v])\n        if (!seen[to]) dfs(to);\n}",
        example: { code: progh(["vector"], "adj[0] = {1, 2};\nadj[1] = {0, 3};\nadj[2] = {0};\nadj[3] = {1};\ndfs(0);", dfsPre), output: "0 1 3 2", note: "Depth first: 0, 1, 3, then back to 2." },
        commonMistakes: ["Forgetting to mark a vertex visited (infinite recursion on cycles).", "Marking visited after the recursive calls instead of before.", "Recursive DFS on a path of 10^6 vertices."],
      },
      questions: [
        predict(progh(["vector"], "adj[0] = {1, 2};\nadj[1] = {0, 3};\nadj[2] = {0};\nadj[3] = {1};\ndfs(0);", dfsPre), ["0 1 3 2", "0 1 2 3", "0 2 1 3", "0 3 1 2"], 0, "From 1 it goes deeper to 3 before returning to visit 2."),
        predict(progh(["vector"], "adj[0] = {1};\nadj[1] = {0, 2};\nadj[2] = {1};\nadj[3] = {4};\nadj[4] = {3};\nint comps = 0;\nfor (int v = 0; v < 5; v++)\n    if (!seen[v]) {\n        dfs(v);\n        comps++;\n    }\ncout << comps;", compPre), ["2", "1", "3", "5"], 0, "Components are {0,1,2} and {3,4}."),
        bug(
          "dfs never returns on a graph that has a cycle. Why?",
          "void dfs(int v) {\n    for (int to : adj[v])\n        dfs(to);\n}",
          ["There is no visited check, so it walks around the cycle forever", "adj must be sorted", "to must be a reference", "dfs must be iterative"], 0,
          "Mark vertices visited and skip them.",
        ),
        fill("Complete the check inside dfs.", progh(["vector"], "adj[0] = {1, 2};\nadj[1] = {0};\nadj[2] = {0};\ndfs(0);", "vector<vector<int>> adj(3);\nvector<bool> seen(3, false);\nvoid dfs(int v) {\n    seen[v] = true;\n    cout << v;\n    for (int to : adj[v])\n        if (!___[to]) dfs(to);\n}"), ["seen"], "Only recurse into unvisited neighbours."),
        mc("What is the running time of DFS on a graph with n vertices and m edges (adjacency list)?", ["O(n + m)", "O(n * m)", "O(n^2) always", "O(log n)"], 0, "Each vertex and edge is handled a constant number of times."),
        arrange("Arrange the body of dfs(v).", ["seen[v] = true;", "for (int to : adj[v])", "    if (!seen[to])", "        dfs(to);"], "Mark first, then visit unseen neighbours."),
        tf("DFS can be used to count the connected components of an undirected graph.", true, "Start a new DFS from each unvisited vertex and count the starts."),
      ],
    },
    {
      slug: "bfs",
      title: "Breadth-First Search and Shortest Steps",
      summary: "Use a queue to visit vertices in rings of increasing distance, also on grids.",
      content: {
        concept: "Breadth-first search (BFS) visits all vertices at distance 1, then distance 2, and so on, using a queue. In an unweighted graph the first time it reaches a vertex is by a shortest path.",
        explanation: [
          "Keep dist[v] = -1 for unreached vertices. Start: dist[source] = 0, push source into the queue.",
          "Repeat: pop v from the front; for every neighbour with dist -1, set dist = dist[v] + 1 and push it. The queue holds vertices in non-decreasing distance order.",
          "Dry run: square 0-1-2-3-0, source 0. Pop 0: reach 1 (dist 1) and 3 (dist 1). Pop 1: reach 2 (dist 2). Pop 3: 2 already has a distance. Distances: 0 1 2 1.",
          "Grids are graphs too: each cell is a vertex and its 4 neighbours are found with direction arrays dr = {1,-1,0,0}, dc = {0,0,1,-1}. Check bounds and walls before pushing.",
          "In the 3 x 3 grid below, the centre is a wall; the shortest way from (0,0) to (2,2) is 4 steps around it.",
          "Cost: O(n + m). Use BFS (not DFS) whenever the question is 'minimum number of steps'.",
        ],
        syntax: "dist[s] = 0; q.push(s);\nwhile (!q.empty()) {\n    int v = q.front(); q.pop();\n    for (int to : adj[v])\n        if (dist[to] == -1) { dist[to] = dist[v] + 1; q.push(to); }\n}",
        example: { code: progh(["vector", "queue"], bfsBody, bfsPre), output: "0 1 2 1", note: "Distances from vertex 0 on a 4-cycle." },
        commonMistakes: ["Marking distance when popping instead of when pushing (vertices enter the queue many times).", "Using DFS for shortest paths.", "Forgetting grid bounds checks."],
      },
      questions: [
        predict(progh(["vector", "queue"], bfsBody, bfsPre), ["0 1 2 1", "0 1 1 1", "0 1 2 3", "0 2 1 1"], 0, "Vertices 1 and 3 are one step from 0; vertex 2 is two steps."),
        predict(progh(["vector", "queue", "string", "utility"], gridBody), ["4", "2", "6", "5"], 0, "The wall in the middle forces a path of 4 steps along the border."),
        bug(
          "BFS visits some vertices many times and runs slowly. What is wrong?",
          "while (!q.empty()) {\n    int v = q.front(); q.pop();\n    for (int to : adj[v]) {\n        q.push(to);\n    }\n}",
          ["There is no visited / dist check before pushing", "q must be a stack", "front() must be back()", "adj must be sorted"],
          0,
          "Without marking, a vertex can be pushed again for every neighbour (and cycles never end).",
        ),
        fill("Complete the distance update for a newly reached neighbour.", progh(["vector"], "vector<int> dist(2, 0);\nint v = 0, to = 1;\ndist[to] = dist[v] ___ 1;\ncout << dist[to];"), ["+"], "A neighbour is one step further than v."),
        mc("You need the minimum number of moves between two cells of a maze with walls. Which algorithm?", ["BFS", "DFS", "Binary search", "Sorting"], 0, "BFS finds shortest paths in unweighted graphs."),
        arrange("Arrange the BFS loop.", ["while (!q.empty()) {", "    int v = q.front();", "    q.pop();", "    for (int to : adj[v])", "        if (dist[to] == -1) {", "            dist[to] = dist[v] + 1;", "            q.push(to);", "        }", "}"], "Pop, scan neighbours, set distance, push."),
        tf("BFS uses a queue; DFS (recursive) uses the call stack.", true, "Queue gives level order; the call stack gives depth-first order."),
      ],
    },
    {
      slug: "graph-traversal-assessment",
      kind: "assessment",
      title: "Assessment: Graph Traversal",
      summary: "Build graphs, trace DFS and BFS, find bugs and choose the right search.",
      content: {
        concept: "This checkpoint covers adjacency lists, DFS and BFS.",
        explanation: ["Draw the graph on paper before tracing.", "Only this unit, stacks/queues and recursion are needed."],
        commonMistakes: ["Forgetting the visited check."],
      },
      questions: [
        predict(progh(["vector"], "adj[0] = {2, 1};\nadj[1] = {0};\nadj[2] = {0, 3};\nadj[3] = {2};\ndfs(0);", dfsPre), ["0 2 3 1", "0 1 2 3", "0 2 1 3", "0 1 3 2"], 0, "Neighbours of 0 are tried in the stored order 2, 1: so 0, 2, 3, then 1."),
        predict(progh(["vector", "queue"], "adj[0] = {1, 2};\nadj[1] = {0, 3};\nadj[2] = {0};\nadj[3] = {1};\nvector<int> dist(4, -1);\nqueue<int> q;\ndist[0] = 0;\nq.push(0);\nwhile (!q.empty()) {\n    int v = q.front();\n    q.pop();\n    for (int to : adj[v]) {\n        if (dist[to] == -1) {\n            dist[to] = dist[v] + 1;\n            q.push(to);\n        }\n    }\n}\ncout << dist[3];", bfsPre), ["2", "3", "1", "-1"], 0, "0 -> 1 -> 3 is two steps."),
        bug(
          "BFS is meant to compute distances but dist[3] is wrong for a graph where 3 is reachable. What is the bug?",
          "dist[0] = 0;\nq.push(0);\nwhile (!q.empty()) {\n    int v = q.front(); q.pop();\n    for (int to : adj[v])\n        if (dist[to] == -1) {\n            dist[to] = 1;\n            q.push(to);\n        }\n}",
          ["dist[to] is set to 1 instead of dist[v] + 1", "q.pop() must come last", "dist must start at 1", "adj must be a matrix"],
          0,
          "Each vertex is one step further than the vertex it was reached from.",
        ),
        fill("Complete the bounds check for a grid cell (nr, nc) with R rows and C columns.", progh(["vector"], "int R = 2, C = 2, nr = 1, nc = 2;\nif (nr < 0 || nr >= R || nc < 0 || nc ___ C) {\n    cout << \"out\";\n    return 0;\n}\ncout << \"in\";"), [">="], "Valid columns are 0..C-1, so nc >= C is out of range."),
        arrange("Arrange the code that counts connected components.", ["int comps = 0;", "for (int v = 0; v < n; v++) {", "    if (!seen[v]) {", "        dfs(v);", "        comps++;", "    }", "}"], "Every unvisited vertex starts a new component."),
        mc("A maze has 10^6 cells and you need the shortest path. Which is correct?", ["BFS in O(cells)", "DFS, which always finds the shortest path", "Trying all paths", "Sorting the cells"], 0, "BFS gives shortest paths and runs in linear time."),
        mc("An undirected graph is stored with edges only in one direction. What is the likely symptom?", ["Some vertices look unreachable", "Stack overflow always", "Compilation error", "Faster DFS"], 0, "Missing reverse edges cut off parts of the graph."),
        tf("Marking a vertex as visited when it is pushed (not when popped) keeps each vertex in the BFS queue at most once.", true, "Otherwise duplicates pile up in the queue."),
      ],
    },
  ],
};
