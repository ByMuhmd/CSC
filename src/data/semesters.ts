import {
    Calculator, Languages, Terminal, Database, Atom, Code,
    Binary, Box, Globe, Grid, Brain, Search,
    TrendingUp, FileText, Leaf, Network, Percent, Settings,
    GitBranch, Book, Cpu, Image, Zap, Wifi,
    Smartphone, Shield, FunctionSquare, LucideIcon, Workflow
} from 'lucide-react';

export interface Resource {
    label: string;
    url: string;
    type: 'drive' | 'youtube' | 'pdf' | 'other';
}

export interface Subject {
    id: string;
    name: string;
    icon?: LucideIcon;
    resources?: Resource[];
    exams?: Resource[];
}

export interface Semester {
    id: number;
    title: string;
    description: string;
    subjects: Subject[];
}

export const SEMESTERS: Semester[] = [
    {
        id: 1,
        title: 'First Semester',
        description: 'Introduction to Computer Science',
        subjects: [
            { id: 'calculus', name: 'Calculus', icon: Calculator },
            { id: 'english', name: 'English', icon: Languages },
            { id: 'intro-cs', name: 'Intro to CS', icon: Terminal },
            { id: 'intro-is', name: 'Intro to IS', icon: Database },
            { id: 'physics', name: 'Physics', icon: Atom },
            { id: 'programming', name: 'Programming', icon: Code }
        ]
    },
    {
        id: 2,
        title: 'Second Semester',
        description: 'Data Structures and Algorithms',
        subjects: [
            { id: 'assembly', name: 'Assembly Language', icon: Binary },
            { id: 'oop', name: 'OOP', icon: Box },
            { id: 'web-dev', name: 'Web Development', icon: Globe },
            { id: 'linear-algebra', name: 'Linear Algebra', icon: Grid },
            { id: 'logic-programming', name: 'Logic Programming', icon: Brain },
            { id: 'intro-db', name: 'Intro to DB', icon: Database }
        ]
    },
    {
        id: 3,
        title: 'Third Semester',
        description: 'Computer Architecture and Organization',
        subjects: [
            { id: 'system-analysis', name: 'System Analysis and Design', icon: Search },
            { id: 'operations-research', name: 'Operations Research', icon: TrendingUp },
            { id: 'file-processing', name: 'File Processing', icon: FileText },
            { id: 'ecology', name: 'Ecology', icon: Leaf },
            { id: 'discrete-maths', name: 'Discrete Maths', icon: Calculator },
            { id: 'data-structure', name: 'Data Structure', icon: Network }
        ]
    },
    {
        id: 4,
        title: 'Fourth Semester',
        description: 'Operating Systems and Networks',
        subjects: [
            { id: 'probability', name: 'Probability', icon: Percent },
            { id: 'software-engineering', name: 'Software Engineering', icon: Settings },
            { id: 'algorithms', name: 'Algorithms', icon: GitBranch },
            { id: 'arabic', name: 'Arabic', icon: Book },
            { id: 'computer-arch', name: 'Computer Architecture', icon: Cpu },
            { id: 'computer-graphics', name: 'Computer Graphics', icon: Image }
        ]
    },
    {
        id: 5,
        title: 'Fifth Semester',
        description: 'Software Engineering and Databases',
        subjects: [
            {
                id: 'trend-topics',
                name: 'Trend Topics',
                icon: Zap,
                resources: [
                    { label: 'Drive Folder', url: 'https://drive.google.com/drive/folders/1XgGmQwZ6XtfsaYqZHPSyOg_25fSgdIpI?usp=drive_link', type: 'drive' },
                    { label: 'Course Book', url: 'https://drive.google.com/file/d/1iw8K76pe-0kSW0JLYnaUOLsMaiRAooW6/view?usp=sharing', type: 'pdf' }
                ],
                exams: [
                    { label: 'Final 2026', url: 'https://drive.google.com/file/d/1E1z1qLfYlhkSXlZffp-j0rstJ5qX6R8N/view?usp=drive_link', type: 'pdf' },
                    { label: 'Final 2025', url: 'https://drive.google.com/file/d/1NxUBYFc_A4OlQC2Tk8VQBloHiFFrlOYP/view?usp=drive_link', type: 'pdf' },
                    { label: 'Midterm 2025', url: 'https://drive.google.com/file/d/1wUg91lm3KKUhTA7JMUzKgq7-5J1-ZCOf/view?usp=drive_link', type: 'pdf' }
                ]
            },
            {
                id: 'networks',
                name: 'Networks',
                icon: Wifi,
                resources: [
                    { label: 'Drive Folder', url: 'https://drive.google.com/drive/folders/1ll6LY4D2QMwt1vNWGttJK9cH4MnbDs63?usp=drive_link', type: 'drive' },
                    { label: 'YouTube Playlist', url: 'https://www.youtube.com/playlist?list=PLNvKgv3h-RQkN2qCgzuYbxkhxH9wFOVsx', type: 'youtube' }
                ],
                exams: [
                    { label: 'Midterm 2025', url: 'https://drive.google.com/file/d/1hkPirzmevj_8ycmSKuYaTemM1y1NPHld/view?usp=drive_link', type: 'pdf' },
                    { label: 'Final 2025', url: 'https://drive.google.com/file/d/1NRVaoeWiRhogiiFv3KSrssfY5D-2XDTo/view?usp=drive_link', type: 'pdf' }
                ]
            },
            {
                id: 'modeling',
                name: 'Modeling and Simulation',
                icon: Workflow,
                resources: [
                    { label: 'Drive Folder', url: 'https://drive.google.com/drive/folders/18v2l2z0-CIZmQrt82EZC1FJ6izPXVYh8?usp=drive_link', type: 'drive' },
                    { label: 'YouTube Playlist', url: 'https://youtube.com/playlist?list=PLNvKgv3h-RQm0Jra2_x7HVBh7hTptOCtV&si=HrF_Ck9ooSEC_8Ii', type: 'youtube' }
                ],
                exams: [
                    { label: 'Midterm 2025', url: 'https://drive.google.com/file/d/1HxkglTQps8yafd6NO-uDa8gcRIT-249i/view?usp=drive_link', type: 'pdf' },
                    { label: 'Final 2025', url: 'https://drive.google.com/file/d/1j3WzKfs5CYtltfb9K8Z0SWuE80euj55p/view?usp=drive_link', type: 'pdf' }
                ]
            },
            {
                id: 'mobile-apps',
                name: 'Mobile Apps',
                icon: Smartphone,
                resources: [
                    { label: 'Drive Folder', url: 'https://drive.google.com/drive/folders/1y7lb7tODocSL-vnJNr8xlUc1ITTiEVCv?usp=drive_link', type: 'drive' },
                    { label: 'YouTube Playlist', url: 'https://www.youtube.com/playlist?list=PLNvKgv3h-RQluNBDtLaP8oTt6bZPIaCXB', type: 'youtube' }
                ],
                exams: [
                    { label: 'Midterm', url: 'https://drive.google.com/file/d/1fQIytIHGqWKiEdegzmSSCnc88dUi19a6/view?usp=drive_link', type: 'pdf' },
                    { label: 'Final 2024', url: 'https://drive.google.com/file/d/1zbNqYO54xlubRwE1NEdCuDm0xIEENLTP/view?usp=drive_link', type: 'pdf' }
                ]
            },
            {
                id: 'ethics',
                name: 'Ethics',
                icon: Shield,
                resources: [
                    { label: 'Drive Folder', url: 'https://drive.google.com/drive/folders/1baKFYRQknZiKZ49D20uQ9SCoQQRCjeZ0?usp=drive_link', type: 'drive' }
                ],
                exams: [
                    { label: 'Final 2024', url: 'https://drive.google.com/file/d/1RU0klGPGGlz7VIj53R2x1vY84lTxQ-Wi/view?usp=drive_link', type: 'pdf' },
                    { label: 'Midterm 2025', url: 'https://drive.google.com/file/d/1laUn6xX1PjayJ4484WXdfvTeo3ImWjjz/view?usp=drive_link', type: 'pdf' }
                ]
            },
            {
                id: 'differential-equations',
                name: 'Differential Equations',
                icon: FunctionSquare,
                resources: [
                    { label: 'Drive Folder', url: 'https://drive.google.com/drive/folders/1JHEk_6JK4cOvcwIeBw9wpZZHgTNc00FW?usp=drive_link', type: 'drive' },
                    { label: 'YouTube Playlist', url: 'https://www.youtube.com/playlist?list=PLNvKgv3h-RQljDldfG7beEta-keoqw6IT', type: 'youtube' }
                ],
                exams: [
                    { label: 'Final 2024', url: 'https://drive.google.com/file/d/1gJuPVGcojje5T3pzwNg1eYceXQ9h5CbF/view?usp=drive_link', type: 'pdf' },
                    { label: 'Midterm 2025', url: 'https://drive.google.com/file/d/1BZ_4srLQUPjCHpTiMblTr8pGP-ElTluH/view?usp=drive_link', type: 'pdf' }
                ]
            }
        ]
    },
    {
        id: 6,
        title: 'Sixth Semester',
        description: 'Advanced Topics and Electives',
        subjects: []
    }
];
