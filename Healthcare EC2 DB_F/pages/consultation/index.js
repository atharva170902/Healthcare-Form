// pages/consultation.js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { withAuth } from '../../lib/withAuth';
import pool from '../../lib/db';

export const getServerSideProps = withAuth(async (context) => {
  const user = context.user;

  // Fetch all doctors from the database
  let doctors = [];
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      `SELECT User_id, Doctor_Name, Qualification, Specialization 
       FROM Users 
       WHERE Role = 'Doctor'`
    );
    doctors = rows;
    connection.release();
  } catch (error) {
    console.error('Failed to fetch doctors:', error);
  }

  return {
    props: {
      user: {
        id: user.User_id,
        role: user.Role,
        name: user.Doctor_Name
      },
      doctors
    },
  };
});

export default function ConsultationForm({ user, doctors }) {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: '',
    address: '',
    contact_number: '',
    trouble: '',
    doctor_id: user.id
  });

  const [status, setStatus] = useState({
    submitting: false,
    success: false,
    error: null
  });

  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [bannerUserName, setBannerUserName] = useState('User');
  const [bannerUserRole, setBannerUserRole] = useState('Loading...');

  useEffect(() => {
    // Set the initially selected doctor
    if (doctors.length > 0) {
      const currentDoctor = doctors.find(d => d.User_id === user.id) || doctors[0];
      setSelectedDoctor(currentDoctor);
      setFormData(prev => ({ ...prev, doctor_id: currentDoctor.User_id }));
    }

    // Set banner info
    setBannerUserName(user.name || 'User');
    setBannerUserRole(user.role || 'N/A');
  }, [doctors, user.id, user.name, user.role]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDoctorChange = (doctorId) => {
    const doctor = doctors.find(d => d.User_id === doctorId);
    setSelectedDoctor(doctor);
    setFormData(prev => ({ ...prev, doctor_id: doctorId }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ submitting: true, success: false, error: null });

    try {
      const response = await fetch('/api/opd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const result = await response.json();

      setStatus({
        submitting: false,
        success: true,
        error: null,
        patientId: result.opd_id
      });

      setFormData({
        name: '',
        age: '',
        gender: '',
        address: '',
        contact_number: '',
        trouble: '',
        doctor_id: selectedDoctor.User_id
      });

      setTimeout(() => {
        setStatus(prev => ({ ...prev, success: false }));
      }, 8000);

    } catch (error) {
      setStatus({
        submitting: false,
        success: false,
        error: error.message || 'Failed to register patient'
      });
    }
  };

  return (
    <>
      <Head>
        <title>OPD Patient Registration | Operisoft</title>
        <meta name="description" content="Register new patients for outpatient department" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </Head>

      {/* Header with logo and title */}
      <div className="bg-white shadow border-b border-gray-200">
        <div className="container mx-auto px-4 py-3 flex items-center">
          <img
            src="/op.png" // <-- Replace this with your actual logo path or URL
            alt="Operisoft Logo"
            className="h-10 w-10 object-contain mr-4"
          />
          <h1 className="text-2xl font-semibold text-gray-800">
            Operisoft Healthcare Center
          </h1>
        </div>
      </div>
      


      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Success Message */}
          {status.success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center">
                <i className="fas fa-check-circle text-green-500 text-xl mr-3"></i>
                <div>
                  <p className="font-semibold text-green-800">Registration Successful!</p>
                  <p className="text-green-600 text-sm">Patient ID: OP-{status.patientId}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Panel - Doctors List */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col">
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <i className="fas fa-user-md text-white"></i>
                  </div>
                  Available Doctors
                </h2>
              </div>

              <div className="p-6">
                {/* Error Message for Doctors */}
                {doctors.length === 0 && (
                  <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-start">
                      <i className="fas fa-exclamation-triangle text-red-500 mr-3 mt-1"></i>
                      <div>
                        <p className="font-semibold text-red-800">Error loading doctors</p>
                        <p className="text-red-600 text-sm">Network Error</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {doctors.map((doctor) => (
                    <div
                      key={doctor.User_id}
                      onClick={() => handleDoctorChange(doctor.User_id)}
                      className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${selectedDoctor?.User_id === doctor.User_id
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <i className="fas fa-user-md text-blue-600 text-lg"></i>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 text-lg"> {doctor.Doctor_Name}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {doctor.Qualification || 'MBBS'} • {doctor.Specialization || 'General Medicine'}
                          </p>
                        </div>
                        {selectedDoctor?.User_id === doctor.User_id && (
                          <i className="fas fa-check-circle text-blue-500 text-xl"></i>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Panel - Patient Form */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col">
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <i className="fas fa-user text-white"></i>
                  </div>
                  Patient Information
                </h2>
              </div>

              <div className="p-6">
                {/* Error Message */}
                {status.error && (
                  <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-start">
                      <i className="fas fa-exclamation-triangle text-red-500 mr-3 mt-1"></i>
                      <div>
                        <p className="font-semibold text-red-800">Registration Failed</p>
                        <p className="text-red-600 text-sm">{status.error}</p>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Full Name */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <div className="relative">
                      <i className="fas fa-user absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                      <input
                        type="text"
                        name="name"
                        id="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full pl-10 pr-3 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter your full name"
                      />
                    </div>
                  </div>

                  {/* Age and Gender */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-2">
                        Age *
                      </label>
                      <div className="relative">
                        <i className="fas fa-calendar-alt absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                        <input
                          type="number"
                          name="age"
                          id="age"
                          min="0"
                          max="120"
                          value={formData.age}
                          onChange={handleChange}
                          required
                          className="w-full pl-10 pr-3 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter your age"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Gender *
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <label className="flex items-center justify-center p-2 border-2 border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer">
                          <input
                            type="radio"
                            name="gender"
                            value="Male"
                            checked={formData.gender === 'Male'}
                            onChange={handleChange}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <span className="ml-2 text-sm text-gray-700">Male</span>
                        </label>
                        <label className="flex items-center justify-center p-2 border-2 border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer">
                          <input
                            type="radio"
                            name="gender"
                            value="Female"
                            checked={formData.gender === 'Female'}
                            onChange={handleChange}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <span className="ml-2 text-sm text-gray-700">Female</span>
                        </label>
                        <label className="flex items-center justify-center p-2 border-2 border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer">
                          <input
                            type="radio"
                            name="gender"
                            value="Other"
                            checked={formData.gender === 'Other'}
                            onChange={handleChange}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <span className="ml-2 text-sm text-gray-700">Other</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label htmlFor="contact_number" className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <div className="relative">
                      <i className="fas fa-phone absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                      <input
                        type="tel"
                        name="contact_number"
                        id="contact_number"
                        value={formData.contact_number}
                        onChange={handleChange}
                        required
                        pattern="\d{10}"
                        maxLength={10}
                        inputMode="numeric"
                        className="w-full pl-10 pr-3 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter 10-digit phone number"
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                      Address *
                    </label>
                    <div className="relative">
                      <i className="fas fa-map-marker-alt absolute left-3 top-3 text-gray-400"></i>
                      <textarea
                        id="address"
                        name="address"
                        rows={3}
                        value={formData.address}
                        onChange={handleChange}
                        required
                        className="w-full pl-10 pr-3 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        placeholder="Enter your complete address"
                      />
                    </div>
                  </div>

                  {/* Medical Issue Description */}
                  <div>
                    <label htmlFor="trouble" className="block text-sm font-medium text-gray-700 mb-2">
                      Medical Issue Description *
                    </label>
                    <div className="relative">
                      <i className="fas fa-notes-medical absolute left-3 top-3 text-gray-400"></i>
                      <textarea
                        id="trouble"
                        name="trouble"
                        rows={4}
                        value={formData.trouble}
                        onChange={handleChange}
                        required
                        className="w-full pl-10 pr-3 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        placeholder="Describe your medical issue or reason for visit"
                      />
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex justify-between pt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          name: '',
                          age: '',
                          gender: '',
                          address: '',
                          contact_number: '',
                          trouble: '',
                          doctor_id: selectedDoctor?.User_id || ''
                        });
                      }}
                      className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors border-2 border-gray-200"
                    >
                      Reset
                    </button>

                    <button
                      type="submit"
                      disabled={status.submitting || !selectedDoctor}
                      className="px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
                    >
                      {status.submitting ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </span>
                      ) : (
                        'Book Appointment'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}