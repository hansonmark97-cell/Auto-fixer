import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import vehicleRoutes from './routes/vehicles.js';
import guideRoutes from './routes/guides.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// API Endpoints
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/guides', guideRoutes);

// 404 handler
app.use((_req, res) => res.status(404).json({ error: 'Route not found.' }));

app.listen(PORT, () => {
  console.log(`Car Repair Manual API running on port ${PORT}`);
});

export default app;
