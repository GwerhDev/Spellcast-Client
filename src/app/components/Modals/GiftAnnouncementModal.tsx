import React from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faGift } from '@fortawesome/free-solid-svg-icons';
import { CustomModal } from './CustomModal';
import { PrimaryButton } from '../Buttons/PrimaryButton';
import { SecondaryButton } from '../Buttons/SecondaryButton';
import s from './GiftAnnouncementModal.module.css';

// TCORE-123: generic "here's something new" announcement shell, factored out of the first
// two one-off gift modals this app shipped (a new companion, then a new cover frame) once
// it became clear every future feature announcement would want the exact same layout --
// an icon cluster with a one-shot confetti burst, a body paragraph, and a primary/secondary
// action row. Callers own their own copy, icon, confetti palette, and both callbacks; this
// only owns the shell so the layout can't drift between announcements over time.
interface GiftAnnouncementModalProps {
  show: boolean;
  title: string;
  body: string;
  // A plain icon fits most announcements, but some benefit from showing the actual thing
  // being announced (e.g. a cover frame's own corner plates on a sample cover) -- pass
  // `visual` instead of `icon` for those; it replaces the circle entirely, still centered
  // inside the same confetti/decorative-gift cluster.
  icon?: IconDefinition;
  visual?: React.ReactNode;
  primaryLabel: string;
  primaryIcon: IconDefinition;
  onPrimary: () => void;
  secondaryLabel: string;
  secondaryIcon: IconDefinition;
  onSecondary: () => void;
  // Confetti pieces cycle through these colors -- pick a palette that matches whatever
  // this announcement is about (e.g. bronze/gilded for the Grimoire cover frame).
  confettiColors: string[];
}

const CONFETTI_COUNT = 22;

// One-shot burst from the icon cluster's center, played once on mount (initial->animate,
// no repeat) — small colored pieces fly outward/down with random rotation and fade out.
// Pure framer-motion (already a dependency elsewhere in the app), no confetti library.
const Confetti: React.FC<{ colors: string[] }> = ({ colors }) => (
  <div className={s.confettiLayer} aria-hidden="true">
    {Array.from({ length: CONFETTI_COUNT }, (_, i) => {
      const angle = (i / CONFETTI_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
      const distance = 70 + Math.random() * 70;
      const color = colors[i % colors.length];
      const isSquare = i % 2 === 0;
      return (
        <motion.span
          key={i}
          className={isSquare ? s.confettiSquare : s.confettiDot}
          style={{ background: color }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance + 30,
            opacity: 0,
            rotate: (Math.random() - 0.5) * 360,
          }}
          transition={{ duration: 1 + Math.random() * 0.7, ease: 'easeOut', delay: Math.random() * 0.2 }}
        />
      );
    })}
  </div>
);

export const GiftAnnouncementModal: React.FC<GiftAnnouncementModalProps> = ({
  show, title, body, icon, visual, primaryLabel, primaryIcon, onPrimary, secondaryLabel, secondaryIcon, onSecondary, confettiColors,
}) => (
  <CustomModal show={show} onClose={onSecondary} title={title} compact>
    <div className={s.content}>
      <div className={s.centered}>
        <div className={s.iconCluster}>
          {show && <Confetti colors={confettiColors} />}
          <FontAwesomeIcon icon={faGift} className={`${s.decorGift} ${s.decorGiftLeft}`} />
          <FontAwesomeIcon icon={faGift} className={`${s.decorGift} ${s.decorGiftRight}`} />
          {visual ?? (
            <div className={s.iconWrap}>
              {icon && <FontAwesomeIcon icon={icon} className={s.icon} />}
            </div>
          )}
        </div>
        <p className={s.body}>{body}</p>
      </div>
      {/* Same action-row pattern as SpellDetailModal's .actions: PrimaryButton/
          SecondaryButton, both with icons, equal-width instead of right-aligned. */}
      <div className={s.actions}>
        <PrimaryButton icon={primaryIcon} onClick={onPrimary}>{primaryLabel}</PrimaryButton>
        <SecondaryButton icon={secondaryIcon} onClick={onSecondary}>{secondaryLabel}</SecondaryButton>
      </div>
    </div>
  </CustomModal>
);
