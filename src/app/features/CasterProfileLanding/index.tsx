import s from './index.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuoteLeft, faScroll, faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../../i18n';

/**
 * TCORE-107 follow-up: the body of the "Perfil" tab -- the header (avatar/XP) and the tab
 * bar itself now live one level up, in CasterLayout, which every /caster/* route (including
 * this one) renders under.
 *
 * The "My Quotes"/"My Grimoire" sections are deliberately hardcoded placeholder data (from
 * i18n, not the local IndexedDB grimoire -- a profile's public grimoire is a backend/social
 * concept, not this device's local spells). TCORE-100/101 replace both with real calls.
 */
export const CasterProfileLanding = () => {
  const { t } = useLanguage();

  return (
    <div data-testid="caster-profile-landing" className={s.container}>
      <p data-testid="caster-profile-mock-notice" className={s.mockNotice}>
        <FontAwesomeIcon icon={faCircleInfo} />
        {t.caster.mockNotice}
      </p>

      <section data-testid="caster-profile-quotes" className={s.section}>
        <h2 className={s.sectionTitle}>{t.caster.myQuotes}</h2>
        <div className={s.cardGrid}>
          {t.caster.mockQuotes.map((quote, i) => (
            <div key={i} data-testid="caster-profile-quote-card" className={s.card}>
              <FontAwesomeIcon icon={faQuoteLeft} className={s.cardIcon} />
              <p className={s.quoteText}>{quote.text}</p>
              <span className={s.quoteSpell}>{quote.spell}</span>
            </div>
          ))}
        </div>
      </section>

      <section data-testid="caster-profile-grimoire" className={s.section}>
        <h2 className={s.sectionTitle}>{t.caster.myGrimoire}</h2>
        <div className={s.cardGrid}>
          {t.caster.mockGrimoire.map((spell, i) => (
            <div key={i} data-testid="caster-profile-grimoire-card" className={s.card}>
              <FontAwesomeIcon icon={faScroll} className={s.cardIcon} />
              <span className={s.grimoireTitle}>{spell.title}</span>
              <span className={s.grimoireAuthor}>{spell.author}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
