import s from './Browser.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { faChevronRight, faFolder } from '@fortawesome/free-solid-svg-icons';
import { PropsWithChildren } from 'react';

export const Browser = (props: PropsWithChildren) => {
  const { children } = props;
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();

  const path = decodeURIComponent(location.pathname);
  const basePath = `/project/${id}`;
  const relativePath = path.replace(basePath, '');

  const segments = relativePath.split('/').filter(Boolean);

  const handleNavigate = (index: number) => {
    const partial = segments.slice(0, index + 1).join('/');
    navigate(`${basePath}/${partial}`);
  };

  return (
    <div className={s.container}>
      <section className={s.location}>
        <span className={s.breadcrumb} onClick={() => navigate(basePath)}>
          <FontAwesomeIcon icon={faFolder} />
        </span>
        {
          segments.map((seg, i) => (
            <span key={i} className={s.separator}>
              <FontAwesomeIcon icon={faChevronRight} />
              <span className={s.breadcrumb} onClick={() => handleNavigate(i)}>
                {seg}
              </span>
            </span>
          ))
        }
      </section>
      <section className={s.content}>
        {children}
      </section>
    </div>
  );
};
