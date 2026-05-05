import { useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { createAdminQuestionNotice } from '@/api/qna';
import AdminRichTextEditor from '@/components/editor/AdminRichTextEditor/AdminRichTextEditor';
import Button from '@/components/ui/Button/Button';
import { TextField } from '@/components/ui/TextField/TextField';
import { adminQuestionsQueryKey } from '@/query/useQnaQueries';
import { routePaths } from '@/routes/routeRegistry';
import { useToastStore } from '@/stores/useToastStore';
import { hasRichTextContent } from '@/utils/htmlContent';

import styles from './AdminConsolePage.module.scss';

const AdminQnaNoticeWorkspace = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const createNoticeMutation = useMutation({
    mutationFn: createAdminQuestionNotice,
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '운영 Q&A 공지 등록에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: adminQuestionsQueryKey(),
      });
      showToast({
        message: '운영 Q&A 공지를 등록했습니다.',
        variant: 'success',
      });
      void navigate(routePaths.adminQna);
    },
  });

  const handleSubmit = () => {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle || !hasRichTextContent(trimmedContent)) {
      showToast({
        message: '공지 제목과 내용을 입력해 주세요.',
        variant: 'error',
      });
      return;
    }

    createNoticeMutation.mutate({
      content: trimmedContent,
      title: trimmedTitle,
    });
  };

  return (
    <div className={styles['page']}>
      <header className={styles['pageHeader']}>
        <h1 className={styles['pageTitle']}>Q&A 공지 작성</h1>
        <div className={styles['pageTopActions']}>
          <Button
            onClick={() => {
              void navigate(routePaths.adminQna);
            }}
            size='sm'
            type='button'
            variant='secondary'
          >
            목록으로
          </Button>
        </div>
      </header>

      <section className={styles['editorShell']}>
        <div className={styles['editorToolbar']}>
          <div className={styles['editorHeaderCompact']}>
            <p className={styles['metaText']}>운영 Q&A 목록 상단에 노출할 공지글입니다.</p>
          </div>
        </div>

        <div className={`${styles['form']} ${styles['noticeEditorForm']}`}>
          <TextField
            label='공지 제목'
            labelClassName={styles['srOnly']}
            name='adminQnaNoticeTitle'
            onChange={(event) => {
              setTitle(event.target.value);
            }}
            placeholder='제목'
            value={title}
          />

          <AdminRichTextEditor onChange={setContent} placeholder='본문' value={content} />

          <div className={styles['noticeEditorActionBar']}>
            <div className={styles['actionRow']}>
              <Button
                disabled={createNoticeMutation.isPending}
                onClick={handleSubmit}
                size='sm'
                type='button'
              >
                {createNoticeMutation.isPending ? '등록 중...' : '공지 등록'}
              </Button>
              <Button
                onClick={() => {
                  setTitle('');
                  setContent('');
                }}
                size='sm'
                type='button'
                variant='secondary'
              >
                초기화
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminQnaNoticeWorkspace;
