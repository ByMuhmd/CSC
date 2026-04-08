import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { PageLoader, ScrollToTop, PushNotificationListener } from './components/AppShell';

const Home = React.lazy(() => import('./pages/Home'));
const SignIn = React.lazy(() => import('./pages/SignIn'));
const SignUp = React.lazy(() => import('./pages/SignUp'));
const Profile = React.lazy(() => import('./pages/Profile'));
const History = React.lazy(() => import('./pages/History'));
const Leaderboard = React.lazy(() => import('./pages/Leaderboard'));
const AboutUs = React.lazy(() => import('./pages/AboutUs'));

const AdminLayout = React.lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = React.lazy(() => import('./pages/admin/AdminUsers'));
const AdminQuizzes = React.lazy(() => import('./pages/admin/AdminQuizzes'));

const AdminSystem = React.lazy(() => import('./pages/admin/AdminSystem'));
const AdminEvents = React.lazy(() => import('./pages/admin/AdminEvents'));
const AdminGamification = React.lazy(() => import('./pages/admin/AdminGamification'));
const AdminMaterials = React.lazy(() => import('./pages/admin/AdminMaterials'));
const AdminTeam = React.lazy(() => import('./pages/admin/AdminTeam'));
const AdminFeedback = React.lazy(() => import('./pages/admin/AdminFeedback'));
const AdminSupport = React.lazy(() => import('./pages/admin/AdminSupport'));
const AdminBroadcast = React.lazy(() => import('./pages/admin/AdminBroadcast'));

const DynamicCoursePage = React.lazy(() => import('./pages/DynamicCoursePage'));

const Materials = React.lazy(() => import('./pages/Materials'));
const Quizzes = React.lazy(() => import('./pages/Quizzes'));
const CreateQuiz = React.lazy(() => import('./pages/CreateQuiz'));
const NotFound = React.lazy(() => import('./pages/NotFound'));
const SemesterSubjects = React.lazy(() => import('./pages/SemesterSubjects'));
const SubjectMaterials = React.lazy(() => import('./pages/SubjectMaterials'));
const SubjectQuiz = React.lazy(() => import('./pages/SubjectQuiz'));
const DirectQuizPage = React.lazy(() => import('./pages/DirectQuizPage'));
const Challenges = React.lazy(() => import('./pages/Challenges'));
const Support = React.lazy(() => import('./pages/Support'));
const Compliance = React.lazy(() => import('./pages/Compliance'));
const MaintenancePage = React.lazy(() => import('./pages/MaintenancePage'));

import { Pomodoro as PomodoroTimer } from './components/Tools';
import { GamificationHUD } from './components/GamificationComponents';
import { Events as ExamCountdown } from './components/UIComponents';
import { usePushNotifications } from './hooks/usePushNotifications';
import { useMaintenance } from './hooks/useMaintenance';


import { useGamification } from './hooks/useGamification';

import { checkVersion } from './utils/versionCheck';
import { Analytics } from '@vercel/analytics/react';
import { useActivityTracker } from './hooks/useActivityTracker';


export default function App() {
    const { init: initGamification, fetchConfig } = useGamification();

    React.useEffect(() => {

        const isUpdating = checkVersion();

        if (!isUpdating) {
            initGamification();
            fetchConfig();
        }
    }, []);

    return (
        <AuthProvider>
            <ToastProvider>
                <ThemeProvider>
                    <AppContent />
                    <Analytics />
                </ThemeProvider>
            </ToastProvider>
        </AuthProvider>
    );
}

function AppContent() {
    const maintenance = useMaintenance();
    
    useActivityTracker();

    return (
        <Router>
            <MainLayout maintenance={maintenance} />
        </Router>
    );
}

import { useAuth } from './context/AuthContext';

function MainLayout({ maintenance }: { maintenance: any }) {
    const { user, isAdmin, isAnonymous, loading: authLoading } = useAuth();
    const currentPath = window.location.pathname;

    if (maintenance.loading || authLoading) {
        return <PageLoader />;
    }

    const authRoutes = ['/signin', '/signup'];

    if (maintenance.isSystemMaintenance && !isAdmin && !authRoutes.some(path => currentPath.startsWith(path))) {
        return (
            <Suspense fallback={<PageLoader />}>
                <MaintenancePage scope="system" />
            </Suspense>
        );
    }

    if (currentPath.startsWith('/admin') && !user) {
        return <Navigate to="/signin" replace />;
    }

    const requiresFullAccount =
        currentPath.startsWith('/quizzes') ||
        currentPath.startsWith('/quiz/') ||
        currentPath.startsWith('/challenges');

    if (isAnonymous && requiresFullAccount) {
        return <Navigate to="/signin" replace />;
    }

    const isAuthOrAdminPath = ['/admin', '/signin', '/signup'].some(path => currentPath.startsWith(path));



    return (
        <>
            <PushNotificationListener />
            <ScrollToTop />
            <ExamCountdown />
            {['/quizzes', '/materials', '/admin', '/course', '/support'].every(path => !window.location.pathname.startsWith(path)) && (
                <PomodoroTimer />
            )}
            <Suspense fallback={<PageLoader />}>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/signin" element={<SignIn />} />
                    <Route path="/signup" element={<SignUp />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/history" element={<History />} />
                    <Route path="/leaderboard" element={<Leaderboard />} />
                    <Route path="/about" element={<AboutUs />} />

                    <Route path="/admin" element={<AdminLayout />}>
                        <Route index element={<AdminDashboard />} />
                        <Route path="users" element={<AdminUsers />} />
                        <Route path="quizzes" element={<AdminQuizzes />} />
                        <Route path="events" element={<AdminEvents />} />
                        <Route path="materials" element={<AdminMaterials />} />
                        <Route path="team" element={<AdminTeam />} />
                        <Route path="gamification" element={<AdminGamification />} />
                        <Route path="courseware" element={<Navigate to="/admin/materials" replace />} />
                        <Route path="feedback" element={<AdminFeedback />} />
                        <Route path="support" element={<AdminSupport />} />
                        <Route path="broadcast" element={<AdminBroadcast />} />
                        <Route path="notifications" element={<Navigate to="/admin/broadcast" replace />} />
                        <Route path="media" element={<Navigate to="/admin" replace />} />
                        <Route path="reports" element={<Navigate to="/admin" replace />} />
                        <Route path="settings" element={<AdminSystem />} />
                    </Route>

                    <Route path="/course/:subjectId" element={<DynamicCoursePage />} />

                    <Route path="/materials" element={<Materials />} />
                    <Route path="/materials/:semesterId" element={<SemesterSubjects mode="materials" />} />
                    <Route path="/materials/:semesterId/:subjectId" element={<SubjectMaterials />} />

                    <Route path="/quizzes" element={<Quizzes />} />
                    <Route path="/quizzes/create" element={<CreateQuiz />} />
                    <Route path="/quizzes/:semesterId" element={<SemesterSubjects mode="quizzes" />} />
                    <Route path="/quizzes/:semesterId/:subjectId" element={<SubjectQuiz />} />
                    <Route path="/quiz/:quizId" element={<DirectQuizPage />} />

                    <Route path="/materials/mobile-apps-course" element={<Navigate to="/course/mobile-apps" replace />} />
                    <Route path="/materials/modeling-course" element={<Navigate to="/course/modeling" replace />} />
                    <Route path="/topics" element={<Navigate to="/course/trend-topics" replace />} />
                    <Route path="/mobile-apps" element={<Navigate to="/course/mobile-apps" replace />} />
                    <Route path="/networks" element={<Navigate to="/course/networks" replace />} />
                    <Route path="/modeling" element={<Navigate to="/course/modeling" replace />} />
                    <Route path="/ethics" element={<Navigate to="/course/ethics" replace />} />
                    <Route path="/differential-equations" element={<Navigate to="/course/differential-equations" replace />} />

                    <Route path="/challenges" element={<Challenges />} />
                    <Route path="/challenges/:id" element={<Challenges />} />
                    <Route path="/support" element={<Support />} />
                    <Route path="/privacy" element={<Compliance />} />
                    <Route path="/terms" element={<Compliance />} />

                    <Route path="*" element={<NotFound />} />
                </Routes>
            </Suspense>
        </>
    );
}
