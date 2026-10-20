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
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}
export const LabeledInput = (props: LabeledInputProps) => {
  const { label, name, value, type, placeholder, id, htmlFor, onChange, disabled, readOnly, autoComplete } = props;
  // A password is hidden until its eye shows it.
  const [shown, setShown] = useState(false);
  const isPassword = type === "password";

  return (
    <span className={s.container}>
      <label className={`${disabled && s.disabled}`} htmlFor={htmlFor}>{label}</label>
      {isPassword ? (
        <span className={s.passwordField}>
          <input readOnly={readOnly} autoComplete={autoComplete} type={shown ? "text" : "password"} name={name} placeholder={placeholder} id={id} onChange={onChange} value={value} disabled={disabled} />
          <RevealButton shown={shown} onToggle={() => setShown(v => !v)} testId={`${id ?? name}-reveal`} disabled={disabled} />
        </span>
      ) : (
        <input readOnly={readOnly} autoComplete={autoComplete} type={type} name={name} placeholder={placeholder} id={id} onChange={onChange} value={value} disabled={disabled} />
      )}
    </span>
  )
}