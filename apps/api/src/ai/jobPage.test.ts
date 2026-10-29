import { expect, test } from "vite-plus/test";
import { blocksToHtml, readJobPage } from "./jobPage.ts";

const link = "https://www.stepstone.de/stellenangebote--frontend-developer";

function page({ head = "", body = "" }: { head?: string; body?: string }) {
  return `<!doctype html><html><head>${head}</head><body>${body}</body></html>`;
}

function jsonLd(data: unknown) {
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}

test("splits the visible page content into blocks", () => {
  const html = page({
    head: "<title>Ad</title><style>p { color: red }</style>",
    body:
      "<nav><a href='/'>Home</a></nav><h1>Frontend Developer</h1>" +
      "<div>Initech <b>GmbH</b><br>München</div><script>track()</script>" +
      "<ul><li>TypeScript</li><li><p>React &amp; CSS</p></li></ul>" +
      "<div hidden>Hidden</div><div aria-hidden='true'>Decoration</div>" +
      "<button>Apply now</button><p>  Join   us! </p>",
  });

  expect(readJobPage(html, link).blocks).toEqual([
    { kind: "heading", text: "Frontend Developer" },
    { kind: "paragraph", text: "Initech GmbH" },
    { kind: "paragraph", text: "München" },
    { kind: "listItem", text: "TypeScript" },
    { kind: "listItem", text: "React & CSS" },
    { kind: "paragraph", text: "Join us!" },
  ]);
});

test("skips repeated blocks", () => {
  const html = page({ body: "<p>Frontend Developer</p><div><p>Frontend Developer</p></div>" });

  expect(readJobPage(html, link).blocks).toEqual([
    { kind: "paragraph", text: "Frontend Developer" },
  ]);
});

test("reads the job posting from the structured data", () => {
  const posting = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: "Frontend Developer",
    hiringOrganization: { "@type": "Organization", name: "Initech GmbH" },
    description: "<p>We build software.</p><ul><li>TypeScript</li></ul>",
  };
  const html = page({ head: jsonLd({ "@graph": [{ "@type": "WebPage" }, posting] }) });

  expect(readJobPage(html, link).posting).toEqual({
    details: {
      "@context": "https://schema.org",
      "@type": "JobPosting",
      title: "Frontend Developer",
      hiringOrganization: { "@type": "Organization", name: "Initech GmbH" },
    },
    blocks: [
      { kind: "paragraph", text: "We build software." },
      { kind: "listItem", text: "TypeScript" },
    ],
  });
});

test("reads an escaped job posting description", () => {
  const html = page({
    head: jsonLd([
      { "@type": ["JobPosting"], description: "&lt;p&gt;We build &amp;amp; ship.&lt;/p&gt;" },
    ]),
  });

  expect(readJobPage(html, link).posting?.blocks).toEqual([
    { kind: "paragraph", text: "We build & ship." },
  ]);
});

test.each([
  ["no structured data", ""],
  ["invalid structured data", '<script type="application/ld+json">{</script>'],
  ["other structured data", jsonLd({ "@type": "Organization", description: "<p>About</p>" })],
  ["a job posting without description", jsonLd({ "@type": "JobPosting", title: "Developer" })],
])("has no job posting with %s", (_case, head) => {
  expect(readJobPage(page({ head }), link).posting).toBeNull();
});

test.each([
  [
    "Lead Developer Frontend - Hybrid (m/w/d) | StepStone",
    "Lead Developer Frontend - Hybrid (m/w/d)",
  ],
  ["StepStone.de – Lead Developer Frontend", "Lead Developer Frontend"],
  ["Lead Developer Frontend | Initech | Karriereportal", "Lead Developer Frontend | Initech"],
  ["StepStone", "StepStone"],
  ["  Lead   Developer  ", "Lead Developer"],
])("removes the site name from the page title %j", (title, expected) => {
  const head = `<title>${title}</title><meta property="og:site_name" content="Karriereportal">`;

  expect(readJobPage(page({ head }), link).title).toBe(expected);
});

test("has an empty title without a title element", () => {
  expect(readJobPage(page({}), link).title).toBe("");
});

test("renders blocks as rich text", () => {
  const html = blocksToHtml([
    { kind: "heading", text: "Your tasks" },
    { kind: "listItem", text: "Build <features>" },
    { kind: "listItem", text: "Review code" },
    { kind: "paragraph", text: "R&D" },
    { kind: "listItem", text: "Mentor" },
  ]);

  expect(html).toBe(
    "<h2>Your tasks</h2><ul><li><p>Build &lt;features&gt;</p></li><li><p>Review code</p></li></ul>" +
      "<p>R&amp;D</p><ul><li><p>Mentor</p></li></ul>",
  );
});
