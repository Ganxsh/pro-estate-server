import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request{
    userId?:{ userId: number, email: string };
}

export  const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token is missing' });
    }

    jwt.verify(token, process.env.JWT_ACCESS_SECRET as string, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid access token' });
        }   
        req.userId = user as { userId: number, email: string };
        next();
    });
}