import pool from '../../lib/db';
import { invokeLLM } from './llm';

export default async function handler(req, res) {
  const { history, model = 'nova-lite', patientId } = req.body;
  
  console.log('Incoming activity data for summary:', req.body);
  
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
        console.log('Patient details fetched for activity analysis:', patientDetails);
      }
    }

    // Create enhanced prompt with patient context
    let prompt = `You are a fitness coach and health data analyst with medical knowledge. Analyze this activity data for trends and patterns.`;
    
    // Add patient context if available
    if (patientDetails) {
      prompt += `

**Patient Profile:**
- Name: ${patientDetails.patient_name}
- Age: ${patientDetails.age} years
- Weight: ${patientDetails.weight} kg
- Height: ${patientDetails.height} cm
- BMI: ${patientDetails.bmi}
- Blood Group: ${patientDetails.blood_group}
- Medical History: ${patientDetails.medical_history || 'No significant history'}
- Current Medications: ${patientDetails.current_medication || 'None reported'}
- Allergies: ${patientDetails.allergies || 'None reported'}

**Age-Appropriate Activity Guidelines:**
${getActivityGuidelines(patientDetails.age, patientDetails.bmi)}`;
    }

    prompt += `

**  Patient's Summary:**
Each entry contains:
- Date
- Steps taken
- Exercise minutes
- Calories burned (active/resting)
- Sleep hours

**Data for Analysis:**
${JSON.stringify(history, null, 2)}

Please provide a comprehensive analysis considering:
1. **Activity Patterns**: Daily step counts, exercise consistency, calorie burn trends
2. **Sleep Quality**: Sleep duration patterns and consistency
3. **Age-Appropriate Assessment**: How the activity levels compare to recommended guidelines for this patient's age and health status
4. **Health Considerations**: Any patterns that might relate to the patient's medical history or current medications
5. **Recommendations**: Personalized suggestions based on the patient's profile and current activity levels

${patientDetails ? 
  'Consider how this patient\'s age, BMI, medical history, and current medications might influence their optimal activity levels and recovery needs.' : 
  'Provide general fitness and wellness insights based on the activity patterns observed.'
}

Avoid giving specific medical advice. Format your output in Markdown with clear sections.`;

    const summary = await invokeLLM(prompt, model);
    
    // Calculate activity metrics for additional context
    const activityMetrics = calculateActivityMetrics(history);
    
    // Return response with summary, patient details, and metrics
    const response = {
      summary,
      patientDetails: patientDetails || null,
      activityMetrics,
      dataPoints: history.length
    };
    
    res.status(200).json(response);
    
  } catch (err) {
    console.error('Error in activity summary generation:', err);
    res.status(500).json({ 
      error: "Failed to generate activity summary",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}

// Helper function to provide age-appropriate activity guidelines
function getActivityGuidelines(age, bmi) {
  let guidelines = '';
  
  if (age < 18) {
    guidelines = '- Youth (under 18): 60+ minutes of moderate-to-vigorous activity daily, 10,000+ steps';
  } else if (age >= 18 && age < 65) {
    guidelines = '- Adults (18-64): 150+ minutes moderate activity/week, 7,000-10,000+ steps daily';
  } else {
    guidelines = '- Older Adults (65+): 150+ minutes moderate activity/week, focus on balance and strength, 6,000-8,000+ steps daily';
  }
  
  if (bmi) {
    if (bmi < 18.5) {
      guidelines += '\n- BMI indicates underweight: Focus on strength training and adequate nutrition';
    } else if (bmi >= 25 && bmi < 30) {
      guidelines += '\n- BMI indicates overweight: Emphasize calorie deficit through activity and diet';
    } else if (bmi >= 30) {
      guidelines += '\n- BMI indicates obesity: Gradual increase in activity, low-impact exercises recommended';
    } else {
      guidelines += '\n- BMI in normal range: Maintain current activity levels with variety';
    }
  }
  
  return guidelines;
}

// Helper function to calculate activity metrics
function calculateActivityMetrics(history) {
  if (!history || history.length === 0) {
    return null;
  }
  
  const metrics = {
    averageSteps: Math.round(history.reduce((sum, day) => sum + (day.steps || 0), 0) / history.length),
    averageExerciseMin: Math.round(history.reduce((sum, day) => sum + (day.exercise_min || 0), 0) / history.length),
    averageSleepHours: Math.round((history.reduce((sum, day) => sum + (day.sleep_hours || 0), 0) / history.length) * 10) / 10,
    averageActiveCalories: Math.round(history.reduce((sum, day) => sum + (day.calories_active || 0), 0) / history.length),
    averageRestingCalories: Math.round(history.reduce((sum, day) => sum + (day.calories_resting || 0), 0) / history.length),
    totalDays: history.length,
    mostActiveDay: history.reduce((max, day) => (day.steps || 0) > (max.steps || 0) ? day : max, history[0]),
    leastActiveDay: history.reduce((min, day) => (day.steps || 0) < (min.steps || 0) ? day : min, history[0])
  };
  
  return metrics;
}