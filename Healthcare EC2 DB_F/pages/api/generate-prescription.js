// pages/api/generate-prescription.js
import { invokeLLM } from './llm';
import bhashiniService from '../../lib/bhashiniService';

const buildPromptByContext = (context, transcript) => {
  console.log('🧠 Building prompt for context:', context);

  switch (context) {
    case 'Cardiology':
      return `
You are a clinical assistant helping a cardiologist prepare a prescription summary from doctor's notes. Extract and organize the prescription details for a cardiology outpatient consultation.

Only include sections if the corresponding information is available in the doctor's notes. If something is not mentioned, omit that section completely.

Include the following if applicable:
- Patient details (if available)
- Clinical diagnosis (e.g., hypertension, coronary artery disease) 
- Current medications with dosages
- Lifestyle and dietary recommendations
- Investigations ordered (e.g., ECG, lipid profile)
- Follow-up instructions (e.g., BP monitoring, next review)

doctor's notes:
"${transcript}"



Summarize concisely and clearly for patient understanding using structured markdown format.
`;

    case 'Oncology':
      return `
You are a clinical assistant helping an oncologist prepare a prescription summary from doctor's notes. Extract and organize the prescription details for an oncology outpatient consultation.

Only include sections if the corresponding information is present in the doctor's notes. If something is not mentioned, skip that section entirely instead of writing "Not specified".

Ensure the output includes:
- Patient details (if available)
- Diagnosis and staging (if mentioned)
- Treatment plan (e.g., chemotherapy regimen, radiation plan)
- Supportive medications (e.g., antiemetics, pain meds)
- Any follow-up instructions (e.g., next cycle, lab tests)
- Special instructions (e.g., hydration, diet, side-effect precautions)

doctor's notes:
"${transcript}"


Summarize concisely and clearly for patient understanding using structured markdown format.
`;

    case 'Nephrology':
      return `
You are a clinical assistant helping a nephrologist prepare a prescription summary from doctor's notes. Extract and organize the prescription details for a nephrology consultation.

Only include sections if the relevant details are present in the notes. Omit any sections that are not mentioned.

Include:
- Patient details (if available)
- Renal diagnosis or conditions (e.g., CKD, proteinuria)
- Current medications with doses
- Dialysis status or instructions (if applicable)
- Recommended tests (e.g., renal panel, GFR, urinalysis)
- Lifestyle/diet (e.g., fluid restriction, protein intake)
- Follow-up instructions

doctor's notes: 
"${transcript}"



Summarize in clear markdown for clinical clarity and patient understanding.
`;
case 'General':
      return `
You are a clinical assistant preparing a general medical prescription summary based on doctor's notes. Use standard medical practices and clinical judgment.

Only include sections that have relevant information. Skip any section that is not supported by the doctor's notes.

Recommended structure (omit any sections not mentioned):
1. Chief complaint
2. Summary of findings
3. Provisional diagnosis
4. Medications (dose, frequency, duration)
5. Investigations (if any)
6. Advice and follow-up

doctor's Notes:
"${transcript}"



Format the output as structured, professional markdown. Ensure readability for both clinician and patient.
`;
    default:
      return `
You are a qualified medical doctor specialized in ${context}. Based on the conversation and medical history provided below, generate a structured medical prescription. Use standard medical practices and clinical judgment. The prescription should include:

1. Chief complaint
2. Summary of findings
3. Provisional diagnosis
4. Medications (with dose, frequency, and duration)
5. Investigations (if any)
6. Advice and follow-up

doctor's conversation:
"${transcript}"



Output only the prescription in a professional, structured markdown format.
`;
  }
};

// NEW: Function to build diagnostic test recommendation prompt
const buildDiagnosticTestPrompt = (context, transcript) => {
  console.log('🔬 Building diagnostic test recommendation prompt for context:', context);

  const basePrompt = `
You are a clinical diagnostician. Based on the doctor's notes and patient information provided, suggest appropriate diagnostic tests that would help confirm or rule out potential diagnoses. Focus on evidence-based, cost-effective testing strategies.

Provide recommendations in the following format:
## Recommended Diagnostic Tests

### Immediate/Priority Tests
(Tests that should be done urgently or first)

### Confirmatory Tests  
(Tests to confirm suspected diagnoses)

### Monitoring Tests
(Tests for ongoing monitoring if applicable)

### Additional Tests (if indicated)
(Additional tests based on clinical findings)

For each test, briefly explain the clinical rationale.

Doctor's notes:
"${transcript}"

`;

  const contextSpecificGuidelines = {
    'Cardiology': `
Focus on cardiovascular diagnostic tests such as:
- ECG/EKG for rhythm and electrical activity
- Echocardiogram for structural heart disease
- Stress tests for coronary artery disease
- Lipid profiles for cardiovascular risk
- Cardiac biomarkers (troponin, BNP) if indicated
- Holter monitoring for arrhythmias
- CT angiography or catheterization for advanced cases
`,
    'Oncology': `
Focus on cancer screening and staging tests such as:
- Tumor markers (CEA, CA-125, PSA, etc.)
- Imaging studies (CT, MRI, PET scans)
- Tissue biopsies for definitive diagnosis
- Complete blood count and comprehensive metabolic panel
- Liver function tests
- Staging studies based on primary tumor location
`,
    'Nephrology': `
Focus on kidney function and related tests such as:
- Comprehensive metabolic panel (creatinine, BUN, eGFR)
- Urinalysis with microscopy
- Urine protein/creatinine ratio
- Electrolyte panel
- Renal ultrasound
- Kidney biopsy if indicated
- Parathyroid hormone (PTH) levels
`,
    'General': `
Focus on general diagnostic approach:
- Complete blood count (CBC)
- Comprehensive metabolic panel (CMP)
- Lipid profile
- Thyroid function tests if indicated
- Inflammatory markers (ESR, CRP) if indicated
- Imaging studies based on presenting symptoms
- Specialized tests based on clinical presentation
`
  };

  return basePrompt + '\n' + (contextSpecificGuidelines[context] || contextSpecificGuidelines['General']) + '\n\nProvide clear, evidence-based recommendations with brief clinical rationale for each test.';
};

// Enhanced function to split text while preserving structure
const splitTextIntoChunks = (text, maxChunkSize = 400) => {
  // First, try to split by sections (markdown headers)
  const sections = text.split(/(?=^#+\s)/gm);
  const chunks = [];

  for (const section of sections) {
    if (section.length <= maxChunkSize) {
      chunks.push(section.trim());
    } else {
      // If section is too large, split by sentences but keep structure
      const sentences = section.split(/(?<=[.!?])\s+/);
      let currentChunk = '';

      for (const sentence of sentences) {
        if ((currentChunk + sentence).length <= maxChunkSize) {
          currentChunk += (currentChunk ? ' ' : '') + sentence;
        } else {
          if (currentChunk) {
            chunks.push(currentChunk.trim());
          }
          currentChunk = sentence;
        }
      }

      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
    }
  }

  return chunks.filter(chunk => chunk.length > 0);
};

// Enhanced function to preserve formatting during translation
const preserveFormatting = (originalText, translatedText) => {
  // Extract markdown formatting patterns from original
  const markdownPatterns = {
    headers: originalText.match(/^#+\s.*/gm) || [],
    bullets: originalText.match(/^[\-\*]\s.*/gm) || [],
    numbers: originalText.match(/^\d+\.\s.*/gm) || [],
    bold: originalText.match(/\*\*.*?\*\*/g) || [],
    italic: originalText.match(/\*.*?\*/g) || []
  };

  let formattedTranslation = translatedText;

  // Try to restore basic structure if it's lost
  if (markdownPatterns.headers.length > 0 && !translatedText.includes('#')) {
    // Attempt to identify section breaks and add headers
    const lines = formattedTranslation.split('\n');
    const keywords = ['निदान', 'दवा', 'सलाह', 'जांच', 'फॉलो-अप', 'Diagnosis', 'Medication', 'Advice', 'Investigation', 'Follow-up'];
    
    formattedTranslation = lines.map(line => {
      const trimmedLine = line.trim();
      if (keywords.some(keyword => trimmedLine.includes(keyword)) && !trimmedLine.startsWith('#')) {
        return `## ${trimmedLine}`;
      }
      return line;
    }).join('\n');
  }

  return formattedTranslation;
};

// Function to translate prescription to target language with better formatting
const translatePrescription = async (prescription, targetLanguage) => {
  try {
    // If target language is English or not specified, return original
    if (!targetLanguage || targetLanguage === 'en') {
      return prescription;
    }

    // Check if the target language is supported
    if (!bhashiniService.isSupportedIndianLanguage(targetLanguage)) {
      console.warn(`Language ${targetLanguage} not supported for translation, returning original prescription`);
      return prescription;
    }

    console.log(`🌐 Translating prescription to ${targetLanguage}`);

    // Parse prescription structure
    const sections = prescription.split(/(?=^##?\s)/gm).filter(section => section.trim());
    
    if (sections.length <= 1) {
      // If no clear sections, use chunk-based translation
      const chunks = splitTextIntoChunks(prescription, 350);
      const translatedChunks = [];

      for (let i = 0; i < chunks.length; i++) {
        try {
          console.log(`Translating chunk ${i + 1}/${chunks.length}`);
          const translatedChunk = await bhashiniService.translateFromEnglish(chunks[i], targetLanguage);
          translatedChunks.push(translatedChunk);
          
          // Delay between requests
          if (i < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        } catch (chunkError) {
          console.error(`Error translating chunk ${i + 1}:`, chunkError);
          translatedChunks.push(chunks[i]);
        }
      }

      const translatedPrescription = translatedChunks.join('\n\n');
      return preserveFormatting(prescription, translatedPrescription);
    }

    // Section-based translation for better structure preservation
    const translatedSections = [];
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i].trim();
      
      try {
        console.log(`Translating section ${i + 1}/${sections.length}`);
        
        // Extract header and content
        const headerMatch = section.match(/^(#+\s*)(.*?)$/m);
        let translatedSection;
        
        if (headerMatch) {
          const headerPrefix = headerMatch[1];
          const headerText = headerMatch[2];
          const content = section.replace(/^#+\s*.*$/m, '').trim();
          
          // Translate header and content separately
          const translatedHeader = await bhashiniService.translateFromEnglish(headerText, targetLanguage);
          let translatedContent = '';
          
          if (content) {
            translatedContent = await bhashiniService.translateFromEnglish(content, targetLanguage);
            await new Promise(resolve => setTimeout(resolve, 150));
          }
          
          translatedSection = `${headerPrefix}${translatedHeader}${translatedContent ? '\n\n' + translatedContent : ''}`;
        } else {
          translatedSection = await bhashiniService.translateFromEnglish(section, targetLanguage);
        }
        
        translatedSections.push(translatedSection);
        
        // Delay between sections
        if (i < sections.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 250));
        }
        
      } catch (sectionError) {
        console.error(`Error translating section ${i + 1}:`, sectionError);
        translatedSections.push(section);
      }
    }

    const finalTranslation = translatedSections.join('\n\n');
    console.log('✅ Prescription translation completed with preserved formatting');
    
    return finalTranslation;

  } catch (error) {
    console.error('Translation error:', error);
    return prescription;
  }
};

// NEW: Function to generate diagnostic test recommendations
const generateDiagnosticTests = async (context, transcript, vitalsText, model) => {
  try {
    console.log('🔬 Generating diagnostic test recommendations...');
    
    const diagnosticPrompt = buildDiagnosticTestPrompt(context, transcript, vitalsText);
    const diagnosticRecommendations = await invokeLLM(diagnosticPrompt, model);
    
    console.log('✅ Diagnostic test recommendations generated');
    return diagnosticRecommendations;
    
  } catch (error) {
    console.error('❌ Error generating diagnostic tests:', error);
    throw error;
  }
};

// Helper function to validate and clean prescription format
const validatePrescriptionFormat = (prescription) => {
  // Ensure proper line breaks and spacing
  let cleaned = prescription
    .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
    .replace(/^\s+|\s+$/g, '') // Trim whitespace
    .replace(/^#+\s*/gm, match => match.toLowerCase().includes('patient') ? '## ' : match); // Standardize headers

  // Ensure sections are properly separated
  cleaned = cleaned.replace(/(?<!^|\n)(##?\s)/g, '\n\n$1');
  
  return cleaned;
};

export default async function handler(req, res) {
  const { 
    transcript, 
    vitals = null, 
    model = 'nova-lite', 
    context = 'General',
    targetLanguage = null,
    includeDiagnosticTests = false  // NEW: Optional parameter to include diagnostic tests
  } = req.body;

  if (!transcript) {
    return res.status(400).json({ error: 'Transcript is required' });
  }

  const vitalDetails = vitals
    ? `
Additional patient vitals:
- Heart Rate: [${vitals.hr?.join(', ') || 'N/A'}]
- Blood Pressure Systolic: [${vitals.bp?.sys?.join(', ') || 'N/A'}]
- Blood Pressure Diastolic: [${vitals.bp?.dia?.join(', ') || 'N/A'}]
- SpO2: [${vitals.spo2?.join(', ') || 'N/A'}]
- Temperature (°F): [${vitals.temp?.join(', ') || 'N/A'}]
`
    : '';

  const prompt = buildPromptByContext(context, transcript, vitalDetails);

  try {
    console.log('🏥 Generating prescription...');
    
    // Generate prescription in English first
    const rawPrescription = await invokeLLM(prompt, model);
    const englishPrescription = validatePrescriptionFormat(rawPrescription);
    console.log('✅ English prescription generated and formatted');

    // NEW: Generate diagnostic test recommendations if requested
    let diagnosticTests = null;
    let translatedDiagnosticTests = null;
    
    if (includeDiagnosticTests) {
      try {
        diagnosticTests = await generateDiagnosticTests(context, transcript, vitalDetails, model);
        diagnosticTests = validatePrescriptionFormat(diagnosticTests);
        
        // Translate diagnostic tests if target language is provided
        if (targetLanguage && targetLanguage !== 'en') {
          translatedDiagnosticTests = await translatePrescription(diagnosticTests, targetLanguage);
          translatedDiagnosticTests = validatePrescriptionFormat(translatedDiagnosticTests);
        }
        
        console.log('✅ Diagnostic test recommendations generated');
      } catch (diagnosticError) {
        console.error('❌ Error generating diagnostic tests:', diagnosticError);
        // Continue with prescription generation even if diagnostic tests fail
      }
    }

    // Translate prescription if target language is provided and not English
    let finalPrescription = englishPrescription;
    // if (targetLanguage && targetLanguage !== 'en') {
    //   console.log(`🌐 Translating prescription to ${targetLanguage}...`);
    //   const translatedPrescription = await translatePrescription(englishPrescription, targetLanguage);
    //   finalPrescription = validatePrescriptionFormat(translatedPrescription);
    //   console.log('✅ Translation completed with formatting preserved');
    // }

    // Prepare response object
    const response = {
      prescription: finalPrescription,
      originalPrescription: englishPrescription,
      translated: targetLanguage && targetLanguage !== 'en',
      language: targetLanguage || 'en'
    };

    // Add diagnostic tests to response if generated
    if (diagnosticTests) {
      response.diagnosticTests = {
        original: diagnosticTests,
        translated: translatedDiagnosticTests || diagnosticTests,
        language: targetLanguage || 'en'
      };
    }

    res.status(200).json(response);

  } catch (err) {
    console.error('❌ Error generating prescription:', err);
    res.status(500).json({ 
      error: 'Failed to generate prescription.',
      details: err.message 
    });
  }
}