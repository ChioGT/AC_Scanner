import { referenceExampleCount, referenceGroups } from "./violence-reference.ts";
import { classifySemantically, type SemanticMatch } from "./semantic-classifier.ts";
import { hasPhysicalThreat, physicalThreatPattern } from "./spanish-violence-language.ts";

export type Level = "green" | "yellow" | "orange" | "red";

export type Finding = {
  category: string;
  label: string;
  excerpt: string;
  explanation: string;
  weight: number;
  icon: string;
  sourceCategories: string[];
  analysisMethod: "reference" | "pattern" | "semantic";
  confidence: number;
};

export type Result = {
  score: number;
  level: Level;
  findings: Finding[];
  messageCount: number;
  repeated: boolean;
};

type DetectionRule = {
  category: string;
  label: string;
  icon: string;
  weight: number;
  explanation: string;
  patterns: RegExp[];
};

export { referenceExampleCount, referenceGroups };

function normalizeForComparison(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function removeChatPrefix(value: string): string {
  if (allNormalizedReferencePhrases.has(normalizeForComparison(value))) return value.trim();

  return value
    .replace(/^\[?\d{1,2}[/.\-]\d{1,2}(?:[/.\-]\d{2,4})?,?\s+\d{1,2}:\d{2}(?:\s*[ap]\.?\s*m\.?)?\]?\s*[-–]?\s*[^:]{1,40}:\s*/i, "")
    .replace(/^[^:]{1,35}:\s*/, "")
    .trim();
}

const normalizedReferenceGroups = referenceGroups.map((group) => ({
  ...group,
  normalizedPhrases: group.phrases.map(normalizeForComparison),
}));

const allNormalizedReferencePhrases = new Set(
  normalizedReferenceGroups.flatMap((group) => group.normalizedPhrases),
);

function matchingReferenceGroups(message: string) {
  const normalizedMessage = normalizeForComparison(removeChatPrefix(message));
  if (!normalizedMessage) return [];

  return normalizedReferenceGroups.filter((group) => group.normalizedPhrases.some((phrase) =>
    normalizedMessage === phrase ||
    (phrase.length >= 22 && ` ${normalizedMessage} `.includes(` ${phrase} `)),
  ));
}

export const scenarios = [
  {
    id: "control",
    label: "Control y amenaza",
    icon: "◉",
    text: "Alex: ¿Por qué no contestas? Ya pasaron 10 minutos.\nAlex: Mándame tu ubicación ahora mismo.\nAlex: Si me amaras me darías la contraseña de tu celular.\nAlex: No quiero que vuelvas a salir con tus amigas.\nAlex: Si vuelves a verme la cara, vas a ver lo que pasa.",
  },
  {
    id: "manipulation",
    label: "Manipulación y chantaje",
    icon: "◌",
    text: "Dani: Estás exagerando, eso nunca pasó.\nDani: Todo el mundo piensa que estás loca.\nDani: Después de todo lo que hago por ti, me debes esto.\nDani: Si me dejas voy a hacerme daño y será por tu culpa.",
  },
  {
    id: "outing",
    label: "Amenaza de outing",
    icon: "◇",
    text: "Sam: Si terminas conmigo le voy a contar a tu familia que estás con una mujer.\nSam: Nadie te va a aceptar como eres.\nSam: Dame acceso a tus redes o les envío nuestras fotos.",
  },
  {
    id: "healthy",
    label: "Vínculo respetuoso",
    icon: "♡",
    text: "Jo: ¿Llegaste bien? Avísame cuando puedas, sin apuro.\nJo: Disfruta con tus amigas; nos vemos mañana.\nJo: Siento lo que dije. ¿Podemos conversarlo cuando te sientas cómoda?",
  },
] as const;

const rules: DetectionRule[] = [
  {
    category: "control",
    label: "Control digital y celos coercitivos",
    icon: "◉",
    weight: 22,
    explanation: "La vigilancia digital, las exigencias de acceso, la supervisión constante y los celos utilizados para restringir conductas afectan tu autonomía y privacidad.",
    patterns: [/(?:m[aá]ndame|env[ií]ame|p[aá]same|dame|comparte|activa)\s+(?:la\s+|tu\s+)?ubicaci[oó]n/i, /(?:dame|dar[ií]as|necesito|quiero|exijo|p[aá]same)\s+(?:la\s+|tu\s+)?(?:contrase[ñn]a|clave)/i, /por qu[eé] no contestas|cont[eé]stame\s*(?:[!¡]|ya|ahora|de inmediato)|resp[oó]ndeme\s*(?:[!¡]|ya|ahora|de inmediato)|responde ahora|en l[ií]nea y no me respond/i, /(?:revisar|reviso|revisar[eé]|revisarte|ens[eé][ñn]ame)\s+(?:tu|el|tus|con qui[eé]n)\s+(?:celular|tel[eé]fono|redes|seguidores|chats|hablas)/i, /(?:dame|quiero|exijo)\s+acceso a tus redes/i, /(?:captura|capturas)\s+de\s+(?:tus|tu)\s+(?:chats|galer[ií]a|conversaciones)/i, /(?:bloqu[eé]alo|b[oó]rralo|elim[ií]nalo).{0,25}(?:o terminamos|si me quieres)/i, /mis celos son culpa tuya|yo solo te celo|t[uú] provocas mis celos/i, /d[oó]nde est[aá]s\s*(?:ahora|ya|contesta|responde)/i, /(?:m[aá]ndame|env[ií]ame)\s+(?:una\s+)?foto\s+(?:ahora|ya|de d[oó]nde|para saber)/i],
  },
  {
    category: "isolation",
    label: "Aislamiento y restricción de redes",
    icon: "↗",
    weight: 23,
    explanation: "Intentar separar a una persona de sus amistades, familia o espacios propios es una forma de control coercitivo.",
    patterns: [/no quiero que (?:vuelvas a )?sal(?:ir|gas)/i, /no (?:veas|hables|salgas) (?:a|con)/i, /tus (?:amigas|amistades|amigos)\s+(?:son|te)/i, /deja (?:a|de ver a) tu familia/i, /te proh[ií]bo/i, /no puedes (?:salir|trabajar|estudiar)/i, /no (?:vayas|quiero que vayas) a terapia/i, /(?:no quiero|prefiero) que no?\s*(?:veas|hables|salgas|vayas)/i, /no necesitas a nadie m[aá]s/i, /elige.{0,8}(?:ellos|ellas|tu familia).{0,8}yo/i, /no hables con nadie de lo que pasa/i, /no quiero que salgas con gente queer/i],
  },
  {
    category: "manipulation",
    label: "Violencia psicológica y gaslighting",
    icon: "〰",
    weight: 20,
    explanation: "La humillación, el castigo emocional, la invalidación y el gaslighting pueden hacerte dudar de tu experiencia y deteriorar tu seguridad personal.",
    patterns: [/est[aá]s exagerando|siempre exageras/i, /(?:eso|esto) nunca pas[oó]|yo nunca dije eso/i, /est[aá]s (?:loca|inventando|malinterpretando|confundiendo)/i, /si me amaras/i, /por tu culpa/i, /me obligas\s+(?:a\s+)?(?:que\s+)?(?:luego\s+)?(?:te\s+)?(?:golpe|pegu|peg|mat|agred|lastim|haga|hacer)/i, /(?:t[uú]\s+)?(?:haces|provocas|consigues)\s+que\s+(?:luego\s+)?te\s+(?:golpe|pegu|peg|mat|agred|lastim)/i, /me debes/i, /nadie te va a (?:querer|aceptar|aguantar|creer|tomar en serio)/i, /todo el mundo piensa/i, /hacerme da[ñn]o/i, /me voy a matar/i, /(?:eres|qu[eé])\s+(?:rid[ií]cula|demasiado sensible|demasiado intensa|un problema|la t[oó]xica)/i, /(?:te voy a ignorar|te castigo con silencio|no te voy a hablar).{0,35}(?:aprendas|entiendas|castig)/i, /(?:todo|eso) (?:te lo imaginas|solo est[aá] en tu cabeza)/i, /te haces la v[ií]ctima|siempre arruinas todo|me das verg[uü]enza/i],
  },
  {
    category: "sexual",
    label: "Violencia sexual, reproductiva y por identidad",
    icon: "◇",
    weight: 30,
    explanation: "La coerción sexual o reproductiva, la difusión de material íntimo y las amenazas de revelar tu orientación o identidad vulneran el consentimiento y la privacidad.",
    patterns: [/(?:m[aá]ndame|env[ií]ame|publicar[eé]|difundir[eé])\s+(?:tus\s+)?fotos (?:[ií]ntimas|desnud)/i, /env[ií]ame (?:un nude|fotos sin ropa)/i, /si no te acuestas/i, /(?:quiero|tienes que|debes hacerlo)\s+sin (?:cond[oó]n|protecci[oó]n)/i, /no uses anticonceptivos/i, /public(?:o|ar|ar[eé]) tus fotos/i, /les env[ií]o nuestras fotos/i, /(?:voy a contar|voy a decir|le voy a contar|voy a publicar).{0,65}(?:bisexual|lesbiana|gay|trans|sales con mujeres|sales con hombres|orientaci[oó]n|lo nuestro)/i, /(?:sacar|sacarte|salir).{0,12}(?:del|de tu) cl[oó]set/i, /(?:hacer p[uú]blico|publicar).{0,30}(?:lo nuestro|tu orientaci[oó]n|tus cosas [ií]ntimas)/i],
  },
  {
    category: "economic",
    label: "Violencia económica y patrimonial",
    icon: "¤",
    weight: 25,
    explanation: "Controlar ingresos, bienes, vivienda, documentos o deudas, así como destruir pertenencias o impedir trabajar, puede crear dependencia y reducir tu libertad.",
    patterns: [/dame (?:tu sueldo|tu dinero|tu tarjeta)/i, /no (?:puedes|vas a|necesitas) trabajar/i, /tu (?:dinero|plata)\s+(?:tambi[eé]n\s+)?es m[ií]a?/i, /pr[eé]stamo a tu nombre/i, /te quito (?:la casa|el carro|todo|las llaves)/i, /yo (?:decido|manejo|administro)\s+(?:(?:qu[eé]|en qu[eé]) gastas|tu sueldo|tu dinero)/i, /(?:voy a|te voy a)\s+(?:romper|vender|da[ñn]ar|botar|quedarme con)\s+(?:tus|tu|la)\s+(?:cosas|ropa|computadora|documentos|celular)/i, /no te (?:doy|dar[eé])\s+(?:ni un centavo|dinero|plata)/i, /sin (?:tus papeles|casa)|te quedas sin casa/i],
  },
  {
    category: "threat",
    label: "Amenazas, intimidación y violencia física",
    icon: "!",
    weight: 45,
    explanation: "Una amenaza de agresión, exposición, represalia o autolesión utilizada para presionar exige valorar cuidadosamente tu seguridad.",
    patterns: [/vas a ver(?: lo que pasa)?/i, physicalThreatPattern, /te (?:vas a )?arrepentir[aá]?s?/i, /le voy a contar (?:todo )?a tu familia/i, /(?:voy a )?public(?:o|ar[eé]|ar) (?:tus|las) fotos/i, /(?:te hago|puedo hacerte) da[ñn]o/i, /les env[ií]o nuestras fotos/i, /si (?:me dejas|terminas conmigo).{0,80}(?:hacerme da[ñn]o|matarme|quitarme la vida)/i, /(?:hacerme da[ñn]o|matarme|quitarme la vida).{0,60}(?:por tu culpa|si me dejas)/i, /(?:s[eé]|se) d[oó]nde (?:vives|trabajas)/i, /(?:te voy a|voy a)\s+(?:destruir|arruinar).{0,20}(?:reputaci[oó]n|vida)/i, /(?:si me denuncias|si hablas).{0,35}(?:te va peor|te parto|te hago)/i, /si no eres m[ií]a.{0,15}no eres de nadie/i, /(?:te voy a|voy a)\s+(?:buscar|agarrar|esperar).{0,45}(?:sola|afuera|donde|aunque)/i, /(?:los reviento|levantar la mano|algo te va a pasar)/i],
  },
];

export const violenceCategories = rules.map(({ category, label, icon }) => ({ category, label, icon }));

const severeThreat = /te\s+(?:(?:voy a|pienso|quiero)\s+)?(?:mat(?:ar|o|e)|golpe(?:ar|o|e)|peg(?:ar|o|ue)|asesin(?:ar|o|e)|apu[ñn]al(?:ar|o|e)|estrangul(?:ar|o|e)|revent(?:ar|o|e)|revient(?:o|e)|agred(?:ir|o|a)|part(?:ir|o|a)|romp(?:er|o|a)\s+la cara|dej(?:ar|o|e) marcada|ha(?:go|ga) desaparecer|quit(?:ar|o|e)\s+la vida)|(?:matarme|quitarme la vida|hacerme da[ñn]o).{0,60}(?:por tu culpa|si me dejas)|si (?:me dejas|terminas conmigo).{0,80}(?:hacerme da[ñn]o|matarme|quitarme la vida)|le voy a contar a tu familia|les env[ií]o nuestras fotos|(?:voy a )?public(?:o|ar[eé]|ar) (?:tus|las) fotos|si no eres m[ií]a.{0,15}no eres de nadie|(?:los reviento|levantar la mano|algo te va a pasar)/i;

export function analyze(text: string): Result {
  if (typeof text !== "string") throw new TypeError("La conversación debe ser texto.");
  const lines = text.split(/\r?\n+/).map((line) => line.trim()).filter(Boolean);
  const findings: Finding[] = [];
  const referencesByLine = new Map(lines.map((line) => [line, matchingReferenceGroups(line)]));
  const semanticByLine = new Map<string, SemanticMatch[]>(
    lines.map((line) => [line, classifySemantically(removeChatPrefix(line))]),
  );

  for (const rule of rules) {
    const matching = lines.filter((line) =>
      rule.patterns.some((pattern) => pattern.test(removeChatPrefix(line))) ||
      referencesByLine.get(line)?.some((group) => group.category === rule.category) ||
      semanticByLine.get(line)?.some((match) => match.category === rule.category),
    );
    if (matching.length) {
      const exactSourceCategories = matching.flatMap((line) =>
        (referencesByLine.get(line) ?? [])
          .filter((group) => group.category === rule.category)
          .map((group) => group.sourceCategory.replace(/^\d+\.\s*/, "")),
      );
      const semanticMatches = matching.flatMap((line) =>
        (semanticByLine.get(line) ?? []).filter((match) => match.category === rule.category),
      );
      const sourceCategories = [...new Set([...exactSourceCategories, ...semanticMatches.map((match) => match.sourceCategory)])];
      const patternMatched = matching.some((line) => rule.patterns.some((pattern) => pattern.test(removeChatPrefix(line))));
      const analysisMethod = exactSourceCategories.length > 0 ? "reference" : patternMatched ? "pattern" : "semantic";
      findings.push({
        category: rule.category,
        label: rule.label,
        excerpt: removeChatPrefix(matching[0]),
        explanation: rule.explanation,
        weight: Math.min(rule.weight + (matching.length - 1) * 7, rule.weight + 16),
        icon: rule.icon,
        sourceCategories,
        analysisMethod,
        confidence: exactSourceCategories.length > 0 ? 100 : Math.max(...semanticMatches.map((match) => match.confidence), patternMatched ? 82 : 0),
      });
    }
  }

  const hasThreat = findings.some((finding) => finding.category === "threat");
  const hasSevereThreat = lines.some((line) =>
    hasPhysicalThreat(removeChatPrefix(line)) ||
    severeThreat.test(removeChatPrefix(line)) ||
    referencesByLine.get(line)?.some((group) => group.sourceCategory === "Amenaza de violencia física") ||
    semanticByLine.get(line)?.some((match) => match.category === "threat" && match.severe),
  );
  const hasIdentityOrSexualViolence = findings.some((finding) => finding.category === "sexual");
  const baseScore = findings.reduce((sum, item) => sum + item.weight, 0) + (findings.length >= 3 ? 8 : 0);
  const score = Math.min(98, hasSevereThreat ? Math.max(baseScore, 80) : baseScore);
  const level: Level = hasSevereThreat || score >= 70 || (hasThreat && findings.length > 1)
    ? "red"
    : hasThreat || hasIdentityOrSexualViolence || score >= 40
      ? "orange"
      : score > 0
        ? "yellow"
        : "green";

  return { score, level, findings, messageCount: lines.length, repeated: findings.length >= 2 };
}

export function replyFor(input: string, result: Result | null): string {
  const value = input.toLowerCase();
  if (/suicid|matarse|matarme|hacerse da[ñn]o|hacerme da[ñn]o|quitarse la vida/.test(value)) return "Una amenaza de autolesión debe tomarse en serio, pero no eres responsable de evitarla permaneciendo en una relación. Si existe peligro inmediato y puedes hacerlo sin exponerte, llama al ECU 911 o contacta a una persona cercana a quien amenaza. Prioriza también tu propia seguridad.";
  if (/exager|loca|culpa/.test(value)) return "No tienes que demostrar que una situación es suficientemente grave para tomar en serio tu incomodidad. La culpa, la minimización y hacerte dudar de lo que recuerdas pueden ser formas de manipulación. ¿Hay alguien de confianza con quien puedas hablar sin aumentar tu riesgo?";
  if (/denunci|polic|911|emerg|buscar ayuda|pedir ayuda/.test(value)) return "Si hay peligro inmediato en Ecuador, puedes llamar al ECU 911 si hacerlo es seguro. También puedes identificar una persona de confianza o un servicio especializado. Buscar asesoría o denunciar es una decisión que debe considerar tu contexto; la aplicación no contacta a nadie automáticamente.";
  if (/contrase|ubicaci|celular|revisa/.test(value)) return "Una relación respetuosa no requiere entregar contraseñas, compartir la ubicación permanentemente ni responder de inmediato. Pedir acceso como prueba de amor puede ser control, especialmente si hay presión, amenazas o represalias.";
  if (/familia|outing|orientaci|sexualidad|trans/.test(value)) return "Amenazar con revelar tu orientación sexual o identidad de género sin tu consentimiento es una forma de coerción. Tu privacidad te pertenece. Antes de buscar apoyo, considera qué persona o espacio es realmente seguro para ti.";
  if (/salir|irme|terminar|dejar/.test(value)) return "Terminar o confrontar puede aumentar el riesgo en algunos contextos. No tienes que tomar decisiones apresuradas. Si puedes, identifica un lugar seguro, una persona de confianza y una forma discreta de pedir ayuda antes de actuar.";
  const mentionedRisk = analyze(input);
  if (mentionedRisk.level === "red") return "Lo que describes contiene una señal de riesgo alto. Si existe peligro inmediato y hacerlo es seguro, llama al ECU 911. Evita confrontar a la persona si eso puede aumentar tu exposición y busca a alguien de confianza.";
  if (mentionedRisk.findings.length > 0) {
    const labels = mentionedRisk.findings.map((finding) => finding.label.toLowerCase()).join(" y ");
    return `En lo que cuentas aparecen señales compatibles con ${labels}. ${mentionedRisk.findings[0].explanation} No es tu culpa y podemos pensar en opciones de apoyo que no aumenten tu riesgo.`;
  }
  if (result?.level === "red") return "En los mensajes analizados aparecen señales de riesgo alto. Lo más importante ahora es tu seguridad: evita confrontaciones si podrían exponerte y piensa si existe una persona de confianza o un lugar seguro al que puedas acudir.";
  return "Gracias por compartirlo. Podemos revisar lo que ocurrió sin juzgarte. ¿Qué parte de la situación te hizo sentir incómoda, presionada o insegura? Recuerda: esta orientación es informativa y no sustituye apoyo profesional.";
}
