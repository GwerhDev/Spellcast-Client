import s from "./Spinner.module.css";

interface SpinnerProps {
  bg?: boolean;
  message?: string;
  isLoading?: boolean;
}

export const Spinner = ({ isLoading, bg, message }: SpinnerProps) => {
  if (!isLoading) return null;

  return (
    <div className={bg ? s.spinnerContainer : s.noBgSpinnerContainer}>
      <div className={s.spinner}></div>
      <small>{message}</small>
    </div>
  );
};
