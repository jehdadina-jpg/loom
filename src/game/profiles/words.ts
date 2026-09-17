/** Structural, so health-worker code can use this without importing the profile store. */
interface NameAndPronouns {
  fullName: string;
  pronouns: "name" | "she" | "he" | "they";
}

export interface PersonWords {
  /** First name, or a neutral fallback. */
  name: string;
  subject: string;
  object: string;
  possessive: string;
}

/**
 * How generated sentences refer to the person. Pronouns are only used when a caregiver
 * has chosen them — otherwise sentences use the person's name.
 */
export function personWords(person: NameAndPronouns | undefined): PersonWords {
  const named = !!person?.fullName.trim();
  if (!named) return { name: "the person you care for", subject: "they", object: "them", possessive: "their" };
  const name = person!.fullName.trim().split(/\s+/)[0];
  switch (named ? person!.pronouns : "they") {
    case "she":
      return { name, subject: "she", object: "her", possessive: "her" };
    case "he":
      return { name, subject: "he", object: "him", possessive: "his" };
    case "they":
      return { name, subject: "they", object: "them", possessive: "their" };
    default:
      return { name, subject: name, object: name, possessive: `${name}'s` };
  }
}

export function ageFrom(birthYear: number | null | undefined, now = new Date()): number | null {
  return birthYear ? now.getFullYear() - birthYear : null;
}

/** "K. Devi" — the short form used on list views. */
export function shortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts[0] ?? "";
  return `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
}
