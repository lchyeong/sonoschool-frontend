import { Link } from 'react-router-dom';

import Button from '@/components/ui/Button/Button';
import { TextAreaField, TextField } from '@/components/ui/TextField/TextField';
import { routePaths } from '@/routes/routeRegistry';
import type { AdminConsoleResponse } from '@/types/adminConsole';

import styles from './AdminConsolePage.module.scss';
import {
  programFormatLabel,
  programStatusLabel,
  resourceVisibilityLabel,
  sectionContent,
  type AdminConsoleSection,
  formatFileSizeLabel,
} from './adminConsolePageShared';
import type { AdminConsolePageActions } from './useAdminConsolePageActions';

interface AdminConsolePageHeaderProps {
  section: AdminConsoleSection;
}

interface AdminDashboardSectionProps {
  data: AdminConsoleResponse;
}

interface AdminConsoleManagedSectionProps {
  actions: AdminConsolePageActions;
  data: AdminConsoleResponse;
}

export const AdminConsolePageHeader = ({ section }: AdminConsolePageHeaderProps) => {
  const sectionMeta = sectionContent[section];

  return (
    <header className={styles['pageHeader']}>
      <p className={styles['pageEyebrow']}>{sectionMeta.eyebrow}</p>
      <h1 className={styles['pageTitle']}>{sectionMeta.title}</h1>
      <p className={styles['pageDescription']}>{sectionMeta.description}</p>
    </header>
  );
};

export const AdminDashboardSection = ({ data }: AdminDashboardSectionProps) => {
  const dashboardShortcutItems = [
    {
      countLabel: `${String(data.notices.length)}건`,
      description: '운영 공지와 학사 공지를 등록하고 상태를 확인합니다.',
      title: '공지사항 관리',
      to: routePaths.adminNotices,
    },
    {
      countLabel: `${String(data.qnaThreads.filter((thread) => thread.status === 'waiting').length)}건 대기`,
      description: '답변 대기 문의에 빠르게 답변을 등록합니다.',
      title: 'Q&A 관리',
      to: routePaths.adminQna,
    },
    {
      countLabel: `${String(data.resources.length)}개`,
      description: '파일 첨부형 자료 게시글을 업로드합니다.',
      title: '자료실 관리',
      to: routePaths.adminResources,
    },
    {
      countLabel: `${String(data.reviewPosts.length)}개`,
      description: '교육자가 직접 남기는 홍보형 후기를 운영합니다.',
      title: '교육후기 관리',
      to: routePaths.adminReviews,
    },
    {
      countLabel: `${String(data.programs.length)}개`,
      description: '강의 등록, 수정, 삭제, 숨김 처리를 진행합니다.',
      title: '강의 관리',
      to: routePaths.adminPrograms,
    },
    {
      countLabel: data.salesOverview.monthlyRevenueLabel,
      description: '누적 판매, 잔여 좌석, 매출 현황을 확인합니다.',
      title: '매출 관리',
      to: routePaths.adminSales,
    },
  ] as const;

  return (
    <>
      <header className={styles['hero']}>
        <div className={styles['heroCopy']}>
          <p className={styles['eyebrow']}>Admin Dashboard</p>
          <h1 className={styles['title']}>운영 개요</h1>
          <p className={styles['description']}>
            {data.adminDisplayName} 계정으로 현재 운영 상태를 확인하고 필요한 관리 메뉴로 바로
            이동합니다.
          </p>
        </div>
      </header>

      <section className={styles['summaryGrid']}>
        {data.summaryCards.map((card) => {
          return (
            <article className={styles['summaryCard']} data-tone={card.tone} key={card.id}>
              <p className={styles['summaryLabel']}>{card.label}</p>
              <strong className={styles['summaryValue']}>{card.value}</strong>
              <p className={styles['summaryDescription']}>{card.description}</p>
            </article>
          );
        })}
      </section>

      <section className={styles['shortcutGrid']}>
        {dashboardShortcutItems.map((item) => {
          return (
            <Link className={styles['shortcutCard']} key={item.to} to={item.to}>
              <p className={styles['shortcutMetric']}>{item.countLabel}</p>
              <h2 className={styles['shortcutTitle']}>{item.title}</h2>
              <p className={styles['shortcutDescription']}>{item.description}</p>
            </Link>
          );
        })}
      </section>
    </>
  );
};

export const AdminNoticesSection = ({ actions, data }: AdminConsoleManagedSectionProps) => {
  return (
    <section className={styles['panel']}>
      <form className={styles['form']} onSubmit={actions.handleNoticeSubmit}>
        <TextField
          label='공지 제목'
          name='noticeTitle'
          onChange={(event) => {
            actions.setNoticeForm((current) => ({
              ...current,
              title: event.target.value,
            }));
          }}
          placeholder='예: 4월 신규 과정 오픈 안내'
          value={actions.noticeForm.title}
        />

        <div className={styles['inlineFieldGrid']}>
          <label className={styles['field']}>
            <span className={styles['fieldLabel']}>카테고리</span>
            <select
              className={styles['select']}
              onChange={(event) => {
                actions.setNoticeForm((current) => ({
                  ...current,
                  category: event.target.value as typeof current.category,
                }));
              }}
              value={actions.noticeForm.category}
            >
              <option value='운영'>운영</option>
              <option value='학사'>학사</option>
              <option value='이벤트'>이벤트</option>
            </select>
          </label>

          <label className={styles['checkboxRow']}>
            <input
              checked={actions.noticeForm.isPinned}
              onChange={(event) => {
                actions.setNoticeForm((current) => ({
                  ...current,
                  isPinned: event.target.checked,
                }));
              }}
              type='checkbox'
            />
            <span>상단 고정</span>
          </label>
        </div>

        <Button disabled={actions.noticeMutation.isPending} type='submit'>
          {actions.noticeMutation.isPending ? '등록 중...' : '공지사항 등록'}
        </Button>
      </form>

      <ul className={styles['stackList']}>
        {data.notices.map((notice) => {
          return (
            <li className={styles['stackItem']} key={notice.id}>
              <div className={styles['metaRow']}>
                <span className={styles['badge']}>{notice.category}</span>
                {notice.isPinned ? <span className={styles['badgeAccent']}>고정</span> : null}
                <span className={styles['metaText']}>{notice.publishedAt}</span>
              </div>
              <p className={styles['itemTitle']}>{notice.title}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export const AdminQnaSection = ({ actions, data }: AdminConsoleManagedSectionProps) => {
  return (
    <section className={styles['panel']}>
      <ul className={styles['stackList']}>
        {data.qnaThreads.map((thread) => {
          return (
            <li className={styles['stackItem']} key={thread.id}>
              <div className={styles['metaRow']}>
                <span className={styles['badge']}>{thread.category}</span>
                <span
                  className={
                    thread.status === 'answered' ? styles['badgeSuccess'] : styles['badgeDanger']
                  }
                >
                  {thread.status === 'answered' ? '답변 완료' : '답변 대기'}
                </span>
                <span className={styles['metaText']}>
                  {thread.authorName} · {thread.submittedAt}
                </span>
              </div>
              <p className={styles['itemTitle']}>{thread.question}</p>

              {thread.reply ? (
                <div className={styles['replyCard']}>
                  <p className={styles['replyLabel']}>관리자 답변</p>
                  <p className={styles['replyContent']}>{thread.reply.content}</p>
                  <p className={styles['replyMeta']}>{thread.reply.repliedAt}</p>
                </div>
              ) : (
                <div className={styles['replyComposer']}>
                  <textarea
                    className={styles['textarea']}
                    onChange={(event) => {
                      actions.setQnaReplyDrafts((current) => ({
                        ...current,
                        [thread.id]: event.target.value,
                      }));
                    }}
                    placeholder='문의 작성자에게 보낼 답변을 입력해 주세요.'
                    value={actions.qnaReplyDrafts[thread.id] ?? ''}
                  />
                  <Button
                    disabled={actions.qnaReplyMutation.isPending}
                    onClick={() => {
                      actions.handleQnaReplySubmit(thread.id);
                    }}
                    type='button'
                  >
                    답변 등록
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export const AdminResourcesSection = ({ actions, data }: AdminConsoleManagedSectionProps) => {
  return (
    <section className={styles['panel']}>
      <form className={styles['form']} onSubmit={actions.handleResourceSubmit}>
        <TextField
          label='게시글 제목'
          name='resourceTitle'
          onChange={(event) => {
            actions.setResourceForm((current) => ({
              ...current,
              title: event.target.value,
            }));
          }}
          placeholder='예: 4월 핸즈온 실습 자료집'
          value={actions.resourceForm.title}
        />

        <TextAreaField
          label='자료 설명'
          name='resourceDescription'
          onChange={(event) => {
            actions.setResourceForm((current) => ({
              ...current,
              description: event.target.value,
            }));
          }}
          placeholder='다운로드 자료의 용도와 사용 시점을 적어 주세요.'
          value={actions.resourceForm.description}
        />

        <label className={styles['field']}>
          <span className={styles['fieldLabel']}>공개 범위</span>
          <select
            className={styles['select']}
            onChange={(event) => {
              actions.setResourceForm((current) => ({
                ...current,
                visibility: event.target.value as typeof current.visibility,
              }));
            }}
            value={actions.resourceForm.visibility}
          >
            <option value='public'>전체 공개</option>
            <option value='students-only'>수강생 전용</option>
          </select>
        </label>

        <label className={styles['field']}>
          <span className={styles['fieldLabel']}>첨부 파일</span>
          <input
            className={styles['fileInput']}
            onChange={(event) => {
              actions.setResourceForm((current) => ({
                ...current,
                attachmentFile: event.target.files?.[0] ?? null,
              }));
            }}
            type='file'
          />
          <span className={styles['helperText']}>
            {actions.resourceForm.attachmentFile
              ? `${actions.resourceForm.attachmentFile.name} · ${formatFileSizeLabel(actions.resourceForm.attachmentFile.size)}`
              : 'PDF, 문서, 스프레드시트 등 자료 파일을 선택해 주세요.'}
          </span>
        </label>

        <Button disabled={actions.resourceMutation.isPending} type='submit'>
          {actions.resourceMutation.isPending ? '업로드 중...' : '자료실 게시글 등록'}
        </Button>
      </form>

      <ul className={styles['stackList']}>
        {data.resources.map((resource) => {
          return (
            <li className={styles['stackItem']} key={resource.id}>
              <div className={styles['metaRow']}>
                <span className={styles['badge']}>
                  {resourceVisibilityLabel[resource.visibility]}
                </span>
                <span className={styles['metaText']}>{resource.publishedAt}</span>
              </div>
              <p className={styles['itemTitle']}>{resource.title}</p>
              <p className={styles['itemDescription']}>{resource.description}</p>
              <p className={styles['helperText']}>
                첨부 파일: {resource.attachmentName} · {resource.attachmentSizeLabel}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export const AdminReviewsSection = ({ actions, data }: AdminConsoleManagedSectionProps) => {
  return (
    <section className={styles['panel']}>
      <form className={styles['form']} onSubmit={actions.handleReviewSubmit}>
        <TextField
          label='홍보글 제목'
          name='reviewTitle'
          onChange={(event) => {
            actions.setReviewForm((current) => ({
              ...current,
              title: event.target.value,
            }));
          }}
          placeholder='예: 초음파 교육자가 직접 추천하는 학습 순서'
          value={actions.reviewForm.title}
        />

        <TextAreaField
          label='홍보 문구'
          name='reviewSummary'
          onChange={(event) => {
            actions.setReviewForm((current) => ({
              ...current,
              summary: event.target.value,
            }));
          }}
          placeholder='사이트와 교육 방향을 홍보할 내용을 입력해 주세요.'
          value={actions.reviewForm.summary}
        />

        <Button disabled={actions.reviewMutation.isPending} type='submit'>
          {actions.reviewMutation.isPending ? '등록 중...' : '교육후기 글 등록'}
        </Button>
      </form>

      <ul className={styles['stackList']}>
        {data.reviewPosts.map((reviewPost) => {
          return (
            <li className={styles['stackItem']} key={reviewPost.id}>
              <div className={styles['metaRow']}>
                <span className={styles['badge']}>{reviewPost.educatorName}</span>
                <span
                  className={
                    reviewPost.status === 'published'
                      ? styles['badgeSuccess']
                      : styles['badgeAccent']
                  }
                >
                  {reviewPost.status === 'published' ? '게시중' : '초안'}
                </span>
                <span className={styles['metaText']}>{reviewPost.publishedAt}</span>
              </div>
              <p className={styles['itemTitle']}>{reviewPost.title}</p>
              <p className={styles['itemDescription']}>{reviewPost.summary}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export const AdminSalesSection = ({ data }: AdminDashboardSectionProps) => {
  return (
    <section className={styles['panel']}>
      <div className={styles['salesSummaryGrid']}>
        <article className={styles['salesMetricCard']}>
          <p className={styles['salesMetricLabel']}>누적 매출</p>
          <strong className={styles['salesMetricValue']}>
            {data.salesOverview.grossRevenueLabel}
          </strong>
        </article>
        <article className={styles['salesMetricCard']}>
          <p className={styles['salesMetricLabel']}>당월 매출</p>
          <strong className={styles['salesMetricValue']}>
            {data.salesOverview.monthlyRevenueLabel}
          </strong>
        </article>
        <article className={styles['salesMetricCard']}>
          <p className={styles['salesMetricLabel']}>누적 주문</p>
          <strong className={styles['salesMetricValue']}>
            {data.salesOverview.totalOrdersLabel}
          </strong>
        </article>
        <article className={styles['salesMetricCard']}>
          <p className={styles['salesMetricLabel']}>베스트셀러</p>
          <strong className={styles['salesMetricValueSmall']}>
            {data.salesOverview.bestSellerTitle}
          </strong>
        </article>
      </div>

      <div className={styles['tableWrap']}>
        <table className={styles['table']}>
          <thead>
            <tr>
              <th scope='col'>강의</th>
              <th scope='col'>형태</th>
              <th scope='col'>상태</th>
              <th scope='col'>누적 판매</th>
              <th scope='col'>당월 판매</th>
              <th scope='col'>누적 매출</th>
              <th scope='col'>당월 매출</th>
              <th scope='col'>잔여 좌석 / 재고</th>
            </tr>
          </thead>
          <tbody>
            {data.salesRows.map((row) => {
              return (
                <tr key={row.id}>
                  <td>{row.programTitle}</td>
                  <td>{programFormatLabel[row.format]}</td>
                  <td>{programStatusLabel[row.status]}</td>
                  <td>{row.soldCount}건</td>
                  <td>{row.monthlySoldCount}건</td>
                  <td>{row.totalRevenueLabel}</td>
                  <td>{row.monthlyRevenueLabel}</td>
                  <td>{row.remainingSeatsLabel}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};
