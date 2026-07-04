import express from 'express';
import { supabase } from '../config/supabase.js';
import { requirePremium } from '../middleware/auth.js';

const router = express.Router();

// GET all guides for a given vehicle, with optional category filter
router.get('/', async (req, res) => {
  const { vehicle_id, category, difficulty } = req.query;

  if (!vehicle_id) {
    return res.status(400).json({ error: 'vehicle_id query parameter is required.' });
  }

  let query = supabase
    .from('guides')
    .select('id, title, category, difficulty, is_premium, source')
    .eq('vehicle_id', vehicle_id);

  if (category) query = query.ilike('category', `%${category}%`);
  if (difficulty) query = query.eq('difficulty', difficulty);

  const { data, error } = await query;

  if (error) return res.status(500).json({ error: 'Error fetching guides.' });
  return res.status(200).json(data);
});

// GET a specific guide with all its ordered steps and affiliate items
router.get('/:guide_id', async (req, res, next) => {
  const { guide_id } = req.params;

  // Fetch guide details and its ordered steps
  const { data: guide, error: guideError } = await supabase
    .from('guides')
    .select(`
      id, title, category, difficulty, is_premium, source,
      guide_steps ( step_number, instruction, image_url, video_url )
    `)
    .eq('id', guide_id)
    .order('step_number', { referencedTable: 'guide_steps', ascending: true })
    .single();

  if (guideError) return res.status(404).json({ error: 'Guide not found.' });

  // Attach guide to request so the premium middleware can inspect it
  req.guide = guide;
  next();
}, requirePremium, async (req, res) => {
  const { guide_id } = req.params;

  // Fetch the tools and parts linked to this guide for affiliate revenue
  const { data: items, error: itemsError } = await supabase
    .from('guide_items')
    .select(`
      parts_and_tools ( item_name, item_type, affiliate_url )
    `)
    .eq('guide_id', guide_id);

  if (itemsError) return res.status(500).json({ error: 'Error fetching required items.' });

  return res.status(200).json({
    ...req.guide,
    required_items: items.map(i => i.parts_and_tools),
  });
});

export default router;
