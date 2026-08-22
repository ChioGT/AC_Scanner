import { referenceGroups } from "./violence-reference.ts";
import { hasPhysicalThreat } from "./spanish-violence-language.ts";

export type SemanticMatch = {
  category: string;
  sourceCategory: string;
  phrase: string;
  confidence: number;
  severe: boolean;
};

type TrainingExample = {
  category: string;
  sourceCategory: string;
  phrase: string;
  tokens: string[];
  weightedFeatures: Map<string, number>;
  magnitude: number;
};

const stopWords = new Set([
  "a", "al", "ante", "con", "de", "del", "el", "ella", "ellos", "en", "es", "esa", "ese", "esta", "este", "la", "las", "le", "les", "lo", "los", "me", "mi", "mis", "o", "para", "por", "que", "se", "su", "sus", "te", "tu", "tus", "un", "una", "y", "yo",
]);

const synonyms: Array<[RegExp, string]> = [
  [/^(?:localizacion|ubicacion|gps|geolocalizacion)$/, "ubicacion"],
  [/^(?:celular|telefono|movil|smartphone)$/, "celular"],
  [/^(?:contrasena|clave|password|pin)$/, "clave"],
  [/^(?:conversaciones?|mensajes?|chats?)$/, "chat"],
  [/^(?:amigas?|amigos?|amistades|amistad)$/, "amistad"],
  [/^(?:papas?|mamas?|padres?|familia|familiares?)$/, "familia"],
  [/^(?:sueldo|salario|plata|dinero|ingresos?)$/, "dinero"],
  [/^(?:papeles|documentos?|identificacion)$/, "documento"],
  [/^(?:fotos?|fotografias?|imagenes?|nudes?)$/, "foto"],
  [/^(?:desnudas?|desnudos?|intimas?|intimos?)$/, "intimo"],
  [/^(?:bisexual|lesbiana|gay|trans|queer|orientacion|sexualidad)$/, "identidad"],
  [/^(?:golpe|peg|pegu|mat|asesin|apunal|estrangul|ahorc|revent|revient|part|agred|lastim|her|hier|hir|romp|quebr|quiebr|quem|asfixi|abofete|cachete|pate|tortur|maltrat)[a-z]*$/, "agredir"],
  [/^(?:vigil|control|revis|supervis|monitore|espi|rastre|ubic|localiz)[a-z]*$/, "vigilar"],
  [/^(?:cuent|cont|dic|dig|dij|dir|dec|revel|public|publiqu|difund|sub|envi|expon|expong|mostr|muestr)[a-z]*$/, "revelar"],
  [/^(?:bloque|bloque|elimin|borr)[a-z]*$/, "bloquear"],
  [/^(?:prohib|prohib|impid|imped|aisl|alej|separ|restring)[a-z]*$/, "restringir"],
  [/^(?:oblig|forz|forc|coaccion|presion|chantaj|amenaz|amenac|intimid)[a-z]*$/, "coaccionar"],
  [/^(?:humill|insult|degrad|ridiculiz|menospreci|culp|manipul|invalid|neg|nieg|castig)[a-z]*$/, "humillar"],
  [/^(?:confisc|reten|reteng|retuv|quit|apropi|administr|manej|rob|destru|destruy|vend|vendi|vender)[a-z]*$/, "confiscar"],
];

function normalize(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function stem(token: string): string {
  for (const [pattern, replacement] of synonyms) if (pattern.test(token)) return replacement;
  return token
    .replace(/(?:amientos|imientos|aciones|adoras|adores|antes|mente)$/u, "")
    .replace(/(?:ariamos|eriamos|iriamos|aramos|ieramos|eramos|iriamos|aremos|eremos|iremos|arian|erian|irian|arias|erias|irias|arais|erais|irais|aseis|ieseis)$/u, "")
    .replace(/(?:abamos|abais|aban|abas|ando|iendo|yendo|ados|adas|idos|idas|aron|ieron|asen|iesen|aran|ieran|aras|eras|iras|ares|ieres)$/u, "")
    .replace(/(?:andote|iendote|arme|arte|arse|erte|erse|irte|irse|aste|iste|amos|emos|imos|aran|eran|iran|aria|eria|iria|aba|ada|ado|ida|ido)$/u, "")
    .replace(/(?:as|es|os)$/u, "");
}

function tokenize(value: string): string[] {
  return normalize(value).split(/\s+/).filter((token) => token.length > 1 && !stopWords.has(token)).map(stem).filter(Boolean);
}

function features(tokens: string[]): string[] {
  const entries = [...tokens];
  for (let index = 0; index < tokens.length - 1; index += 1) entries.push(`${tokens[index]}_${tokens[index + 1]}`);
  return entries;
}

const trainingRows = referenceGroups.flatMap((group) => group.phrases.map((phrase) => ({
  category: group.category,
  sourceCategory: group.sourceCategory.replace(/^\d+\.\s*/, ""),
  phrase,
  tokens: tokenize(phrase),
})));

const documentFrequency = new Map<string, number>();
for (const row of trainingRows) {
  for (const feature of new Set(features(row.tokens))) documentFrequency.set(feature, (documentFrequency.get(feature) ?? 0) + 1);
}

function vectorize(tokens: string[]): { weightedFeatures: Map<string, number>; magnitude: number } {
  const counts = new Map<string, number>();
  for (const feature of features(tokens)) counts.set(feature, (counts.get(feature) ?? 0) + 1);
  const weightedFeatures = new Map<string, number>();
  let squaredMagnitude = 0;

  for (const [feature, count] of counts) {
    const inverseFrequency = Math.log((trainingRows.length + 1) / ((documentFrequency.get(feature) ?? 0) + 1)) + 1;
    const weight = (1 + Math.log(count)) * inverseFrequency * (feature.includes("_") ? 0.75 : 1);
    weightedFeatures.set(feature, weight);
    squaredMagnitude += weight * weight;
  }

  return { weightedFeatures, magnitude: Math.sqrt(squaredMagnitude) || 1 };
}

const trainingExamples: TrainingExample[] = trainingRows.map((row) => ({ ...row, ...vectorize(row.tokens) }));

function cosine(left: Map<string, number>, leftMagnitude: number, right: TrainingExample): number {
  let dot = 0;
  for (const [feature, weight] of left) dot += weight * (right.weightedFeatures.get(feature) ?? 0);
  return dot / (leftMagnitude * right.magnitude);
}

function contextSignals(message: string): Map<string, { strength: number; severe: boolean }> {
  const text = normalize(message);
  const signals = new Map<string, { strength: number; severe: boolean }>();
  const mark = (category: string, strength: number, severe = false) => {
    const previous = signals.get(category);
    if (!previous || strength > previous.strength || severe) signals.set(category, { strength: Math.max(previous?.strength ?? 0, strength), severe: severe || Boolean(previous?.severe) });
  };

  const respectful = /(?:si quieres|cuando puedas|sin apuro|sin presion|no hay problema|respeto tu decision|si te parece bien)/.test(text);
  const digitalObject = /(?:ubicacion|localizacion|gps|contrasena|clave|celular|telefono|whatsapp|instagram|redes|seguidores|chat|conversaciones|mensajes|capturas|videollamada)/.test(text);
  const demand = /(?:mand[a-z]*|envi[a-z]*|pas[a-z]*|dame|da[rsmn][a-z]*|di[a-z]*|quier[a-z]*|quer[a-z]*|querr[a-z]*|exij[a-z]*|exig[a-z]*|exigier[a-z]*|revis[a-z]*|muestr[a-z]*|mostr[a-z]*|mostras[a-z]*|ensen[a-z]*|activ[a-z]*|vigil[a-z]*|control[a-z]*|supervis[a-z]*|monitore[a-z]*|espi[a-z]*|rastre[a-z]*|oblig[a-z]*|forz[a-z]*|forc[a-z]*|tienes que|tenes que|tendras que|tuvier[a-z]* que|necesit[a-z]* que)/.test(text);

  if (digitalObject && demand && !respectful) mark("control", 0.83);
  if (/(?:contest[a-z]*|respond[a-z]*|respuest[a-z]*)/.test(text) && /(?:ya|ahora|de inmediato|inmediatamente|me oblig[a-z]*|te golpe|te pegu|te mat|vas a ver|o si no|si no)/.test(text) && !respectful) mark("control", 0.84);
  if (/(?:celos|celoso|desconfio|desconfiar|me enganas|me engañas|coqueteas|con quien hablas|para quien te arreglas)/.test(text) && !respectful) mark("control", 0.74);

  const socialAnchor = /(?:amig|amistad|familia|terapia|terapeuta|grupo|comunidad|reunion|estudi|trabaj|gente queer)/.test(text);
  const restriction = /(?:no vuelv[a-z]*|no volv[a-z]*|no quier[a-z]*|no quer[a-z]*|no hab[a-z]*|no habl[a-z]*|no salg[a-z]*|no sal[a-z]*|no saldr[a-z]*|dej[a-z]* de|alej[a-z]*|no vay[a-z]*|no fuer[a-z]*|prohib[a-z]*|impid[a-z]*|imped[a-z]*|restring[a-z]*|elig[a-z]*|elij[a-z]*|solo me necesit[a-z]*|solo necesit[a-z]*|sin mi|nadie mas|te separ[a-z]*|aisl[a-z]*|apart[a-z]*)/.test(text);
  if (socialAnchor && restriction && !respectful) mark("isolation", 0.84);
  if (/(?:solo me necesitas a mi|no necesitas a nadie|nadie te quiere como yo)/.test(text)) mark("isolation", 0.86);

  if (/(?:jamas (?:te )?(?:insult[a-z]*|golpe[a-z]*|dij[a-z]*)|nunca pas[a-z]*|te lo est[a-z]* imagin[a-z]*|te lo imagin[a-z]*|est[a-z]* invent[a-z]*|est[a-z]* loca|exager[a-z]*|hac[a-z]* drama|nadie te (?:va a |podr[a-z]* )?cre[a-z]*|te castig[a-z]*|te ignor[a-z]* para|no merec[a-z]*|no val[a-z]* nada|er[a-z]* ridicul[a-z]*)/.test(text)) mark("manipulation", 0.85);
  if (/(?:me obligas|me haces|me provocas|por tu culpa).{0,45}(?:te golpe|te pegu|te peg|te mat|te agred|te lastim|hacerte dano|te haga dano)/.test(text)) mark("manipulation", 0.91);
  if (/(?:me oblig[a-z]*|me provoc[a-z]*|me hac[a-z]*|me hic[a-z]*|por tu culpa|tu me llev[a-z]*).{0,65}(?:te (?:golpe|peg|pegu|mat|agred|lastim|asesin|apunal|estrangul)|hacerte dano|te haga dano)/.test(text)) mark("manipulation", 0.91);
  if (/(?:te humill[a-z]*|te insult[a-z]*|te degrad[a-z]*|te castig[a-z]*|te manipul[a-z]*|te ridiculiz[a-z]*|te menospreci[a-z]*|te invalid[a-z]*|te culp[a-z]*).{0,65}(?:para que|porque|por tu culpa|te lo merec[a-z]*|aprend[a-z]*|obedezc[a-z]*)/.test(text)) mark("manipulation", 0.84);

  const intimateContent = /(?:fotos?|imagenes?|videos?).{0,25}(?:desnud|intim|sin ropa)|(?:desnud|intim).{0,25}(?:fotos?|imagenes?|videos?)/.test(text);
  const exposure = /(?:decir[a-z]*|dic[a-z]*|dig[a-z]*|dij[a-z]*|dir[a-z]*|cont[a-z]*|cuent[a-z]*|public[a-z]*|publiqu[a-z]*|sub[a-z]*|envi[a-z]*|revel[a-z]*|difund[a-z]*|expon[a-z]*|expong[a-z]*|mostr[a-z]*|muestr[a-z]*)/.test(text);
  const identity = /(?:bisexual|lesbiana|gay|trans|queer|orientacion|sexualidad|te gustan las mujeres|te gustan los hombres|sales con mujeres|sales con hombres|lo nuestro|closet)/.test(text);
  if ((intimateContent && (demand || exposure || /(?:si no|o les|o le)/.test(text))) || (identity && exposure)) mark("sexual", 0.88, exposure);
  if (/(?:sin condon|sin proteccion|no us[a-z]* anticonceptiv[a-z]*|oblig[a-z]* a tener sexo|si no te acuest[a-z]*)/.test(text)) mark("sexual", 0.85);
  if (/(?:oblig[a-z]*|forz[a-z]*|forc[a-z]*|coaccion[a-z]*|presion[a-z]*|exig[a-z]*|exij[a-z]*|chantaj[a-z]*|amenaz[a-z]*).{0,75}(?:sexo|sexual|acost[a-z]*|acuest[a-z]*|desnud[a-z]*|foto[a-z]* intim[a-z]*|embaraz[a-z]*|anticonceptiv[a-z]*|condon|proteccion|abort[a-z]*)/.test(text)) mark("sexual", 0.88);

  const asset = /(?:dinero|plata|salario|sueldo|tarjeta|cuenta|documentos|papeles|llaves|casa|departamento|carro|computadora|pertenencias|cosas|prestamo|deuda)/.test(text);
  const financialControl = /(?:dame|qued[a-z]*|ret[eiu][a-z]*|retuv[a-z]*|reteng[a-z]*|quit[a-z]*|confisc[a-z]*|apropi[a-z]*|control[a-z]*|manej[a-z]*|administr[a-z]*|decid[a-z]*|decis[a-z]*|decidier[a-z]*|no te d[a-z]*|no vas a trabajar|no pued[a-z]* trabajar|impid[a-z]* trabaj[a-z]*|imped[a-z]* trabaj[a-z]*|romp[a-z]*|vend[a-z]*|vendi[a-z]*|vender[a-z]*|dan[a-z]*|destru[a-z]*|destruy[a-z]*|rob[a-z]*|embarg[a-z]*|firm[a-z]*|a tu nombre)/.test(text);
  if (asset && financialControl && !respectful) mark("economic", 0.85);

  const directPhysicalThreat = hasPhysicalThreat(text) || /(?:reventar(?:te)? la cara|romperte la cara|te dej[a-z]* marcada|voy a hacerte dano|te voy a encontrar|levant[a-z]* la mano|algo te va a pasar)/.test(text);
  const intimidation = /(?:v[a-z]* a ver|te (?:vas a |har[a-z]* )?arrepent[a-z]*|te arruin[a-z]*|te destru[a-z]*|te destruy[a-z]*|nadie te (?:va a |podr[a-z]* )?salv[a-z]*|si no er[a-z]* mia|no respond[a-z]* por lo que pas[a-z]*|(?:voy a |ir[a-z]* a )?busc[a-z]*te|te esper[a-z]* afuera|si me denunci[a-z]*)/.test(text);
  const coerciveSelfHarm = /(?:si me dej[a-z]*|si termin[a-z]*|si te v[a-z]*|si te fuer[a-z]*|si me abandon[a-z]*).{0,90}(?:me mat[a-z]*|me voy a matar|me quitar[a-z]* la vida|me quit[a-z]* la vida|me hag[a-z]* dano|me hac[a-z]* dano|hacerme dano|me suicid[a-z]*)/.test(text);
  if (directPhysicalThreat || coerciveSelfHarm) mark("threat", 0.96, true);
  else if (intimidation || (identity && exposure) || (intimateContent && exposure)) mark("threat", 0.81, Boolean(identity && exposure));

  return signals;
}

export function classifySemantically(message: string): SemanticMatch[] {
  const tokens = tokenize(message);
  if (tokens.length < 1) return [];

  const { weightedFeatures, magnitude } = vectorize(tokens);
  const signals = contextSignals(message);
  if (signals.size === 0) return [];

  const bestByCategory = new Map<string, { example: TrainingExample; similarity: number }>();
  for (const example of trainingExamples) {
    if (!signals.has(example.category)) continue;
    const similarity = cosine(weightedFeatures, magnitude, example);
    const current = bestByCategory.get(example.category);
    if (!current || similarity > current.similarity) bestByCategory.set(example.category, { example, similarity });
  }

  return [...bestByCategory.entries()].flatMap(([category, match]) => {
    const signal = signals.get(category);
    if (!signal) return [];
    const confidence = Math.min(0.99, signal.strength * 0.72 + Math.min(match.similarity, 0.85) * 0.28);
    if (confidence < 0.54) return [];
    return [{ category, sourceCategory: match.example.sourceCategory, phrase: match.example.phrase, confidence: Math.round(confidence * 100), severe: signal.severe }];
  });
}
