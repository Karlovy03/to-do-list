/** Чи є на сервері новіша збірка. Будь-який збій — «ні»: не турбуємо людину через погану мережу */
export async function hasNewVersion(current: string, load: () => Promise<Response> = () => fetch('/version.json', { cache: 'no-store' })): Promise<boolean> {
  try {
    const res = await load();
    if (!res.ok) return false;
    const data: unknown = await res.json();
    const id = data && typeof data === 'object' && 'id' in data ? (data as { id: unknown }).id : undefined;
    return typeof id === 'string' && id !== current;
  } catch {
    return false;
  }
}
