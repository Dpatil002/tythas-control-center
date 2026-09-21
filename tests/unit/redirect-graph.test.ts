import { describe, it, expect } from 'vitest';
import { analyzeRedirectGraph, normalizePath } from '@/lib/seo/redirects';

describe('Redirect Graph Traversal & Cycle/Chain Detection', () => {
  it('normalizes path strings reliably', () => {
    expect(normalizePath('products/serum')).toBe('/products/serum');
    expect(normalizePath('/products/serum/')).toBe('/products/serum');
    expect(normalizePath('https://amarybeaute.com/shop')).toBe('/shop');
    expect(normalizePath('/')).toBe('/');
  });

  it('detects infinite redirect loops (A -> B -> A and A -> B -> C -> A)', () => {
    const directLoop = [
      { id: '1', fromPath: '/cycle-a', toPath: '/cycle-b', type: 'R301' },
      { id: '2', fromPath: '/cycle-b', toPath: '/cycle-a', type: 'R301' },
      { id: '3', fromPath: '/valid-page', toPath: '/target', type: 'R301' }
    ];

    const res1 = analyzeRedirectGraph(directLoop);
    expect(res1.loops).toHaveLength(1);
    expect(res1.loops[0].paths).toContain('/cycle-a');
    expect(res1.loops[0].paths).toContain('/cycle-b');
    expect(res1.affectedPathMap['/cycle-a'].inLoop).toBe(true);
    expect(res1.affectedPathMap['/valid-page']?.inLoop).toBeFalsy();

    const threeNodeLoop = [
      { id: '1', fromPath: '/x', toPath: '/y', type: 'R301' },
      { id: '2', fromPath: '/y', toPath: '/z', type: 'R301' },
      { id: '3', fromPath: '/z', toPath: '/x', type: 'R301' }
    ];

    const res2 = analyzeRedirectGraph(threeNodeLoop);
    expect(res2.loops).toHaveLength(1);
    expect(res2.loops[0].paths).toHaveLength(4); // x -> y -> z -> x
  });

  it('detects multi-hop redirect chains (A -> B -> C)', () => {
    const chain = [
      { id: '1', fromPath: '/old-store', toPath: '/shop', type: 'R301' },
      { id: '2', fromPath: '/shop', toPath: '/products/all', type: 'R301' },
      { id: '3', fromPath: '/independent', toPath: '/dest', type: 'R301' }
    ];

    const res = analyzeRedirectGraph(chain);
    expect(res.loops).toHaveLength(0);
    expect(res.chains).toHaveLength(1);
    expect(res.chains[0].fromPath).toBe('/old-store');
    expect(res.chains[0].finalDestination).toBe('/products/all');
    expect(res.chains[0].hopCount).toBe(2);
    expect(res.affectedPathMap['/old-store'].inChain).toBe(true);
  });
});
