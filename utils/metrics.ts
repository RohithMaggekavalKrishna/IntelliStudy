import { SessionData, TimeSlice, WebsiteVisit } from "../types";

export const calculateSessionMetrics = (slices: TimeSlice[]) => {
  if (slices.length === 0) {
    return {
      totalDuration: 0,
      focusedTime: 0,
      outsideTime: 0,
      phoneTime: 0,
      webTime: 0,
      absentTime: 0,
      focusScore: 0,
      distractionRatio: 0,
      topSites: [] as WebsiteVisit[],
    };
  }

  const totalDuration = slices.length; 
  
  let focusedTime = 0;
  let partialTime = 0;
  let outsideTime = 0;
  
  let phoneTime = 0;
  let webTime = 0;
  let absentTime = 0;

  // Site aggregation
  const siteMap = new Map<string, { duration: number, category: string }>();

  slices.forEach((slice) => {
    // Basic Status Counters
    if (slice.status === 'FOCUSED') focusedTime++;
    else if (slice.status === 'PARTIAL') partialTime++;
    else outsideTime++;

    // Specific Distraction Counters
    if (slice.distractionType === 'PHONE') phoneTime++;
    if (slice.distractionType === 'WEB_DISTRACTION') webTime++;
    if (slice.distractionType === 'ABSENT' || slice.distractionType === 'LOOKING_AWAY') absentTime++;

    // Website Aggregation
    if (slice.metadata?.domain) {
      const current = siteMap.get(slice.metadata.domain) || { duration: 0, category: 'NEUTRAL' };
      // Infer category from slice status if web distraction
      const cat = slice.distractionType === 'WEB_DISTRACTION' ? 'NON_STUDY' : 'STUDY';
      siteMap.set(slice.metadata.domain, {
        duration: current.duration + 1,
        category: cat
      });
    }
  });

  // Convert site map to sorted array
  const topSites: WebsiteVisit[] = Array.from(siteMap.entries()).map(([domain, data]) => ({
    domain,
    category: data.category as any,
    duration: data.duration
  })).sort((a, b) => b.duration - a.duration);

  // Score Formula:
  // (Focused * 1.0 + Partial * 0.5) / Total * 100
  const weightedScore = ((focusedTime * 1.0) + (partialTime * 0.5)) / totalDuration;
  const focusScore = Math.min(100, Math.max(0, Math.round(weightedScore * 100)));

  const distractionRatio = outsideTime / totalDuration;

  return {
    totalDuration,
    focusedTime,
    outsideTime: outsideTime + partialTime,
    phoneTime,
    webTime,
    absentTime,
    focusScore,
    distractionRatio,
    topSites
  };
};

export const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
};