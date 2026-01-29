import styles from './HomePage.module.scss';

const HomePage = () => {
  return (
    <div className={styles['container']}>
      <div>
        <h1 className={styles['title']}>React CSR 템플릿</h1>
        <p className={styles['description']}>
          라우팅, Server State, 폼 검증, 목킹, 테스트, 품질 게이트까지 기본 제공하는 Vite 기반
          템플릿입니다.
        </p>
      </div>

      <div className={styles['grid']}>
        <section className={styles['card']}>
          <h2 className={styles['cardTitle']}>Routing</h2>
          <p className={styles['cardBody']}>
            React Router 기반 라우팅과 404/에러 페이지를 포함합니다.
          </p>
        </section>
        <section className={styles['card']}>
          <h2 className={styles['cardTitle']}>Data Fetching</h2>
          <p className={styles['cardBody']}>
            TanStack Query로 캐싱/리트라이/로딩 상태를 표준화합니다.
          </p>
        </section>
        <section className={styles['card']}>
          <h2 className={styles['cardTitle']}>Quality Gate</h2>
          <p className={styles['cardBody']}>
            TypeScript + ESLint + Prettier + Stylelint가 기본값입니다.
          </p>
        </section>
      </div>
    </div>
  );
};

export default HomePage;
