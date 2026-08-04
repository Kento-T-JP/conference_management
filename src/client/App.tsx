import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { CalendarPage } from './pages/CalendarPage';
import { ConferenceDetailPage } from './pages/ConferenceDetailPage';
import { ConferenceFormPage } from './pages/ConferenceFormPage';
import { ConferencesPage } from './pages/ConferencesPage';
import { DashboardPage } from './pages/DashboardPage';
import { EditionDetailPage } from './pages/EditionDetailPage';
import { EditionFormPage } from './pages/EditionFormPage';
import { EditionsPage } from './pages/EditionsPage';

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
    <Route path="calendar" element={<CalendarPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Route></Routes>;
}
