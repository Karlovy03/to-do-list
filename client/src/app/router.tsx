import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';
import { LoginPage } from '@/modules/auth';
import { TasksPage } from '@/modules/tasks';
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
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
