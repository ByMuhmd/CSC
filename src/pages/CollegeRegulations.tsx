import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { ArrowLeft, ArrowRight, BookOpen, Calculator, ExternalLink, Globe, Loader2, Plus, RefreshCcw, Search, Sparkles, Trash2, Download, Target, History, BarChart3, Check } from 'lucide-react';

type Language = 'en' | 'ar';
type GradeLetter = 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D+' | 'D' | 'F';

interface CourseRow {
    id: number;
    name: string;
    credits: number;
    grade: GradeLetter;
}

interface OfficialSubject {
    id: number;
    name: string;
    nameEn?: string;
    hours: string;
    hours2: number;
    total_subject_estimate_id: number;
    total_subject_estimates?: {
        id: number;
        name: string;
    };
}

const TRANSLATIONS = {
    en: {
        backToHome: "Back to Home",
        gpaGuide: "GPA Guide",
        collegeRegulations: "College Regulations",
        title: "Regulations &\nGPA Calculator",
        subtitle: "This page provides the grading scale, GPA formula, and a practical calculator where you can enter your subjects and credit hours to instantly see your GPA.",
        currentGpa: "Current GPA",
        credits: "Credits",
        standing: "Standing",
        gradingScale: "Grading Scale",
        gradingScaleSub: "The default scale is based on a 4.0 system and can be adjusted.",
        formula: "GPA = Σ(Points × Credits) ÷ Σ(Credits)",
        grade: "Grade",
        points: "Points",
        description: "Description",
        exemptNote: "Exempted or non-credit courses are not included in the GPA calculation.",
        differentScaleNote: "If your college uses a different scale, refer to the grading scale to adjust manually.",
        gpaCalculator: "GPA Calculator",
        gpaCalculatorSub: "Add subjects, their credit hours, and your final grade for each.",
        subjectName: "Subject Name",
        subjectNamePlaceholder: "Example: Programming",
        gradeLabel: "Grade",
        delete: "Delete",
        addSubject: "Add Subject",
        reset: "Reset Data",
        totalCredits: "Total Credits",
        weightedPts: "Weighted Pts",
        finalGpa: "Final GPA",
        quickNotes: "Quick Notes",
        quickNotesSub: "Useful before relying on the final numbers.",
        note1: "Calculate each subject according to its credit hours; a 4-credit course affects your GPA more than a 2-credit course.",
        note2: "If you have a Pass/Fail or non-credit course, leave it out of the calculator.",
        note3: "If the college uses a different scale, modify the grade points to match your regulations.",
        officialSubjects: "Official Subjects",
        officialSubjectsSub: "Current list of subjects from the official institute website for the Computer Science department.",
        officialSource: "Official Source",
        searchPlaceholder: "Search for a subject...",
        loadingSubjects: "Loading subjects...",
        loadingOfficial: "Loading official materials",
        subjectCount: (count: number) => `${count} Subject${count === 1 ? '' : 's'}`,
        unknownRegulation: "Unknown Regulation",
        officialRecord: "Official subject record",
        hours: "Hours",
        plan: "Plan",
        standingExcellentPlus: "Excellent+",
        standingExcellent: "Excellent",
        standingVeryGoodPlus: "Very Good+",
        standingVeryGood: "Very Good",
        standingGoodPlus: "Good+",
        standingGood: "Good",
        standingPassPlus: "Pass+",
        standingPass: "Pass",
        standingFail: "Fail",
        academicWarning: "Academic Warning",
        failedToLoad: "Failed to load official subjects from the reference site.",
        initialSubject1: "Subject 1",
        initialSubject2: "Subject 2",
        initialSubject3: "Subject 3",
        subjectPrefix: "Subject",
        academicHistory: "Academic History",
        academicHistorySub: "Enter your past records to calculate cumulative GPA.",
        previousGpa: "Previous Cum. GPA",
        previousCredits: "Previous Credits",
        targetGpa: "Target GPA Setter",
        targetGpaSub: "Find out what semester GPA you need.",
        targetGpaInput: "Target Cum. GPA",
        requiredSemesterGpa: "Required Semester GPA",
        impossibleTarget: "Impossible with current credits",
        achievedTarget: "Target Achieved!",
        exportResult: "Export PDF/Image",
        exporting: "Exporting...",
        clearData: "Clear Data",
        cumulativeGpa: "Cumulative GPA",
        semesterGpa: "Semester GPA",
        charts: "Performance Charts",
        gpaDistribution: "Semester Weights",
        addSubjectTooltip: "Add to Calculator",
        subjectAdded: "Added!",
        exportSuccess: "Saved!"
    },
    ar: {
        backToHome: "العودة للرئيسية",
        gpaGuide: "دليل GPA",
        collegeRegulations: "اللائحة الداخلية",
        title: "اللائحة الداخلية\nوحاسبة GPA",
        subtitle: "الصفحة دي بتجمع لك سلم التقديرات، معادلة حساب المعدل، وحاسبة عملية تقدر تدخل فيها المواد والساعات المعتمدة وتشوف النتيجة فورًا.",
        currentGpa: "المعدل الحالي",
        credits: "الساعات المعتمدة",
        standing: "التقدير",
        gradingScale: "سلم التقديرات",
        gradingScaleSub: "السلم الافتراضي هنا مبني على مقياس 4.0 ويمكن تعديله حسب لائحة الكلية.",
        formula: "GPA = Σ(النقاط × الساعات) ÷ Σ(الساعات)",
        grade: "التقدير",
        points: "النقاط",
        description: "الوصف",
        exemptNote: "المواد المعفاة أو غير المحتسبة في المعدل لا تدخل في الحساب.",
        differentScaleNote: "لو الكلية بتستخدم سلم مختلف، غيّر النقاط من الحاسبة أو اعتبرها مرجعًا سريعًا فقط.",
        gpaCalculator: "حاسبة GPA",
        gpaCalculatorSub: "أضف المواد وساعاتها والتقدير النهائي لكل مادة.",
        subjectName: "اسم المادة",
        subjectNamePlaceholder: "مثال: برمجة",
        gradeLabel: "التقدير",
        delete: "حذف",
        addSubject: "إضافة مادة",
        reset: "إعادة الضبط",
        totalCredits: "إجمالي الساعات",
        weightedPts: "النقاط الموزونة",
        finalGpa: "GPA النهائي",
        quickNotes: "ملاحظات سريعة",
        quickNotesSub: "مفيدة قبل اعتماد الأرقام النهائية.",
        note1: "احسب كل مادة بالساعة المعتمدة الخاصة بها، لأن المادة ذات 4 ساعات تؤثر أكثر من مادة بساعتين.",
        note2: "لو عندك مادة ناجح/راسب أو غير محتسبة، اتركها خارج الحاسبة.",
        note3: "لو الكلية بتستخدم مقياسًا مختلفًا، غيّر سلم النقاط الظاهر بالأعلى ليتطابق مع لائحتك.",
        officialSubjects: "المواد الرسمية",
        officialSubjectsSub: "قائمة المواد الحالية من موقع المعهد الرسمي لقسم علوم الحاسب.",
        officialSource: "المصدر الرسمي",
        searchPlaceholder: "ابحث عن مادة...",
        loadingSubjects: "جاري تحميل المواد...",
        loadingOfficial: "جاري تحميل المواد الرسمية",
        subjectCount: (count: number) => `${count} مادة`,
        unknownRegulation: "لائحة غير معروفة",
        officialRecord: "سجل المادة الرسمي",
        hours: "الساعات",
        plan: "لائحة",
        standingExcellentPlus: "ممتاز جدًا",
        standingExcellent: "ممتاز",
        standingVeryGoodPlus: "جيد جدًا مرتفع",
        standingVeryGood: "جيد جدًا",
        standingGoodPlus: "جيد مرتفع",
        standingGood: "جيد",
        standingPassPlus: "مقبول مرتفع",
        standingPass: "مقبول",
        standingFail: "راسب",
        academicWarning: "منذر أكاديميًا",
        failedToLoad: "تعذر تحميل قائمة المواد الرسمية من الموقع المرجعي.",
        initialSubject1: "مادة 1",
        initialSubject2: "مادة 2",
        initialSubject3: "مادة 3",
        subjectPrefix: "مادة",
        academicHistory: "السجل الأكاديمي",
        academicHistorySub: "أدخل بياناتك السابقة لحساب التراكمي.",
        previousGpa: "المعدل التراكمي السابق",
        previousCredits: "إجمالي الساعات السابقة",
        targetGpa: "حاسبة الهدف 🎯",
        targetGpaSub: "اكتشف التقدير المطلوب لتحقيق هدفك.",
        targetGpaInput: "التراكمي المستهدف",
        requiredSemesterGpa: "المعدل الفصلي المطلوب",
        impossibleTarget: "مستحيل بالساعات الحالية",
        achievedTarget: "تم تحقيق الهدف!",
        exportResult: "تصدير كصورة",
        exporting: "جاري التصدير...",
        clearData: "مسح البيانات",
        cumulativeGpa: "المعدل التراكمي",
        semesterGpa: "المعدل الفصلي",
        charts: "الأداء والتوزيع",
        gpaDistribution: "تأثير المواد في الفصل",
        addSubjectTooltip: "إضافة للحاسبة",
        subjectAdded: "تمت الإضافة!",
        exportSuccess: "تم الحفظ!"
    }
};

const GRADE_POINTS: Record<GradeLetter, number> = {
    'A+': 4.0, A: 3.7, 'B+': 3.3, B: 3.0, 'C+': 2.7, C: 2.0, 'D+': 1.7, D: 1.0, F: 0,
};

function getGradeScale(lang: Language) {
    const t = TRANSLATIONS[lang];
    return [
        { grade: 'A+', points: 4.0, label: t.standingExcellentPlus },
        { grade: 'A', points: 3.7, label: t.standingExcellent },
        { grade: 'B+', points: 3.3, label: t.standingVeryGoodPlus },
        { grade: 'B', points: 3.0, label: t.standingVeryGood },
        { grade: 'C+', points: 2.7, label: t.standingGoodPlus },
        { grade: 'C', points: 2.0, label: t.standingGood },
        { grade: 'D+', points: 1.7, label: t.standingPassPlus },
        { grade: 'D', points: 1.0, label: t.standingPass },
        { grade: 'F', points: 0, label: t.standingFail },
    ] as Array<{ grade: GradeLetter; points: number; label: string }>;
}

function getInitialRows(lang: Language): CourseRow[] {
    const t = TRANSLATIONS[lang];
    return [
        { id: 1, name: t.initialSubject1, credits: 3, grade: 'A' },
        { id: 2, name: t.initialSubject2, credits: 3, grade: 'B+' },
        { id: 3, name: t.initialSubject3, credits: 2, grade: 'B' },
    ];
}

const OFFICIAL_DEPARTMENT_ID = 4;

function getStandingLabel(gpa: number, lang: Language) {
    const t = TRANSLATIONS[lang];
    if (gpa >= 3.7) return t.standingExcellent;
    if (gpa >= 3.0) return t.standingVeryGood;
    if (gpa >= 2.0) return t.standingGood;
    if (gpa >= 1.0) return t.standingPass;
    return t.academicWarning;
}

function useStickyState<T>(defaultValue: T, key: string): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [value, setValue] = useState<T>(() => {
        if (typeof window === 'undefined') return defaultValue;
        const stickyValue = window.localStorage.getItem(key);
        return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
    });
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(key, JSON.stringify(value));
        }
    }, [key, value]);
    return [value, setValue];
}

const DonutChart = ({ gpa, size = 120, strokeWidth = 10 }: { gpa: number, size?: number, strokeWidth?: number }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (gpa / 4.0) * circumference;

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg className="transform -rotate-90 w-full h-full">
                <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" strokeWidth={strokeWidth} fill="transparent" className="text-white/5" />
                <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" strokeWidth={strokeWidth} fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} className="text-cyan-400 transition-all duration-1000 ease-out" strokeLinecap="round" />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
                <span className="text-2xl font-black">{gpa.toFixed(2)}</span>
                <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">GPA</span>
            </div>
        </div>
    );
};

const BarChart = ({ rows }: { rows: CourseRow[] }) => {
    const maxPoints = Math.max(...rows.map(r => r.credits * GRADE_POINTS[r.grade]), 1);

    return (
        <div className="h-32 flex items-end gap-2 w-full pt-4">
            {rows.map((r, i) => {
                const points = r.credits * GRADE_POINTS[r.grade];
                const height = `${Math.max((points / maxPoints) * 100, 5)}%`;
                return (
                    <div key={r.id || i} className="flex-1 flex flex-col items-center gap-2 group relative h-full">
                        <div className="absolute -top-10 bg-black/90 px-3 py-1.5 rounded-lg text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 border border-white/10 shadow-xl">
                            {r.name}: {points.toFixed(1)} pts
                        </div>
                        <div className="w-full bg-white/5 rounded-t-lg overflow-hidden flex items-end justify-center h-full relative border border-white/5">
                            <div className="w-full bg-gradient-to-t from-cyan-500/30 to-cyan-400/80 transition-all duration-700 ease-out rounded-t-lg" style={{ height }} />
                        </div>
                        <span className="text-[9px] text-gray-500 truncate w-full text-center font-bold px-1">{r.name}</span>
                    </div>
                );
            })}
        </div>
    );
};

export default function CollegeRegulations() {
    const [lang, setLang] = useStickyState<Language>('en', 'gpa-lang-pref');
    const [rows, setRows] = useStickyState<CourseRow[]>(getInitialRows('en'), 'gpa-calculator-rows');
    const [previousGpa, setPreviousGpa] = useStickyState<string>('', 'gpa-previous-val');
    const [previousCredits, setPreviousCredits] = useStickyState<string>('', 'gpa-previous-credits');
    const [targetGpa, setTargetGpa] = useStickyState<string>('', 'gpa-target-val');

    const [officialSubjects, setOfficialSubjects] = useState<OfficialSubject[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loadingOfficialSubjects, setLoadingOfficialSubjects] = useState(false);
    const [officialSubjectsError, setOfficialSubjectsError] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [exportSuccess, setExportSuccess] = useState(false);
    const [recentlyAddedId, setRecentlyAddedId] = useState<number | null>(null);

    const exportRef = useRef<HTMLDivElement>(null);
    const t = TRANSLATIONS[lang];
    const isRtl = lang === 'ar';

    useEffect(() => {
        const loadOfficialSubjects = async () => {
            setLoadingOfficialSubjects(true);
            setOfficialSubjectsError(null);

            try {
                const response = await fetch(`https://mis.himit-kfs.edu.eg/api/website/departmentSubjects/${OFFICIAL_DEPARTMENT_ID}`);
                if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
                const data = await response.json();
                setOfficialSubjects(Array.isArray(data) ? data : []);
            } catch (error) {
                setOfficialSubjectsError(t.failedToLoad);
                console.error('Failed to load official subjects', error);
            } finally {
                setLoadingOfficialSubjects(false);
            }
        };
        loadOfficialSubjects();
    }, [t.failedToLoad]);

    const totals = useMemo(() => {
        const semCredits = rows.reduce((sum, row) => sum + Number(row.credits || 0), 0);
        const semPoints = rows.reduce((sum, row) => sum + (Number(row.credits || 0) * GRADE_POINTS[row.grade]), 0);
        const semGpa = semCredits > 0 ? semPoints / semCredits : 0;

        const prevCreds = Number(previousCredits || 0);
        const prevGpaVal = Number(previousGpa || 0);

        const cumCredits = semCredits + prevCreds;
        const cumPoints = semPoints + (prevCreds * prevGpaVal);
        const cumGpa = cumCredits > 0 ? cumPoints / cumCredits : (semCredits > 0 ? semGpa : 0);

        let requiredSemGpa = 0;
        let targetStatus = '';
        const targetGpaVal = Number(targetGpa || 0);

        if (targetGpaVal > 0 && semCredits > 0) {
            requiredSemGpa = ((targetGpaVal * cumCredits) - (prevCreds * prevGpaVal)) / semCredits;
            if (requiredSemGpa > 4.0) targetStatus = 'impossible';
            else if (requiredSemGpa <= 0) targetStatus = 'achieved';
            else targetStatus = 'possible';
        }

        return {
            semCredits,
            semPoints,
            semGpa,
            semStanding: getStandingLabel(semGpa, lang),
            cumCredits,
            cumPoints,
            cumGpa,
            cumStanding: getStandingLabel(cumGpa, lang),
            requiredSemGpa,
            targetStatus
        };
    }, [rows, lang, previousCredits, previousGpa, targetGpa]);

    const addRow = () => {
        setRows((current) => [...current, { id: Date.now(), name: `${t.subjectPrefix} ${current.length + 1}`, credits: 3, grade: 'B' }]);
    };

    const handleQuickAdd = (subject: OfficialSubject) => {
        const credits = (Number(subject.hours) || 0) + (Number(subject.hours2) || 0);
        setRows(curr => [...curr, { id: Date.now() + Math.random(), name: subject.name, credits: credits || 3, grade: 'B' }]);
        setRecentlyAddedId(subject.id);
        setTimeout(() => setRecentlyAddedId(null), 2000);
    };

    const resetRows = () => {
        if(window.confirm('Are you sure you want to clear all data?')) {
            setRows(getInitialRows(lang));
            setPreviousCredits('');
            setPreviousGpa('');
            setTargetGpa('');
        }
    };

    const updateRow = (id: number, field: keyof CourseRow, value: string | number | GradeLetter) => {
        setRows((current) => current.map((row) => row.id === id ? { ...row, [field]: field === 'credits' ? Math.max(0, Number(value) || 0) : value } : row));
    };

    const removeRow = (id: number) => {
        setRows((current) => (current.length === 1 ? current : current.filter((row) => row.id !== id)));
    };

    const toggleLang = () => setLang((prev) => (prev === 'en' ? 'ar' : 'en'));

    const exportAsImage = async () => {
        if (!exportRef.current) return;
        setIsExporting(true);
        try {
            const canvas = await html2canvas(exportRef.current, { backgroundColor: '#0A0C10', scale: 2, useCORS: true });
            const url = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `GPA_Report_${new Date().toISOString().split('T')[0]}.png`;
            link.href = url;
            link.click();
            setExportSuccess(true);
            setTimeout(() => setExportSuccess(false), 3000);
        } catch (err) {
            console.error("Export failed", err);
        } finally {
            setIsExporting(false);
        }
    };

    const getBadgeClass = (gpa: number) =>
        gpa >= 3.7 ? 'from-emerald-500/20 to-emerald-400/10 text-emerald-200 border-emerald-400/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
            : gpa >= 3.0 ? 'from-cyan-500/20 to-cyan-400/10 text-cyan-200 border-cyan-400/20 shadow-[0_0_20px_rgba(34,211,238,0.15)]'
                : gpa >= 2.0 ? 'from-amber-500/20 to-amber-400/10 text-amber-200 border-amber-400/20 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                    : 'from-red-500/20 to-red-400/10 text-red-200 border-red-400/20 shadow-[0_0_20px_rgba(239,68,68,0.15)]';

    const filteredOfficialSubjects = officialSubjects.filter((subject) => {
        const planName = subject.total_subject_estimates?.name || '';
        if (planName.includes('2005')) return false;

        const needle = searchQuery.trim().toLowerCase();
        if (!needle) return true;
        return [subject.name, subject.nameEn, planName].filter(Boolean).some((value) => String(value).toLowerCase().includes(needle));
    });

    const officialGroups = Object.values(filteredOfficialSubjects.reduce<Record<string, OfficialSubject[]>>((groups, subject) => {
        const key = subject.total_subject_estimates?.name || `${t.plan} ${subject.total_subject_estimate_id}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(subject);
        return groups;
    }, {})).map((group) => group.sort((left, right) => Number(left.id) - Number(right.id)));

    const gradeScale = getGradeScale(lang);

    return (
        <div dir={isRtl ? 'rtl' : 'ltr'} className={`min-h-screen bg-[#05070a] text-white ${isRtl ? 'font-arabic' : 'font-sans'} relative overflow-hidden selection:bg-cyan-500/20`}>
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                <div className={`absolute -top-32 ${isRtl ? 'left-16' : 'right-16'} h-[400px] w-[400px] rounded-full bg-cyan-500/10 blur-[140px] mix-blend-screen`} />
                <div className={`absolute -bottom-32 ${isRtl ? 'right-16' : 'left-16'} h-[400px] w-[400px] rounded-full bg-purple-500/10 blur-[140px] mix-blend-screen`} />
            </div>

            <div className="relative mx-auto w-full max-w-7xl px-4 pb-16 pt-10 md:px-6 md:pt-16">
                <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
                    <Link to="/" className="group inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-gray-300 backdrop-blur-md transition-all hover:bg-white/10 hover:text-white hover:border-white/20">
                        {isRtl ? <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /> : <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />}
                        {t.backToHome}
                    </Link>

                    <div className="flex flex-wrap items-center gap-3">
                        <button onClick={exportAsImage} disabled={isExporting} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-gray-300 backdrop-blur-md transition-all hover:bg-white/10 hover:text-white hover:border-white/20">
                            {exportSuccess ? <Check size={16} className="text-emerald-400" /> : isExporting ? <Loader2 size={16} className="animate-spin text-cyan-400" /> : <Download size={16} className="text-cyan-400" />}
                            {exportSuccess ? t.exportSuccess : isExporting ? t.exporting : t.exportResult}
                        </button>
                        <button onClick={toggleLang} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-gray-300 backdrop-blur-md transition-all hover:bg-white/10 hover:text-white hover:border-white/20">
                            <Globe size={16} className="text-purple-400" />
                            {lang === 'en' ? 'عربي' : 'English'}
                        </button>
                    </div>
                </div>

                <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]" ref={exportRef}>
                    <section className="space-y-8">
                        <div className="rounded-[32px] border border-white/10 bg-gradient-to-b from-[#0A0C10]/95 to-[#0A0C10]/80 p-6 shadow-2xl backdrop-blur-2xl md:p-10 relative overflow-hidden group hover:border-white/15 transition-all">
                            <div className={`absolute inset-0 bg-gradient-to-${isRtl ? 'tl' : 'tr'} from-cyan-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                            
                            <div className="relative">
                                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-gray-300">
                                    <BookOpen size={14} className="text-purple-400" />
                                    {t.collegeRegulations}
                                </div>

                                <div className="mt-6 space-y-4">
                                    <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl lg:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400 whitespace-pre-line">
                                        {t.title}
                                    </h1>
                                    <p className="max-w-xl text-sm leading-relaxed text-gray-400 md:text-base font-medium">
                                        {t.subtitle}
                                    </p>
                                </div>

                                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                    <div className={`rounded-[24px] border bg-gradient-to-br p-5 transition-transform hover:-translate-y-1 ${getBadgeClass(totals.cumGpa)} col-span-2 sm:col-span-1 lg:col-span-2`}>
                                        <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-80">{t.cumulativeGpa}</p>
                                        <p className="mt-2 text-4xl font-black text-white">{totals.cumGpa.toFixed(2)}</p>
                                    </div>
                                    <div className="rounded-[24px] border border-white/10 bg-white/5 p-5 transition-transform hover:-translate-y-1 hover:bg-white/10">
                                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">{t.semesterGpa}</p>
                                        <p className="mt-2 text-2xl font-black text-white">{totals.semGpa.toFixed(2)}</p>
                                    </div>
                                    <div className="rounded-[24px] border border-white/10 bg-white/5 p-5 transition-transform hover:-translate-y-1 hover:bg-white/10">
                                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">{t.totalCredits}</p>
                                        <p className="mt-2 text-2xl font-black text-white">{totals.cumCredits.toFixed(0)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-[32px] border border-white/10 bg-[#0A0C10]/90 p-6 shadow-2xl backdrop-blur-xl md:p-10 relative overflow-hidden">
                             <div className="flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-2xl font-black tracking-tight">{t.charts}</h2>
                                    <p className="mt-1 text-sm text-gray-400 font-medium">{t.gpaDistribution}</p>
                                </div>
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
                                    <BarChart3 size={20} />
                                </div>
                            </div>
                            <div className="mt-8 grid md:grid-cols-[auto_1fr] gap-8 items-center">
                                <div className="flex justify-center md:justify-start">
                                    <DonutChart gpa={totals.cumGpa} size={140} strokeWidth={12} />
                                </div>
                                <div className="w-full">
                                    <BarChart rows={rows} />
                                </div>
                            </div>
                        </div>

                        <div className="rounded-[32px] border border-white/10 bg-[#0A0C10]/90 p-6 shadow-2xl backdrop-blur-xl md:p-10 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                                <Calculator size={140} />
                            </div>
                            
                            <div className="relative">
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
                                            {t.gpaCalculator}
                                        </h2>
                                        <p className="mt-2 text-sm text-gray-400 font-medium">{t.gpaCalculatorSub}</p>
                                    </div>
                                    <button onClick={resetRows} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-gray-400 transition-all hover:bg-white/10 hover:text-white">
                                        <RefreshCcw size={14} />
                                        {t.clearData}
                                    </button>
                                </div>

                                <div className="mt-8 space-y-4">
                                    {rows.map((row) => (
                                        <div key={row.id} className="grid gap-4 rounded-[24px] border border-white/10 bg-white/[0.03] p-5 md:grid-cols-[1.4fr_0.6fr_0.8fr_auto] md:items-end transition-all hover:border-white/20 hover:bg-white/[0.05]">
                                            <label className="space-y-2">
                                                <span className="block text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">{t.subjectName}</span>
                                                <input type="text" value={row.name} onChange={(e) => updateRow(row.id, 'name', e.target.value)} className={`w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-medium text-white outline-none transition-all placeholder:text-gray-600 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10 ${isRtl ? 'text-right' : 'text-left'}`} placeholder={t.subjectNamePlaceholder} />
                                            </label>

                                            <label className="space-y-2">
                                                <span className="block text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">{t.credits}</span>
                                                <input type="number" min="0" step="0.5" value={row.credits} onChange={(e) => updateRow(row.id, 'credits', Number(e.target.value))} className={`w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-medium text-white outline-none transition-all focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10 ${isRtl ? 'text-right' : 'text-left'}`} />
                                            </label>

                                            <label className="space-y-2">
                                                <span className="block text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">{t.gradeLabel}</span>
                                                <select value={row.grade} onChange={(e) => updateRow(row.id, 'grade', e.target.value as GradeLetter)} dir="ltr" className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-bold text-white outline-none transition-all focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10 appearance-none text-left">
                                                    {gradeScale.map((item) => <option key={item.grade} value={item.grade} className="bg-gray-900 text-left">{item.grade} - {item.points.toFixed(1)}</option>)}
                                                </select>
                                            </label>

                                            <button type="button" onClick={() => removeRow(row.id)} className="inline-flex h-[46px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 text-sm font-bold text-gray-400 transition-all hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/30">
                                                <Trash2 size={16} />
                                                <span className="md:hidden">{t.delete}</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 flex justify-center">
                                    <button type="button" onClick={addRow} className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-6 py-3.5 text-sm font-bold text-cyan-200 transition-all hover:bg-cyan-400/20 hover:scale-[1.02] shadow-[0_0_15px_rgba(34,211,238,0.1)] w-full md:w-auto">
                                        <Plus size={16} />
                                        {t.addSubject}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-8">
                        <div className="rounded-[32px] border border-white/10 bg-[#0A0C10]/90 p-6 shadow-2xl backdrop-blur-xl md:p-8 relative overflow-hidden">
                             <div className="flex items-center gap-3 mb-6">
                                <History className="text-cyan-400" size={24} />
                                <h2 className="text-2xl font-black tracking-tight">{t.academicHistory}</h2>
                            </div>
                            <p className="text-sm text-gray-400 font-medium mb-6">{t.academicHistorySub}</p>

                            <div className="grid gap-4 sm:grid-cols-2 mb-8">
                                <label className="space-y-2">
                                    <span className="block text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">{t.previousGpa}</span>
                                    <input type="number" step="0.01" min="0" max="4" value={previousGpa} onChange={e => setPreviousGpa(e.target.value)} placeholder="e.g. 3.2" className={`w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3.5 text-sm font-medium text-white outline-none transition-all placeholder:text-gray-600 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10 ${isRtl ? 'text-right' : 'text-left'}`} />
                                </label>
                                <label className="space-y-2">
                                    <span className="block text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">{t.previousCredits}</span>
                                    <input type="number" step="1" min="0" value={previousCredits} onChange={e => setPreviousCredits(e.target.value)} placeholder="e.g. 60" className={`w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3.5 text-sm font-medium text-white outline-none transition-all placeholder:text-gray-600 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10 ${isRtl ? 'text-right' : 'text-left'}`} />
                                </label>
                            </div>

                            <hr className="border-white/5 my-6" />

                            <div className="flex items-center gap-3 mb-6">
                                <Target className="text-purple-400" size={24} />
                                <h2 className="text-2xl font-black tracking-tight">{t.targetGpa}</h2>
                            </div>
                            <p className="text-sm text-gray-400 font-medium mb-6">{t.targetGpaSub}</p>

                            <label className="space-y-2 mb-6 block">
                                <span className="block text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">{t.targetGpaInput}</span>
                                <input type="number" step="0.01" min="0" max="4" value={targetGpa} onChange={e => setTargetGpa(e.target.value)} placeholder="e.g. 3.5" className={`w-full rounded-2xl border border-purple-400/20 bg-purple-400/5 px-4 py-3.5 text-sm font-medium text-white outline-none transition-all placeholder:text-gray-600 focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/10 ${isRtl ? 'text-right' : 'text-left'}`} />
                            </label>

                            {targetGpa && totals.semCredits > 0 && (
                                <div className={`rounded-2xl p-4 border ${totals.targetStatus === 'impossible' ? 'bg-red-500/10 border-red-500/20 text-red-200' : totals.targetStatus === 'achieved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200' : 'bg-purple-500/10 border-purple-500/20 text-purple-200'}`}>
                                    <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">{t.requiredSemesterGpa}</div>
                                    <div className="text-2xl font-black">
                                        {totals.targetStatus === 'impossible' ? t.impossibleTarget : totals.targetStatus === 'achieved' ? t.achievedTarget : totals.requiredSemGpa.toFixed(2)}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="rounded-[32px] border border-white/10 bg-[#0A0C10]/90 p-6 shadow-2xl backdrop-blur-xl md:p-8">
                             <h2 className="text-2xl font-black tracking-tight">{t.gradingScale}</h2>
                            <div className="mt-6 overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.02]">
                                <div className="grid grid-cols-3 bg-white/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-white/10">
                                    <span>{t.grade}</span>
                                    <span>{t.points}</span>
                                    <span>{t.description}</span>
                                </div>
                                <div className="divide-y divide-white/5">
                                    {gradeScale.map((item) => (
                                        <div key={item.grade} className="grid grid-cols-3 px-4 py-3 text-sm hover:bg-white/[0.02] transition-colors">
                                            <span className="font-black text-white text-base">{item.grade}</span>
                                            <span className="text-gray-300 font-medium">{item.points.toFixed(1)}</span>
                                            <span className="text-gray-400 text-xs">{item.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="mt-8 rounded-[32px] border border-white/10 bg-[#0A0C10]/90 p-6 shadow-2xl backdrop-blur-xl md:p-10">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h2 className="text-3xl font-black tracking-tight">{t.officialSubjects}</h2>
                            <p className="mt-2 text-sm text-gray-400 font-medium">{t.officialSubjectsSub}</p>
                        </div>

                        <a href="https://himit-kfs.edu.eg/department/%D8%B9%D9%84%D9%88%D9%85-%D8%A7%D9%84%D8%AD%D8%A7%D8%B3%D8%A8/Courses" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-200 transition-all hover:bg-cyan-400/20">
                            <ExternalLink size={16} />
                            {t.officialSource}
                        </a>
                    </div>

                    <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="relative w-full md:max-w-md">
                            <Search className={`pointer-events-none absolute ${isRtl ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-gray-500`} size={18} />
                            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t.searchPlaceholder} className={`w-full rounded-[20px] border border-white/10 bg-black/40 ${isRtl ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3.5 text-sm font-medium text-white outline-none transition-all placeholder:text-gray-600 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10`} />
                        </div>
                        <div className="text-sm font-bold text-gray-400 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                            {loadingOfficialSubjects ? t.loadingSubjects : t.subjectCount(filteredOfficialSubjects.length)}
                        </div>
                    </div>

                    {officialSubjectsError ? (
                        <div className="mt-6 rounded-[24px] border border-red-500/20 bg-red-500/10 p-5 text-sm font-medium text-red-200">
                            {officialSubjectsError}
                        </div>
                    ) : loadingOfficialSubjects ? (
                        <div className="mt-8 flex items-center justify-center rounded-[32px] border border-white/10 bg-white/[0.02] py-16 text-gray-400">
                            <Loader2 className={`animate-spin ${isRtl ? 'ml-3' : 'mr-3'}`} size={24} />
                            <span className="font-medium text-lg">{t.loadingOfficial}</span>
                        </div>
                    ) : (
                        <div className="mt-8 space-y-8">
                            {officialGroups.map((group) => {
                                const groupTitle = group[0]?.total_subject_estimates?.name || t.unknownRegulation;
                                return (
                                    <div key={groupTitle} className="space-y-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <h3 className="text-xl font-black text-white">{groupTitle}</h3>
                                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
                                                {t.subjectCount(group.length)}
                                            </span>
                                        </div>

                                        <div className="flex flex-col gap-1.5">
                                            {group.map((subject) => {
                                                const totalHours = Number(subject.hours || 0) + Number(subject.hours2 || 0);
                                                const isAdded = recentlyAddedId === subject.id;

                                                return (
                                                    <div key={subject.id} className="flex flex-row items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-2 transition-all hover:border-cyan-400/30 hover:bg-white/[0.05] group">
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/40 border border-white/10 text-[9px] font-black text-gray-500 group-hover:border-cyan-400/30 group-hover:text-cyan-400 transition-colors">
                                                                {subject.id}
                                                            </div>
                                                            <div className="truncate">
                                                                <h4 className="text-[13px] font-bold text-white truncate">{subject.name}</h4>
                                                                <p className="text-[9px] font-medium text-gray-500 truncate hidden sm:block">
                                                                    {subject.nameEn && subject.nameEn !== '1' ? subject.nameEn : t.officialRecord}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex items-center justify-end gap-4 shrink-0">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 hidden sm:inline">{t.hours}</span>
                                                                <span className="text-[11px] font-black text-cyan-200 bg-cyan-400/10 border border-cyan-400/20 px-2 py-0.5 rounded flex items-center justify-center min-w-[24px]">
                                                                    {totalHours || subject.hours || 0}
                                                                </span>
                                                            </div>
                                                            
                                                            <button 
                                                                onClick={() => handleQuickAdd(subject)}
                                                                disabled={isAdded}
                                                                title={t.addSubjectTooltip}
                                                                className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-all flex items-center gap-1.5 ${isAdded ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300' : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-cyan-500/20 hover:border-cyan-500/30 hover:text-cyan-300 hover:scale-[1.02]'}`}
                                                            >
                                                                {isAdded ? <Check size={12} /> : <Plus size={12} />}
                                                                <span className="hidden md:inline">{isAdded ? t.subjectAdded : t.addSubject}</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}