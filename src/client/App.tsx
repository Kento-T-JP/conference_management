import { lazy, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';

const pageImports = {
  conferences: () => import('./pages/ConferencesPage'),
  conferenceDetail: () => import('./pages/ConferenceDetailPage'),
  conferenceForm: () => import('./pages/ConferenceFormPage'),
  editions: () => import('./pages/EditionsPage'),
  editionDetail: () => import('./pages/EditionDetailPage'),
  editionForm: () => import('./pages/EditionFormPage'),
  calendar: () => import('./pages/CalendarPage'),
  settings: () => import('./pages/SettingsPage')
};

const ConferencesPage = lazy(() => pageImports.conferences().then(({ ConferencesPage }) => ({ default: ConferencesPage })));
const ConferenceDetailPage = lazy(() => pageImports.conferenceDetail().then(({ ConferenceDetailPage }) => ({ default: ConferenceDetailPage })));
const ConferenceFormPage = lazy(() => pageImports.conferenceForm().then(({ ConferenceFormPage }) => ({ default: ConferenceFormPage })));
const EditionsPage = lazy(() => pageImports.editions().then(({ EditionsPage }) => ({ default: EditionsPage })));
const EditionDetailPage = lazy(() => pageImports.editionDetail().then(({ EditionDetailPage }) => ({ default: EditionDetailPage })));
const EditionFormPage = lazy(() => pageImports.editionForm().then(({ EditionFormPage }) => ({ default: EditionFormPage })));
const CalendarPage = lazy(() => pageImports.calendar().then(({ CalendarPage }) => ({ default: CalendarPage })));
const SettingsPage = lazy(() => pageImports.settings().then(({ SettingsPage }) => ({ default: SettingsPage })));

export function App() {
  useEffect(() => {
    const preload = () => { Object.values(pageImports).forEach((load) => void load()); };
    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(preload, { timeout: 2500 });
      return () => window.cancelIdleCallback(idleId);
    }
    const timeoutId = globalThis.setTimeout(preload, 1200);
    return () => globalThis.clearTimeout(timeoutId);
  }, []);

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
    <Route path="settings" element={<SettingsPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Route></Routes>;
}
