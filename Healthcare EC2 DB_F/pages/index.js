// pages/index.js
import Head from 'next/head';
import { withAuth } from '../lib/withAuth';

export const getServerSideProps = withAuth(async (context) => {


    const isAuthenticated = context.user ? true : false;
    return {
        props: {
            isAuthenticated
        },
    };
});

export default function Welcome({ isAuthenticated }) {
    const loginUrl = process.env.NEXT_PUBLIC_LOGIN_URL; // should be in .env

    return (
        <>
            <Head>
                <title>Welcome | Health Dashboard</title>
            </Head>
            <div className="absolute inset-0 overflow-hidden z-0">
                <div className=" opacity-30 rounded-full "></div>
                {/* 
                <div style={{ backgroundImage: "url('https://download-accl.zoho.in/webdownload?x-service=CLIQ&event-id=a_01022003103617504099367290_1_60008788462&x-cli-msg=%7B%22appaccount_id%22%3A%2260008788462%22%7D')", backgroundRepeat: "no-repeat", backgroundSize: "cover" }} className="min-h-screen bg-gradient-to-br flex items-center justify-center text-center px-6">
                    <div className="max-w-xl">
                        <h1 className="text-4xl sm:text-5xl font-bold text-gray-800 dark:text-gray-100 mb-6 leading-snug animate-fade-in">
                            Empowering healthcare <span className="text-blue-600">through</span><br />
                            Operisoft AI <span className="text-red-500"> real-time insights</span>.
                        </h1>
                        <p className="text-gray-600 dark:text-gray-300 mb-8 text-lg">
                            Welcome to your personalized health monitoring dashboard.
                        </p>
                        {!isAuthenticated ? (
                            <a
                                href={loginUrl}
                                className="px-6 py-3 bg-blue-600 text-white text-lg font-semibold rounded hover:bg-blue-700 transition"
                            >
                                🔐 Login to Continue
                            </a>
                        ) : (
                            <div className="space-x-4">
                                <a
                                    href="/dashboard"
                                    className="px-6 py-3 bg-blue-600 text-white text-lg font-semibold rounded hover:bg-blue-700 transition"
                                >
                                    📊 Go to Dashboard
                                </a>
                                <a
                                    href="/consultation"
                                    className="px-6 py-3 bg-green-600 text-white text-lg font-semibold rounded hover:bg-green-700 transition"
                                >
                                    👨‍⚕️ Start a Consultation
                                </a>
                            </div>
                        )}
                    </div>
                </div> */}
                <div className="relative min-h-screen flex items-center justify-center text-center px-6 bg-gradient-to-br">
                    {/* Background Image with Opacity */}
                    <div
                        className="absolute inset-0 bg-cover bg-no-repeat opacity-50 z-0"
                        style={{
                            backgroundImage: "url('/operisoftbg.png')",
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                        }}
                    ></div>

                    {/* Logo at top-left with full opacity */}
                    <div className="absolute top-4 left-4 z-10">
                        <img src="/Op.png" alt="Operisoft Logo" className="w-40 h-auto" />
                    </div>

                    {/* Main Content */}
                    <div className="relative z-10">
                        {/* Your heading and buttons go here */}
                    </div>

                    {/* Foreground Content */}
                    <div className="relative z-10 max-w-xl">
                        {/* <h1 className="text-4xl sm:text-5xl font-bold text-gray-800 dark:text-gray-100 mb-6 leading-snug animate-fade-in">
                            Empowering healthcare <span className="">through</span><br />
                            <span style={{
                                background: 'linear-gradient(to right,rgb(239, 175, 13),rgb(255, 145, 0),rgb(107, 92, 57),rgb(0, 0, 0),rgb(0, 0, 0))',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent'
                            }}>Operisoft</span> <span style={{
                                background: 'linear-gradient(to right,rgb(239, 175, 13),rgb(255, 145, 0),rgb(107, 92, 57),rgb(0, 0, 0),rgb(0, 0, 0))',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent'
                            }}>AI</span><span className=""> real-time insights</span>.
                        </h1> */}
                        <h1 className="text-4xl sm:text-5xl font-bold text-gray-800 dark:text-gray-100 mb-6 leading-snug animate-fade-in">
                            Empowering healthcare <span className="">through</span><br />
                            <span style={{
                                background: 'linear-gradient(to right, rgb(0, 0, 0), rgb(20, 15, 10), rgb(94, 69, 44), rgb(155, 104, 36), rgb(255, 145, 0), rgb(239, 175, 13))',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent'
                            }}>Operisoft AI</span>
                            {/* <span style={{
                                background: 'linear-gradient(to right, rgb(0, 0, 0), rgb(20, 15, 10), rgb(218, 120, 21), rgb(181, 129, 61), rgb(255, 145, 0), rgb(239, 175, 13))',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent'
                            }}></span> */}
                            <span className=""> real-time insights</span>.
                        </h1>
                        <p className="text-[black] dark:text-sky-400 mb-8 text-lg">
                            Welcome to your personalized health monitoring dashboard.
                        </p>
                        {!isAuthenticated ? (
                            
                            <a
                                href={loginUrl}
                                className="px-6 py-3 bg-blue-600 text-white text-lg font-semibold rounded hover:bg-blue-700 transition"
                            >
                                🔐 Login to Continue
                            </a>
                        ) : (
                            <div className="space-x-4 flex flex-wrap justify-center mt-4">
                                {/* <a
                                    href="/dashboard"
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#0f0f0f] text-white text-lg font-semibold rounded-xl shadow-lg hover:bg-gray-800 hover:scale-105 transform transition duration-300 ease-in-out"
                                >
                                    📊 <span>Monitor Patients</span>
                                </a> */}
                                <a
                                    href="/consultation"
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#f1930a] text-black text-lg font-semibold rounded-xl shadow-lg hover:bg-orange-400 hover:scale-105 transform transition duration-300 ease-in-out"
                                >
                                    👨‍⚕️ <span>OPD Patients</span>
                                </a>
                            </div>
                            
                        )}
                    </div>
                </div>

            </div >
        </>
    );
}
