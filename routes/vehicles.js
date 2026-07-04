import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

// GET vehicle details by VIN prefix (first 10 digits)
router.get('/lookup/:vin', async (req, res) => {
  const { vin } = req.params;

  if (!vin || vin.length < 10) {
    return res.status(400).json({ error: 'VIN must be at least 10 characters long.' });
  }

  const vinPrefix = vin.substring(0, 10).toUpperCase();

  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('vin_prefix', vinPrefix)
    .single();

  if (error) return res.status(404).json({ error: 'Vehicle not found.' });
  return res.status(200).json(data);
});

// GET vehicles filtered by year, make, and/or model
router.get('/', async (req, res) => {
  const { year, make, model } = req.query;

  let query = supabase.from('vehicles').select('*');

  if (year) query = query.eq('year', year);
  if (make) query = query.ilike('make', `%${make}%`);
  if (model) query = query.ilike('model', `%${model}%`);

  const { data, error } = await query;

  if (error) return res.status(500).json({ error: 'Error fetching vehicles.' });
  return res.status(200).json(data);
});

export default router;
