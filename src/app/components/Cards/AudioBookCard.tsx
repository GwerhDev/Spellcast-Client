import s from './AudioBookCard.module.css';
import { faRocket } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useDispatch } from 'react-redux';
import { setPlaylist, play } from '../../../store/audioPlayerSlice';

interface AudioBook {
  image?: string;
  name: string;
}

interface AudioBookCardProps {
  audioBook: AudioBook;
}

export const AudioBookCard = (props: AudioBookCardProps) => {
  const { audioBook } = props || {};
  const dispatch = useDispatch();

  const handleCardClick = () => {
    // In a real application, audioBook would have a 'url' property
    const dummyAudioUrl = `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${Math.floor(Math.random() * 10) + 1}.mp3`;
    dispatch(setPlaylist({ playlist: [dummyAudioUrl], startIndex: 0 }));
    dispatch(play());
  };

  return (
    <>
      <span className={s.box} onClick={handleCardClick}>
        <span className={s.audioBookImageContainer}>
          {
            audioBook.image
              ? <img className={s.audioBookImage} src={audioBook.image} alt="" />
              : <span>{audioBook.name[0]}</span>
          }
        </span>
        <h4 className={s.title}>
          {audioBook.name}
        </h4>
      </span>
      <FontAwesomeIcon icon={faRocket} />
    </>
  )
}
