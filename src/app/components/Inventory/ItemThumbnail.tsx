import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMusic, faCat, faImage } from '@fortawesome/free-solid-svg-icons';
import { SOUND_ARTWORK, type Asset } from '../../../config/assets';
import { getCoverFrameStyle, getCoverFrameCorners } from '../../../utils/coverFrame';
import { CoverFrameCorners } from '../CoverFrameCorners';
import s from './Inventory.module.css';

interface ItemThumbnailProps {
  asset: Asset;
  size?: 'slot' | 'detail';
}

const DARK_PAGE_THUMBNAILS = ['#1e2433', '#2a1f0e'];

// The item's own artwork, filling whatever box it's placed in -- a bag slot or the detail
// modal's preview. Same visual language as the Havenstore cards for each category.
export const ItemThumbnail = ({ asset, size = 'slot' }: ItemThumbnailProps) => {
  const sizeClass = size === 'detail' ? s.thumbDetail : s.thumbSlot;

  switch (asset.category) {
    case 'sound-background':
      return (
        <div className={`${s.thumb} ${sizeClass}`} style={{ background: SOUND_ARTWORK[asset.id] ?? 'var(--color-dark-300)' }}>
          <FontAwesomeIcon icon={faMusic} className={s.thumbIcon} />
        </div>
      );

    case 'companion':
      return (
        <div className={`${s.thumb} ${sizeClass}`} style={{ background: asset.thumbnail }}>
          <FontAwesomeIcon icon={faCat} className={s.thumbIcon} />
        </div>
      );

    case 'page-background': {
      const isDark = DARK_PAGE_THUMBNAILS.includes(asset.thumbnail);
      const background = asset.thumbnail.startsWith('var(') ? 'var(--paper-bg)' : asset.thumbnail;
      return (
        <div className={`${s.thumb} ${sizeClass}`} style={{ background }}>
          <div className={s.pageLines} style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.2)' }}>
            {[100, 75, 90, 60].map((w, i) => (
              <div key={i} className={s.pageLine} style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
      );
    }

    case 'cover-frame': {
      const corners = getCoverFrameCorners(asset.id);
      return (
        <div className={`${s.thumb} ${sizeClass}`} style={{ background: 'var(--component-background)' }}>
          <div className={s.coverPreview} style={getCoverFrameStyle(asset.id)}>
            <FontAwesomeIcon icon={faImage} className={s.coverPreviewIcon} />
            {corners && <CoverFrameCorners config={corners} />}
          </div>
        </div>
      );
    }
  }
};
