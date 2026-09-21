import { CrawlProgress } from './types';

// In-memory progress cache keyed by analysisId
const progressCache = new Map<string, CrawlProgress>();

export function setAnalysisProgress(analysisId: string, progress: CrawlProgress) {
  progressCache.set(analysisId, progress);
}

export function getAnalysisProgress(analysisId: string): CrawlProgress | null {
  return progressCache.get(analysisId) || null;
}

export function clearAnalysisProgress(analysisId: string) {
  progressCache.delete(analysisId);
}
