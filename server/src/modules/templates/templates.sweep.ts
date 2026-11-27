import { templatesRepository } from './templates.repository';
import { templatesStorage } from './templates.storage';

const DAY_MS = 24 * 60 * 60_000;

const sweepOnce = () =>
  templatesStorage
    .ensure()
    .then(() => templatesStorage.sweep(templatesRepository.existingKeys))
    .catch((err: unknown) => console.error('[templates] sweep failed', err));

/** Прибирання недокачаних файлів і сиріт: на старті й раз на добу (таймер не тримає процес) */
export function startTemplateSweep() {
  void sweepOnce();
  setInterval(() => void sweepOnce(), DAY_MS).unref();
}
