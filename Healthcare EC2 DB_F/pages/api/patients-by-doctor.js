import { getUserFromRequest } from '../../lib/auth';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT || 3306,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  try {
    const userPayload = await getUserFromRequest(req);
    if (!userPayload) return res.status(401).json({ error: 'Unauthorized' });

    const username = userPayload['cognito:username'];
    const connection = await pool.getConnection();

    const [doctors] = await connection.execute(
      'SELECT User_id FROM Users WHERE Username = ? LIMIT 1',
      [username]
    );

    if (doctors.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const doctorId = doctors[0].User_id;

    const [patients] = await connection.execute(
      'SELECT name, age, gender, contact_number, address FROM OPD WHERE doctor_id = ? ORDER BY OPD_id DESC',
      [doctorId]
    );

    connection.release();

    return res.status(200).json(patients.map(p => ({
      name: p.name,
      age: p.age,
      gender: p.gender?.toLowerCase(),
      phone: p.contact_number,
      address: p.address
    })));
  } catch (error) {
    console.error('[API] Error fetching patients list:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}
