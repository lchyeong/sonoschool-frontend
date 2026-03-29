import { useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { replaceAdminProgramTags } from '@/api/adminProgramTags';
import Button from '@/components/ui/Button/Button';
import { adminProgramDetailLiveQueryKey } from '@/query/useAdminProgramsLiveQuery';
import {
  adminProgramTagsQueryKey,
  useAdminProgramTagsQuery,
} from '@/query/useAdminProgramTagsQuery';
import { useToastStore } from '@/stores/useToastStore';
import type { AdminProgramTag, AdminProgramTagType } from '@/types/adminProgramsLive';
import { classNames } from '@/utils/classNames';

import styles from './AdminProgramTagsSection.module.scss';

interface AdminProgramTagsSectionProps {
  enabled: boolean;
  initialTags: readonly AdminProgramTag[];
  programId: number | null;
}

const tagTypeLabel: Record<AdminProgramTagType, string> = {
  FEATURE: '특징',
  FORMAT: '형식',
  LEVEL: '난이도',
  TARGET: '추천 대상',
  TOPIC: '주제',
};

const tagTypeOrder: readonly AdminProgramTagType[] = [
  'TOPIC',
  'TARGET',
  'FORMAT',
  'LEVEL',
  'FEATURE',
];

const AdminProgramTagsSection = ({
  enabled,
  initialTags,
  programId,
}: AdminProgramTagsSectionProps) => {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const tagsQuery = useAdminProgramTagsQuery(enabled && programId !== null);
  const [selectedTagIds, setSelectedTagIds] = useState<readonly number[]>(() =>
    initialTags.map((tag) => tag.id),
  );

  const saveMutation = useMutation({
    mutationFn: (tagIds: readonly number[]) => replaceAdminProgramTags(programId as number, tagIds),
    onError: (error: unknown) => {
      showToast({
        message: error instanceof Error ? error.message : '프로그램 태그를 저장하지 못했습니다.',
        variant: 'error',
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminProgramDetailLiveQueryKey(programId) }),
        queryClient.invalidateQueries({ queryKey: adminProgramTagsQueryKey() }),
      ]);
      showToast({
        message: '프로그램 태그를 저장했습니다.',
        variant: 'success',
      });
    },
  });

  if (!enabled || programId === null) {
    return (
      <section className={styles['section']}>
        <p className={styles['helperText']}>
          태그는 프로그램 기본정보를 먼저 저장한 뒤 관리할 수 있습니다.
        </p>
      </section>
    );
  }

  const tags = tagsQuery.data ?? [];
  const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.id));

  const groupedTags = tagTypeOrder
    .map((type) => ({
      items: tags.filter((tag) => tag.type === type),
      type,
    }))
    .filter((group) => group.items.length > 0);

  const handleToggle = (tag: AdminProgramTag) => {
    if (!tag.active) {
      return;
    }

    setSelectedTagIds((current) => {
      if (current.includes(tag.id)) {
        return current.filter((tagId) => tagId !== tag.id);
      }

      return [...current, tag.id];
    });
  };

  return (
    <section className={styles['section']}>
      {tagsQuery.isPending ? (
        <p className={styles['helperText']}>태그 목록을 불러오는 중입니다.</p>
      ) : null}

      {tagsQuery.isError ? (
        <p className={styles['helperText']}>
          {tagsQuery.error instanceof Error
            ? tagsQuery.error.message
            : '태그 목록을 불러오지 못했습니다.'}
        </p>
      ) : null}

      {!tagsQuery.isPending && !tagsQuery.isError ? (
        <>
          <section className={styles['summaryCard']}>
            <h2 className={styles['sectionTitle']}>선택된 태그</h2>
            {selectedTags.length ? (
              <div className={styles['tagList']}>
                {selectedTags.map((tag) => (
                  <button
                    className={styles['tagChipActive']}
                    key={tag.id}
                    onClick={() => {
                      handleToggle(tag);
                    }}
                    type='button'
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className={styles['emptyState']}>선택된 태그가 없습니다.</p>
            )}

            <div className={styles['actionRow']}>
              <Button
                disabled={saveMutation.isPending}
                onClick={() => {
                  saveMutation.mutate(selectedTagIds);
                }}
                type='button'
              >
                {saveMutation.isPending ? '저장 중...' : '태그 저장'}
              </Button>
            </div>
          </section>

          {groupedTags.map((group) => (
            <section className={styles['groupCard']} key={group.type}>
              <div className={styles['groupHeader']}>
                <p className={styles['groupLabel']}>{tagTypeLabel[group.type]}</p>
                <p className={styles['groupMeta']}>{group.items.length}개 태그</p>
              </div>

              <div className={styles['tagList']}>
                {group.items.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id);

                  return (
                    <button
                      className={classNames(
                        isSelected && styles['tagChipActive'],
                        !isSelected && tag.active && styles['tagChip'],
                        !tag.active && styles['tagChipDisabled'],
                      )}
                      disabled={!tag.active}
                      key={tag.id}
                      onClick={() => {
                        handleToggle(tag);
                      }}
                      type='button'
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </>
      ) : null}
    </section>
  );
};

export default AdminProgramTagsSection;
