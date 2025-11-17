import { Request } from 'express';

export interface User {
  id: string;
  role: string;
}

export interface RequestWithUser extends Request {
  user?: User;
}
