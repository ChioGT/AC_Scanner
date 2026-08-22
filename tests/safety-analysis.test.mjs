import assert from "node:assert/strict";
import test from "node:test";

import { analyze, referenceExampleCount, referenceGroups, replyFor, scenarios } from "../app/safety-analysis.ts";

test("loads all 270 workbook examples and maps nine source columns to six categories", () => {
  assert.equal(referenceExampleCount, 270);
  assert.equal(referenceGroups.length, 9);
  assert.equal(new Set(referenceGroups.map(({ category }) => category)).size, 6);
  for (const group of referenceGroups) assert.equal(group.phrases.length, 30);
});

for (const group of referenceGroups) {
  test(`recognizes all 30 workbook examples from ${group.sourceCategory}`, () => {
    for (const phrase of group.phrases) {
      const result = analyze(phrase);
      assert.ok(
        result.findings.some(({ category }) => category === group.category),
        `Expected ${group.category} for workbook phrase: ${phrase}`,
      );
      assert.notEqual(result.level, "green", `Workbook phrase must not be marked green: ${phrase}`);
    }
  });
}

test("classifies every workbook physical-violence threat as high risk", () => {
  const physicalThreats = referenceGroups.find(({ sourceCategory }) => sourceCategory === "Amenaza de violencia física");
  assert.ok(physicalThreats);
  for (const phrase of physicalThreats.phrases) {
    assert.equal(analyze(phrase).level, "red", `Expected high risk for physical threat: ${phrase}`);
  }
});

test("identifies outing under sexual, reproductive and identity-based violence", () => {
  const result = analyze("Le voy a contar a tu familia que eres bisexual.");
  assert.ok(result.findings.some(({ category, sourceCategories }) => category === "sexual" && sourceCategories.includes("Outing")));
  assert.equal(result.level, "red");
});

test("recognizes workbook phrases with WhatsApp timestamps, quotation marks and accent changes", () => {
  const samples = [
    ["22/08/2026, 10:30 - Alex: Mandame tu ubicacion en tiempo real.", "control"],
    ["Dani: “Tu terapeuta te mete cosas en la cabeza.”", "isolation"],
    ["Sam: TU PLATA TAMBIEN ES MIA", "economic"],
    ["[22/08/2026, 10:30 a. m.] Sam: Voy a decir que eres trans.", "sexual"],
  ];
  for (const [message, category] of samples) {
    assert.ok(analyze(message).findings.some((finding) => finding.category === category), `Expected ${category}: ${message}`);
  }
});

test("classifies every demonstration scenario consistently", () => {
  assert.equal(analyze(scenarios[0].text).level, "red");
  assert.equal(analyze(scenarios[1].text).level, "red");
  assert.equal(analyze(scenarios[2].text).level, "red");
  assert.equal(analyze(scenarios[3].text).level, "green");
});

test("classifies a direct death threat as high risk even in one message", () => {
  const result = analyze("Alex: Te voy a matar.");
  assert.equal(result.level, "red");
  assert.ok(result.score >= 80);
  assert.ok(result.findings.some(({ category }) => category === "threat"));
});

test("classifies direct present-tense physical and death threats as high risk", () => {
  const threats = [
    "si me dejas te mato",
    "Si me dejas, te mato.",
    "te mato",
    "te pego",
    "te golpeo",
    "te asesino",
    "te apuñalo",
    "te estrangulo",
    "te reviento",
    "te hago desaparecer",
    "si terminamos te hago desaparecer",
    "si me denuncias te mato",
    "si sales de la casa te pego",
    "si te veo con otra persona te golpeo",
    "si me dejas te quito la vida",
  ];

  for (const message of threats) {
    const result = analyze(message);
    assert.equal(result.level, "red", `Direct threat must be high risk: ${message}`);
    assert.ok(result.score >= 80, `Direct threat needs a high score: ${message}`);
    assert.ok(result.findings.some(({ category }) => category === "threat"), `Threat category missing: ${message}`);
  }
});

test("classifies coercive self-harm threats as high risk", () => {
  const result = analyze("Si me dejas voy a hacerme daño y será por tu culpa.");
  assert.equal(result.level, "red");
  assert.ok(result.findings.some(({ category }) => category === "threat"));
  assert.match(replyFor("Amenaza con matarse si lo dejo", result), /911|seguridad/i);
});

test("recognizes Spanish violent verbs across tenses, moods and verbal constructions", () => {
  const threats = [
    "te golpeo", "te golpeé", "te golpeaba", "te golpearé", "te golpearía", "te golpee", "te golpeara", "te golpease",
    "te pego", "te pegué", "te pegaba", "te pegaré", "te pegaría", "te pegue", "te pegara",
    "te mato", "te maté", "te mataba", "te mataré", "te mataría", "te mate", "te matara", "te matase",
    "te asesinaré", "te asesinaría", "te asesine", "te estrangularé", "te estrangularía", "te estrangule",
    "te apuñalaré", "te apuñalaría", "te apuñale", "te agrediré", "te agrediría", "te agreda",
    "te voy a golpear", "te iba a pegar", "te podría matar", "te terminaré golpeando", "te acabaré agrediendo",
  ];

  for (const message of threats) {
    const result = analyze(message);
    assert.equal(result.level, "red", `Conjugated physical violence must be high risk: ${message}`);
    assert.ok(result.findings.some(({ category }) => category === "threat"), `Threat category missing: ${message}`);
  }
});

test("recognizes conjugated coercive language across all six violence categories", () => {
  const samples = [
    ["Vigilaré tu celular y revisaré tus conversaciones.", "control"],
    ["Te prohibiría hablar con tus amigas y te aislaré de tu familia.", "isolation"],
    ["Me obligarás a que te golpee; por tu culpa sucede esto.", "manipulation"],
    ["Te obligaría a tener sexo y te presionaré para quedar embarazada.", "sexual"],
    ["Confiscaré tu salario y administraría todo tu dinero.", "economic"],
    ["Me obligas a que luego te golpee.", "threat"],
  ];

  for (const [message, category] of samples) {
    assert.ok(analyze(message).findings.some((finding) => finding.category === category), `Expected ${category}: ${message}`);
  }
});

test("normalizes Spanish verb conjugations across all six violence categories", () => {
  const samples = {
    control: [
      "Vigilo tu celular y todas tus conversaciones.", "Vigilaba tu celular y todas tus conversaciones.",
      "Vigilaré tu celular y todas tus conversaciones.", "Vigilaría tu celular y todas tus conversaciones.",
      "Vigilarás tu celular y me enseñarás tus conversaciones.", "Exigí tu contraseña y tus mensajes.",
      "Exigía tu contraseña y tus mensajes.", "Exigiré tu contraseña y tus mensajes.",
      "Exigiría tu contraseña y tus mensajes.", "Espiaré tus redes y rastrearé tu ubicación.",
    ],
    isolation: [
      "Te prohíbo hablar con tus amigas.", "Te prohibí hablar con tus amigas.",
      "Te prohibía hablar con tus amigas.", "Te prohibiré hablar con tus amigas.",
      "Te prohibiría hablar con tus amigas.", "Te impediré ver a tu familia.",
      "Te impediría ver a tu familia.", "Te aislaré de tus amistades.",
      "Te aislaba de tus amistades.", "Te separaría de tu familia.",
    ],
    manipulation: [
      "Te humillo porque te lo mereces.", "Te humillaba porque te lo merecías.",
      "Te humillaré para que aprendas.", "Te humillaría para que obedezcas.",
      "Te insulté porque te lo mereces.", "Te insultaría para que aprendas.",
      "Te castigaba para que aprendas.", "Te castigaré para que obedezcas.",
      "Me obligaste a que te golpeara.", "Me obligarías a que te golpease.",
    ],
    sexual: [
      "Te obligo a tener sexo.", "Te obligaba a tener sexo.",
      "Te obligaré a tener sexo.", "Te obligaría a tener sexo.",
      "Te forcé a tener sexo.", "Te forzaría a quedar embarazada.",
      "Publicaré tus fotos íntimas.", "Publicaría tus fotos íntimas.",
      "Difundiré tus fotos desnuda.", "Le diría a tu familia que eres bisexual.",
    ],
    economic: [
      "Confisco tu salario y tu dinero.", "Confiscaba tu salario y tu dinero.",
      "Confiscaré tu salario y tu dinero.", "Confiscaría tu salario y tu dinero.",
      "Retengo tus documentos y tu dinero.", "Retuve tus documentos y tu dinero.",
      "Retendría tus documentos y tu dinero.", "Destruiré tus documentos y tu computadora.",
      "Vendería tu carro y tu casa.", "Me apropiaré de tu salario y tu casa.",
    ],
    threat: [
      "Voy a golpearte.", "Terminaría pegándote.", "Habría podido matarte.",
      "Pensaba estrangularte.", "Podría apuñalarte.", "Te abofetearé.",
      "Te cachetearía.", "Te patearé.", "Te torturaría.", "Te desfiguraré.",
    ],
  };

  for (const [category, phrases] of Object.entries(samples)) {
    for (const phrase of phrases) {
      const result = analyze(phrase);
      assert.ok(result.findings.some((finding) => finding.category === category), `Expected ${category}: ${phrase}`);
      if (category === "threat") assert.equal(result.level, "red", `Violent verb must be high risk: ${phrase}`);
    }
  }
});

test("keeps negated violence and respectful consent from becoming false positives", () => {
  for (const phrase of ["Nunca te golpearía.", "Jamás voy a golpearte.", "No pienso pegarte."]) {
    assert.ok(!analyze(phrase).findings.some(({ category }) => category === "threat"), phrase);
  }
});

test("detects blame-shifting physical threats in subjunctive verb forms", () => {
  const threats = [
    "contestame! me obligas a que luego te golpee",
    "¡Contéstame! Me obligas a que luego te golpee.",
    "me obligas a que te pegue",
    "por tu culpa voy a terminar haciendo que te mate",
    "me provocas para que te agreda",
    "me obligas a que te asesine",
    "me haces que te apuñale",
    "me obligas a que te estrangule",
    "me provocas para que te reviente",
    "me obligas a que te parta la cara",
  ];

  for (const message of threats) {
    const result = analyze(message);
    assert.equal(result.level, "red", `Subjunctive physical threat must be high risk: ${message}`);
    assert.ok(result.score >= 80, `Subjunctive threat needs a high score: ${message}`);
    assert.ok(result.findings.some(({ category }) => category === "threat"), `Threat category missing: ${message}`);
  }

  const reportedCase = analyze("contestame! me obligas a que luego te golpee");
  assert.ok(reportedCase.findings.some(({ category }) => category === "control"));
  assert.ok(reportedCase.findings.some(({ category }) => category === "manipulation"));
});

test("does not mistake consensual location sharing for coercive control", () => {
  const result = analyze("¿Me compartes tu ubicación cuando puedas, si quieres?");
  assert.equal(result.level, "green");
});

test("does not flag a respectful breakup response as a threat", () => {
  const result = analyze("Si terminas conmigo, respetaré tu decisión.");
  assert.equal(result.level, "green");
});

test("detects economic, sexual and isolation patterns", () => {
  assert.ok(analyze("Dame tu sueldo, tu dinero es mío.").findings.some(({ category }) => category === "economic"));
  assert.ok(analyze("Envíame fotos sin ropa o les envío nuestras fotos.").findings.some(({ category }) => category === "sexual"));
  assert.ok(analyze("No quiero que vuelvas a salir con tus amigas.").findings.some(({ category }) => category === "isolation"));
});

test("provides concrete support information when asked how to find help", () => {
  assert.match(replyFor("¿Cómo puedo buscar ayuda?", null), /911|confianza/i);
});

test("returns no findings for empty input", () => {
  const result = analyze("   \n  ");
  assert.equal(result.level, "green");
  assert.equal(result.messageCount, 0);
  assert.equal(result.findings.length, 0);
});

test("detects new paraphrased messages across all six categories", () => {
  const samples = [
    ["Quiero que me mandes tu localización y me enseñes todas tus conversaciones.", "control"],
    ["No vuelvas a hablar con tu mejor amiga, solo me necesitas a mí.", "isolation"],
    ["Yo jamás te insulté, te lo estás imaginando y nadie te va a creer.", "manipulation"],
    ["Voy a decirles a tus papás que te gustan las mujeres.", "sexual"],
    ["A partir de hoy yo voy a quedarme con tu salario y tus documentos.", "economic"],
    ["Como vuelvas a salir sola te reviento la cara.", "threat"],
    ["Si no me mandas fotos desnuda le cuento a todos lo nuestro.", "sexual"],
  ];

  for (const [message, category] of samples) {
    const result = analyze(message);
    assert.ok(result.findings.some((finding) => finding.category === category), `Expected ${category} for new message: ${message}`);
    assert.notEqual(result.level, "green");
  }
});

test("semantic physical threats trigger high risk without an exact workbook match", () => {
  const result = analyze("Como vuelvas a salir sola te reviento la cara.");
  assert.equal(result.level, "red");
  assert.ok(result.score >= 80);
});

test("semantic analysis includes category-specific evidence and confidence", () => {
  const finding = analyze("A partir de hoy yo voy a quedarme con tu salario y tus documentos.")
    .findings.find(({ category }) => category === "economic");
  assert.ok(finding);
  assert.equal(finding.analysisMethod, "semantic");
  assert.ok(finding.confidence >= 54);
  assert.ok(finding.sourceCategories.includes("Violencia Patrimonial"));
});

test("does not flag respectful location requests or consensual relationship conversations", () => {
  const examples = [
    "Dime dónde estás, necesito tu ubicación para saber que llegaste bien, si quieres.",
    "¿Quieres contarle a tu familia sobre nuestra relación cuando te sientas lista?",
    "Si terminas conmigo, respeto tu decisión y te deseo lo mejor.",
  ];
  for (const message of examples) assert.equal(analyze(message).level, "green", message);
});

test("support assistant adapts its response to newly described economic violence", () => {
  const answer = replyFor("Mi pareja quiere quedarse con mi salario y mis documentos.", null);
  assert.match(answer, /económica|patrimonial|ingresos|documentos/i);
});
