/* Демо-наповнення з prisma/fixtures/demo.yml (тексти — у YAML, не в коді) */
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient, type Priority, type Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { parse } from 'yaml';

interface Fixture {
  users: { login: string; fullName: string; position: string; role: Role }[];
  directory: { key: string; fullName: string; position: string; organization: string }[];
  tasks: {
    title: string;
    priority: Priority;
    deadlineInHours: number;
    author: string;
    assignees: string[];
    control?: { user?: string; directory?: string; text?: string; basis: string };
    progress?: { by: string; percent: number; text: string };
  }[];
}

const prisma = new PrismaClient();
const H = 3600_000;

async function main() {
  if ((await prisma.task.count()) > 0) {
    console.log('Database already has tasks — demo data skipped.');
    return;
  }
  const data = parse(fs.readFileSync(path.join(__dirname, 'fixtures/demo.yml'), 'utf8')) as Fixture;
  const passwordHash = await bcrypt.hash('demo1234', 10);

  const users = new Map<string, string>();
  for (const u of data.users) {
    const row = await prisma.user.upsert({ where: { login: u.login }, update: {}, create: { ...u, passwordHash } });
    users.set(u.login, row.id);
  }
  const directory = new Map<string, string>();
  for (const { key, ...person } of data.directory) directory.set(key, (await prisma.controller.create({ data: person })).id);

  const now = Date.now();
  const createdAt = new Date(now - 2 * 24 * H);
  for (const t of data.tasks) {
    const authorId = users.get(t.author)!;
    const control = t.control
      ? {
          isControlled: true,
          controlSetAt: createdAt,
          controlSetById: authorId,
          controllerUserId: t.control.user ? users.get(t.control.user) : null,
          controllerId: t.control.directory ? directory.get(t.control.directory) : null,
          controllerText: t.control.text ?? null,
          controlBasis: t.control.basis,
        }
      : {};
    const task = await prisma.task.create({
      data: {
        title: t.title,
        priority: t.priority,
        deadline: new Date(now + t.deadlineInHours * H),
        deadlineSetAt: createdAt,
        createdAt,
        authorId,
        status: t.progress ? 'IN_PROGRESS' : 'NEW',
        progress: t.progress?.percent ?? 0,
        ...control,
        assignees: { create: t.assignees.map((login) => ({ userId: users.get(login)!, addedAt: createdAt })) },
      },
    });
    await prisma.taskUpdate.create({ data: { taskId: task.id, authorId, kind: 'CREATED', createdAt } });
    if (t.control) {
      await prisma.taskUpdate.create({ data: { taskId: task.id, authorId, kind: 'CONTROL_ON', text: t.control.basis, createdAt: new Date(createdAt.getTime() + 1000) } });
    }
    if (t.progress) {
      await prisma.taskUpdate.create({
        data: { taskId: task.id, authorId: users.get(t.progress.by)!, kind: 'PROGRESS', progress: t.progress.percent, text: t.progress.text, createdAt: new Date(now - 4 * H) },
      });
    }
  }
  console.log(`Demo data created: ${data.users.map((u) => u.login).join(', ')} / password demo1234`);
}

main().finally(() => prisma.$disconnect());
