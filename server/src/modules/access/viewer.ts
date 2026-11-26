import type { Request } from 'express';
import type { User } from '@prisma/client';
import { currentUser } from '../../core/auth';
import { subtreeIds, unitTree } from '../units';
import { hasFullAccess, type Scope } from './access.policy';

/** Користувач разом із вертикаллю, яку він бачить (ADR-0012) — рахується раз на запит */
export type Viewer = User & { scope: Scope };

const NONE: Scope = new Set<string>();

export async function toViewer(user: User): Promise<Viewer> {
  if (hasFullAccess(user)) return { ...user, scope: 'all' };
  if (user.role !== 'MANAGER' || !user.unitId) return { ...user, scope: NONE };
  return { ...user, scope: subtreeIds(user.unitId, await unitTree()) };
}

export const viewerOf = (req: Request) => toViewer(currentUser(req));
