// pages/_app.js
import '../styles/globals.css';
import { useEffect, useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { ModelProvider } from '../context/ModelContext';
import { LanguageProvider } from '../context/LanguageContext';

function MyApp({ Component, pageProps }) {
  const [mounted, setMounted] = useState(false);

  // Ensure hydration happens only after client-side mount
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null; // Prevent hydration mismatch

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <ModelProvider>
        <LanguageProvider>
          <Component {...pageProps} />
        </LanguageProvider>
      </ModelProvider>
    </ThemeProvider>
  );
}

export default MyApp;