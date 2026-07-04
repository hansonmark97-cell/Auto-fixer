import { supabase } from '../config/supabase.js';

/**
 * Middleware that checks whether the authenticated user has an active
 * premium subscription before serving a premium repair guide.
 *
 * Expects the Supabase JWT to be forwarded in the Authorization header:
 *   Authorization: Bearer <token>
 *
 * Usage: attach after the guide is fetched so that `req.guide` is available.
 */
export async function requirePremium(req, res, next) {
  if (!req.guide || !req.guide.is_premium) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required for premium content.' });
  }

  const token = authHeader.split(' ')[1];

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  // Check for an active subscription record in the database
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (subError || !subscription) {
    return res.status(403).json({ error: 'A premium subscription is required to view this guide.' });
  }

  req.user = user;
  return next();
}
