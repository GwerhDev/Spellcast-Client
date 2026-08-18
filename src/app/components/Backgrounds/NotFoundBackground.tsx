import s from './Background.module.css';
import { faBan } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../i18n';
import { PrimaryButton } from '../Buttons/PrimaryButton';

export const NotFoundBackground = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  return (
    <div className={s.container}>
      <span>
        <FontAwesomeIcon icon={faBan} size="10x" />
      </span>
      <h2>{t.errors.notFound}</h2>
      <PrimaryButton data-testid="not-found-home-btn" onClick={() => navigate('/')}>
        {t.errors.backToHome}
      </PrimaryButton>
    </div>
  );
};
