import { z } from 'zod';

export const contactSchema = z.object({
  title: z.string().trim().min(1, '제목을 입력해주세요.').max(200, '제목이 너무 깁니다.'),
  email: z.string().trim().pipe(z.email('이메일을 확인해주세요.')),
  content: z.string().trim().min(1, '내용을 입력해주세요.').max(5000, '내용이 너무 깁니다.'),
  name: z.string().trim().optional(),
  jobTitle: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  turnstileToken: z.string().trim().min(1, '스팸 방지 인증이 필요합니다.'),
});

export type ContactFormValues = z.infer<typeof contactSchema>;
