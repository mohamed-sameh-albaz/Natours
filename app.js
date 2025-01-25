import express from "express";
import morgan from "morgan";

import tourRouter from './routes/tourRoutes'
import userRouter from './routes/userRoutes.js'
const app = express();

// Middlewares
if(process.env.NODE_ENV==='development'){
  app.use(morgan('dev'));
}

app.use(express.json());
app.use(express.static(`${__dirname}/public`))

// Routes
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);

export default app;