import s from './PdfReader.module.css';
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../../store';
import { textToSpeechService } from '../../../../services/tts';
import { setPlaylist, play, resetAudioPlayer } from '../../../../store/audioPlayerSlice';
import { PageSelector } from './PageSelector/PageSelector';
import { IconButton } from '../../Buttons/IconButton';
import { faArrowLeft, faEdit, faSave, faXmark } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import { PageSelectorModal } from '../../Modals/PageSelectorModal';

export const PdfReader = () => {
  const dispatch = useDispatch();
  const { currentPage, isLoaded, currentPageText } = useSelector((state: RootState) => state.pdfReader);
  const { selectedVoice } = useSelector((state: RootState) => state.voice);

  const [editedText, setEditedText] = useState(currentPageText || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isPageSelectorModalOpen, setIsPageSelectorModalOpen] = useState(false);

  useEffect(() => {
    if (currentPageText) {
      setEditedText(currentPageText);
    }
  }, [currentPageText]);

  useEffect(() => {
    dispatch(resetAudioPlayer());
  }, [currentPage, dispatch]);

  const handleGenerateAudio = async (textToGenerate: string, pageNumber: number) => {
    try {
      const audioUrl = await textToSpeechService({ text: textToGenerate, voice: selectedVoice });
      dispatch(setPlaylist({ playlist: [audioUrl], startIndex: 0, sourceType: 'pdfPage', pdfPageNumber: pageNumber }));
      dispatch(play());
    } catch (error) {
      console.error('Failed to generate audio for page', error);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    setIsEditing(false);
    handleGenerateAudio(editedText, currentPage);
  };

  const handleCancel = () => {
    setEditedText(currentPageText || '');
    setIsEditing(false);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedText(e.target.value);
  };

  return (
    <div className={s.pdfReaderContainer}>
        <PageSelectorModal 
            show={isPageSelectorModalOpen}
            onClose={() => setIsPageSelectorModalOpen(false)}
        />
      <div className={s.pageInfoContainer}>
        <span className={s.headerControls}>
          <Link to={'/'}>
            <IconButton variant='transparent' icon={faArrowLeft} />
          </Link>
          {isLoaded && <PageSelector onClick={() => setIsPageSelectorModalOpen(true)} />}
        </span>
        <div className={s.controlsContainer}>
          {isLoaded && isEditing ? (
            <>
              <IconButton icon={faSave} variant='transparent' onClick={handleSave} />
              <IconButton icon={faXmark} variant='transparent' onClick={handleCancel} />
            </>
          ) : (
            <IconButton icon={faEdit} variant='transparent' onClick={handleEdit} />
          )}
        </div>
      </div>
      <div className={s.textContainer}>
        {isLoaded ? (
          <textarea
            value={isEditing ? editedText : currentPageText || 'Extracted text will appear here...'}
            onChange={handleTextChange}
            readOnly={!isEditing}
          />
        ) : (
          <p>Loading page...</p>
        )}
      </div>
    </div>
  )
}