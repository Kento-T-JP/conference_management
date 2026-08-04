import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Loading } from './components/ui';
import { ConferenceDetailPage } from './pages/ConferenceDetailPage';
import { ConferenceFormPage } from './pages/ConferenceFormPage';
import { ConferencesPage } from './pages/ConferencesPage';
import { DashboardPage } from './pages/DashboardPage';
import { EditionDetailPage } from './pages/EditionDetailPage';
import { EditionFormPage } from './pages/EditionFormPage';
import { EditionsPage } from './pages/EditionsPage';
import { SettingsPage } from './pages/SettingsPage';

const CalendarPage = lazy(() => import('./pages/CalendarPage').then((module) => ({ default: module.CalendarPage })));

export function App() {
  return <Routes><Route element={<Layout />}>
    <Route index element={<DashboardPage />} />
    <Route path="conferences" element={<ConferencesPage />} />
    <Route path="conferences/new" element={<ConferenceFormPage />} />
    <Route path="conferences/:id" element={<ConferenceDetailPage />} />
    <Route path="conferences/:id/edit" element={<ConferenceFormPage />} />
    <Route path="conferences/:conferenceId/editions/new" element={<EditionFormPage />} />
    <Route path="editions" element={<EditionsPage />} />
    <Route path="editions/:id" element={<EditionDetailPage />} />
    <Route path="editions/:id/edit" element={<EditionFormPage />} />
    <Route path="calendar" element={<Suspense fallback={<Loading />}><CalendarPage /></Suspense>} />
    <Route path="settings" element={<SettingsPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Route></Routes>;
}
