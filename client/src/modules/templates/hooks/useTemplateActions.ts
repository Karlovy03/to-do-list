import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { errorText } from '@/shared/api/errors';
import { t } from '@/shared/lib/texts';
import { useToast } from '@/shared/ui';
import { templateKeys, templatesApi, type TemplateFields } from '../api/templates.api';

/** Хід надсилання файлу: null — не надсилається; 0…1 — частка */
function useProgress() {
  const [progress, setProgress] = useState<number | null>(null);
  return { progress, setProgress };
}

export function useUploadTemplate() {
  const qc = useQueryClient();
  const toast = useToast();
  const { progress, setProgress } = useProgress();
  const mutation = useMutation({
    mutationFn: ({ file, fields }: { file: File; fields: TemplateFields }) => {
      setProgress(0);
      return templatesApi.upload(file, fields, setProgress);
    },
    onSettled: () => setProgress(null),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: templateKeys.all });
      toast(t('templates.toast.added'));
    },
  });
  return { ...mutation, progress };
}

/** Зміни одного шаблону; помилку заміни файлу показує сам аркуш, решту — сповіщення */
export function useTemplateActions(id: string) {
  const qc = useQueryClient();
  const toast = useToast();
  const { progress, setProgress } = useProgress();
  const done = (key: string) => () => {
    void qc.invalidateQueries({ queryKey: templateKeys.all });
    toast(t(key));
  };
  return {
    update: useMutation({
      mutationFn: (changes: { name?: string; description?: string | null }) => templatesApi.update(id, changes),
      onSuccess: done('templates.toast.updated'),
    }),
    remove: useMutation({
      mutationFn: () => templatesApi.remove(id),
      onSuccess: done('templates.toast.removed'),
      onError: (err) => toast(errorText(err)),
    }),
    replace: {
      ...useMutation({
        mutationFn: (file: File) => {
          setProgress(0);
          return templatesApi.replace(id, file, setProgress);
        },
        onSettled: () => setProgress(null),
        onSuccess: done('templates.toast.replaced'),
      }),
      progress,
    },
  };
}
