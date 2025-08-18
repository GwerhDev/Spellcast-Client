import s from './AudioBookCard.module.css';
import { faRocket } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export const AudioBookCard = (props: any) => {
  const { audioBook } = props || {};

  return (
    <>
      <span className={s.box}>
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
