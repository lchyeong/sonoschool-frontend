import { createBrowserRouter } from 'react-router-dom';

import ContactPage from '@/pages/ContactPage/ContactPage';
import HomePage from '@/pages/HomePage/HomePage';
import NotFoundPage from '@/pages/NotFoundPage/NotFoundPage';
import RootLayout from '@/pages/RootLayout/RootLayout';
import RouteErrorPage from '@/pages/RouteErrorPage/RouteErrorPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'contact', element: <ContactPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
