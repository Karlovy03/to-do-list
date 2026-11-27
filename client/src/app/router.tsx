import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';
import { StrengthPage } from '@/modules/absences';
import { AdminPage } from '@/modules/admin';
import { LoginPage } from '@/modules/auth';
import { CalendarPage } from '@/modules/calendar';
import { EventsPage } from '@/modules/events';
import { NotificationsPage } from '@/modules/notifications';
import { ReportPage } from '@/modules/report';
import { SettingsPage } from '@/modules/settings';
import { TasksPage } from '@/modules/tasks';
import { TemplatesPage } from '@/modules/templates';
import type { Scope } from '@/modules/tasks';
import { Shell } from './layout/Shell/Shell';

/** Кожен розділ завдань має свою адресу і вкладену адресу вибраного завдання …/t/:taskId */
const scopeRoutes = (path: string, scope: Scope): RouteObject[] => [
  { path, element: <TasksPage scope={scope} /> },
  { path: `${path === '/' ? '' : path}/t/:taskId`, element: <TasksPage scope={scope} /> },
];

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <Shell />,
    children: [
      ...scopeRoutes('/', 'mine'),
      ...scopeRoutes('/control', 'controlled'),
      ...scopeRoutes('/authored', 'authored'),
      ...scopeRoutes('/all', 'all'),
      { path: '/events', element: <EventsPage /> },
      { path: '/events/e/:eventId', element: <EventsPage /> },
      { path: '/calendar', element: <CalendarPage /> },
      { path: '/calendar/t/:taskId', element: <CalendarPage /> },
      { path: '/calendar/e/:eventId', element: <CalendarPage /> },
      { path: '/strength', element: <StrengthPage /> },
      { path: '/notifications', element: <NotificationsPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/report', element: <ReportPage /> },
      { path: '/templates', element: <TemplatesPage /> },
      { path: '/admin/:tab?/:sub?', element: <AdminPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
