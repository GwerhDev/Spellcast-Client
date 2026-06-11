import spellcastIcon from '../../../assets/spellcast-logo.svg';
import s from './AppSwitcher.module.css';
import { useAppDispatch } from 'store/hooks';
import { toggleMinimized } from 'store/desktopSlice';

export const AppSwitcher = () => {
  const dispatch = useAppDispatch();

  return (
    <div className={s.root}>
      <button
        className={s.trigger}
        onClick={() => dispatch(toggleMinimized())}
        data-testid="app-switcher-trigger"
      >
        <span className={s.brandSpellcast}>
          <img src={spellcastIcon} alt="" className={s.triggerIcon} />
          <span className={s.name}>SPELLCAST</span>
        </span>
        <span className={s.brandNhexa}>
          <span className={s.nhexaIcon} />
          <span className={s.nhexaName}>NHEXA</span>
        </span>
      </button>
    </div>
  );
};
