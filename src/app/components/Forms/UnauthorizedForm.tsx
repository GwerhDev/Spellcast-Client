import { useState } from 'react';
import s from './UnauthorizedForm.module.css';
import { ActionButton } from '../Buttons/ActionButton';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faUserPlus } from '@fortawesome/free-solid-svg-icons';
import { CLIENT_BASE, CLIENT_NAME, REDIRECT_LOGIN, REDIRECT_SIGNUP, APP_ID, VITE_ENV } from '../../../config/api';
import { useLanguage } from '../../../i18n';

export const UnauthorizedForm = () => {
  const [devToken, setDevToken] = useState('');
  const { t } = useLanguage();

  const handleDevTokenSubmit = () => {
    if (!devToken.trim()) return;
    document.cookie = `accessToken=${devToken}; path=/`;
    window.location.reload();
  };

  return (
    <div className={s.container}>
      <h2>{t.errors.unauthorized}</h2>
      <p>{t.errors.unauthorizedDesc.replace('{name}', CLIENT_NAME)}</p>
      <ActionButton onClick={() => window.location.href = REDIRECT_LOGIN + "?callback=" + encodeURIComponent(CLIENT_BASE) + "&appId=" + APP_ID} icon={faUser} text={t.auth.loginWith.replace('{name}', CLIENT_NAME)} type='submit' />
      <p>{t.errors.noAccount} <a href={REDIRECT_SIGNUP + "?callback=" + encodeURIComponent(CLIENT_BASE)}><FontAwesomeIcon icon={faUserPlus} /> {t.errors.register}</a></p>
      {VITE_ENV !== 'production' && (
        <div className={s.devTokenForm}>
          <p>Dev: enter token manually</p>
          <input
            type="text"
            placeholder="userToken"
            value={devToken}
            onChange={(e) => setDevToken(e.target.value)}
            className={s.devTokenInput}
          />
          <ActionButton onClick={handleDevTokenSubmit} text="Set token" type="button" />
        </div>
      )}
    </div>
  )
};
