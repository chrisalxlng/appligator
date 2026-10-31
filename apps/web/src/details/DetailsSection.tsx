import type { ContractTerm, JobDetails, NoticePeriod, NoticePeriodUnit } from "@appligator/shared";
import { RichText } from "@appligator/ui";
import {
  IconBasketHeart,
  IconBeach,
  IconBuildingSkyscraper,
  IconBuilding,
  IconClock,
  IconCoins,
  IconContract,
  IconCurrencyDollar,
  IconFlask,
  IconHandStop,
  IconHome,
  IconHourglass,
  IconMapPin,
  IconNote,
  IconRocket,
  IconRoute,
  type Icon,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Property, PropertyList, Section } from "../collection/DetailView.tsx";
import { formatIsoDate, formatNumber, formatSalaryRange, formatUnit } from "./format.ts";

export interface Detail {
  icon: Icon;
  label: string;
  value: ReactNode;
}

export function useDetails(details: JobDetails | null): Detail[] {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;

  function formatDuration({ amount, unit }: { amount: number; unit: NoticePeriodUnit }) {
    return t(`details.duration.${unit}`, { count: amount });
  }

  function formatContractTerm(contractTerm: ContractTerm) {
    switch (contractTerm.kind) {
      case "permanent":
        return t("details.contractTerm.permanent");
      case "months":
        return t("details.contractTerm.months", { count: contractTerm.months });
      case "until":
        return t("details.contractTerm.until", { date: formatIsoDate(contractTerm.date, locale) });
    }
  }

  function formatNoticePeriod(noticePeriod: NoticePeriod) {
    const duration = formatDuration(noticePeriod);
    return noticePeriod.endOf
      ? t(`details.noticePeriodEndOf.${noticePeriod.endOf}`, { duration })
      : duration;
  }

  if (!details) return [];

  const commute = [
    details.commuteDistance !== null && formatUnit(details.commuteDistance, "kilometer", locale),
    details.commuteDuration !== null && formatUnit(details.commuteDuration, "minute", locale),
  ].filter(Boolean);

  const companySize = [
    details.companyType !== null && t(`details.companyType.${details.companyType}`),
    details.employeeCount !== null &&
      t("details.employees", {
        count: details.employeeCount,
        amount: formatNumber(details.employeeCount, locale),
      }),
  ].filter(Boolean);

  const entries: (Detail | false)[] = [
    companySize.length > 0 && {
      icon: IconBuildingSkyscraper,
      label: t("details.properties.companySize"),
      value: companySize.join(" • "),
    },
    details.salary !== null && {
      icon: IconCurrencyDollar,
      label: t("details.properties.salary"),
      value: t(`details.salaryPerPeriod.${details.salary.period}`, {
        amount: formatSalaryRange(details.salary, locale),
      }),
    },
    details.bonuses.length > 0 && {
      icon: IconCoins,
      label: t("details.properties.bonuses", { count: details.bonuses.length }),
      value: details.bonuses.join(", "),
    },
    details.benefits.length > 0 && {
      icon: IconBasketHeart,
      label: t("details.properties.benefits", { count: details.benefits.length }),
      value: details.benefits.join(", "),
    },
    details.employmentType !== null && {
      icon: IconContract,
      label: t("details.properties.employmentType"),
      value: t(`details.employmentType.${details.employmentType}`),
    },
    details.workModel !== null && {
      icon: IconBuilding,
      label: t("details.properties.workModel"),
      value: t(`details.workModel.${details.workModel}`),
    },
    details.homeOfficePercentage !== null && {
      icon: IconHome,
      label: t("details.properties.homeOffice"),
      value: formatUnit(details.homeOfficePercentage, "percent", locale),
    },
    details.workingHours !== null && {
      icon: IconClock,
      label: t("details.properties.workingHours"),
      value: t(`details.workingHoursPerPeriod.${details.workingHours.period}`, {
        hours: formatNumber(details.workingHours.hours, locale),
      }),
    },
    details.locations.length > 0 && {
      icon: IconMapPin,
      label: t("details.properties.locations", { count: details.locations.length }),
      value: details.locations.join(", "),
    },
    commute.length > 0 && {
      icon: IconRoute,
      label: t("details.properties.commute"),
      value: commute.join(", "),
    },
    details.vacationDays !== null && {
      icon: IconBeach,
      label: t("details.properties.vacationDays"),
      value: formatNumber(details.vacationDays, locale),
    },
    details.startDate !== null && {
      icon: IconRocket,
      label: t("details.properties.startDate"),
      value: formatIsoDate(details.startDate, locale),
    },
    details.contractTerm !== null && {
      icon: IconHourglass,
      label: t("details.properties.contractTerm"),
      value: formatContractTerm(details.contractTerm),
    },
    details.probationMonths !== null && {
      icon: IconFlask,
      label: t("details.properties.probation"),
      value: formatDuration({ amount: details.probationMonths, unit: "months" }),
    },
    details.noticePeriod !== null && {
      icon: IconHandStop,
      label: t("details.properties.noticePeriod"),
      value: formatNoticePeriod(details.noticePeriod),
    },
    Boolean(details.notes) && {
      icon: IconNote,
      label: t("details.properties.notes"),
      value: <RichText html={details.notes} />,
    },
  ];

  return entries.filter((entry) => entry !== false);
}

export function DetailsSection({ details }: { details: JobDetails }) {
  const { t } = useTranslation();
  const entries = useDetails(details);

  if (entries.length === 0) return null;

  return (
    <Section title={t("sections.details")}>
      <PropertyList>
        {entries.map(({ icon, label, value }) => (
          <Property key={label} icon={icon} label={label}>
            {value}
          </Property>
        ))}
      </PropertyList>
    </Section>
  );
}
