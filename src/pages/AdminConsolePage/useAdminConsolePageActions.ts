import type { FormEvent } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';

import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  createAdminNotice,
  createAdminResource,
  createAdminReview,
  replyAdminQna,
} from '@/api/adminConsole';
import { adminConsoleQueryKey } from '@/query/useAdminConsoleQuery';
import { useToastStore } from '@/stores/useToastStore';
import type {
  CreateAdminNoticePayload,
  CreateAdminResourcePayload,
  CreateAdminReviewPayload,
  ReplyAdminQnaPayload,
} from '@/types/adminConsole';

import {
  formatFileSizeLabel,
  INITIAL_NOTICE_FORM,
  INITIAL_RESOURCE_FORM,
  INITIAL_REVIEW_FORM,
  type NoticeFormState,
  type ResourceFormState,
  type ReviewFormState,
} from './adminConsolePageShared';

export interface AdminConsolePageActions {
  handleNoticeSubmit: (event: FormEvent<HTMLFormElement>) => void;
  handleQnaReplySubmit: (threadId: string) => void;
  handleResourceSubmit: (event: FormEvent<HTMLFormElement>) => void;
  handleReviewSubmit: (event: FormEvent<HTMLFormElement>) => void;
  noticeForm: NoticeFormState;
  noticeMutation: UseMutationResult<void, unknown, CreateAdminNoticePayload>;
  qnaReplyDrafts: Record<string, string>;
  qnaReplyMutation: UseMutationResult<void, unknown, ReplyAdminQnaPayload & { threadId: string }>;
  resourceForm: ResourceFormState;
  resourceMutation: UseMutationResult<void, unknown, CreateAdminResourcePayload>;
  reviewForm: ReviewFormState;
  reviewMutation: UseMutationResult<void, unknown, CreateAdminReviewPayload>;
  setNoticeForm: Dispatch<SetStateAction<NoticeFormState>>;
  setQnaReplyDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  setResourceForm: Dispatch<SetStateAction<ResourceFormState>>;
  setReviewForm: Dispatch<SetStateAction<ReviewFormState>>;
}

export const useAdminConsolePageActions = (): AdminConsolePageActions => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);

  const [noticeForm, setNoticeForm] = useState<NoticeFormState>(INITIAL_NOTICE_FORM);
  const [resourceForm, setResourceForm] = useState<ResourceFormState>(INITIAL_RESOURCE_FORM);
  const [reviewForm, setReviewForm] = useState<ReviewFormState>(INITIAL_REVIEW_FORM);
  const [qnaReplyDrafts, setQnaReplyDrafts] = useState<Record<string, string>>({});

  const invalidateAdminConsole = async () => {
    await queryClient.invalidateQueries({
      queryKey: adminConsoleQueryKey(),
    });
  };

  const noticeMutation = useMutation({
    mutationFn: createAdminNotice,
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '공지사항 등록에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      setNoticeForm(INITIAL_NOTICE_FORM);
      await invalidateAdminConsole();
      showToast({
        message: '공지사항이 등록되었습니다.',
        variant: 'success',
      });
    },
  });

  const qnaReplyMutation = useMutation({
    mutationFn: ({ content, threadId }: { content: string; threadId: string }) => {
      return replyAdminQna(threadId, { content });
    },
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : 'Q&A 답변 등록에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async (_, variables) => {
      setQnaReplyDrafts((current) => ({
        ...current,
        [variables.threadId]: '',
      }));
      await invalidateAdminConsole();
      showToast({
        message: 'Q&A 답변을 등록했습니다.',
        variant: 'success',
      });
    },
  });

  const resourceMutation = useMutation({
    mutationFn: createAdminResource,
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '자료실 게시글 등록에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      setResourceForm(INITIAL_RESOURCE_FORM);
      await invalidateAdminConsole();
      showToast({
        message: '자료실 게시글을 등록했습니다.',
        variant: 'success',
      });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: createAdminReview,
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '교육후기 홍보글 등록에 실패했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      setReviewForm(INITIAL_REVIEW_FORM);
      await invalidateAdminConsole();
      showToast({
        message: '교육후기 홍보글을 등록했습니다.',
        variant: 'success',
      });
    },
  });

  const handleNoticeSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!noticeForm.title.trim()) {
      showToast({ message: '공지사항 제목을 입력해 주세요.', variant: 'error' });
      return;
    }

    noticeMutation.mutate({
      category: noticeForm.category,
      isPinned: noticeForm.isPinned,
      title: noticeForm.title.trim(),
    });
  };

  const handleResourceSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!resourceForm.title.trim() || !resourceForm.description.trim()) {
      showToast({ message: '자료실 제목과 설명을 입력해 주세요.', variant: 'error' });
      return;
    }

    if (!resourceForm.attachmentFile) {
      showToast({ message: '첨부 파일을 선택해 주세요.', variant: 'error' });
      return;
    }

    resourceMutation.mutate({
      attachmentName: resourceForm.attachmentFile.name,
      attachmentSizeLabel: formatFileSizeLabel(resourceForm.attachmentFile.size),
      description: resourceForm.description.trim(),
      title: resourceForm.title.trim(),
      visibility: resourceForm.visibility,
    });
  };

  const handleReviewSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!reviewForm.title.trim() || !reviewForm.summary.trim()) {
      showToast({ message: '홍보글 제목과 내용을 입력해 주세요.', variant: 'error' });
      return;
    }

    reviewMutation.mutate({
      summary: reviewForm.summary.trim(),
      title: reviewForm.title.trim(),
    });
  };

  const handleQnaReplySubmit = (threadId: string) => {
    const draft = qnaReplyDrafts[threadId] ?? '';

    if (!draft.trim()) {
      showToast({ message: '답변 내용을 입력해 주세요.', variant: 'error' });
      return;
    }

    qnaReplyMutation.mutate({
      content: draft.trim(),
      threadId,
    });
  };

  return {
    handleNoticeSubmit,
    handleQnaReplySubmit,
    handleResourceSubmit,
    handleReviewSubmit,
    noticeForm,
    noticeMutation,
    qnaReplyDrafts,
    qnaReplyMutation,
    resourceForm,
    resourceMutation,
    reviewForm,
    reviewMutation,
    setNoticeForm,
    setQnaReplyDrafts,
    setResourceForm,
    setReviewForm,
  };
};
