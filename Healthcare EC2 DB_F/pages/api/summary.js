import pool from '../../lib/db';
import { invokeLLM } from './llm';

export default async function handler(req, res) {
  const { latestVitals, model = 'nova-lite', patientId } = req.body;
  const { hr, spo2, temp, bp } = latestVitals;

  console.log('Incoming vitals for summary:', req.body);

  try {
    // Fetch patient details if patientId is provided
    let patientDetails = null;

    if (patientId) {
      const patientQuery = `
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
          ROUND(weight * 10000 / (height * height), 1) AS bmi
        FROM test."Patients"
        WHERE patient_id = $1
      `;

      const { rows: patients } = await pool.query(patientQuery, [patientId]);

      if (patients.length > 0) {
        patientDetails = patients[0];
        console.log('Patient details fetched:', patientDetails);
      }
    }

    // Construct the LLM prompt with full vital sign data
    let prompt = `You are a qualified medical doctor. Analyze the patient's vital signs over time using evidence-based clinical guidelines. Identify any abnormalities or significant trends.`;

    if (patientDetails) {
      prompt += `

**Patient Information:**
- Name: ${patientDetails.patient_name}
- Age: ${patientDetails.age} years
- Weight: ${patientDetails.weight} kg
- Height: ${patientDetails.height} cm
- BMI: ${patientDetails.bmi}
- Blood Group: ${patientDetails.blood_group}
- Allergies: ${patientDetails.allergies || 'None reported'}
- Medical History: ${patientDetails.medical_history || 'No significant history'}
- Current Medications: ${patientDetails.current_medication || 'None reported'}`;
    }

    prompt += `

**Normal Vital Sign Ranges:**
- Heart Rate: 60–100 bpm
- Blood Pressure: 90/60 to 120/80 mmHg
- SpO2: ≥ 95%
- Temperature: 97°F to 99°F

**Vital Signs Over Time:**
- Heart Rate (bpm): [${hr.join(', ')}]
- Blood Pressure Systolic (mmHg): [${bp.sys.join(', ')}]
- Blood Pressure Diastolic (mmHg): [${bp.dia.join(', ')}]
- SpO2 (%): [${spo2.join(', ')}]
- Temperature (°F): [${temp.join(', ')}]

**Instructions:**
1. Identify abnormalities (e.g., bradycardia, tachycardia, hypertension, hypoxia, fever).
2. Comment on trends, fluctuations, or outliers.
3. Explain any potential clinical significance.
4. Factor in patient age, BMI, and medical history where relevant.
5. Provide output in **Markdown** format using the following structure:

### Vital Signs Summary
- Bullet points summarizing observations per vital.

### Clinical Interpretation
- Reasoning behind abnormal values or risks.

### Recommendations
- Next steps, follow-up needs, or reassurance if stable.
`;

    const summary = await invokeLLM(prompt, model);

    // Return response with summary and context
    res.status(200).json({
      summary,
      patientDetails: patientDetails || null,
      vitalsAnalyzed: {
        hr: hr.length,
        spo2: spo2.length,
        temp: temp.length,
        bp: bp.sys.length
      }
    });

  } catch (err) {
    console.error('Error in summary generation:', err);
    res.status(500).json({
      error: 'Failed to generate summary',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}
