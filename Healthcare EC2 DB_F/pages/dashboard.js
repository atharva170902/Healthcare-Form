import Head from 'next/head';
import VitalCard from '../components/VitalCard';
import { useEffect, useState } from 'react';
import ActivityPanel from '../components/ActivityPanel';
import SummaryPanel from '../components/SummaryPanel';
import { useModel } from '../context/ModelContext';
import GlobalHeader from '../components/GlobalHeader';
import PatientSidebar from '../components/PatientSidebar';
import DoctorsNotePanel from '../components/DoctorsNotePanel';
import {
    HeartIcon,
    ArrowTrendingUpIcon,
    FireIcon,
    DevicePhoneMobileIcon,
} from '@heroicons/react/24/solid';
import { withAuth } from '../lib/withAuth';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export const getServerSideProps = withAuth(async (context) => {
    return {
        props: {
            dashboardData: 'secure data',
        },
    };
});

export default function Home({ user }) {
    const [tab, setTab] = useState('dashboard');
    const [vitals, setVitals] = useState({
        bp: { sys: [], dia: [] },
        hr: [],
        spo2: [],
        temp: [],
    });
    const [vitalsHistory, setVitalsHistory] = useState([]);
    const [summary, setSummary] = useState('');
    const [selectedConditions, setSelectedConditions] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [monitoring, setMonitoring] = useState(false);
    const [showConfigPanel, setShowConfigPanel] = useState(false);
    const [autoPushToFHIR, setAutoPushToFHIR] = useState(false);
    const [pushStatus, setPushStatus] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const { selectedModel } = useModel();
    const [selectedDate, setSelectedDate] = useState('');

    const [patientData, setPatientData] = useState(null);
    const [isLoadingPatient, setIsLoadingPatient] = useState(true);
    const [lastFetchTime, setLastFetchTime] = useState(null);

    const [allPatients, setAllPatients] = useState([]);
    const [isLoadingPatients, setIsLoadingPatients] = useState(false);
    const [selectedPatientId, setSelectedPatientId] = useState(null);

    const [isLoadingNotes, setIsLoadingNotes] = useState(false);
    const [noteError, setNoteError] = useState(null);

    useEffect(() => {
        async function fetchAllPatients() {
            setIsLoadingPatients(true);
            try {
                const res = await fetch('/api/patient');
                const data = await res.json();
                setAllPatients(data);
            } catch (error) {
                console.error('Failed to fetch patients list:', error);
                setAllPatients([
                    { patient_id: '-7308', patient_name: 'VIKRAM GOPAL', age: 45 },
                    { patient_id: '-7309', patient_name: 'JOHN DOE', age: 35 },
                    { patient_id: '-7310', patient_name: 'JANE SMITH', age: 42 },
                ]);
            } finally {
                setIsLoadingPatients(false);
            }
        }

        fetchAllPatients();
    }, []);

    useEffect(() => {
        async function fetchPatientData(patientId = null) {
            setIsLoadingPatient(true);
            setMonitoring(false);
            setVitals({ bp: { sys: [], dia: [] }, hr: [], spo2: [], temp: [] });
            setVitalsHistory([]);
            setSummary('');

            try {
                const endpoint = patientId ? `/api/patient?id=${patientId}` : '/api/patient';
                const res = await fetch(endpoint);
                const data = await res.json();

                if (data.length > 0) {
                    setPatientData(data[0]);
                    setSelectedPatientId(data[0].patient_id);

                    if (data[0].patient_id) {
                        const selected_patient_id = data[0].patient_id;
                        data[0].vitals.map((vital) => {
                            if (vital.patient_id == selected_patient_id) {
                                setVitals(prev => ({
                                    ...prev,
                                    hr: [vital.heart_rate, ...prev.hr],
                                    spo2: [vital.spo2, ...prev.spo2],
                                    temp: [vital.temperature_f, ...prev.temp],
                                    bp: {
                                        sys: [vital.bp_sys, ...prev.bp.sys],
                                        dia: [vital.bp_dia, ...prev.bp.dia],
                                    }
                                }));
                            }
                        }
                        )
                    }
                } else if (patientId) {
                    const defaultRes = await fetch('/api/patient');
                    const defaultData = await defaultRes.json();
                    if (defaultData.length > 0) {
                        setPatientData(defaultData[0]);
                        setSelectedPatientId(defaultData[0].patient_id);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch patient data:', error);
                setPatientData({
                    patient_name: "VIKRAM GOPAL",
                    patient_id: "-7308",
                    age: 45
                });
                setSelectedPatientId("-7308");
            } finally {
                setIsLoadingPatient(false);
            }
        }

        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const patientIdFromUrl = urlParams.get('patientId');
            fetchPatientData(patientIdFromUrl);
        }
    }, []);

    const handlePatientSelect = (patient) => {
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('patientId', patient.patient_id);
        window.history.pushState({}, '', newUrl);

        setPatientData(patient);
        setSelectedPatientId(patient.patient_id);

        setMonitoring(false);
        setVitals({ bp: { sys: [], dia: [] }, hr: [], spo2: [], temp: [] });
        setVitalsHistory([]);
        setSummary('');
        setShowConfigPanel(true);
    };

    const handleAddNote = async (noteData) => {
        setNoteError(null);
        try {
            // Actual API call would be here
            console.log('Note added:', noteData);
        } catch (error) {
            setNoteError(error.message);
        }
    };



    const handleUpdateNote = async (noteId, updatedData) => {
        setNoteError(null);
        console.log('Note updated:', noteId, updatedData);
    };

    const handleDeleteNote = async (noteId) => {
        setNoteError(null);
        console.log('Note deleted:', noteId);
    };

    const fetchVitalsFromRDS = async () => {
        if (!patientData?.patient_id) return;

        try {
            const conditionsQuery = selectedConditions.map((c) => `condition=${c}`).join('&');
            const query = `id=${patientData.patient_id}${conditionsQuery ? '&' + conditionsQuery : ''}`;

            const res = await fetch(`/api/vitals?${query}`);
            const data = await res.json();

            if (data.error) {
                console.error('API Error:', data.error);
                return;
            }

            setVitals({
                bp: {
                    sys: data.bp.sys,
                    dia: data.bp.dia,
                },
                hr: data.hr,
                spo2: data.spo2,
                temp: data.temp,
            });

            const historyData = data.hr.map((_, index) => {
                const rawDateString = data.rawTimestamps[index];
                const cleanDate = rawDateString.split(' ').slice(0, 4).join(' ');
                return {
                    date: cleanDate,
                    rawtimestamps: data.rawTimestamps[index],
                    timestamp: data.timestamps[index],
                    hr: data.hr[index],
                    spo2: data.spo2[index],
                    temp: data.temp[index],
                    bp: {
                        sys: data.bp.sys[index],
                        dia: data.bp.dia[index],
                    },
                };
            });

            setVitalsHistory(historyData);
            setLastFetchTime(new Date().toLocaleTimeString());

            if (autoPushToFHIR && data.hr.length > 0) {
                sendVitalsToFHIRServer();
            }

        } catch (error) {
            console.error('Error fetching vitals from RDS:', error);
        }
    };

    useEffect(() => {
        if (!monitoring || !patientData?.patient_id) return;

        fetchVitalsFromRDS();
        const interval = setInterval(fetchVitalsFromRDS, 10000);

        return () => clearInterval(interval);
    }, [monitoring, selectedConditions, patientData?.patient_id, autoPushToFHIR]);

    const handleGenerate = async () => {
        setIsGenerating(true);
        await generateSummary();
    };

    const getColorHR = (val) => (val < 60 || val > 100 ? '#ef4444' : '#10b981');
    const getColorSpO2 = (val) => (val < 94 ? '#ef4444' : '#10b981');
    const getColorTemp = (val) => (val < 97.0 || val > 100.4 ? '#ef4444' : '#10b981');

    const generateSummary = async () => {
        setIsGenerating(true);
        setSummary('');
        try {
            const latestVitals = {
                hr: vitals.hr,
                spo2: vitals.spo2,
                temp: vitals.temp,
                bp: {
                    sys: vitals.bp.sys,
                    dia: vitals.bp.dia,
                }
            };
            const res = await fetch('/api/summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ latestVitals, model: selectedModel }),
            });
            const data = await res.json();
            setSummary(data.summary);
        } catch (err) {
            setSummary('Error generating summary.');
        }
        setIsGenerating(false);
    };

    const conditionOptions = [
        { label: 'Low BP', value: 'lowbp' },
        { label: 'High BP', value: 'highbp' },
        { label: 'Low SpO₂', value: 'lowspo2' },
        { label: 'Fever', value: 'fever' },
        { label: 'Tachycardia', value: 'tachycardia' },
        { label: 'Bradycardia', value: 'bradycardia' },
    ];

    const toggleCondition = (value) => {
        const conflictMap = {
            lowbp: 'highbp',
            highbp: 'lowbp',
            tachycardia: 'bradycardia',
            bradycardia: 'tachycardia',
        };

        setSelectedConditions((prev) => {
            const isSelected = prev.includes(value);
            const conflict = conflictMap[value];

            let updated = isSelected
                ? prev.filter((c) => c !== value)
                : [...prev, value];

            if (conflict && updated.includes(conflict) && !isSelected) {
                updated = updated.filter((c) => c !== conflict);
            }

            return updated;
        });
    };

    const sendVitalsToFHIRServer = async () => {
        if (vitals.hr.length === 0) return;

        setIsSyncing(true);
        setPushStatus(' Syncing vitals to FHIR server...');
        try {
            const latestIndex = vitals.hr.length - 1;
            const payload = {
                patientId: patientData?.patient_id || '-7308',
                systolicValue: String(vitals.bp?.sys?.[latestIndex] ?? 120),
                diastolicValue: String(vitals.bp?.dia?.[latestIndex] ?? 80),
                bloodOxygen: String(vitals.spo2?.[latestIndex] ?? 98),
                heartRate: String(vitals.hr?.[latestIndex] ?? 72),
                temperature: String(vitals.temp?.[latestIndex] ?? 98.4),
                effectiveDate: new Date().toISOString(),
            };

            const res = await fetch('https://d3f993sfxu3y3q.cloudfront.net/Patient/CaptureVitalSigns', {
                method: 'POST',
                headers: {
                    'accept': '*/*',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setPushStatus(' Vitals sent successfully to FHIR server!');
            } else {
                setPushStatus(' Failed to send vitals to FHIR server');
            }
        } catch (err) {
            console.error('Send to FHIR error:', err);
            setPushStatus('⚠️ An error occurred while sending vitals');
        } finally {
            setIsSyncing(false);
            setTimeout(() => setPushStatus(''), 3000);
        }
    };

    if (isLoadingPatient) {
        return (
            <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6">
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600 dark:text-gray-300">Loading patient data...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!patientData) {
        return (
            <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6">
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <p className="text-red-600 dark:text-red-400 mb-4">Failed to load patient data</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const getHighlightDates = (vitalsHistory) => {
        return vitalsHistory.map(v => {
            const date = new Date(v.date);
            return isNaN(date) ? null : new Date(date.toDateString());
        }).filter(Boolean);
    };

    const highlightDates = getHighlightDates(vitalsHistory);

    const filteredVitals = selectedDate
        ? vitalsHistory.filter(v => {
            const formattedSelected = selectedDate.toDateString();
            return v.date === formattedSelected;
        })
        : vitalsHistory;

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            {showConfigPanel && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center px-4">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg p-6 sm:p-8 relative animate-fade-in">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                                Select Patient Condition(s)
                            </h2>
                            <button
                                onClick={() => setShowConfigPanel(false)}
                                className="text-gray-900 hover:text-gray-800 dark:hover:text-red text-xl focus:outline-none"
                                aria-label="Close"
                            >
                                &times;
                            </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
                            {conditionOptions.map(({ label, value }) => (
                                <button
                                    key={value}
                                    onClick={() => toggleCondition(value)}
                                    className={`w-full px-3 py-2 rounded-md text-sm font-medium border text-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
              ${selectedConditions.includes(value)
                                            ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 focus:ring-blue-400'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 focus:ring-gray-400'
                                        }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        <div className="flex justify-center">
                            <button
                                onClick={() => {
                                    setMonitoring(true);
                                    setShowConfigPanel(false);
                                }}
                                className="px-6 py-3 rounded-lg text-white font-semibold shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-green-600 hover:bg-green-700 focus:ring-green-400"
                            >
                                ✅ Start Monitoring
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <PatientSidebar
                allPatients={allPatients}
                selectedPatientId={selectedPatientId}
                onSelectPatient={handlePatientSelect}
                patientData={patientData}
                isLoadingPatients={isLoadingPatients}
            />

            <div className="ml-80 p-6">
                <Head>
                    <title>Health Dashboard - {patientData.patient_name}</title>
                </Head>

                <GlobalHeader
                    user={user}
                    extraContent={
                        <div className="flex space-x-2 items-center">
                            <button
                                onClick={fetchVitalsFromRDS}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded rounded-xl "
                            >
                                🔄 Refresh Vitals
                            </button>
                        </div>
                    }
                />

                <SummaryPanel
                    summary={summary}
                    isGenerating={isGenerating}
                    isCollapsed={isCollapsed}
                    setIsCollapsed={setIsCollapsed}
                    onGenerate={handleGenerate}
                    patientData={patientData}
                />

                <div className="flex justify-between items-center mb-4">
                    <p className="text-gray-500 dark:text-gray-300">
                        Real data from Database
                        {lastFetchTime && (
                            <span className="ml-3 text-sm">
                                (Last fetch: {lastFetchTime})
                            </span>
                        )}
                    </p>
                    {selectedConditions.length > 0 && (
                        <div className="text-sm text-blue-600 dark:text-blue-400">
                            Filtering: {selectedConditions.join(', ')}
                        </div>
                    )}
                </div>

                {pushStatus && (
                    <div className="mt-2 text-sm flex items-center space-x-2 text-green-600 dark:text-green-400">
                        {(isSyncing || autoPushToFHIR) && (
                            <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                            </svg>
                        )}
                        <span>{pushStatus}</span>
                    </div>
                )}

                {/* ADD ERROR DISPLAY FOR NOTES */}
                {noteError && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        <strong>Note Error:</strong> {noteError}
                    </div>
                )}

                <div className="flex mb-6 space-x-3">
                    <button
                        className={`px-5 py-2.5 rounded-xl font-medium transition-colors duration-200 
            ${tab === 'dashboard'
                                ? 'bg-blue-600 text-white shadow'
                                : 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700'}`}
                        onClick={() => setTab('dashboard')}
                    >
                        📊 Dashboard
                    </button>

                    <button
                        className={`px-5 py-2.5 rounded-xl font-medium transition-colors duration-200 
            ${tab === 'history'
                                ? 'bg-blue-600 text-white shadow'
                                : 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700'}`}
                        onClick={() => setTab('history')}
                    >
                        📈 Vitals History
                    </button>

                    {/* New Doctor's Notes button */}
                    <button
                        className={`px-5 py-2.5 rounded-xl font-medium transition-colors duration-200 
            ${tab === 'notes'
                                ? 'bg-blue-600 text-white shadow'
                                : 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700'}`}
                        onClick={() => setTab('notes')}
                    >
                        📝 Doctor's Notes
                    </button>
                </div>

                {tab === 'dashboard' ? (
                    <>
                        <main className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-3">
                            <VitalCard title="Heart Rate (HR)" data={vitals.hr} icon={HeartIcon} unit=" bpm" getStatusColor={getColorHR} />
                            <VitalCard title="SpO₂" data={vitals.spo2} icon={FireIcon} unit="%" getStatusColor={getColorSpO2} />
                            <VitalCard title="Temperature (°F)" data={vitals.temp} icon={DevicePhoneMobileIcon} unit="°F" getStatusColor={getColorTemp} />
                            <VitalCard title="Blood Pressure (BP)" data={vitals.bp.sys} data2={vitals.bp.dia} icon={ArrowTrendingUpIcon} />
                        </main>
                    </>
                ) : tab === 'history' ? (
                    <div className="overflow-x-auto bg-white dark:bg-gray-800 shadow rounded-lg p-4 h-[600px] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">Vitals History Database</h2>
                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={() => setShowConfigPanel(true)}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded rounded-xl"
                                >
                                    ⚙️ Filter Vitals Condition
                                </button>
                                <button
                                    onClick={() => setVitalsHistory([])}
                                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded rounded-xl"
                                >
                                    🗑 Clear Display
                                </button>
                                <div className="flex items-center">
                                    <label className="mr-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Filter by Date:
                                    </label>

                                    <style jsx global>{`.react-datepicker-popper {
                                    z-index: 100 !important;}
                                    `}</style>
                                    <DatePicker
                                        selected={selectedDate}
                                        onChange={(date) => setSelectedDate(date)}
                                        highlightDates={highlightDates}
                                        dateFormat="dd/MM/yyyy"
                                        className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                        placeholderText="Select a date"
                                        isClearable
                                        popperClassName="z-[100]"
                                        calendarClassName="z-[100]"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="overflow-y-auto flex-1">
                            {filteredVitals.length > 0 ? (
                                <table className="min-w-full table-auto text-sm">
                                    <thead className="border-b border-gray-300 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
                                        <tr>
                                            <th className="px-4 py-2 text-left">Date</th>
                                            <th className="px-4 py-2 text-left">Time</th>
                                            <th className="px-4 py-2 text-left">HR (bpm)</th>
                                            <th className="px-4 py-2 text-left">SpO₂ (%)</th>
                                            <th className="px-4 py-2 text-left">Temp (°F)</th>
                                            <th className="px-4 py-2 text-left">BP (sys/dia)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredVitals.map((v, i) => (
                                            <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                                                <td className="px-4 py-2">{v.date}</td>
                                                <td className="px-4 py-2">{v.timestamp}</td>
                                                <td className="px-4 py-2" style={{ color: getColorHR(v.hr) }}>{v.hr}</td>
                                                <td className="px-4 py-2" style={{ color: getColorSpO2(v.spo2) }}>{v.spo2}</td>
                                                <td className="px-4 py-2" style={{ color: getColorTemp(v.temp) }}>{v.temp}</td>
                                                <td className="px-4 py-2">{v.bp.sys}/{v.bp.dia}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    No vitals data available. Please select proper date to start monitoring to see real-time data from data base.
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    // Doctor's Notes Tab Content
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
                        <DoctorsNotePanel

                            selectedPatientId={selectedPatientId}
                            patientData={patientData}
                            currentUser={user}
                            onAddNote={handleAddNote}
                            onUpdateNote={handleUpdateNote}
                            onDeleteNote={handleDeleteNote}
                            noteError={noteError}
                            setNoteError={setNoteError}
                            isLoadingNotes={isLoadingNotes}
                        />
                    </div>
                )}

                <div className="pt-4">
                    <ActivityPanel patientId={selectedPatientId} />
                </div>
            </div>
        </div>
    );
}