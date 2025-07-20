//implement add patient page
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { withAuth } from '../../lib/withAuth';
import GlobalHeader from '../../components/GlobalHeader';

import { useModel } from '../../context/ModelContext';

import { useTheme } from 'next-themes';
import { useEffect } from 'react';
import { useRef } from 'react';



function AddPatient() {
  const router = useRouter();

  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('');
  const [patientSymptoms, setPatientSymptoms] = useState('');

  const handleAddPatient = async () => {
    try {
      const res = await fetch('/api/patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: patientName,
          age: parseInt(patientAge),
          gender: patientGender,
          symptoms: patientSymptoms,
        }),
      });

      if (res.ok) {
        router.push('/patient');
      } else {
        alert('Failed to add patient');
      }
    } catch (err) {
      console.error(err);
      alert('Server error');
    }
  };

  return (
    <>
      <GlobalHeader />
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">Add New Patient</h1>

        <div className="mb-4">
          <label className="block mb-1">Name</label>
          <input
            type="text"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1">Age</label>
          <input
            type="number"
            value={patientAge}
            onChange={(e) => setPatientAge(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1">Gender</label>
          <select
            value={patientGender}
            onChange={(e) => setPatientGender(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block mb-1">Symptoms</label>
          <textarea
            value={patientSymptoms}
            onChange={(e) => setPatientSymptoms(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        <button
          onClick={handleAddPatient}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Add Patient
        </button>
      </div>
    </>
  );
}

export default withAuth(AddPatient);