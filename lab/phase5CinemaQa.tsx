import React from 'react';
import { createRoot } from 'react-dom/client';
import CinemaLockedScreen from '../components/CinemaLockedScreen';
import '../index.css';

createRoot(document.getElementById('root')!).render(<CinemaLockedScreen onBack={() => {}} />);
