// pages/api/current-user.js

import { spec } from 'node:test/reporters';
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
  console.log('[API] /api/current-user HIT');

  try {
    const userPayload = await getUserFromRequest(req);
    if (!userPayload) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const connection = await pool.getConnection();
    const [users] = await connection.execute(
      'SELECT * FROM Users WHERE Username = ? LIMIT 1',
      [userPayload['cognito:username']]
    );
    connection.release();

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const doctorInfo = users[0];
    //console.log('[API] Current Users:', doctorInfo);

    res.status(200).json({
      userId: doctorInfo.User_id,
      role: doctorInfo.Role,
      doctorName: doctorInfo.Doctor_Name,
      phonenumber: doctorInfo.Phone_Number,
      username: doctorInfo.Username,
      specialization: doctorInfo.Specialization,
      qualification: doctorInfo.Qualification,
    });

  } catch (error) {
    console.error('[API] Error fetching doctor info:', error.message, error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
}
