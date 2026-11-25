/* Демо-наповнення для показу. Пароль у всіх: demo1234 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const H = 3600_000;

async function main() {
  if ((await prisma.task.count()) > 0) {
    console.log('База вже містить завдання — демо-дані не додаю.');
    return;
  }
  const hash = await bcrypt.hash('demo1234', 10);
  const mk = (login: string, fullName: string, position: string, role: 'ADMIN' | 'MANAGER' | 'MEMBER') =>
    prisma.user.upsert({ where: { login }, update: {}, create: { login, fullName, position, role, passwordHash: hash } });

  const chief = await mk('chief', 'Коваленко Олександр', 'Начальник управління', 'MANAGER');
  const deputy = await mk('deputy', 'Мельник Ірина', 'Заступник начальника управління', 'MANAGER');
  const a = await mk('bondar', 'Бондар Андрій', 'Старший інспектор', 'MEMBER');
  const b = await mk('shevchenko', 'Шевченко Оксана', 'Інспектор', 'MEMBER');
  const c = await mk('tkachenko', 'Ткаченко Дмитро', 'Головний спеціаліст', 'MEMBER');
  await mk('admin', 'Адміністратор системи', '', 'ADMIN');

  const ext = await prisma.controller.create({
    data: { fullName: 'Петренко Віктор', position: 'Заступник Міністра', organization: 'МВС України' },
  });
  await prisma.controller.create({ data: { fullName: 'Савчук Леся', position: 'Начальник департаменту', organization: 'Апарат МВС' } });

  const now = Date.now();
  const tasks = [
    { title: 'Підготувати аналітичну довідку щодо стану реагування на звернення громадян', priority: 'URGENT', deadline: now + 20 * H, who: [a, b], control: { controllerId: ext.id, controlBasis: 'Доручення МВС № 1234/01-2026 від 20.11.2026' }, progress: 40 },
    { title: 'Надати пропозиції до плану заходів на I квартал 2027 року', priority: 'HIGH', deadline: now + 3 * 24 * H, who: [c], control: { controllerUserId: chief.id, controlBasis: 'Протокол наради № 15 від 24.11.2026' }, progress: 10 },
    { title: 'Опрацювати лист Держприкордонслужби щодо обміну інформацією', priority: 'NORMAL', deadline: now - 5 * H, who: [b], control: { controllerText: 'Перший заступник Голови НПУ', controlBasis: 'Лист вх. № 5678 від 18.11.2026' }, progress: 70 },
    { title: 'Оновити контактні дані підрозділів у довіднику', priority: 'NORMAL', deadline: now + 6 * 24 * H, who: [a], control: null, progress: 0 },
    { title: 'Підготувати матеріали до селекторної наради', priority: 'HIGH', deadline: now + 26 * H, who: [deputy, c], control: null, progress: 0 },
  ] as const;

  for (const t of tasks) {
    const task = await prisma.task.create({
      data: {
        title: t.title,
        description: '',
        priority: t.priority,
        deadline: new Date(t.deadline),
        progress: t.progress,
        status: t.progress > 0 ? 'IN_PROGRESS' : 'NEW',
        authorId: chief.id,
        createdAt: new Date(now - 2 * 24 * H),
        ...(t.control ? { isControlled: true, controlSetAt: new Date(now - 2 * 24 * H), controlSetById: chief.id, ...t.control } : {}),
        assignees: { create: t.who.map((u) => ({ userId: u.id })) },
      },
    });
    await prisma.taskUpdate.create({ data: { taskId: task.id, authorId: chief.id, kind: 'CREATED', createdAt: new Date(now - 2 * 24 * H) } });
    if (t.control) await prisma.taskUpdate.create({ data: { taskId: task.id, authorId: chief.id, kind: 'CONTROL_ON', text: t.control.controlBasis, createdAt: new Date(now - 2 * 24 * H + 1000) } });
    if (t.progress > 0) {
      await prisma.taskUpdate.create({
        data: { taskId: task.id, authorId: t.who[0].id, kind: 'PROGRESS', progress: t.progress, text: 'Зібрано дані від територіальних підрозділів, готую узагальнення.', createdAt: new Date(now - 4 * H) },
      });
    }
  }
  console.log('Демо-дані створено. Логіни: chief, deputy, bondar, shevchenko, tkachenko, admin · пароль demo1234');
}

main().finally(() => prisma.$disconnect());
