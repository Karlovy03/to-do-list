import { Router } from 'express';
import { templatesController as c } from './templates.controller';
import { receiveFile } from './templates.upload';

export const templatesRouter = Router();

templatesRouter.get('/', c.list);
templatesRouter.post('/', receiveFile, c.create);
templatesRouter.get('/:id/file', c.file);
templatesRouter.patch('/:id', c.update);
templatesRouter.put('/:id/file', receiveFile, c.replace);
templatesRouter.delete('/:id', c.remove);
