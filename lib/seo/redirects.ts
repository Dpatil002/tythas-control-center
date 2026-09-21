export interface RedirectEntry {
  id: string;
  fromPath: string;
  toPath: string;
  type: string;
}

export interface RedirectLoop {
  paths: string[];
  redirectIds: string[];
  description: string;
}

export interface RedirectChain {
  fromPath: string;
  hops: string[];
  finalDestination: string;
  hopCount: number;
  redirectIds: string[];
  description: string;
}

export interface RedirectGraphAnalysis {
  loops: RedirectLoop[];
  chains: RedirectChain[];
  totalIssues: number;
  affectedPathMap: Record<string, { inLoop: boolean; inChain: boolean }>;
}

export function normalizePath(path: string): string {
  if (!path) return '/';
  let p = path.trim();
  // Strip origin if full URL provided
  try {
    if (p.startsWith('http://') || p.startsWith('https://')) {
      const u = new URL(p);
      p = u.pathname + u.search;
    }
  } catch {}
  if (!p.startsWith('/')) {
    p = '/' + p;
  }
  // Strip trailing slash except root
  if (p.length > 1 && p.endsWith('/')) {
    p = p.slice(0, -1);
  }
  return p;
}

export function analyzeRedirectGraph(redirects: RedirectEntry[]): RedirectGraphAnalysis {
  const map = new Map<string, { toPath: string; id: string; type: string }>();
  for (const r of redirects) {
    const from = normalizePath(r.fromPath);
    const to = normalizePath(r.toPath);
    map.set(from, { toPath: to, id: r.id, type: r.type });
  }

  const loops: RedirectLoop[] = [];
  const chains: RedirectChain[] = [];
  const visitedForLoops = new Set<string>();
  const loopSeenSet = new Set<string>();

  // 1. Detect Loops using DFS
  for (const [startPath] of Array.from(map.entries())) {
    if (visitedForLoops.has(startPath)) continue;

    const currentPathList: string[] = [];
    const currentIdList: string[] = [];
    const inStack = new Set<string>();

    let currentPath: string = startPath;

    while (map.has(currentPath)) {
      if (inStack.has(currentPath)) {
        // Cycle detected!
        const cycleStartIndex = currentPathList.indexOf(currentPath);
        const cyclePaths = currentPathList.slice(cycleStartIndex);
        cyclePaths.push(currentPath); // complete circle

        const cycleIds = currentIdList.slice(cycleStartIndex);

        const cycleKey = [...cyclePaths].sort().join('|');
        if (!loopSeenSet.has(cycleKey)) {
          loopSeenSet.add(cycleKey);
          loops.push({
            paths: cyclePaths,
            redirectIds: cycleIds,
            description: `Infinite redirect loop: ${cyclePaths.join(' → ')}`
          });
        }
        break;
      }

      visitedForLoops.add(currentPath);
      inStack.add(currentPath);
      currentPathList.push(currentPath);

      const targetEntry = map.get(currentPath);
      if (!targetEntry) break;
      currentIdList.push(targetEntry.id);
      currentPath = targetEntry.toPath;
    }
  }

  // 2. Detect Multi-Hop Chains (paths that redirect >= 2 hops, excluding loops)
  const loopPathSet = new Set<string>();
  for (const l of loops) {
    for (const p of l.paths) loopPathSet.add(p);
  }

  for (const [startPath] of Array.from(map.entries())) {
    if (loopPathSet.has(startPath)) continue;

    const chainHops: string[] = [startPath];
    const chainIds: string[] = [];
    let currentPath: string = startPath;
    const chainVisited = new Set<string>();

    while (map.has(currentPath) && !chainVisited.has(currentPath)) {
      chainVisited.add(currentPath);
      const targetEntry = map.get(currentPath);
      if (!targetEntry) break;
      chainIds.push(targetEntry.id);
      currentPath = targetEntry.toPath;
      chainHops.push(currentPath);
    }

    // If chain length > 2 (i.e. more than 1 hop: A -> B -> C has 2 hops / 3 nodes)
    if (chainHops.length >= 3 && !loopPathSet.has(currentPath)) {
      chains.push({
        fromPath: startPath,
        hops: chainHops,
        finalDestination: currentPath,
        hopCount: chainHops.length - 1,
        redirectIds: chainIds,
        description: `Redirect chain (${chainHops.length - 1} hops): ${chainHops.join(' → ')}`
      });
    }
  }

  const affectedPathMap: Record<string, { inLoop: boolean; inChain: boolean }> = {};
  for (const l of loops) {
    for (const p of l.paths) {
      if (!affectedPathMap[p]) affectedPathMap[p] = { inLoop: false, inChain: false };
      affectedPathMap[p].inLoop = true;
    }
  }
  for (const c of chains) {
    for (const p of c.hops) {
      if (!affectedPathMap[p]) affectedPathMap[p] = { inLoop: false, inChain: false };
      affectedPathMap[p].inChain = true;
    }
  }

  return {
    loops,
    chains,
    totalIssues: loops.length + chains.length,
    affectedPathMap
  };
}
