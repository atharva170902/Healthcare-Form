# Health Dashboard: Real-time Patient Monitoring with AI-Powered Insights

A comprehensive healthcare monitoring system that combines real-time vital sign tracking with AI-powered analysis and consultation support. The dashboard provides medical professionals with intelligent insights, automated prescription generation, and FHIR server integration for seamless health data management.

The system features advanced monitoring capabilities including real-time vital sign tracking (blood pressure, heart rate, SpO2, and temperature), AI-powered patient summary generation, and intelligent consultation support. Medical professionals can leverage multiple AI models (Nova, Claude, Mistral) for generating patient summaries, treatment suggestions, and prescription drafts. The system integrates with FHIR servers for standardized healthcare data exchange and provides a flexible consultation interface with voice input support and context-aware suggestions.

## Repository Structure
```
health-dashbord/
├── pages/                      # Next.js pages directory containing all route components
│   ├── _app.js                # Application entry point with theme and model providers
│   ├── api/                   # API route handlers for backend functionality
│   │   ├── activity-summary.js    # Generates AI-powered activity summaries
│   │   ├── auth/                  # Authentication-related API endpoints
│   │   ├── generate-prescription.js# Prescription generation endpoint
│   │   ├── llm.js                 # LLM service integration handler
│   │   ├── summary.js             # Patient summary generation endpoint
│   │   └── vitals.js             # Vital signs simulation endpoint
│   ├── auth/                  # Authentication-related pages
│   ├── consultation/          # Consultation interface pages
│   ├── dashboard.js          # Main dashboard component
│   ├── index.js             # Landing page
│   └── patient/             # Patient management pages
```

## Usage Instructions
### Prerequisites
- Node.js (v14 or higher)
- AWS Account with Bedrock access
- Amazon Cognito User Pool
- FHIR Server (optional for health data integration)

Required environment variables:
```
COGNITO_DOMAIN=
COGNITO_CLIENT_ID=
CALLBACK_URI=
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
```

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd health-dashbord

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev
```

### Quick Start
1. Access the application at `http://localhost:3000`
2. Log in using your Cognito credentials
3. Navigate to the dashboard to start monitoring vital signs
4. Select patient conditions to monitor from the configuration panel
5. Enable auto-push to FHIR server if required

### More Detailed Examples

**Monitoring Vital Signs**
```javascript
// Select conditions to monitor
const conditions = ['lowbp', 'fever'];
// Dashboard will automatically update with simulated vital signs
```

**Generating AI-Powered Summary**
```javascript
// Select AI model (Nova, Claude, or Mistral)
const model = 'nova-lite';
// Click "Generate Summary" to get AI analysis
```

### Troubleshooting

**Authentication Issues**
- Error: "Unable to authenticate"
  1. Verify Cognito configuration in environment variables
  2. Check browser console for detailed error messages
  3. Ensure Cognito User Pool is properly configured

**Vital Sign Monitoring**
- Issue: No vital signs updating
  1. Check if monitoring is enabled
  2. Verify selected conditions in configuration panel
  3. Check browser console for API errors

**FHIR Integration**
- Error: "Failed to push to FHIR server"
  1. Verify FHIR server endpoint configuration
  2. Check network connectivity
  3. Validate data format compliance

## Data Flow
The system processes patient data through a pipeline of real-time monitoring, AI analysis, and healthcare data integration.

```ascii
[Vital Signs] --> [Dashboard] --> [AI Analysis] --> [FHIR Server]
     |              |                |                  |
     v              v                v                  v
[Monitoring] -> [Display] -> [Summary/Suggestions] -> [Storage]
```

Key Component Interactions:
1. Dashboard continuously polls vital sign data from the API
2. AI models process patient data for insights and suggestions
3. FHIR integration enables standardized health data exchange
4. Authentication service manages user sessions and access control
5. Consultation interface processes voice input and generates suggestions
6. Prescription generator creates structured medical documents
7. Activity summary provides AI-powered analysis of patient trends