import { mkdirSync } from "node:fs";
import { test, type Page } from "@playwright/test";
import { closeDb, createClass, createUser, signIn, sql } from "../helpers";

/**
 * Captures the app views and animation frames used on the marketing page (#58).
 * Not part of the normal runs: `pnpm media:capture` (playwright --project=media)
 * against a production build, then `pnpm media` turns the frames into public/marketing/*. Seeds a realistic sample course so the screens show real
 * content, in Light and Dark.
 */
const OUT = process.env.MEDIA_OUT ?? "tmp/media";
const PHONE = { width: 390, height: 844 };

// ---------------------------------------------------------------- sample content
const diagram = {
  overview: `<svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg"><defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs><circle cx="62" cy="52" r="24" fill="var(--accent)" fill-opacity="0.25" stroke="var(--accent)" stroke-width="2"/><text x="62" y="57" font-size="13" text-anchor="middle" fill="currentColor">Light</text><path d="M200 70 C150 80 140 160 200 182 C260 160 250 80 200 70z" fill="var(--accent)" fill-opacity="0.15" stroke="var(--accent)" stroke-width="2"/><path d="M200 78 V176" stroke="var(--accent)" stroke-width="1.5"/><text x="200" y="134" font-size="13" text-anchor="middle" fill="currentColor">Leaf</text><path d="M86 62 L160 100" stroke="currentColor" stroke-width="1.6" marker-end="url(#a)"/><path d="M40 130 H150" stroke="currentColor" stroke-width="1.6" marker-end="url(#a)"/><text x="40" y="122" font-size="12" fill="currentColor">Carbon dioxide</text><path d="M40 176 H150" stroke="currentColor" stroke-width="1.6" marker-end="url(#a)"/><text x="40" y="168" font-size="12" fill="currentColor">Water</text><path d="M250 112 H360" stroke="currentColor" stroke-width="1.6" marker-end="url(#a)"/><text x="262" y="104" font-size="12" fill="currentColor">Oxygen</text><path d="M250 158 H360" stroke="currentColor" stroke-width="1.6" marker-end="url(#a)"/><text x="262" y="150" font-size="12" fill="currentColor">Glucose</text></svg>`,
  chloroplast: `<svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg"><ellipse cx="200" cy="110" rx="160" ry="80" fill="var(--accent)" fill-opacity="0.12" stroke="var(--accent)" stroke-width="2"/><g fill="var(--accent)" fill-opacity="0.35" stroke="var(--accent)" stroke-width="1.2"><rect x="110" y="80" width="40" height="10" rx="5"/><rect x="110" y="94" width="40" height="10" rx="5"/><rect x="110" y="108" width="40" height="10" rx="5"/><rect x="180" y="96" width="40" height="10" rx="5"/><rect x="180" y="110" width="40" height="10" rx="5"/><rect x="180" y="124" width="40" height="10" rx="5"/><rect x="250" y="84" width="40" height="10" rx="5"/><rect x="250" y="98" width="40" height="10" rx="5"/><rect x="250" y="112" width="40" height="10" rx="5"/></g><text x="130" y="150" font-size="12" text-anchor="middle" fill="currentColor">Thylakoids</text><text x="270" y="150" font-size="12" text-anchor="middle" fill="currentColor">Stroma</text><text x="200" y="210" font-size="13" text-anchor="middle" fill="currentColor">Chloroplast</text></svg>`,
  light: `<svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg"><defs><marker id="b" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs><rect x="140" y="60" width="120" height="100" rx="18" fill="var(--accent)" fill-opacity="0.15" stroke="var(--accent)" stroke-width="2"/><text x="200" y="104" font-size="13" text-anchor="middle" fill="currentColor">Thylakoid</text><text x="200" y="124" font-size="12" text-anchor="middle" fill="currentColor">membrane</text><text x="30" y="84" font-size="12" fill="currentColor">Light</text><path d="M70 80 H136" stroke="currentColor" stroke-width="1.6" marker-end="url(#b)"/><text x="30" y="144" font-size="12" fill="currentColor">Water</text><path d="M74 140 H136" stroke="currentColor" stroke-width="1.6" marker-end="url(#b)"/><path d="M264 76 H330" stroke="currentColor" stroke-width="1.6" marker-end="url(#b)"/><text x="336" y="80" font-size="12" fill="currentColor">Oxygen</text><path d="M264 110 H330" stroke="currentColor" stroke-width="1.6" marker-end="url(#b)"/><text x="336" y="114" font-size="12" fill="currentColor">ATP</text><path d="M264 144 H330" stroke="currentColor" stroke-width="1.6" marker-end="url(#b)"/><text x="336" y="148" font-size="12" fill="currentColor">NADPH</text></svg>`,
  calvin: `<svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg"><defs><marker id="c" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--accent)"/></marker></defs><path d="M200 50 A60 60 0 1 1 140 110" fill="none" stroke="var(--accent)" stroke-width="3" marker-end="url(#c)"/><text x="200" y="106" font-size="13" text-anchor="middle" fill="currentColor">Calvin</text><text x="200" y="124" font-size="13" text-anchor="middle" fill="currentColor">cycle</text><text x="40" y="54" font-size="12" fill="currentColor">Carbon dioxide</text><path d="M120 60 L150 78" stroke="currentColor" stroke-width="1.6"/><text x="292" y="196" font-size="12" fill="currentColor">Sugar</text><path d="M246 160 L284 186" stroke="currentColor" stroke-width="1.6"/><text x="300" y="54" font-size="12" fill="currentColor">ATP, NADPH</text><path d="M296 60 L258 80" stroke="currentColor" stroke-width="1.6"/></svg>`,
};

/** The overview diagram with labels in the course language (centred, so it reads the same in RTL). */
const overview = (l: { light: string; leaf: string; co2: string; water: string; o2: string; sugar: string }) =>
  `<svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg"><defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs><circle cx="62" cy="52" r="26" fill="var(--accent)" fill-opacity="0.25" stroke="var(--accent)" stroke-width="2"/><text x="62" y="57" font-size="13" text-anchor="middle" fill="currentColor">${l.light}</text><path d="M200 70 C150 80 140 160 200 182 C260 160 250 80 200 70z" fill="var(--accent)" fill-opacity="0.15" stroke="var(--accent)" stroke-width="2"/><path d="M200 78 V176" stroke="var(--accent)" stroke-width="1.5"/><text x="200" y="134" font-size="13" text-anchor="middle" fill="currentColor">${l.leaf}</text><path d="M88 64 L160 100" stroke="currentColor" stroke-width="1.6" marker-end="url(#a)"/><path d="M40 130 H150" stroke="currentColor" stroke-width="1.6" marker-end="url(#a)"/><text x="95" y="122" font-size="12" text-anchor="middle" fill="currentColor">${l.co2}</text><path d="M40 176 H150" stroke="currentColor" stroke-width="1.6" marker-end="url(#a)"/><text x="95" y="168" font-size="12" text-anchor="middle" fill="currentColor">${l.water}</text><path d="M250 112 H360" stroke="currentColor" stroke-width="1.6" marker-end="url(#a)"/><text x="305" y="104" font-size="12" text-anchor="middle" fill="currentColor">${l.o2}</text><path d="M250 158 H360" stroke="currentColor" stroke-width="1.6" marker-end="url(#a)"/><text x="305" y="150" font-size="12" text-anchor="middle" fill="currentColor">${l.sugar}</text></svg>`;

type Mod = {
  heading: string;
  body: string;
  points: string[];
  cards: { q: string; a: string }[];
  quiz: { question: string; options: string[]; answer: number; explanation: string };
  svg: string;
  caption: string;
  alt: string;
};

const english: Mod[] = [
  {
    heading: "What photosynthesis is",
    body: "Photosynthesis is how plants, algae and some bacteria turn light into chemical energy. Using sunlight, they combine carbon dioxide from the air with water from the soil to make glucose, and release oxygen.",
    points: [
      "Light energy becomes chemical energy stored in glucose.",
      "The inputs are carbon dioxide, water and light.",
      "Oxygen is released as a by-product.",
    ],
    cards: [
      { q: "What does photosynthesis produce?", a: "Glucose and oxygen." },
      { q: "Where does the carbon come from?", a: "Carbon dioxide in the air." },
    ],
    quiz: {
      question: "Which gas do plants release during photosynthesis?",
      options: ["Carbon dioxide", "Oxygen", "Nitrogen", "Methane"],
      answer: 1,
      explanation: "Oxygen is released when water molecules are split in the light reactions.",
    },
    svg: diagram.overview,
    caption: "What goes into a leaf, and what comes out.",
    alt: "Light, carbon dioxide and water go into a leaf; oxygen and glucose come out.",
  },
  {
    heading: "Inside the chloroplast",
    body: "Photosynthesis happens in chloroplasts, mostly in leaf cells. Each chloroplast holds stacks of thylakoids, where chlorophyll captures light, surrounded by a fluid called the stroma.",
    points: [
      "Chloroplasts are found mainly in leaf cells.",
      "Chlorophyll absorbs red and blue light and reflects green.",
      "Sugar is built in the stroma.",
    ],
    cards: [
      { q: "Why do leaves look green?", a: "Chlorophyll reflects green light." },
      { q: "What are thylakoids?", a: "Stacked membranes where light is captured." },
    ],
    quiz: {
      question: "Which part of the chloroplast absorbs light?",
      options: ["Stroma", "Cell wall", "Thylakoid membranes", "Nucleus"],
      answer: 2,
      explanation: "Chlorophyll sits in the thylakoid membranes, where light is captured.",
    },
    svg: diagram.chloroplast,
    caption: "A chloroplast, with thylakoid stacks in the stroma.",
    alt: "An oval chloroplast with three stacks of thylakoids inside, surrounded by stroma.",
  },
  {
    heading: "The light-dependent reactions",
    body: "In the thylakoids, light energy splits water molecules. This releases oxygen and produces ATP and NADPH, two energy carriers the plant uses in the next stage.",
    points: [
      "Light splits water molecules.",
      "Oxygen leaves the leaf through the stomata.",
      "ATP and NADPH carry energy to the Calvin cycle.",
    ],
    cards: [
      { q: "What splits water in the thylakoids?", a: "Light energy." },
      { q: "Name the two energy carriers made here.", a: "ATP and NADPH." },
    ],
    quiz: {
      question: "What do the light-dependent reactions make for the Calvin cycle?",
      options: ["Glucose and water", "ATP and NADPH", "Carbon dioxide", "Chlorophyll"],
      answer: 1,
      explanation: "ATP and NADPH carry the captured energy to the Calvin cycle.",
    },
    svg: diagram.light,
    caption: "Light and water in; oxygen, ATP and NADPH out.",
    alt: "Light and water enter the thylakoid membrane; oxygen, ATP and NADPH leave it.",
  },
  {
    heading: "The Calvin cycle",
    body: "In the stroma, the Calvin cycle uses ATP and NADPH to fix carbon dioxide into a three-carbon sugar, which the plant builds into glucose. It doesn't need light directly, but it depends on the light reactions.",
    points: [
      "It takes place in the stroma.",
      "Carbon dioxide is fixed with the help of the enzyme RuBisCO.",
      "Its sugars become glucose, starch and cellulose.",
    ],
    cards: [
      { q: "Where does the Calvin cycle happen?", a: "In the stroma." },
      { q: "Which enzyme fixes carbon dioxide?", a: "RuBisCO." },
    ],
    quiz: {
      question: "Where does the Calvin cycle take place?",
      options: ["Thylakoid membrane", "Stroma", "Mitochondria", "Stomata"],
      answer: 1,
      explanation: "The Calvin cycle runs in the stroma, the fluid around the thylakoids.",
    },
    svg: diagram.calvin,
    caption: "Carbon dioxide in, sugar out, powered by ATP and NADPH.",
    alt: "A circular arrow labelled Calvin cycle, with carbon dioxide going in and sugar coming out.",
  },
];

/** The first module in the other three languages, for the languages strip. */
const translated: Record<"ar" | "fr" | "es", { title: string; mod: Mod }> = {
  ar: {
    title: "البناء الضوئي",
    mod: {
      ...english[0],
      svg: overview({ light: "ضوء", leaf: "ورقة", co2: "ثاني أكسيد الكربون", water: "ماء", o2: "أكسجين", sugar: "غلوكوز" }),
      heading: "ما هو البناء الضوئي",
      body: "البناء الضوئي هو الطريقة التي تحوّل بها النباتات والطحالب وبعض البكتيريا الضوء إلى طاقة كيميائية. فهي تجمع ثاني أكسيد الكربون من الهواء والماء من التربة لتصنع الغلوكوز، وتطلق الأكسجين.",
      points: [
        "تتحوّل طاقة الضوء إلى طاقة كيميائية مخزّنة في الغلوكوز.",
        "المدخلات هي ثاني أكسيد الكربون والماء والضوء.",
        "يُطلق الأكسجين كناتج ثانوي.",
      ],
      cards: [{ q: "ماذا ينتج البناء الضوئي؟", a: "الغلوكوز والأكسجين." }],
      quiz: {
        question: "أي غاز تطلقه النباتات أثناء البناء الضوئي؟",
        options: ["ثاني أكسيد الكربون", "الأكسجين", "النيتروجين", "الميثان"],
        answer: 1,
        explanation: "يُطلق الأكسجين عند انشطار جزيئات الماء.",
      },
      caption: "ما يدخل إلى الورقة وما يخرج منها.",
      alt: "يدخل الضوء وثاني أكسيد الكربون والماء إلى الورقة، ويخرج الأكسجين والغلوكوز.",
    },
  },
  fr: {
    title: "La photosynthèse",
    mod: {
      ...english[0],
      svg: overview({ light: "Lumière", leaf: "Feuille", co2: "Dioxyde de carbone", water: "Eau", o2: "Oxygène", sugar: "Glucose" }),
      heading: "Qu'est-ce que la photosynthèse",
      body: "La photosynthèse permet aux plantes, aux algues et à certaines bactéries de transformer la lumière en énergie chimique. Elles combinent le dioxyde de carbone de l'air et l'eau du sol pour fabriquer du glucose, et libèrent de l'oxygène.",
      points: [
        "L'énergie lumineuse devient de l'énergie chimique stockée dans le glucose.",
        "Il faut du dioxyde de carbone, de l'eau et de la lumière.",
        "L'oxygène est libéré.",
      ],
      cards: [{ q: "Que produit la photosynthèse ?", a: "Du glucose et de l'oxygène." }],
      quiz: {
        question: "Quel gaz les plantes libèrent-elles pendant la photosynthèse ?",
        options: ["Le dioxyde de carbone", "L'oxygène", "L'azote", "Le méthane"],
        answer: 1,
        explanation: "L'oxygène est libéré quand les molécules d'eau sont scindées.",
      },
      caption: "Ce qui entre dans une feuille, et ce qui en sort.",
      alt: "La lumière, le dioxyde de carbone et l'eau entrent dans une feuille ; l'oxygène et le glucose en sortent.",
    },
  },
  es: {
    title: "La fotosíntesis",
    mod: {
      ...english[0],
      svg: overview({ light: "Luz", leaf: "Hoja", co2: "Dióxido de carbono", water: "Agua", o2: "Oxígeno", sugar: "Glucosa" }),
      heading: "Qué es la fotosíntesis",
      body: "La fotosíntesis es la forma en que las plantas, las algas y algunas bacterias convierten la luz en energía química. Combinan el dióxido de carbono del aire con el agua del suelo para producir glucosa, y liberan oxígeno.",
      points: [
        "La energía de la luz se convierte en energía química guardada en la glucosa.",
        "Necesita dióxido de carbono, agua y luz.",
        "Se libera oxígeno.",
      ],
      cards: [{ q: "¿Qué produce la fotosíntesis?", a: "Glucosa y oxígeno." }],
      quiz: {
        question: "¿Qué gas liberan las plantas durante la fotosíntesis?",
        options: ["Dióxido de carbono", "Oxígeno", "Nitrógeno", "Metano"],
        answer: 1,
        explanation: "El oxígeno se libera cuando se dividen las moléculas de agua.",
      },
      caption: "Lo que entra en una hoja y lo que sale de ella.",
      alt: "La luz, el dióxido de carbono y el agua entran en una hoja; salen oxígeno y glucosa.",
    },
  },
};

const SOURCE_TEXT =
  "Photosynthesis — Biology 10, unit 3\n\nPhotosynthesis is the process plants, algae and some bacteria use to turn light into chemical energy. It takes place in chloroplasts, mainly in leaf cells.\n\nIn the light-dependent reactions, light splits water, releasing oxygen and producing ATP and NADPH. In the Calvin cycle, those carriers fix carbon dioxide into sugar.";

async function addCourse(teacher: string, title: string, locale: string, mods: Mod[], status: "draft" | "assigned") {
  const [{ id }] = await sql<{ id: string }>(
    "insert into public.courses (teacher_id, title, content_locale, level, status, source_name) values ($1, $2, $3, 'intermediate', 'draft', 'Photosynthesis — unit 3.pdf') returning id",
    [teacher, title, locale],
  );
  for (const [i, m] of mods.entries()) {
    const [{ id: mid }] = await sql<{ id: string }>(
      `insert into public.modules (course_id, position, heading, body, key_points, flashcards, quiz, visual_svg, visual_caption, visual_alt, checked_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now()) returning id`,
      [id, i + 1, m.heading, m.body, m.points, JSON.stringify(m.cards), JSON.stringify({ question: m.quiz.question, options: m.quiz.options }), m.svg, m.caption, m.alt],
    );
    await sql("insert into public.quiz_answers (module_id, answer_index, explanation) values ($1, $2, $3)", [mid, m.quiz.answer, m.quiz.explanation]);
  }
  await sql(
    "insert into public.generation_jobs (course_id, teacher_id, source_kind, step, chunks_total, chunks_done, modules_total, modules_drawn, pages_total, finished_at) values ($1, $2, 'pdf', 'done', 2, 2, $3, $3, 6, now())",
    [id, teacher, mods.length],
  );
  // Assigned only after its job exists (an assigned course can't get a new job).
  if (status === "assigned") await sql("update public.courses set status = 'assigned', assigned_at = now() where id = $1", [id]);
  return id;
}

async function progress(student: string, course: string, done: number, right: boolean[]) {
  const mods = await sql<{ id: string; position: number }>("select id, position from public.modules where course_id = $1 order by position", [course]);
  for (const m of mods.slice(0, done)) {
    const correct = right[m.position - 1] ?? true;
    const [{ answer_index }] = await sql<{ answer_index: number }>("select answer_index from public.quiz_answers where module_id = $1", [m.id]);
    await sql(
      "insert into public.quiz_attempts (student_id, module_id, course_id, chosen_index, is_correct, is_first) values ($1, $2, $3, $4, $5, true)",
      [student, m.id, course, correct ? answer_index : (answer_index + 1) % 4, correct],
    );
    await sql("insert into public.module_progress (student_id, module_id, course_id) values ($1, $2, $3)", [student, m.id, course]);
  }
}

// ---------------------------------------------------------------- capture helpers
let frame = 0;
async function shot(page: Page, dir: string, name?: string) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(350);
  const file = name ? `${OUT}/${dir}/${name}.png` : `${OUT}/${dir}/${String(frame++).padStart(3, "0")}.png`;
  await page.screenshot({ path: file });
}

/** Scrolls so the element's top sits just under the header. */
async function scrollTo(page: Page, selector: string) {
  await page.locator(selector).first().evaluate((el) => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 90 }));
  await page.waitForTimeout(200);
}

test.afterAll(closeDb);

test("marketing media", async ({ browser }) => {
  test.setTimeout(30 * 60_000);
  // Re-runnable: drop the sample people from an earlier capture (local test database only).
  await sql("delete from public.courses where teacher_id in (select id from auth.users where email like '%@school.example')");
  await sql("delete from public.classes where teacher_id in (select id from auth.users where email like '%@school.example')");
  await sql("delete from auth.users where email like '%@school.example'");
  const teacher = await createUser("nadia@school.example", "teacher", "Nadia Rahme");
  const cls = await createClass(teacher, "Biology 10");
  const course = await addCourse(teacher, "Photosynthesis: how plants make food", "en", english, "assigned");
  const extra: Record<string, string> = {};
  for (const l of ["ar", "fr", "es"] as const) extra[l] = await addCourse(teacher, translated[l].title, l, [translated[l].mod], "assigned");
  await sql("insert into public.course_assignments (course_id, class_id, due_date) values ($1, $2, current_date + 9)", [course, cls]);
  for (const l of ["ar", "fr", "es"] as const) await sql("insert into public.course_assignments (course_id, class_id) values ($1, $2)", [extra[l], cls]);
  const names = ["Lina Saad", "Omar Haddad", "Maya Khoury", "Karim Nassar", "Sara Aoun", "Jad Fares"];
  const students: string[] = [];
  for (const [i, n] of names.entries()) {
    const id = await createUser(`student${i}@school.example`, "student", n);
    await sql("insert into public.class_members (class_id, student_id) values ($1, $2)", [cls, id]);
    students.push(id);
  }
  await progress(students[1], course, 4, [true, true, false, true]);
  await progress(students[2], course, 4, [true, true, true, true]); // Maya: finished, for the certificate
  await progress(students[3], course, 2, [true, false]);
  await progress(students[4], course, 1, [true]);
  await sql("insert into public.announcements (class_id, author_id, body) values ($1, $2, $3)", [
    cls,
    teacher,
    "Lab on Thursday: we'll test leaves for starch. Bring your notebooks.",
  ]);
  // A second course in progress, so "Courses" has more than one row.
  const draft = await addCourse(teacher, "Cell respiration", "en", english.slice(0, 2), "draft");
  void draft;

  for (const theme of ["light", "dark"] as const) {
    for (const d of ["create", "learn", "views"]) mkdirSync(`${OUT}/${theme}/${d}`, { recursive: true });
    const phone = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const t = await phone.newPage();
    await signIn(t, { id: teacher, email: "nadia@school.example" }, { theme });

    // ---- Create: paste → generating → review → module with its diagram
    frame = 0;
    await t.goto("/en/teacher/courses/new");
    await t.getByRole("button", { name: /paste text instead/i }).click();
    await shot(t, `${theme}/create`);
    const area = t.locator("textarea[name=text]");
    for (const end of [60, 170, SOURCE_TEXT.length]) {
      await area.fill(SOURCE_TEXT.slice(0, end));
      await shot(t, `${theme}/create`);
    }
    await sql("update public.generation_jobs set step = 'reading', chunks_done = 0, modules_drawn = 0, finished_at = null where course_id = $1", [course]);
    for (const patch of [
      "step = 'reading'",
      "step = 'writing', chunks_done = 0",
      "step = 'writing', chunks_done = 1",
      "step = 'drawing', chunks_done = 2, modules_drawn = 1",
      "step = 'drawing', modules_drawn = 3",
    ]) {
      await sql(`update public.generation_jobs set ${patch} where course_id = $1`, [course]);
      await t.goto(`/en/teacher/courses/${course}/generating`);
      await shot(t, `${theme}/create`);
    }
    await sql("update public.generation_jobs set step = 'done', modules_drawn = 4, finished_at = now() where course_id = $1", [course]);
    await t.goto(`/en/teacher/courses/${course}/review?generated=1`);
    await shot(t, `${theme}/create`);
    await t.goto(`/en/teacher/courses/${course}/modules/1/edit`);
    await shot(t, `${theme}/create`);
    await scrollTo(t, "#diagram-title");
    await shot(t, `${theme}/create`);

    // ---- Static teacher views (phone)
    await t.goto("/en/teacher/courses/new");
    await shot(t, `${theme}/views`, "teacher-new");
    await t.goto(`/en/teacher/courses/${course}/review`);
    await shot(t, `${theme}/views`, "teacher-review");
    await t.goto(`/en/teacher/courses/${course}/assign`);
    await shot(t, `${theme}/views`, "teacher-assign");
    await phone.close();

    // ---- Teacher on a computer: the class roster
    const desk = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
    const dt = await desk.newPage();
    await signIn(dt, { id: teacher, email: "nadia@school.example" }, { theme });
    await dt.goto(`/en/teacher/classes/${cls}/students?course=${course}`);
    await shot(dt, `${theme}/views`, "teacher-roster-desktop");
    await desk.close();

    // ---- Learn: home → course → reader → flashcard → quick check → certificate
    const sp = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const s = await sp.newPage();
    await signIn(s, { id: students[0], email: "student0@school.example" }, { theme });
    frame = 0;
    await s.goto("/en/student");
    await shot(s, `${theme}/learn`);
    await s.goto(`/en/student/courses/${course}`);
    await shot(s, `${theme}/learn`);
    await s.goto(`/en/student/courses/${course}/modules/1`);
    await shot(s, `${theme}/learn`);
    await scrollTo(s, ".cc-diagram");
    await shot(s, `${theme}/learn`);
    const flip = s.getByRole("button", { name: /tap to reveal|reveal|show/i }).first();
    await flip.scrollIntoViewIfNeeded();
    await s.evaluate(() => window.scrollBy(0, 120));
    await shot(s, `${theme}/learn`);
    await flip.click();
    await shot(s, `${theme}/learn`);
    await s.goto(`/en/student/courses/${course}/modules/1/check`);
    await shot(s, `${theme}/learn`);
    await s.getByRole("radio", { name: /Oxygen/ }).or(s.getByRole("button", { name: /Oxygen/ })).first().click();
    await shot(s, `${theme}/learn`);
    await s.goto("/en/student");
    await shot(s, `${theme}/views`, "student-home");
    await s.goto(`/en/student/courses/${course}/modules/2`);
    await shot(s, `${theme}/views`, "student-reader");
    for (const l of ["ar", "fr", "es"] as const) {
      await s.goto(`/${l}/student/courses/${extra[l]}/modules/1`);
      await shot(s, `${theme}/views`, `lang-${l}`);
    }
    await s.goto(`/en/student/courses/${course}/modules/1`);
    await shot(s, `${theme}/views`, "lang-en");
    await sp.close();

    const mp = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const m = await mp.newPage();
    await signIn(m, { id: students[2], email: "student2@school.example" }, { theme });
    await m.goto(`/en/student/courses/${course}/finish`);
    await shot(m, `${theme}/learn`);
    await shot(m, `${theme}/views`, "student-finish");
    await mp.close();
  }
});
