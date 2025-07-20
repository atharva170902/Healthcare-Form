import pool from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { name, age, gender, address, contact_number, trouble, doctor_id } = req.body;

  // Basic validation
  if (!name || !age || !gender || !address || !contact_number || !trouble) {
    return res.status(400).json({ message: 'All fields except Doctor ID are required' });
  }

  try {
    const connection = await pool.getConnection();
    
    // If doctor_id not provided, assign to Dr. Atharva Satam (User_id: 1) by default
    const finalDoctorId = doctor_id || 1;

    const [result] = await connection.query(
      `INSERT INTO OPD (name, age, gender, address, contact_number, trouble, doctor_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, age, gender, address, contact_number, trouble, finalDoctorId]
    );
    
    connection.release();
    
    return res.status(201).json({ 
      message: 'Appointment booked successfully',
      appointmentId: result.insertId
    });
    
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ 
      message: 'Error booking appointment',
      error: error.message
    });
  }
}