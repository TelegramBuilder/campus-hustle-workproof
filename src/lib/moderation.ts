interface Rule {
  label: string;
  pattern: RegExp;
}

const RULES: Rule[] = [
  {
    label: 'Phone number',
    // Nigerian + international phone numbers
    pattern: /(\+?\d{2,3}[\s-]?)?(\d{3}[\s-]?\d{3}[\s-]?\d{4}|\d{4}[\s-]?\d{3}[\s-]?\d{4})/,
  },
  {
    label: 'Academic cheating',
    pattern:
      /do my (assignment|homework|project)|assignment writing|write my (essay|assignment|thesis)|exam answers|exam paper|exam leak|expo|(buy|sell).{0,20}(assignment|project)|waec|neco|jamb expo|project writing for pay/i,
  },
  {
    label: 'Prohibited service',
    pattern:
      /\b(cocaine|weed|cannabis|hard drug|ice|tramadol|gun|weapon|pistol|porn|escort|nude|sex work|bet9ja|sportybet|betting|loan|quick cash|money ritual|fraud|yahoo|hacking someone|spy)\b/i,
  },
  {
    label: 'Abuse or harassment',
    pattern: /\b(fuck|bastard|idiot|stupid|moron|loser|dumb)\b/i,
  },
  {
    label: 'Payment request outside app',
    pattern: /(bank account|account number|pay before|pay upfront|send.{0,15}(money|payment)|wire transfer|deposit)/i,
  },
];

export interface ModerationResult {
  flags: string[];
  blocked: boolean;
}

/** Checks listing / request text. Flagged content is held for admin review. */
export function moderateContent(text: string): ModerationResult {
  const flags = RULES.filter((r) => r.pattern.test(text)).map((r) => r.label);
  return { flags, blocked: flags.length > 0 };
}

/** Spam link detection used in chat. */
export function countLinks(text: string): number {
  const matches = text.match(/https?:\/\/\S+/gi);
  return matches ? matches.length : 0;
}

/** Insults list for chat-level detection (mild). */
export function containsAbuse(text: string): boolean {
  return RULES[3].pattern.test(text);
}