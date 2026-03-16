import { Link } from 'react-router-dom';

import { routePaths } from '@/routes/routeRegistry';
import type { ProgramDetailPageResponse } from '@/types/programCatalog';

import styles from './ProgramPageDetail.module.scss';
import {
  ProgramPageDetailHero,
  ProgramPageDetailMainContent,
  ProgramPageDetailSidebar,
} from './ProgramPageDetailSections';
import { useProgramPageDetailViewModel } from './useProgramPageDetailViewModel';

interface ProgramPageDetailProps {
  data: ProgramDetailPageResponse;
}

const ProgramPageDetail = ({ data }: ProgramPageDetailProps) => {
  const viewModel = useProgramPageDetailViewModel(data);
  const {
    activeSectionId,
    discountedPriceAmount,
    handleReviewCarouselScroll,
    handleTabClick,
    heroInfoPills,
    openCurriculumRows,
    openFaqId,
    optionList,
    originalPriceAmount,
    quantity,
    reviewCarouselRef,
    reviewSortOrder,
    sectionRefHandlers,
    selectedOption,
    setOpenFaqId,
    setQuantity,
    setReviewSortOrder,
    setSelectedOption,
    setShowOptionList,
    showOptionList,
    sortedReviews,
    supportTags,
    toggleCurriculumRow,
    totalPriceLabel,
    visiblePreviewReviewIds,
  } = viewModel;

  return (
    <div className={styles['page']}>
      <ProgramPageDetailHero data={data} heroInfoPills={heroInfoPills} supportTags={supportTags} />

      <div className={styles['detailShell']}>
        <div className={styles['contentLayout']}>
          <ProgramPageDetailMainContent
            activeSectionId={activeSectionId}
            data={data}
            handleReviewCarouselScroll={handleReviewCarouselScroll}
            handleTabClick={handleTabClick}
            openCurriculumRows={openCurriculumRows}
            openFaqId={openFaqId}
            reviewCarouselRef={reviewCarouselRef}
            reviewSortOrder={reviewSortOrder}
            sectionRefHandlers={sectionRefHandlers}
            setOpenFaqId={setOpenFaqId}
            setReviewSortOrder={setReviewSortOrder}
            sortedReviews={sortedReviews}
            toggleCurriculumRow={toggleCurriculumRow}
            visiblePreviewReviewIds={visiblePreviewReviewIds}
          />
          <ProgramPageDetailSidebar
            data={data}
            discountedPriceAmount={discountedPriceAmount}
            optionList={optionList}
            originalPriceAmount={originalPriceAmount}
            quantity={quantity}
            selectedOption={selectedOption}
            setQuantity={setQuantity}
            setSelectedOption={setSelectedOption}
            setShowOptionList={setShowOptionList}
            showOptionList={showOptionList}
            totalPriceLabel={totalPriceLabel}
          />
        </div>
      </div>

      <div className={styles['mobileBottomBar']}>
        <Link className={styles['mobileReserveActionLink']} to={routePaths.contact}>
          예약하기
        </Link>
        <Link className={styles['mobileApplyActionLink']} to={routePaths.contact}>
          수강 신청
        </Link>
      </div>
    </div>
  );
};

export default ProgramPageDetail;
