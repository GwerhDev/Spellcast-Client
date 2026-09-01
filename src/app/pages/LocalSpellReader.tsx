import s from '../components/SpellReader/index.module.css';
import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { getSpellById } from '../../db';
import { useAppSelector } from '../../store/hooks';
import { resetAudioPlayer, setAutoPlayOnLoad as setAudioAutoPlayOnLoad } from '../../store/audioPlayerSlice';
import { resetBrowserPlayer, stop, setAutoPlayOnLoad } from '../../store/browserPlayerSlice';
import { setSpellFile, setSpellInfo, resetSpellReader, setSpellLoaded, setHasInitialPageSet } from '../../store/spellReaderSlice';
import { Spinner } from '../components/Spinner';
import { SpellReader } from '../components/SpellReader';
import { EmptyState } from '../components/EmptyState';
import { IconButton } from '../components/Buttons/IconButton';
import { faArrowLeft, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../i18n';

export const LocalSpellReader: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useLanguage();
  const [error, setError] = useState<string | null>(null);

  const { userData, logged } = useAppSelector((state) => state.session);
  const { spellId } = useAppSelector((state) => state.spellReader);

  useEffect(() => {
    const loadSpell = async () => {
      if (!id) { setError('No document ID provided.'); setIsLoading(false); return; }
      if (!logged) { setError('You must be logged in to view this document.'); setIsLoading(false); return; }

      if (id === spellId) {
        setIsLoading(false);
        if (location.state?.autoPlay) {
          dispatch(setAutoPlayOnLoad(true));
          dispatch(setAudioAutoPlayOnLoad(true));
        }
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        dispatch(stop());
        dispatch(resetSpellReader());
        dispatch(resetAudioPlayer());
        dispatch(resetBrowserPlayer());
        if (location.state?.autoPlay) {
          dispatch(setAutoPlayOnLoad(true));
          dispatch(setAudioAutoPlayOnLoad(true));
        }
        dispatch(setSpellLoaded(false));

        const doc = await getSpellById(id, userData.id);
        if (!doc) { setError('Spell not found.'); setIsLoading(false); return; }

        const totalPages = doc.pagesContent
          ? (JSON.parse(doc.pagesContent) as unknown[]).length
          : 1;

        dispatch(setSpellFile({ id, title: doc.title, progress: doc.progress }));
        dispatch(setSpellInfo({ totalPages }));
        dispatch(setHasInitialPageSet(true));
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load local spell:', err);
        setError('Failed to load spell.');
        setIsLoading(false);
      }
    };

    loadSpell();
    //eslint-disable-next-line
  }, [id, dispatch, spellId, logged, userData.id]);

  if (isLoading) return <Spinner isLoading message={t.errors.loadingSpell} />;
  if (error) return (
    <div className={s.pdfReaderContainer}>
      <div className={s.pageInfoContainer}>
        <IconButton data-testid="local-spell-reader-error-back-btn" icon={faArrowLeft} variant='transparent' title={t.common.back} onClick={() => navigate(-1)} />
      </div>
      <EmptyState testId="local-spell-reader-error" icon={faTriangleExclamation} message={error} />
    </div>
  );

  return <SpellReader />;
};
