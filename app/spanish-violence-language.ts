/**
 * Spanish abuse-related verbs are matched by their productive stems instead of
 * enumerating individual conjugations. This covers tense, mood, person,
 * accentuation, clitics and common periphrastic constructions.
 */
const auxiliaries = "(?:voy|vas|va|vamos|van|iba|ibas|ibamos|iban|ir[eé]|ir[aá]s|ir[aá]|ir[ií]a|fu[a-záéíóú]*|pued[a-záéíóú]*|pod[a-záéíóú]*|quier[a-záéíóú]*|quer[a-záéíóú]*|querr[a-záéíóú]*|pens[a-záéíóú]*|piens[a-záéíóú]*|termin[a-záéíóú]*|acab[a-záéíóú]*|teng[a-záéíóú]*|ten[a-záéíóú]*|tendr[a-záéíóú]*|deb[a-záéíóú]*|hab[a-záéíóú]*|h[a-záéíóú]*|estar[a-záéíóú]*|est[a-záéíóú]*)";
const violentStems = "(?:mat|golpe|peg|pegu|asesin|apu[ñn]al|estrangul|ahorc|revent|revient|part|agred|lastim|her|hier|hir|quebr|quiebr|romp|acuchill|quem|asfixi|abofete|cachete|azot|pate|pati|apu[ñn]et|apu[ñn]et|tortur|maltrat|desfigur|acribill|dispar|apu[nñ]t)";
const conjugation = "[a-záéíóúüñ]*";

export const physicalThreatPattern = new RegExp(
  `(?<!\\b(?:nunca|jam[aá]s|no)\\s)te\\s+(?:(?:${auxiliaries})\\s+(?:a\\s+)?){0,3}(?:${violentStems}${conjugation}|(?:hac|hag|har)${conjugation}\\s+(?:da[ñn]o|desaparecer)|quit${conjugation}\\s+la\\s+vida)\\b`,
  "i",
);

export function hasPhysicalThreat(message: string): boolean {
  if (physicalThreatPattern.test(message)) return true;

  const normalized = message.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  if (/(?:nunca|jamas|no)\s+(?:voy\s+a\s+|pienso\s+|quiero\s+)?(?:golpe|peg|pegu|mat|agred|lastim|her|hir|asesin)[a-z]*te\b/.test(normalized)) return false;

  // Spanish attaches its object pronoun to infinitives and gerunds:
  // "voy a golpearte", "terminaría pegándote", "hubiera podido matarte".
  const directedVerb = new RegExp(`\\b${violentStems}${conjugation}te\\b`, "i");
  const coercedViolence = new RegExp(`\\b(?:oblig|forz|forc|provoc|hac|hag|hic|har|llev)${conjugation}\\b.{0,80}\\b(?:${violentStems}${conjugation}|(?:hac|hag|har)${conjugation}\\s+da[ñn]o)\\b`, "i");
  return directedVerb.test(normalized) || coercedViolence.test(normalized);
}
