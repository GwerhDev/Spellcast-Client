import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMusic, faLock, faTrophy, faCheck, faCoins, faArrowUpRightFromSquare, faMagnifyingGlass, faCube } from '@fortawesome/free-solid-svg-icons';
import { useAppSelector, useAppDispatch } from 'store/hooks';
import { unlockAsset, setActiveSoundBg, setActivePageBg } from '../../../store/userLibrarySlice';
import { soundBackgrounds, pageBackgrounds } from '../../../config/assets';
import { EXTERNAL_LINKS } from '../../../config/externalLinks';
import { useLanguage } from '../../../i18n';
import s from './index.module.css';

type Tab = 'assets' | 'companions';

const SOUND_ARTWORK: Record<string, string> = {
  'rain-window':      'linear-gradient(145deg, #0e2a40 0%, #1e5a8a 100%)',
  'cafe-murmur':      'linear-gradient(145deg, #2e1808 0%, #8a4010 100%)',
  'ancient-forest':   'linear-gradient(145deg, #0a2414 0%, #145c30 100%)',
  'ocean-tides':      'linear-gradient(145deg, #082430 0%, #0e6e80 100%)',
  'crackling-hearth': 'linear-gradient(145deg, #2e0e08 0%, #a03010 100%)',
  'northern-winds':   'linear-gradient(145deg, #120a30 0%, #3a1870 100%)',
};

export const HavenStoreLanding = () => {
  const dispatch = useAppDispatch();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>('assets');
  const [query, setQuery] = useState('');
  const { unlockedIds, activeSoundBgId, activePageBgId } = useAppSelector(state => state.userLibrary);

  const isUnlocked = (id: string) => unlockedIds.includes(id);

  const q = query.toLowerCase().trim();
  const filteredSounds = soundBackgrounds.filter(bg =>
    !q || bg.name.toLowerCase().includes(q) || bg.description.toLowerCase().includes(q) || bg.tags.some(t => t.includes(q))
  );
  const filteredPages = pageBackgrounds.filter(bg =>
    !q || bg.name.toLowerCase().includes(q) || bg.description.toLowerCase().includes(q) || bg.tags.some(t => t.includes(q))
  );

  const handleSoundAction = (id: string) => {
    if (!isUnlocked(id)) {
      dispatch(unlockAsset(id));
      dispatch(setActiveSoundBg(id));
      return;
    }
    dispatch(setActiveSoundBg(activeSoundBgId === id ? null : id));
  };

  const handlePageAction = (id: string) => {
    if (!isUnlocked(id)) {
      dispatch(unlockAsset(id));
      dispatch(setActivePageBg(id));
      return;
    }
    dispatch(setActivePageBg(id));
  };

  const renderSoundGrid = () => (
    <div className={s.soundGrid}>
      {filteredSounds.map(bg => {
        const unlocked = isUnlocked(bg.id);
        const isActive = activeSoundBgId === bg.id;
        const locked = !unlocked;
        return (
          <div key={bg.id} className={`${s.productCard} ${isActive ? s.productCardActive : ''} ${locked ? s.productCardLocked : ''}`}>
            <div className={s.artwork} style={{ background: SOUND_ARTWORK[bg.id] ?? 'var(--color-dark-300)' }}>
              <FontAwesomeIcon icon={faMusic} className={s.artworkIcon} />
              {locked && (
                <div className={s.lockOverlay}>
                  <FontAwesomeIcon icon={bg.unlockMethod === 'achievement' ? faTrophy : faLock} className={s.lockIcon} />
                </div>
              )}
              {isActive && (
                <span className={s.activePill}>
                  <FontAwesomeIcon icon={faCheck} /> {t.havenStore.active}
                </span>
              )}
            </div>
            <div className={s.productBody}>
              <span className={s.productName}>{bg.name}</span>
              <p className={s.productDesc}>{bg.description}</p>
              <div className={s.productFooter}>
                {bg.unlockMethod === 'free' && (
                  <span className={s.freeBadge}>{t.havenStore.free}</span>
                )}
                {bg.unlockMethod === 'purchase' && (
                  <span className={s.priceBadge}>
                    <FontAwesomeIcon icon={faCoins} /> {bg.price}
                  </span>
                )}
                {bg.unlockMethod === 'achievement' && (
                  <span className={s.achievementBadge}>
                    <FontAwesomeIcon icon={faTrophy} />
                  </span>
                )}
                {locked && bg.unlockMethod !== 'achievement' && (
                  <button className={s.btnBuy} onClick={() => handleSoundAction(bg.id)}>
                    {bg.unlockMethod === 'free' ? t.havenStore.unlock : t.havenStore.purchase}
                  </button>
                )}
                {locked && bg.unlockMethod === 'achievement' && (
                  <span className={s.achievementLabel}>{t.havenStore.achievementRequired}</span>
                )}
                {unlocked && (
                  <button
                    className={isActive ? s.btnActive : s.btnSet}
                    onClick={() => handleSoundAction(bg.id)}
                  >
                    {isActive ? t.havenStore.deactivate : t.havenStore.setActive}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderPageGrid = () => (
    <div className={s.pageGrid}>
      {filteredPages.map(bg => {
        const unlocked = isUnlocked(bg.id);
        const isActive = activePageBgId === bg.id;
        const locked = !unlocked;
        const isDark = bg.thumbnail === '#1e2433' || bg.thumbnail === '#2a1f0e';
        const thumbStyle = bg.thumbnail.startsWith('var(') ? { background: 'var(--paper-bg)' } : { background: bg.thumbnail };
        return (
          <div
            key={bg.id}
            className={`${s.productCard} ${s.pageProductCard} ${isActive ? s.productCardActive : ''} ${locked ? s.productCardLocked : ''}`}
            onClick={() => unlocked && handlePageAction(bg.id)}
          >
            <div className={s.pageThumbnail} style={thumbStyle}>
              {unlocked && (
                <div className={s.pageThumbnailLines} style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.2)' }}>
                  {[100, 75, 90, 60, 85].map((w, i) => (
                    <div key={i} className={s.pageThumbnailLine} style={{ width: `${w}%` }} />
                  ))}
                </div>
              )}
              {locked && (
                <div className={s.lockOverlay}>
                  <FontAwesomeIcon icon={bg.unlockMethod === 'achievement' ? faTrophy : faLock} className={s.lockIcon} />
                </div>
              )}
              {isActive && (
                <span className={s.activePill}>
                  <FontAwesomeIcon icon={faCheck} /> {t.havenStore.active}
                </span>
              )}
            </div>
            <div className={s.productBody}>
              <span className={s.productName}>{bg.name}</span>
              <div className={s.productFooter}>
                {bg.unlockMethod === 'free' && <span className={s.freeBadge}>{t.havenStore.free}</span>}
                {bg.unlockMethod === 'purchase' && (
                  <span className={s.priceBadge}><FontAwesomeIcon icon={faCoins} /> {bg.price}</span>
                )}
                {bg.unlockMethod === 'achievement' && (
                  <span className={s.achievementBadge}><FontAwesomeIcon icon={faTrophy} /></span>
                )}
                {locked && bg.unlockMethod !== 'achievement' && (
                  <button className={s.btnBuy} onClick={e => { e.stopPropagation(); handlePageAction(bg.id); }}>
                    {bg.unlockMethod === 'free' ? t.havenStore.unlock : t.havenStore.purchase}
                  </button>
                )}
                {locked && bg.unlockMethod === 'achievement' && (
                  <span className={s.achievementLabel}>{t.havenStore.achievementRequired}</span>
                )}
                {unlocked && (
                  <button
                    className={isActive ? s.btnActive : s.btnSet}
                    onClick={e => { e.stopPropagation(); handlePageAction(bg.id); }}
                  >
                    {isActive ? t.havenStore.deactivate : t.havenStore.setActive}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderAssetsTab = () => (
    <div className={s.assetsBody}>
      <div className={s.assetsSection}>
        <p className={s.sectionLabel}>{t.havenStore.soundBackgrounds}</p>
        {renderSoundGrid()}
      </div>
      <div className={s.assetsSection}>
        <p className={s.sectionLabel}>{t.havenStore.pageBackgrounds}</p>
        {renderPageGrid()}
      </div>
    </div>
  );

  const renderCompanionsTab = () => (
    <div className={s.companionsSoon}>
      <FontAwesomeIcon icon={faCube} className={s.companionsSoonIcon} />
      <p className={s.companionsSoonTitle}>{t.havenStore.companionsComingSoon}</p>
      <p className={s.companionsSoonDesc}>{t.havenStore.companionsComingSoonDesc}</p>
    </div>
  );

  return (
    <div className={s.container}>
      <div className={s.hero}>
        <div className={s.heroContent}>
          <h1 className="featured">{t.havenStore.title}</h1>
          <p className={s.heroSubtitle}>{t.havenStore.subtitle}</p>
        </div>
        <a
          href={EXTERNAL_LINKS.havenStore}
          target="_blank"
          rel="noreferrer"
          className={s.heroCtaLink}
        >
          {t.havenStore.exploreFullStore}
          <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
        </a>
      </div>

      <div className={s.panel}>
        <div className={s.panelHeader}>
          <button
            className={`${s.tab} ${activeTab === 'assets' ? s.tabActive : ''}`}
            onClick={() => setActiveTab('assets')}
          >
            {t.havenStore.assets}
          </button>
          <button
            className={`${s.tab} ${activeTab === 'companions' ? s.tabActive : ''}`}
            onClick={() => setActiveTab('companions')}
          >
            {t.havenStore.companions}
          </button>
          {activeTab === 'assets' && (
            <div className={s.searchWrapper}>
              <FontAwesomeIcon icon={faMagnifyingGlass} className={s.searchIcon} />
              <input
                className={s.searchInput}
                placeholder={t.common.search}
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
          )}
        </div>
        <div className={s.panelBody}>
          {activeTab === 'assets' ? renderAssetsTab() : renderCompanionsTab()}
        </div>
      </div>
    </div>
  );
};
