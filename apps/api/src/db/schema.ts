import {
  aiLanguages,
  aiProviders,
  currencies,
  employmentTypes,
  salaryPeriods,
  workModels,
} from "@appligator/shared";
import { date, index, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const currencyEnum = pgEnum("currency", currencies);
export const salaryPeriodEnum = pgEnum("salary_period", salaryPeriods);
export const workModelEnum = pgEnum("work_model", workModels);
export const employmentTypeEnum = pgEnum("employment_type", employmentTypes);
export const aiProviderEnum = pgEnum("ai_provider", aiProviders);
export const aiLanguageEnum = pgEnum("ai_language", aiLanguages);

export const jobs = pgTable(
  "jobs",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text().notNull(),
    link: text(),
    description: text().notNull(),
    summary: text().notNull(),
    company: text().notNull(),
    position: text().notNull(),
    salaryCurrency: currencyEnum(),
    salaryPeriod: salaryPeriodEnum(),
    salaryMin: integer(),
    salaryMax: integer(),
    locations: text().array().notNull(),
    workModel: workModelEnum(),
    employmentType: employmentTypeEnum(),
    applicationDeadline: date(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index().on(table.userId, table.createdAt)],
);

export const aiSettings = pgTable("ai_settings", {
  userId: text().primaryKey(),
  provider: aiProviderEnum().notNull(),
  model: text().notNull(),
  encryptedApiKey: text().notNull(),
  language: aiLanguageEnum().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  accessUpdatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
