import type { LocationId } from "./locations/types";

/**
 * The day the guide plan walks you through, seen as chapters instead of a checklist.
 * Nothing here changes what happens — it's a narrative skin over the same nine steps,
 * so the day feels like it's telling a story instead of issuing instructions.
 */
export interface StoryChapter {
  id: string;
  /** Inclusive range into GUIDE_PLAN this chapter covers. */
  fromIndex: number;
  toIndex: number;
  title: string;
  subtitle: string;
  narration: string;
  /** Which location's art dresses the chapter card. */
  backdropLocation: LocationId;
}

export const STORY_CHAPTERS: StoryChapter[] = [
  {
    id: "waking-the-house",
    fromIndex: 0,
    toIndex: 1,
    title: "Chapter I",
    subtitle: "Waking the House",
    narration: "The morning starts slow. The kettle wants filling, and the house wants you in it.",
    backdropLocation: "home",
  },
  {
    id: "the-veranda",
    fromIndex: 2,
    toIndex: 3,
    title: "Chapter II",
    subtitle: "The Veranda",
    narration: "Outside, the terraces catch the light. Someone is already sitting with a story to tell.",
    backdropLocation: "veranda",
  },
  {
    id: "down-to-market",
    fromIndex: 4,
    toIndex: 5,
    title: "Chapter III",
    subtitle: "Down to Market",
    narration: "The village is awake now. Ilo's stall needs a second pair of eyes for the fruit.",
    backdropLocation: "market",
  },
  {
    id: "tending-the-garden",
    fromIndex: 6,
    toIndex: 7,
    title: "Chapter IV",
    subtitle: "Tending the Garden",
    narration: "The vegetable beds have been waiting all week. A little water, row by row.",
    backdropLocation: "garden",
  },
  {
    id: "rest-by-the-water",
    fromIndex: 8,
    toIndex: 8,
    title: "Chapter V",
    subtitle: "Rest by the Water",
    narration: "The day slows down here. Nothing left to do but sit, and let it be quiet.",
    backdropLocation: "waterpoint",
  },
];

export function chapterForGuideIndex(guideIndex: number): StoryChapter | null {
  return STORY_CHAPTERS.find((c) => guideIndex >= c.fromIndex && guideIndex <= c.toIndex) ?? null;
}
