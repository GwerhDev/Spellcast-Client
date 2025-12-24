import s from "./LabeledInput.module.css";

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
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}
export const LabeledInput = (props: LabeledInputProps) => {
  const { label, name, value, type, placeholder, id, htmlFor, onChange, disabled, readOnly } = props;

  return (
    <span className={s.container}>
      <label className={`${disabled && s.disabled}`} htmlFor={htmlFor}>{label}</label>
      <input readOnly={readOnly} type={type} name={name} placeholder={placeholder} id={id} onChange={onChange} value={value} disabled={disabled} />
    </span>
  )
}