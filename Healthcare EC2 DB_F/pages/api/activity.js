// pages/api/activity.js
import pool from '../../lib/db';

export default async function handler(req, res) {
  const { patient_id } = req.query;

  if (!patient_id) {
    return res.status(400).json({ error: 'patient_id is required' });
  }

  try {
    const [rows] = await pool.query(`
      SELECT date, steps, exercise_min, calories_active, calories_resting, sleep_hours
      FROM activity_summary
      WHERE patient_id = ?
      ORDER BY date DESC
      LIMIT 15
    `, [patient_id]);

    res.status(200).json({ history: rows });
  } catch (error) {
    console.error('🔥 ACTIVITY API ERROR:', error.stack);
    res.status(500).json({ error: 'Failed to fetch activity data' });
  }
}
