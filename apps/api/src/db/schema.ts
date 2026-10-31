import {
  aiLanguages,
  aiProviders,
  applicationStatuses,
  companyTypes,
  currencies,
  employmentTypes,
  salaryPeriods,
  workModels,
  type ContractTerm,
  type NoticePeriod,
  type WorkingHours,
} from "@appligator/shared";
import { sql } from "drizzle-orm";
import {
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const companyTypeEnum = pgEnum("company_type", companyTypes);
export const currencyEnum = pgEnum("currency", currencies);
export const salaryPeriodEnum = pgEnum("salary_period", salaryPeriods);
export const workModelEnum = pgEnum("work_model", workModels);
export const employmentTypeEnum = pgEnum("employment_type", employmentTypes);
export const applicationStatusEnum = pgEnum("application_status", applicationStatuses);
export const aiProviderEnum = pgEnum("ai_provider", aiProviders);
export const aiLanguageEnum = pgEnum("ai_language", aiLanguages);

function jobDetailColumns() {
  return {
    companyType: companyTypeEnum(),
    employeeCount: integer(),
    salaryCurrency: currencyEnum(),
    salaryPeriod: salaryPeriodEnum(),
    salaryMin: integer(),
    salaryMax: integer(),
    bonuses: text()
      .array()
      .notNull()
      .default(sql`'{}'`),
    benefits: text()
      .array()
      .notNull()
      .default(sql`'{}'`),
    employmentType: employmentTypeEnum(),
    workModel: workModelEnum(),
    homeOfficePercentage: integer(),
    workingHours: jsonb().$type<WorkingHours>(),
    locations: text().array().notNull(),
    commuteDistance: integer(),
    commuteDuration: integer(),
    vacationDays: numeric({ precision: 4, scale: 1, mode: "number" }),
    startDate: date(),
    contractTerm: jsonb().$type<ContractTerm>(),
    probationMonths: integer(),
    noticePeriod: jsonb().$type<NoticePeriod>(),
    notes: text().notNull().default(""),
  };
}

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
    ...jobDetailColumns(),
    applicationDeadline: date(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index().on(table.userId, table.createdAt)],
);

export const applications = pgTable(
  "applications",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text().notNull(),
    jobId: uuid()
      .notNull()
      .unique()
      .references(() => jobs.id, { onDelete: "restrict" }),
    status: applicationStatusEnum().notNull(),
    appliedAt: date().notNull(),
    company: text().notNull(),
    position: text().notNull(),
    ...jobDetailColumns(),
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
