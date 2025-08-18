import s from "./LabeledInput.module.css";
import { LabeledInputProps } from '../../../interfaces';

export const LabeledInput = (props: LabeledInputProps) => {
  const { label, name, value, type, placeholder, id, htmlFor, onChange, disabled } = props;

  return (
    <span className={`${s.inputContainer} ${disabled ? s.disabled : ''}`}>
      <label htmlFor={htmlFor}>{label}</label>
      <input type={type} name={name} placeholder={placeholder} id={id} onChange={onChange} value={value} disabled={disabled} />
    </span>
  )
}