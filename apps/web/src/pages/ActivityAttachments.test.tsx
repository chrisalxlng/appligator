import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vite-plus/test";
import { toLocalDateTime } from "../details/localDateTime.ts";
import { activityWith, applicationFor, createFakeApi, jobFixture } from "../testing/fakeApi.ts";
import { renderApp } from "../testing/renderApp.tsx";

const application = applicationFor(jobFixture);
const cvFileId = "6a1f0e3c-2b4d-4c5e-8f9a-0b1c2d3e4f5a";
const offerEmail = {
  kind: "email" as const,
  subject: "Unser Angebot an dich",
  from: "hr@randstad-digital.de",
  to: "jd@example.com",
  sentAt: "2026-10-30T09:00:00.000Z",
  body: "<p>Hallo, anbei unser Angebot.</p>",
};
const cv = {
  kind: "file" as const,
  fileId: cvFileId,
  title: "",
  name: "Lebenslauf.pdf",
  mimeType: "application/pdf",
};
const submission = activityWith({
  occurredAt: "2026-10-17T08:00:00.000Z",
  attachments: [cv, offerEmail],
});

const eml = [
  "From: Randstad HR <hr@randstad-digital.de>",
  "To: jd@example.com",
  "Subject: Einladung zum Gespräch",
  "Date: Fri, 30 Oct 2026 10:00:00 +0100",
  "Content-Type: text/plain; charset=utf-8",
  "",
  "Hallo,",
  "",
  "wir laden dich ein.",
].join("\r\n");

const htmlEml = [
  "From: Jasmin Habegger <J.HABEGGER@optadata-gruppe.de>",
  "To: Christopher <Contact@Example.com>, Team: frank@example.com, marcel@example.com;",
  "Subject: Deep Dive und Kennenlernen",
  "Date: Mon, 04 Dec 2023 11:59:00 +0100",
  "Content-Type: text/html; charset=utf-8",
  "",
  '<p class="MsoNormal">Hallo Christopher,</p><p>&nbsp;</p>',
  '<p>Link zum Meeting: <a href="https://teams.microsoft.com/l/meetup/1">Hier klicken</a></p>',
  '<p>Link Aufgabenstellung: <a href="https://stackblitz.com/edit/challenge">https://stackblitz.com/edit/challenge</a></p>',
  '<p>E-Mail: <a href="mailto:j.habegger@optadata-gruppe.de">j.habegger@optadata-gruppe.de</a></p>',
].join("\r\n");

function emlFile(content = eml, name = "einladung.eml") {
  return new File([content], name, { type: "message/rfc822" });
}

function dropFiles(target: HTMLElement, files: File[]) {
  fireEvent.drop(target, { dataTransfer: { files, types: ["Files"] } });
}

function renderAttachments() {
  const api = createFakeApi([jobFixture], [application], { [application.id]: [submission] });
  api.files.set(cvFileId, new Blob(["%PDF"], { type: "application/pdf" }));
  renderApp(`/applications/${application.id}`);
  return api;
}

async function findLog() {
  return screen.findByRole("region", { name: "Activities" });
}

async function editSubmission() {
  const log = await findLog();
  await userEvent.click(
    await within(log).findByRole("button", { name: /Edit Application submitted$/ }),
  );
  return screen.findByRole("dialog", { name: "Application submitted" });
}

async function chooseAttachment(form: HTMLElement, kind: "Link" | "Email" | "File") {
  await userEvent.click(within(form).getByRole("button", { name: "Add attachment" }));
  await userEvent.click(await screen.findByRole("menuitem", { name: kind }));
}

test("shows the email and file attachments of an activity", async () => {
  renderAttachments();
  const log = await findLog();

  expect(await within(log).findByRole("button", { name: /^Lebenslauf/ })).toHaveTextContent(
    "LebenslaufPDF",
  );
  expect(within(log).getByRole("button", { name: /^Unser Angebot/ })).toHaveTextContent(
    "Unser Angebot an dichhr@randstad-digital.de",
  );
});

test("reads an email attachment in a drawer", async () => {
  renderAttachments();
  const log = await findLog();

  await userEvent.click(await within(log).findByRole("button", { name: /^Unser Angebot/ }));

  const email = await screen.findByRole("dialog", { name: "Unser Angebot an dich" });
  expect(email).toHaveTextContent("Fromhr@randstad-digital.de");
  expect(email).toHaveTextContent("SentOctober 30, 2026");
  expect(email).toHaveTextContent("Hallo, anbei unser Angebot.");
});

test("opens a file attachment in a new tab", async () => {
  const tab = { location: { href: "" }, close: vi.fn() };
  vi.spyOn(window, "open").mockReturnValue(tab as unknown as Window);
  URL.createObjectURL = vi.fn(() => "blob:cv");
  const api = renderAttachments();
  const log = await findLog();

  await userEvent.click(await within(log).findByRole("button", { name: /^Lebenslauf/ }));

  await waitFor(() => expect(tab.location.href).toBe("blob:cv"));
  expect(api.stashRequests).toEqual([{ method: "GET", fileId: cvFileId }]);
});

test("explains when a file cannot be opened", async () => {
  const tab = { location: { href: "" }, close: vi.fn() };
  vi.spyOn(window, "open").mockReturnValue(tab as unknown as Window);
  const api = renderAttachments();
  api.failStashWith(500);
  const log = await findLog();

  await userEvent.click(await within(log).findByRole("button", { name: /^Lebenslauf/ }));

  expect(await within(log).findByRole("alert")).toHaveTextContent(
    "The file could not be opened. Please try again.",
  );
  expect(tab.close).toHaveBeenCalled();
});

test("adds an email by hand", async () => {
  const api = renderAttachments();
  const form = await editSubmission();

  await chooseAttachment(form, "Email");
  const drawer = await screen.findByRole("dialog", { name: "Add email" });
  await userEvent.type(within(drawer).getByRole("textbox", { name: "Subject" }), "Rückfrage");
  await userEvent.type(within(drawer).getByRole("textbox", { name: "From" }), "hr@example.com");
  await userEvent.click(within(drawer).getByRole("button", { name: "Add" }));
  await userEvent.click(within(form).getByRole("button", { name: "Update" }));

  await waitFor(() =>
    expect(api.requestsWith("PUT")[0]?.body?.attachments).toEqual([
      cv,
      offerEmail,
      {
        kind: "email",
        subject: "Rückfrage",
        from: "hr@example.com",
        to: "",
        sentAt: null,
        body: "",
      },
    ]),
  );
});

test("imports an email with its text and links from an .eml file", async () => {
  const api = renderAttachments();
  const form = await editSubmission();
  await chooseAttachment(form, "Email");
  const drawer = await screen.findByRole("dialog", { name: "Add email" });

  await userEvent.upload(
    within(drawer).getByLabelText("Import from file", { selector: "input" }),
    emlFile(htmlEml),
  );

  await waitFor(() =>
    expect(within(drawer).getByRole("textbox", { name: "Subject" })).toHaveValue(
      "Deep Dive und Kennenlernen",
    ),
  );
  expect(within(drawer).getByRole("textbox", { name: "From" })).toHaveValue(
    "j.habegger@optadata-gruppe.de",
  );
  expect(within(drawer).getByRole("textbox", { name: "To" })).toHaveValue(
    "contact@example.com, frank@example.com, marcel@example.com",
  );
  expect(within(drawer).getByLabelText("Sent")).toHaveValue(
    toLocalDateTime("2023-12-04T10:59:00.000Z"),
  );
  await userEvent.click(within(drawer).getByRole("button", { name: "Add" }));
  await userEvent.click(within(form).getByRole("button", { name: "Update" }));

  await waitFor(() =>
    expect(api.requestsWith("PUT")[0]?.body?.attachments).toEqual([
      cv,
      offerEmail,
      expect.objectContaining({
        kind: "email",
        body: expect.stringMatching(
          /^<p>Hallo Christopher,<\/p><p>Link zum Meeting: Hier klicken<\/p>/,
        ),
      }),
      { kind: "link", url: "https://teams.microsoft.com/l/meetup/1", title: "Hier klicken" },
      { kind: "link", url: "https://stackblitz.com/edit/challenge", title: "" },
    ]),
  );
});

test("writes the sender of an email in lower case", async () => {
  renderAttachments();
  const form = await editSubmission();
  await chooseAttachment(form, "Email");
  const drawer = await screen.findByRole("dialog", { name: "Add email" });

  await userEvent.type(within(drawer).getByRole("textbox", { name: "From" }), "HR@Example.com");

  expect(within(drawer).getByRole("textbox", { name: "From" })).toHaveValue("hr@example.com");
});

test("imports an .eml file dropped onto the email drawer", async () => {
  renderAttachments();
  const form = await editSubmission();
  await chooseAttachment(form, "Email");
  const drawer = await screen.findByRole("dialog", { name: "Add email" });

  dropFiles(within(drawer).getByRole("textbox", { name: "Subject" }), [emlFile()]);

  await waitFor(() =>
    expect(within(drawer).getByRole("textbox", { name: "Subject" })).toHaveValue(
      "Einladung zum Gespräch",
    ),
  );
  expect(within(form).queryByRole("button", { name: /^Einladung/ })).not.toBeInTheDocument();
});

test("only imports .eml files into the email drawer", async () => {
  renderAttachments();
  const form = await editSubmission();
  await chooseAttachment(form, "Email");
  const drawer = await screen.findByRole("dialog", { name: "Add email" });

  dropFiles(within(drawer).getByRole("textbox", { name: "Subject" }), [
    new File(["cv"], "CV.pdf", { type: "application/pdf" }),
  ]);

  expect(await within(drawer).findByRole("alert")).toHaveTextContent("Please drop an .eml file.");
});

test("adds files dropped anywhere onto an activity: emails with their links and uploads", async () => {
  const api = renderAttachments();
  const form = await editSubmission();

  dropFiles(within(form).getByLabelText("Time"), [
    emlFile(htmlEml),
    new File(["cover letter"], "Anschreiben.pdf", { type: "application/pdf" }),
  ]);

  expect(await within(form).findByRole("button", { name: /^Anschreiben/ })).toHaveTextContent(
    "AnschreibenPDF",
  );
  expect(await within(form).findByRole("button", { name: /^Deep Dive/ })).toBeVisible();
  expect(within(form).getByRole("button", { name: /^Hier klicken/ })).toBeVisible();
  const [upload] = api.stashRequests;
  expect(upload).toMatchObject({ method: "POST" });
  expect(api.files.get(upload!.fileId)).toBeInstanceOf(File);

  await userEvent.click(within(form).getByRole("button", { name: "Update" }));
  await waitFor(() =>
    expect(api.requestsWith("PUT")[0]?.body?.attachments).toContainEqual({
      kind: "file",
      fileId: upload!.fileId,
      title: "Anschreiben",
      name: "Anschreiben.pdf",
      mimeType: "application/pdf",
    }),
  );
});

async function openFileDrawer() {
  const form = await editSubmission();
  await chooseAttachment(form, "File");
  return { form, drawer: await screen.findByRole("dialog", { name: "Add file" }) };
}

function chooseFile(drawer: HTMLElement, file: File) {
  return userEvent.upload(
    within(drawer).getByLabelText("Choose file", { selector: "input" }),
    file,
  );
}

test("adds a file with the file name as its default title", async () => {
  const api = renderAttachments();
  const { form, drawer } = await openFileDrawer();

  await chooseFile(drawer, new File(["cv"], "CV_2026.pdf", { type: "application/pdf" }));

  const title = within(drawer).getByRole("textbox", { name: "Title" });
  await waitFor(() => expect(title).toHaveValue("CV_2026"));
  await userEvent.clear(title);
  await userEvent.type(title, "Lebenslauf");
  await userEvent.click(within(drawer).getByRole("button", { name: "Add" }));
  await userEvent.click(within(form).getByRole("button", { name: "Update" }));

  await waitFor(() =>
    expect(api.requestsWith("PUT")[0]?.body?.attachments).toContainEqual(
      expect.objectContaining({ kind: "file", title: "Lebenslauf", name: "CV_2026.pdf" }),
    ),
  );
});

test("keeps an entered title when a file is dropped onto the file drawer", async () => {
  renderAttachments();
  const { drawer } = await openFileDrawer();
  const title = within(drawer).getByRole("textbox", { name: "Title" });
  await userEvent.type(title, "Anschreiben");

  dropFiles(title, [new File(["letter"], "cover.pdf", { type: "application/pdf" })]);

  expect(await within(drawer).findByText("cover.pdf")).toBeVisible();
  expect(title).toHaveValue("Anschreiben");
});

test("requires a file in the file drawer", async () => {
  renderAttachments();
  const { drawer } = await openFileDrawer();

  await userEvent.click(within(drawer).getByRole("button", { name: "Add" }));

  expect(await within(drawer).findByRole("alert")).toHaveTextContent("Please choose a file.");
});

test("renames a file attachment", async () => {
  const api = renderAttachments();
  const form = await editSubmission();

  await userEvent.click(within(form).getByRole("button", { name: /^Lebenslauf/ }));
  const drawer = await screen.findByRole("dialog", { name: "Edit file" });
  await userEvent.type(within(drawer).getByRole("textbox", { name: "Title" }), "CV");
  await userEvent.click(within(drawer).getByRole("button", { name: "Update" }));
  await userEvent.click(within(form).getByRole("button", { name: "Update" }));

  await waitFor(() =>
    expect(api.requestsWith("PUT")[0]?.body?.attachments).toEqual([
      { ...cv, title: "CV" },
      offerEmail,
    ]),
  );
  expect(api.stashRequests).toEqual([]);
});

test("rejects files larger than 10 MB without uploading them", async () => {
  const api = renderAttachments();
  const { drawer } = await openFileDrawer();
  const largeFile = new File(["x"], "Portfolio.pdf", { type: "application/pdf" });
  Object.defineProperty(largeFile, "size", { value: 10_000_001 });

  await chooseFile(drawer, largeFile);

  expect(await within(drawer).findByRole("alert")).toHaveTextContent("Files can be at most 10 MB.");
  expect(api.stashRequests).toEqual([]);
});

test("explains when a file cannot be uploaded", async () => {
  const api = renderAttachments();
  api.failStashWith(422);
  const { drawer } = await openFileDrawer();

  await chooseFile(drawer, new File(["cv"], "CV.pdf", { type: "application/pdf" }));

  expect(await within(drawer).findByRole("alert")).toHaveTextContent(
    "You have reached the maximum number of files.",
  );
});

test("deletes a file chosen in the file drawer when it is closed without adding", async () => {
  const api = renderAttachments();
  const { drawer } = await openFileDrawer();
  await chooseFile(drawer, new File(["cv"], "CV.pdf", { type: "application/pdf" }));
  await within(drawer).findByText("CV.pdf");

  await userEvent.click(within(drawer).getByRole("button", { name: "Close" }));

  await waitFor(() => expect(api.files.size).toBe(1));
});

test("deletes removed files after saving", async () => {
  const api = renderAttachments();
  const form = await editSubmission();

  await userEvent.click(within(form).getByRole("button", { name: "Remove Lebenslauf" }));
  expect(api.stashRequests).toEqual([]);
  await userEvent.click(within(form).getByRole("button", { name: "Update" }));

  await waitFor(() => expect(api.stashRequests).toEqual([{ method: "DELETE", fileId: cvFileId }]));
});

test("deletes uploaded files when the activity is closed without saving", async () => {
  const api = renderAttachments();
  const form = await editSubmission();
  dropFiles(within(form).getByLabelText("Time"), [
    new File(["cv"], "CV.pdf", { type: "application/pdf" }),
  ]);
  await within(form).findByRole("button", { name: /^CV/ });

  await userEvent.click(within(form).getByRole("button", { name: "Close" }));

  await waitFor(() => expect(api.files.size).toBe(1));
  expect(api.files.has(cvFileId)).toBe(true);
});

test("deletes the files of a deleted activity", async () => {
  const api = renderAttachments();
  const form = await editSubmission();

  await userEvent.click(within(form).getByRole("button", { name: "Delete" }));
  const dialog = await screen.findByRole("alertdialog", { name: "Delete activity?" });
  await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

  await waitFor(() => expect(api.stashRequests).toEqual([{ method: "DELETE", fileId: cvFileId }]));
});

test("downloads an SVG file instead of opening it with the origin of the app", async () => {
  const api = createFakeApi([jobFixture], [application], {
    [application.id]: [
      activityWith({ attachments: [{ ...cv, name: "logo.svg", mimeType: "image/svg+xml" }] }),
    ],
  });
  api.files.set(cvFileId, new Blob(["<svg/>"], { type: "image/svg+xml" }));
  const open = vi.spyOn(window, "open");
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  URL.createObjectURL = vi.fn(() => "blob:logo");
  renderApp(`/applications/${application.id}`);
  const log = await findLog();

  await userEvent.click(await within(log).findByRole("button", { name: /^logo/ }));

  await waitFor(() => expect(click).toHaveBeenCalled());
  expect(open).not.toHaveBeenCalled();
  open.mockRestore();
  click.mockRestore();
});

test("waits for running uploads before saving an activity", async () => {
  const api = renderAttachments();
  const release = api.holdResponses("STASH");
  const form = await editSubmission();
  dropFiles(within(form).getByLabelText("Time"), [
    new File(["cv"], "CV_2026.pdf", { type: "application/pdf" }),
  ]);
  await within(form).findByText("CV_2026.pdf");

  fireEvent.submit(form.querySelector("form")!);
  expect(api.requestsWith("PUT")).toEqual([]);

  release();
  await waitFor(() =>
    expect(within(form).getByRole("button", { name: /Update/ })).not.toHaveAttribute("aria-busy"),
  );
  await userEvent.click(within(form).getByRole("button", { name: /Update/ }));
  await waitFor(() =>
    expect(api.requestsWith("PUT")[0]?.body?.attachments).toContainEqual(
      expect.objectContaining({ name: "CV_2026.pdf" }),
    ),
  );
});

test("deletes a file whose upload finishes after the activity was closed", async () => {
  const api = renderAttachments();
  const release = api.holdResponses("STASH");
  const form = await editSubmission();
  dropFiles(within(form).getByLabelText("Time"), [
    new File(["cv"], "CV_2026.pdf", { type: "application/pdf" }),
  ]);
  await within(form).findByText("CV_2026.pdf");
  const upload = api.stashRequests.find(({ method }) => method === "POST")!;

  await userEvent.click(within(form).getByRole("button", { name: "Close" }));
  await waitFor(() =>
    expect(screen.queryByRole("dialog", { name: "Application submitted" })).not.toBeInTheDocument(),
  );
  release();

  await waitFor(() => expect(api.files.has(upload.fileId)).toBe(false));
  expect(api.stashRequests).toContainEqual({ method: "DELETE", fileId: upload.fileId });
});

test("rejects a dropped email that is too long", async () => {
  const api = renderAttachments();
  const form = await editSubmission();
  const longEml = eml.replace("wir laden dich ein.", "x".repeat(100_100));

  dropFiles(within(form).getByLabelText("Time"), [emlFile(longEml)]);

  expect(await within(form).findByRole("alert")).toHaveTextContent(
    "This email is too long to be imported.",
  );
  await userEvent.click(within(form).getByRole("button", { name: "Update" }));
  await waitFor(() => expect(api.requestsWith("PUT")).toHaveLength(1));
  expect(api.requestsWith("PUT")[0]?.body?.attachments).toHaveLength(2);
});
