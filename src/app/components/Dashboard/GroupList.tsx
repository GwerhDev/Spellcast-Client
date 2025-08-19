import s from './GroupList.module.css';

export function GroupList() {

  return (
    <div className={s.container}>
      <div className={s.header}>
        <h2 className={s.title}>Groups</h2>
        <p className={s.subtitle}>Manage your groups</p>
      </div>
      {
        <>
          <ul className={s.memberGrid}>

          </ul>
        </>
      }
    </div>
  );
}