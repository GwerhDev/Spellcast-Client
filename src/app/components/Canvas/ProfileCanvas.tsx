import s from './ProfileCanvas.module.css';
import { userData } from '../../../interfaces';

interface ProfileCanvasProps {
  userData: userData;
}

export const ProfileCanvas = (props: ProfileCanvasProps) => {
  const { userData } = props || {};
  const { username, role } = userData || {};

  return (
    <ul className={s.container}>
      <li>
        <h3>
          {username}
        </h3>
      </li>
      <li>
        <small>{role}</small>
      </li>
    </ul>
  )
}