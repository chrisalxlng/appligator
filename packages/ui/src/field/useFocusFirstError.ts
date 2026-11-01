import { useEffect, useRef } from "react";

const errorSelector = '[aria-invalid="true"], [role="combobox"][data-invalid], [role="alert"]';
const controlSelector = 'input:not([hidden]), [role="combobox"], [role="textbox"]';

function focusFirstError(form: HTMLFormElement) {
  const error = form.querySelector<HTMLElement>(errorSelector);
  if (error?.getAttribute("role") !== "alert") {
    error?.focus();
    return;
  }
  const control = error.closest("fieldset")?.querySelector<HTMLElement>(controlSelector);
  if (control) control.focus();
  else error.scrollIntoView({ block: "nearest" });
}

/** Moves to the first error whenever validation reports errors, which may be out of view otherwise. */
export function useFocusFirstError(errors: object) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (formRef.current && Object.values(errors).some(Boolean)) focusFirstError(formRef.current);
  }, [errors]);

  return formRef;
}
