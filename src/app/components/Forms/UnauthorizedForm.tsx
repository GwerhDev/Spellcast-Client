import { useState } from 'react';
import s from './UnauthorizedForm.module.css';
import { ActionButton } from '../Buttons/ActionButton';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faUserPlus } from '@fortawesome/free-solid-svg-icons';
import { CLIENT_BASE, CLIENT_NAME, REDIRECT_LOGIN, REDIRECT_SIGNUP, APP_ID, VITE_ENV } from '../../../config/api';

export const UnauthorizedForm = () => {
  const [devToken, setDevToken] = useState('');

  const handleDevTokenSubmit = () => {
    if (!devToken.trim()) return;
    document.cookie = `userToken=${devToken}; path=/`;
    window.location.reload();
  };

  return (
    <div className={s.container}>
      <h2>Unauthorized</h2>
      <p>You are not authenticated. Please, login with {CLIENT_NAME} to continue</p>
      <ActionButton onClick={() => window.location.href = REDIRECT_LOGIN + "?callback=" + encodeURIComponent(CLIENT_BASE) + "&appId=" + APP_ID} icon={faUser} text={'Log in with ' + CLIENT_NAME} type='submit' />
      <p>Don't have an account? <a href={REDIRECT_SIGNUP + "?callback=" + encodeURIComponent(CLIENT_BASE)}><FontAwesomeIcon icon={faUserPlus} /> Register</a></p>
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
