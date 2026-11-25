import type { Request, Response } from 'express';
import { currentUser } from '../../core/auth';
import { param } from '../../core/http-error';
import { createUserSchema, listUsersQuery, updateUserSchema } from './users.schemas';
import { adminUser, publicUser } from './users.serializer';
import { usersService } from './users.service';

export const usersController = {
  async list(req: Request, res: Response) {
    const viewer = currentUser(req);
    const all = listUsersQuery.parse(req.query).all === '1';
    const users = await usersService.list(viewer, all);
    res.json(users.map(viewer.role === 'ADMIN' && all ? adminUser : publicUser));
  },

  async create(req: Request, res: Response) {
    const user = await usersService.create(createUserSchema.parse(req.body));
    res.status(201).json(adminUser(user));
  },

  async update(req: Request, res: Response) {
    const user = await usersService.update(currentUser(req), param(req, 'id'), updateUserSchema.parse(req.body));
    res.json(adminUser(user));
  },
};
