import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faTrophy, faGift, faCoins } from '@fortawesome/free-solid-svg-icons';
import type { Asset } from '../../../config/assets';
import { useLanguage, assetName, assetDescription, assetTag } from '../../../i18n';
import { CustomModal } from '../Modals/CustomModal';
import { PrimaryButton } from '../Buttons/PrimaryButton';
import { SecondaryButton } from '../Buttons/SecondaryButton';
import { Flight } from '../Flight/Flight';
import { useFlightTransition, type FlightOrigin } from '../Flight/useFlightTransition';
import { ItemThumbnail } from './ItemThumbnail';
import s from './Inventory.module.css';

interface ItemDetailModalProps {
  asset: Asset | null;
  isActive: boolean;
  // Page backgrounds always have one default, so the active one can't be cleared -- only
  // replaced by picking another.
  canDeactivate: boolean;
  onToggleActive: (asset: Asset) => void;
  onClose: () => void;
  // The bag slot it was opened from: the item flies from it into the preview, and back.
  openedFrom?: FlightOrigin | null;
}

export const ItemDetailModal = ({ asset, isActive, canDeactivate, onToggleActive, onClose, openedFrom = null }: ItemDetailModalProps) => {
  const { t } = useLanguage();
  const { slotRef, leg, requestClose, modalMotion, flightProps } = useFlightTransition({ show: !!asset, origin: openedFrom, onClose });
  if (!asset) return null;

  const origin = {
    free: { icon: faGift, label: t.caster.itemOriginFree },
    purchase: { icon: faCoins, label: t.caster.itemOriginPurchase },
    achievement: { icon: faTrophy, label: t.caster.itemOriginAchievement },
  }[asset.unlockMethod];

  return (
    <>
    <CustomModal show title={assetName(t, asset)} onClose={requestClose} compact motion={modalMotion}>
      <div data-testid="item-detail" className={s.detail}>
        <div ref={slotRef} data-testid="item-detail-preview" className={`${s.detailPreview} ${leg ? s.detailPreviewAway : ''}`}>
          <ItemThumbnail asset={asset} size="detail" />
        </div>
        <div className={s.detailInfo}>
          <div className={s.detailMeta}>
            <span className={s.detailCategory}>{t.caster.itemCategory[asset.category]}</span>
            <span className={s.detailOrigin}>
              <FontAwesomeIcon icon={origin.icon} /> {origin.label}
            </span>
          </div>
          <p className={s.detailDescription}>{assetDescription(t, asset)}</p>
          {asset.tags.length > 0 && (
            <div className={s.detailTags}>
              {asset.tags.map(tag => <span key={tag} className={s.detailTag}>{assetTag(t, tag)}</span>)}
            </div>
          )}
          <div className={s.detailActions}>
            {isActive ? (
              canDeactivate ? (
                <SecondaryButton data-testid="item-detail-deactivate" icon={faCheck} text={t.havenStore.deactivate} onClick={() => onToggleActive(asset)} />
              ) : (
                <span className={s.detailActiveNote} data-testid="item-detail-active">
                  <FontAwesomeIcon icon={faCheck} /> {t.havenStore.active}
                </span>
              )
            ) : (
              <PrimaryButton data-testid="item-detail-activate" text={t.havenStore.setActive} onClick={() => onToggleActive(asset)} />
            )}
          </div>
        </div>
      </div>
    </CustomModal>
    {leg && flightProps && (
      // No turn on arrival: it just lands in the preview.
      <Flight key={leg.direction} {...flightProps} radius="8px" testId="item-flight">
        <ItemThumbnail asset={asset} size="detail" />
      </Flight>
    )}
    </>
  );
};
