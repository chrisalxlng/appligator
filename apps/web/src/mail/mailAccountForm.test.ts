import type { MailAccount } from "@appligator/shared";
import { expect, test } from "vite-plus/test";
import { ApiError } from "../api/apiClient.ts";
import {
  mailSaveError,
  toMailAccountFormValues,
  validateMailAccountForm,
  type MailAccountFormValues,
} from "./mailAccountForm.ts";

const account: MailAccount = {
  host: "imap.gmx.net",
  username: "bewerbung@gmx.de",
  accessUpdatedAt: "2026-10-01T12:00:00.000Z",
};

const values: MailAccountFormValues = {
  provider: "other",
  host: "imap.example.com",
  username: "bewerbung@example.com",
  password: "secret",
};

test("starts empty without an account", () => {
  expect(toMailAccountFormValues()).toEqual({
    provider: null,
    host: "",
    username: "",
    password: "",
  });
});

test("recognizes the preset of an account and never prefills the password", () => {
  expect(toMailAccountFormValues(account)).toEqual({
    provider: "gmx",
    host: "",
    username: "bewerbung@gmx.de",
    password: "",
  });
});

test("treats an unknown host as another provider", () => {
  expect(toMailAccountFormValues({ ...account, host: "imap.example.com" })).toMatchObject({
    provider: "other",
    host: "imap.example.com",
  });
});

test("requires every field", () => {
  expect(validateMailAccountForm(toMailAccountFormValues())).toEqual({
    errors: {
      provider: "providerRequired",
      username: "usernameRequired",
      password: "passwordRequired",
    },
  });
});

test("requires a valid host only for another provider", () => {
  expect(validateMailAccountForm({ ...values, host: " " }).errors).toEqual({
    host: "hostRequired",
  });
  expect(validateMailAccountForm({ ...values, host: "127.0.0.1" }).errors).toEqual({
    host: "hostInvalid",
  });
  expect(validateMailAccountForm({ ...values, provider: "webDe", host: "" }).input).toMatchObject({
    host: "imap.web.de",
  });
});

test("normalizes the host and username but keeps the password as entered", () => {
  expect(
    validateMailAccountForm({
      ...values,
      host: " IMAP.Example.com ",
      username: " bewerbung@example.com ",
      password: " secret ",
    }).input,
  ).toEqual({
    host: "imap.example.com",
    username: "bewerbung@example.com",
    password: " secret ",
  });
});

test("maps known API errors and falls back for everything else", () => {
  expect(mailSaveError(new ApiError(422, "loginRejected"))).toBe("loginRejected");
  expect(mailSaveError(new ApiError(422, "connectionFailed"))).toBe("connectionFailed");
  expect(mailSaveError(new ApiError(429))).toBe("saveFailed");
  expect(mailSaveError(new Error("offline"))).toBe("saveFailed");
});
