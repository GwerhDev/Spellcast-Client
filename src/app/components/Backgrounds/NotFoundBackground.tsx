import s from './Background.module.css';
import { faBan } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useLanguage } from '../../../i18n';

export const NotFoundBackground = () => {
  const { t } = useLanguage();
  return (
    <div className={s.container}>
      <span>
        <FontAwesomeIcon icon={faBan} size="10x" />
      </span>
      <h2>{t.errors.notFound}</h2>
    </div>
  );
};
