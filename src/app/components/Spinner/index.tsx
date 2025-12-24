import styles from "./Spinner.module.css";

interface SpinnerProps {
  bg?: boolean;
  message?: string;
  isLoading?: boolean;
}

export const Spinner = ({ isLoading, bg, message }: SpinnerProps) => {
  if (!isLoading) return null;

  return (
    <div className={bg ? styles.spinnerContainer : styles.noBgSpinnerContainer}>
      <div className={styles.spinner}></div>
      <small>{message}</small>
    </div>
  );
};
