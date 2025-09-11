import styles from "./Spinner.module.css";

interface SpinnerProps {
  bg?: boolean;
  isLoading: boolean;
}

export const Spinner = ({ isLoading, bg }: SpinnerProps) => {
  if (!isLoading) return null;

  return (
    <div className={bg ? styles.spinnerContainer : styles.noBgSpinnerContainer}>
      <div className={styles.spinner}></div>
    </div>
  );
};
