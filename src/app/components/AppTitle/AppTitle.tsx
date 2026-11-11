import s from './AppTitle.module.css';

interface AppTitleProps {
  label: string;
  // The app's own icon, beside its name.
  iconSrc?: string;
  onClick: () => void;
}

// The header's centered title: the app's icon and name, which go to the app's home.
export const AppTitle = ({ label, iconSrc, onClick }: AppTitleProps) => (
  <button type="button" className={s.title} onClick={onClick} data-testid="app-title">
    {iconSrc && <img src={iconSrc} alt="" className={s.icon} data-testid="app-title-icon" />}
    {label.toUpperCase()}
  </button>
);
