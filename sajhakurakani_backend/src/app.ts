import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app: Application = express();

const corsOptions = {
  origin: ['http://localhost:3000'],
};

app.use(cors(corsOptions));
app.use(express.json());

app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'SajhaKuraKani backend is running' });
});

export default app;
