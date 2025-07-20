// pages/api/patient.js
import pool from '../../lib/db';

export default async function handler(req, res) {
  try {
    const { id } = req.query;

    let patientQuery = `
      SELECT 
        patient_id,
        patient_name,
        age,
        weight,
        height,
        blood_group,
        allergies,
        medical_history,
        current_medication,
        provisional_diagnosis,
        gender,
        ROUND(weight * 10000 / (height * height), 1) AS bmi
      FROM Patients
    `;

    let queryParams = [];
    if (id) {
      patientQuery += ' WHERE patient_id = ?';
      queryParams = [id];
    } else {
      patientQuery += ' LIMIT 5';
    }

    const [patients] = await pool.query(patientQuery, queryParams);

    // Debug log
    console.log('Fetched patients:', patients.length);

    const patientWithVitals = await Promise.all(
      patients.map(async (patient) => {
        try {
          const [vitals] = await pool.query(
            'SELECT * FROM vitals_history WHERE patient_id = ? ORDER BY time DESC LIMIT 5',
            [patient.patient_id]
          );
          return { ...patient, vitals };
        } catch (err) {
          console.error(`Error fetching vitals for ${patient.patient_id}:`, err.message);
          return { ...patient, vitals: [] };
        }
      })
    );

    res.status(200).json(patientWithVitals);
  } catch (error) {
    console.error('🔥 API ERROR:', error.stack);
    res.status(500).json({
      error: 'Internal Server Error',
      details: error.message,
    });
  }
}
