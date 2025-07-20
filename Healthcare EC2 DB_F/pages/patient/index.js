// pages/patient/index.js
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import GlobalHeader from '../../components/GlobalHeader';

export default function PatientListPage() {
  const router = useRouter();
  const [patients, setPatients] = useState([]);

  useEffect(() => {
    const fetchPatients = async () => {
      const res = await fetch('/api/patient');
      const data = await res.json();
      setPatients(data);
    };

    fetchPatients();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <GlobalHeader title="Patients" />
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Patient List</h1>
          <button
            onClick={() => router.push('/patient/add')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + Add Patient
          </button>
        </div>

        {patients.length === 0 ? (
          <p className="text-gray-600">No patients found.</p>
        ) : (
          <div className="grid gap-4">
            {patients.map((patient) => (
              <div
                key={patient.id}
                className="p-4 bg-white rounded shadow hover:shadow-md transition"
              >
                <h2 className="text-xl font-semibold text-gray-700">{patient.name}</h2>
                <p className="text-gray-600">Age: {patient.age}</p>
                <p className="text-gray-600">Gender: {patient.gender}</p>
                <p className="text-gray-600">Symptoms: {patient.symptoms}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
