import s from "./Spinner.module.css";
import spellcastLogo from "../../../assets/spellcast-logo.svg";

interface SpinnerProps {
  bg?: boolean;
  message?: string;
  isLoading?: boolean;
}

// Quoted: Vite inlines small SVGs as data URIs containing single quotes, which an unquoted
// url() rejects.
const brandMask = `url("${spellcastLogo}")`;

export const Spinner = ({ isLoading, bg, message }: SpinnerProps) => {
  if (!isLoading) return null;

  return (
    <div data-testid="spinner" role="status" className={bg ? s.spinnerContainer : s.noBgSpinnerContainer}>
      {/* The Spellcast mark inside the spinning ring, drawn as a mask in the theme's color. */}
      <div className={s.mark}>
        <div className={s.spinner}></div>
        <span
          data-testid="spinner-logo"
          className={s.logo}
          style={{ maskImage: brandMask, WebkitMaskImage: brandMask }}
          aria-hidden="true"
        />
      </div>
      {message && <small>{message}</small>}
    </div>
  );
};
