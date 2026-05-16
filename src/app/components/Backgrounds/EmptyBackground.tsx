import s from './Background.module.css';
import { faBan } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useLanguage } from '../../../i18n';

export const EmptyBackground = () => {
  const { t } = useLanguage();
  return (
    <div className={s.container}>
      <span>
        <FontAwesomeIcon icon={faBan} size="10x" />
      </span>
      <h4>{t.errors.empty}</h4>
    </div>
  );
};
