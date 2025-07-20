import pool from '../../lib/db';

export default async function handler(req, res) {
  const { id, condition, limit = 1000 } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Patient ID is required' });
  }

  try {
    const [vitals] = await pool.query(
      `SELECT * FROM vitals_history 
       WHERE patient_id = ? 
       ORDER BY Date DESC, Time DESC 
       LIMIT ?`,
      [id, parseInt(limit)]
    );

    if (vitals.length === 0) {
      return res.status(404).json({ error: 'No vitals found for this patient' });
    }

    // Reverse for chronological ordering
    const chronologicalVitals = vitals.reverse();

    // Core vitals data
    const vitalsData = {
      hr: [],
      spo2: [],
      temp: [],
      bp: { sys: [], dia: [] },
      timestamps: [],
      rawTimestamps: [],
      dates: [], // ✅ Added dates array
      all: [],
    };

    const groupedByDate = {}; // e.g., "2025-06-25": [ ...vitals ]

    chronologicalVitals.forEach(v => {
      const datetime = `${v.Date}T${v.Time}`;
      const vitalEntry = {
        timestamp: datetime,
        date: v.Date,
        time: v.Time,
        hr: parseInt(v.heart_rate),
        spo2: parseInt(v.spo2),
        temp: parseFloat(v.temperature_f),
        bp: {
          sys: parseInt(v.bp_sys),
          dia: parseInt(v.bp_dia)
        }
      };

      vitalsData.hr.push(vitalEntry.hr);
      vitalsData.spo2.push(vitalEntry.spo2);
      vitalsData.temp.push(vitalEntry.temp);
      vitalsData.bp.sys.push(vitalEntry.bp.sys);
      vitalsData.bp.dia.push(vitalEntry.bp.dia);
      vitalsData.timestamps.push(v.Time);
      vitalsData.rawTimestamps.push(datetime);
      vitalsData.dates.push(v.Date); // ✅ Add date to array
      vitalsData.all.push(vitalEntry);

      // Group by date
      if (!groupedByDate[v.Date]) {
        groupedByDate[v.Date] = [];
      }
      groupedByDate[v.Date].push(vitalEntry);
    });

    // Filter if a condition is passed
    if (condition && condition.length > 0) {
      const conditions = Array.isArray(condition) ? condition : [condition];
      const filteredIndices = [];

      for (let i = 0; i < vitalsData.hr.length; i++) {
        let match = false;
        for (const cond of conditions) {
          switch (cond) {
            case 'fever':
              if (vitalsData.temp[i] > 100.4) match = true;
              break;
            case 'lowspo2':
              if (vitalsData.spo2[i] < 94) match = true;
              break;
            case 'tachycardia':
              if (vitalsData.hr[i] > 100) match = true;
              break;
            case 'bradycardia':
              if (vitalsData.hr[i] < 60) match = true;
              break;
            case 'highbp':
              if (vitalsData.bp.sys[i] > 140 || vitalsData.bp.dia[i] > 90) match = true;
              break;
            case 'lowbp':
              if (vitalsData.bp.sys[i] < 90 || vitalsData.bp.dia[i] < 60) match = true;
              break;
          }
        }
        if (match) filteredIndices.push(i);
      }

      const indicesToUse = filteredIndices.length > 0 ? filteredIndices : [vitalsData.hr.length - 1];

      vitalsData.hr = indicesToUse.map(i => vitalsData.hr[i]);
      vitalsData.spo2 = indicesToUse.map(i => vitalsData.spo2[i]);
      vitalsData.temp = indicesToUse.map(i => vitalsData.temp[i]);
      vitalsData.bp.sys = indicesToUse.map(i => vitalsData.bp.sys[i]);
      vitalsData.bp.dia = indicesToUse.map(i => vitalsData.bp.dia[i]);
      vitalsData.timestamps = indicesToUse.map(i => vitalsData.timestamps[i]);
      vitalsData.rawTimestamps = indicesToUse.map(i => vitalsData.rawTimestamps[i]);
      vitalsData.dates = indicesToUse.map(i => vitalsData.dates[i]); // ✅ Preserve filtered dates
      vitalsData.all = indicesToUse.map(i => vitalsData.all[i]);
    }

    res.status(200).json({
      ...vitalsData,
      groupedByDate,
      availableDates: Object.keys(groupedByDate),
      meta: {
        totalRecords: vitals.length,
        patientId: id,
        latestReading: `${vitals[vitals.length - 1]?.Date}T${vitals[vitals.length - 1]?.Time}`,
        conditionsApplied: condition ? (Array.isArray(condition) ? condition : [condition]) : [],
        dataSource: 'mysql_ec2'
      }
    });
  } catch (error) {
    console.error('🔥 VITALS API ERROR:', error.stack);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
}
