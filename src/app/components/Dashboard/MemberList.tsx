import s from './MemberList.module.css';

export function MemberList() {

  return (
    <div className={s.container}>
      <div className={s.header}>
        <h2 className={s.title}>Project Members</h2>
        <p className={s.subtitle}>Manage your project's team</p>
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