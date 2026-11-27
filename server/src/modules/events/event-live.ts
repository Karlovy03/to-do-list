import { announce } from '../live';
import { canViewEvent, type PolicyEvent } from './events.policy';

/** Сигнал «змінився захід» (ADR-0021) тим, хто бачив його до зміни або бачить після */
export const announceEvent = (id: string, ...versions: PolicyEvent[]) =>
  announce({ t: 'event', id }, (viewer) => versions.some((e) => canViewEvent(e, viewer)));
