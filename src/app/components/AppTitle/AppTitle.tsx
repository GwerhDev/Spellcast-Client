import s from './AppTitle.module.css';

interface AppTitleProps {
  label: string;
  onClick: () => void;
}

// The header's centered title: the app's name, which goes to the app's home.
export const AppTitle = ({ label, onClick }: AppTitleProps) => (
  <button type="button" className={s.title} onClick={onClick} data-testid="app-title">
    {label.toUpperCase()}
  </button>
);
