// pages/api/opd.js
import pool from '../../lib/db';
import { getUserFromRequest } from '../../lib/auth'; // ✅ your custom Cognito helper

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getUserFromRequest(req); // ✅ Cognito-based auth
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { 
      name, 
      age, 
      gender, 
      address, 
      contact_number, 
      trouble,
      doctor_id 
    } = req.body;

    if (!name || !age || !gender || !address || !contact_number || !trouble || !doctor_id) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO OPD (
        name, 
        age, 
        gender, 
        address, 
        contact_number, 
        trouble, 
        doctor_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, age, gender, address, contact_number, trouble, doctor_id]
    );

    return res.status(201).json({ 
      success: true, 
      opd_id: result.insertId 
    });

  } catch (error) {
    console.error('Database operation failed:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}
