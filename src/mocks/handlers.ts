import { http, HttpResponse } from 'msw';

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object';
};

export const handlers = [
  http.post('*/contact', async ({ request }) => {
    const body = await request.json().catch(() => null);

    if (!isRecord(body)) {
      return HttpResponse.json({ ok: false, message: 'Invalid body' }, { status: 400 });
    }

    const title = body['title'];
    if (typeof title === 'string' && title.toLowerCase().includes('error')) {
      return HttpResponse.json({ ok: false, message: 'Invalid title' }, { status: 400 });
    }

    return HttpResponse.json({ ok: true });
  }),
];
