import s from "./LabeledInput.module.css";
import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { useLanguage } from "../../../i18n";

// A password field's eye: shows what's typed, or hides it again.
const RevealButton = ({ shown, onToggle, testId, disabled }: { shown: boolean; onToggle: () => void; testId: string; disabled?: boolean }) => {
  const { t } = useLanguage();
  const label = shown ? t.common.hidePassword : t.common.showPassword;
  return (
    <button type="button" className={s.reveal} data-testid={testId} title={label} aria-label={label} aria-pressed={shown} disabled={disabled} onClick={onToggle}>
      <FontAwesomeIcon icon={shown ? faEyeSlash : faEye} />
    </button>
  );
};

export interface LabeledInputProps {
  label: string;
  name: string;
  value: string;
  type?: string;
  placeholder?: string;
  id?: string;
  htmlFor?: string;
  disabled?: boolean;
  readOnly?: boolean;
  // What the browser may fill it with (e.g. "new-password": never a saved one).
  autoComplete?: string;
  // A password the browser's password manager must never offer to save (a .spell's: it isn't
  // the caster's account's). See NOT_SAVED.
  notSaved?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}
// Password managers offer to save whatever was typed in a password field, as the site's
// login, once the page moves on -- even with autocomplete off. A password not to be saved is
// typed in a text field instead, its characters masked by CSS, and the managers that read
// them are told to keep out. Where the masking isn't supported, it stays a password field.
const canMask = typeof CSS !== "undefined" && typeof CSS.supports === "function" && CSS.supports("-webkit-text-security", "disc");
const NOT_SAVED = {
  autoComplete: "off",
  spellCheck: false,
  autoCapitalize: "off",
  autoCorrect: "off",
  "data-1p-ignore": "true",
  "data-lpignore": "true",
  "data-bwignore": "true",
  "data-form-type": "other",
} as const;

export const LabeledInput = (props: LabeledInputProps) => {
  const { label, name, value, type, placeholder, id, htmlFor, onChange, disabled, readOnly, autoComplete, notSaved } = props;
  // A password is hidden until its eye shows it.
  const [shown, setShown] = useState(false);
  const isPassword = type === "password";
  const masked = isPassword && notSaved && canMask;

  return (
    <span className={s.container}>
      <label className={`${disabled && s.disabled}`} htmlFor={htmlFor}>{label}</label>
      {isPassword ? (
        <span className={s.passwordField}>
          {masked ? (
            <input {...NOT_SAVED} className={shown ? undefined : s.masked} readOnly={readOnly} type="text" name={name} placeholder={placeholder} id={id} onChange={onChange} value={value} disabled={disabled} />
          ) : (
            <input {...(notSaved ? NOT_SAVED : {})} readOnly={readOnly} autoComplete={notSaved ? "new-password" : autoComplete} type={shown ? "text" : "password"} name={name} placeholder={placeholder} id={id} onChange={onChange} value={value} disabled={disabled} />
          )}
          <RevealButton shown={shown} onToggle={() => setShown(v => !v)} testId={`${id ?? name}-reveal`} disabled={disabled} />
        </span>
      ) : (
        <input readOnly={readOnly} autoComplete={autoComplete} type={type} name={name} placeholder={placeholder} id={id} onChange={onChange} value={value} disabled={disabled} />
      )}
    </span>
  )
}