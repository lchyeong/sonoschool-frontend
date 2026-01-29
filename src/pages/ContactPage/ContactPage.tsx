import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';

import type { ContactFormData } from '@/api/contact';
import { submitContactForm } from '@/api/contact';
import Button from '@/components/ui/Button/Button';
import { TextAreaField, TextField } from '@/components/ui/TextField/TextField';
import { env } from '@/config/env';
import { contactSchema, type ContactFormValues } from '@/forms/schemas/contactSchema';
import { useToastStore } from '@/stores/useToastStore';

import styles from './ContactPage.module.scss';

const ContactPage = () => {
  const showToast = useToastStore((state) => state.showToast);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      title: '',
      email: '',
      content: '',
      product: '',
      name: '',
      jobTitle: '',
      phone: '',
      turnstileToken: env.VITE_ENABLE_MOCK ? 'dev-token' : '',
    },
    mode: 'onBlur',
  });

  const submitMutation = useMutation({
    mutationFn: (values: ContactFormValues) => {
      const formData: ContactFormData = {
        title: values.title,
        email: values.email,
        content: values.content,
        turnstileToken: values.turnstileToken,
        ...(values.product ? { product: values.product } : {}),
        ...(values.name ? { name: values.name } : {}),
        ...(values.jobTitle ? { jobTitle: values.jobTitle } : {}),
        ...(values.phone ? { phone: values.phone } : {}),
      };

      return submitContactForm(formData);
    },
    onSuccess: () => {
      showToast({ message: '문의가 접수되었습니다.', variant: 'success' });
      form.reset({
        title: '',
        email: '',
        content: '',
        product: '',
        name: '',
        jobTitle: '',
        phone: '',
        turnstileToken: env.VITE_ENABLE_MOCK ? 'dev-token' : '',
      });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : '문의 접수에 실패했습니다.';
      showToast({ message, variant: 'error' });
    },
  });

  const handleSubmit = form.handleSubmit((values) => {
    submitMutation.mutate(values);
  });

  return (
    <div className={styles['container']}>
      <div>
        <h1 className={styles['title']}>Contact</h1>
        <p className={styles['description']}>
          이 폼은 템플릿 기본 제공 예시입니다. 실제 Turnstile 연동은 추후 필요하며, 개발 환경에서
          목킹이 켜져 있으면(dev) <code>turnstileToken</code>은 <code>dev-token</code> 기본값으로
          동작합니다.
        </p>
      </div>

      <form
        className={styles['form']}
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        <TextField
          errorMessage={form.formState.errors.title?.message}
          label='제목'
          placeholder='제목을 입력해주세요'
          {...form.register('title')}
        />
        <TextField
          errorMessage={form.formState.errors.email?.message}
          label='이메일'
          placeholder='you@example.com'
          type='email'
          {...form.register('email')}
        />
        <TextAreaField
          errorMessage={form.formState.errors.content?.message}
          label='내용'
          placeholder='문의 내용을 입력해주세요'
          {...form.register('content')}
        />

        <div className={styles['submitRow']}>
          <Button disabled={submitMutation.isPending} type='submit'>
            {submitMutation.isPending ? '전송 중...' : '전송'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ContactPage;
