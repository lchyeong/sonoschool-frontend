import { Link } from 'react-router-dom';

import closeIconSrc from '@/assets/icons/lucide_x.svg';
import Modal from '@/components/overlay/Modal/Modal';
import { routePaths } from '@/routes/routeRegistry';
import type { CartItem } from '@/types/mypage';

import styles from './CartAddedModal.module.scss';

interface CartAddedModalProps {
  item: CartItem;
  onClose: () => void;
}

const formatPrice = (value: number) => {
  return `${value.toLocaleString('ko-KR')}원`;
};

const CartAddedModal = ({ item, onClose }: CartAddedModalProps) => {
  return (
    <Modal
      bodyClassName={styles['body']}
      description='선택한 강의가 장바구니에 추가되었습니다.'
      descriptionClassName={styles['modalDescription']}
      hideTitle
      headerClassName={styles['header']}
      onClose={onClose}
      panelClassName={styles['panel']}
      closeButtonClassName={styles['closeButton']}
      closeButtonContent={<img alt='' aria-hidden='true' src={closeIconSrc} />}
      title='장바구니에 담았습니다'
    >
      <div className={styles['content']}>
        <div aria-hidden='true' className={styles['checkBadge']}>
          <span className={styles['checkMark']}>✓</span>
        </div>

        <div className={styles['messageGroup']}>
          <h2 className={styles['heading']}>장바구니에 담았습니다</h2>
          <p className={styles['description']}>선택한 강의가 장바구니에 추가되었습니다.</p>
          <p className={styles['description']}>장바구니로 이동하시겠어요?</p>
        </div>

        <article className={styles['itemCard']}>
          <div className={styles['thumbnailFrame']}>
            {item.thumbnailUrl ? (
              <img alt='' className={styles['thumbnail']} src={item.thumbnailUrl} />
            ) : null}
          </div>

          <div className={styles['itemCopy']}>
            <p className={styles['eyebrow']}>장바구니 추가 완료</p>
            <h3 className={styles['title']}>{item.title}</h3>
            <p className={styles['price']}>{formatPrice(item.payablePrice)}</p>
          </div>
        </article>

        <div className={styles['actionRow']}>
          <button className={styles['secondaryAction']} onClick={onClose} type='button'>
            계속 둘러보기
          </button>
          <Link className={styles['primaryAction']} to={routePaths.cart}>
            장바구니 보러가기
          </Link>
        </div>
      </div>
    </Modal>
  );
};

export default CartAddedModal;
