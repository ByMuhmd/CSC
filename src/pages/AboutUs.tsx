import React, { useState, useEffect } from 'react';
import { ArrowLeft, Globe, Code, Heart, Sparkles, BookOpen, Users, Rocket, Target, Shield, Zap, TrendingUp, Presentation, CheckCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const translations = {
    en: {
        title: "ABOUT",
        brand: "CSC",
        subtitle: "A vision built. Driven by purpose.",
        storyTitle: "Our Journey",
        paragraphs: [
            "Believing that the charity of knowledge is its sharing, CSC was born two years ago as a simple Telegram bot. Its primary goal was clear: to facilitate access to knowledge and help overcome daily study obstacles. What started as a small idea to serve a limited number of people soon evolved thanks to your feedback, suggestions, and needs.",
            "As time passed, we realized the idea could be bigger than just a bot. So we expanded to Google Drive to better organize content and provide multiple resources in one place. Then we launched our YouTube channel to offer explanations and educational materials in one place, making everything available in the easiest way possible for anyone who needs it.",
            "Today, we reach a new milestone with the launch of this platform, which comes to gather all the above in one place. Our goal is to make access to information easier, simpler, and faster, to save long hours of searching and distraction across various sources that we ourselves experienced, and to reduce repetitive questions by organizing knowledge and presenting it clearly and directly.",
            "But more important than platforms and tools is the idea itself. CSC was never a one-person project; rather, it's a collective effort expanding day by day. Our team continually grows to include students from different cohorts and people who share the same belief that knowledge becomes stronger and more impactful when shared.",
            "From the very first moment, CSC sought to utilize every available means and integrate as much technology as possible to create an educational environment that helps us today and remains beneficial to those who come after us. Every step in this project has been an attempt to make the path clearer and easier for those walking it.",
            "In the end, CSC remains, above all else, the charity of knowledge; charity on behalf of everyone who contributed an idea, effort, information, or even simple support. It is a reflection of our belief that the best thing we can leave behind is beneficial knowledge, and that sharing knowledge is not just temporary help, but an impact that lasts and is inherited by others after us."
        ],
        valuesTitle: "Core Values",
        values: [
            { id: 'v1', icon: Users, title: "Community First", desc: "Built by students, for students." },
            { id: 'v2', icon: Shield, title: "Accessibility", desc: "Quality resources for everyone." },
            { id: 'v3', icon: Zap, title: "Innovation", desc: "Adapting technology for learning." },
            { id: 'v4', icon: Target, title: "Clarity", desc: "Reducing confusion, saving time." }
        ],
        statsTitle: "Impact",
        stats: [
            { id: 'students', icon: Users, value: 500, suffix: '+', label: "Active Students" },
            { id: 'materials', icon: Presentation, value: 120, suffix: '+', label: "Study Materials" },
            { id: 'quizzes', icon: CheckCircle, value: 50, suffix: '+', label: "Quizzes" },
            { id: 'subjects', icon: BookOpen, value: 20, suffix: '+', label: "Subjects" }
        ],
        missionTitle: "The Mission",
        missionText: "To build a collaborative community where learning is seamless, engaging, and rewarding for every student in our cohort and beyond.",
        ctaTitle: "Join the Movement",
        ctaText: "Whether you want to contribute study materials, suggest a feature, or simply learn alongside us, there's a place for you here.",
        btnTeam: "Our Telegram Bot",
        closing: "BEST REGARDS,",
        team: "CSC TEAM",
        footerText: "CS Cohort '23 © All rights reserved",
        back: "Back",
        lang: "عربي"
    },
    ar: {
        title: "من نحن",
        brand: "CSC",
        subtitle: "رؤية صُنعت. مجتمع تحركه غاية واضحة.",
        storyTitle: "رحلتنا",
        paragraphs: [
            "من منطلق أن زكاة العلم نشره، وُلدت CSC قبل عامين كبوت بسيط على تيليجرام، هدفه الأول كان واضحًا: تسهيل الوصول إلى المعرفة والمساعدة على تجاوز العقبات اليومية في الدراسة. ما بدأ كفكرة صغيرة لخدمة عدد محدود من الأشخاص، سرعان ما تطوّر بفضل أرائكم واقتراحاتكم وحاجاتكم.",
            "ومع مرور الوقت أدركنا أن الفكرة يمكن أن تكون أكبر من مجرد بوت. لذلك توسعنا إلى Google Drive لننظم المحتوى بشكل أفضل ونوفر مصادر متعددة في مكان واحد. ثم أطلقنا قناتنا على YouTube لنقدم الشروحات والمواد التعليمية في مكان واحد، حتى يكون كل شئ متاح بأسهل صورة ممكنة لكل من يحتاجه.",
            "واليوم نصل إلى مرحلة جديدة مع إطلاق هذه المنصة، التي جاءت لتجمع كل ما سبق في مكان واحد. هدفنا أن نجعل الوصول للمعلومة أسهل، أبسط، وأسرع، وأن نختصر ساعات طويلة من البحث والتشتت بين المصادر المختلفة كنا قد مررنا بها نحن، وأن نقلل من تكرار الأسئلة من خلال تنظيم المعرفة وتقديمها بشكل واضح ومباشر.",
            "لكن الأهم من المنصات والأدوات هو الفكرة نفسها. فـ CSC لم تكن يومًا مشروع شخص واحد، بل هي جهد جماعي يتوسع يومًا بعد يوم. فريقنا ينمو باستمرار ليشمل طلابًا من دفعات مختلفة وأشخاصًا يشاركون نفس الإيمان بأن المعرفة حين تُشارك تصبح أقوى وأكثر تأثيرًا.",
            "منذ اللحظة الأولى، سعت CSC إلى الاستفادة من كل وسيلة متاحة، ودمج أكبر قدر ممكن من التكنولوجيا، لنصنع بيئة تعليمية تساعدنا اليوم وتبقى مفيدة لمن سيأتي بعدنا. كل خطوة في هذا المشروع كانت محاولة لجعل الطريق أوضح وأسهل لمن يسير فيه.",
            "وفي النهاية، تبقى CSC قبل أي شيء آخر زكاة علم؛ زكاة عن كل شخص شارك بفكرة، أو بمجهود، أو بمعلومة، أو حتى بدعم بسيط. هي انعكاس لإيماننا بأن أفضل ما يمكن أن نتركه بعدنا هو علم ينتفع به، وأن مشاركة المعرفة ليست مجرد مساعدة مؤقتة، بل أثر يستمر ويتوارثه الآخرون من بعدنا."
        ],
        valuesTitle: "قيمنا",
        values: [
            { id: 'v1', icon: Users, title: "المجتمع", desc: "صنع للطلاب ومن أجلهم." },
            { id: 'v2', icon: Shield, title: "الوصول", desc: "مصادر متاحة للجميع." },
            { id: 'v3', icon: Zap, title: "الابتكار", desc: "تكنولوجيا تحسّن التعلم." },
            { id: 'v4', icon: Target, title: "الوضوح", desc: "تنظيم يقلل التشتت." }
        ],
        statsTitle: "الأثر",
        stats: [
            { id: 'students', icon: Users, value: 500, suffix: '+', label: "طالب نشط" },
            { id: 'materials', icon: Presentation, value: 120, suffix: '+', label: "مورد تعليمي" },
            { id: 'quizzes', icon: CheckCircle, value: 50, suffix: '+', label: "اختبار" },
            { id: 'subjects', icon: BookOpen, value: 20, suffix: '+', label: "مادة دراسية" }
        ],
        missionTitle: "مهمتنا",
        missionText: "بناء تجربة تعليمية سلسة لكل طالب في دفعتنا وما بعدها.",
        ctaTitle: "كُن جزءاً من الأثر",
        ctaText: "سواء كنت ترغب في المساهمة بمواد دراسية، اقتراح ميزة، أو التعلم معنا، هناك مكان لك هنا.",
        btnTeam: "بوت تيليجرام الخاص بنا",
        closing: "BEST REGARDS,",
        team: "CSC TEAM",
        footerText: "دفعة علوم الحاسب '23 © جميع الحقوق محفوظة",
        back: "عودة",
        lang: "English"
    }
};

export default function AboutUs() {
    const navigate = useNavigate();
    const [lang, setLang] = useState<'en' | 'ar'>('ar');
    const [animatedStats, setAnimatedStats] = useState<{ [key: string]: number }>({});
    const t = translations[lang];

    const isAr = lang === 'ar';

    useEffect(() => {
        const interval = setInterval(() => {
            setAnimatedStats(prev => {
                const next = { ...prev };
                let allDone = true;

                t.stats.forEach(stat => {
                    const current = prev[stat.id] || 0;
                    if (current < stat.value) {
                        allDone = false;
                        const step = Math.ceil(stat.value / 30);
                        next[stat.id] = Math.min(current + step, stat.value);
                    }
                });

                if (allDone) clearInterval(interval);
                return next;
            });
        }, 30);
        return () => clearInterval(interval);
    }, [lang]);

    const toggleLang = () => {
        setLang(lang === 'en' ? 'ar' : 'en');
        setAnimatedStats({});
    };

    return (
        <div className={`min-h-screen bg-[#000000] text-white overflow-x-hidden selection:bg-white/20 ${isAr ? 'dir-rtl text-right font-cairo' : 'dir-ltr text-left font-sans'}`} dir={isAr ? 'rtl' : 'ltr'}>

            <div className="fixed inset-0 z-0 pointer-events-none flex items-center justify-center overflow-hidden">
                <div className="absolute top-[-10%] w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] bg-white/[0.03] rounded-full blur-[100px]" />
                <div className="absolute top-[30%] opacity-20 w-full h-[50vh] bg-gradient-to-b from-transparent via-purple-500/10 to-transparent blur-[100px]" />
            </div>

            <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.02] bg-white/5 mix-blend-screen" />

            <div className="max-w-7xl mx-auto relative z-10 px-4 sm:px-6 lg:px-8 py-8 md:py-16">

                <header className="flex items-center justify-between mb-12 md:mb-20 animate-in fade-in slide-in-from-top-4 duration-1000">
                    <button
                        onClick={() => navigate(-1)}
                        className="group flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all backdrop-blur-md"
                    >
                        <ArrowLeft size={20} className={`text-white/70 group-hover:text-white transition-colors mb-1 ${isAr ? 'rotate-180' : ''}`} />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/50 group-hover:text-white transition-colors">
                            {t.back}
                        </span>
                    </button>

                    <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md">
                        <Code size={16} className="text-white/60" />
                        <span className="font-bold tracking-widest text-sm text-white/80">CSC</span>
                    </div>

                    <button
                        onClick={toggleLang}
                        className="group flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all backdrop-blur-md"
                    >
                        <Globe size={20} className="text-white/70 group-hover:text-white transition-colors mb-1" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/50 group-hover:text-white transition-colors">
                            {t.lang}
                        </span>
                    </button>
                </header>

                <div className="space-y-6">

                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100 mb-10 w-full flex flex-col items-center justify-center min-h-[40vh] relative">
                        <h1 className="text-[12vw] sm:text-[10vw] md:text-[8vw] lg:text-[7vw] font-black leading-[0.85] tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/20 mix-blend-screen text-center z-10 drop-shadow-2xl">
                            {t.brand}
                            <br />
                            <span className="text-[10vw] sm:text-[8vw] md:text-[6vw] lg:text-[5vw] from-white/60 to-white/10">{t.title}</span>
                        </h1>
                        <p className="mt-8 text-lg sm:text-xl md:text-2xl text-white/60 font-medium max-w-2xl mx-auto text-center px-4 tracking-wide">
                            {t.subtitle}
                        </p>

                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-purple-500/20 blur-[120px] rounded-full z-0" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6 auto-rows-auto">

                        <div className="col-span-1 md:col-span-4 lg:col-span-4 bg-white/[0.03] border border-white/[0.05] rounded-[32px] p-6 sm:p-8 md:p-12 hover:bg-white/[0.05] transition-colors group animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-2.5 bg-white/10 rounded-xl">
                                    <BookOpen size={20} className="text-white" />
                                </div>
                                <h2 className="text-xl sm:text-2xl font-bold tracking-wide">{t.storyTitle}</h2>
                            </div>
                            <div className="space-y-6">
                                {t.paragraphs.map((para, i) => (
                                    <p key={i} className="text-base sm:text-lg md:text-xl text-white/60 leading-relaxed font-medium group-hover:text-white/80 transition-colors duration-500">
                                        {para}
                                    </p>
                                ))}
                            </div>
                        </div>

                        <div className="col-span-1 md:col-span-4 lg:col-span-2 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-white/[0.05] rounded-[32px] p-6 sm:p-8 flex flex-col justify-center items-center text-center relative overflow-hidden group animate-in fade-in slide-in-from-right-8 duration-1000 delay-300">
                            <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/20 blur-[60px] rounded-full group-hover:bg-purple-500/30 transition-colors" />
                            <Rocket size={40} className="text-white/80 mb-6 group-hover:-translate-y-2 transition-transform duration-500" />
                            <h2 className="text-xl sm:text-2xl font-bold mb-4">{t.missionTitle}</h2>
                            <p className="text-white/70 text-lg leading-relaxed font-medium">"{t.missionText}"</p>
                        </div>

                        <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-white/[0.03] border border-white/[0.05] rounded-[32px] p-6 sm:p-8 animate-in fade-in slide-in-from-left-8 duration-1000 delay-400">
                            <h2 className="text-xl sm:text-2xl font-bold tracking-wide mb-8 flex items-center gap-3">
                                <Sparkles size={20} className="text-white" />
                                {t.statsTitle}
                            </h2>
                            <div className="grid grid-cols-2 gap-4 sm:gap-6 h-full">
                                {t.stats.map((stat, i) => (
                                    <div key={i} className="flex flex-col">
                                        <div className="flex items-center gap-2 mb-2">
                                            <stat.icon size={16} className="text-white/40" />
                                            <span className="text-xs font-bold uppercase tracking-wider text-white/50">{stat.label}</span>
                                        </div>
                                        <div className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter">
                                            {animatedStats[stat.id] || 0}
                                            <span className="text-purple-400">{stat.suffix}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="col-span-1 md:col-span-2 lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 animate-in fade-in slide-in-from-right-8 duration-1000 delay-500">
                            {t.values.map((val, i) => (
                                <div key={val.id} className="bg-white/[0.03] border border-white/[0.05] rounded-[24px] p-6 hover:bg-white/[0.08] transition-all group duration-300">
                                    <val.icon size={24} className="text-white/60 mb-4 group-hover:text-white transition-colors" />
                                    <h3 className="text-lg font-bold mb-2 group-hover:text-white">{val.title}</h3>
                                    <p className="text-sm text-white/50 font-medium leading-relaxed group-hover:text-white/70 transition-colors">{val.desc}</p>
                                </div>
                            ))}
                        </div>

                        <div className="col-span-1 md:col-span-4 lg:col-span-6 mt-4">
                            <div className="bg-white/[0.05] border border-white/10 rounded-[32px] p-8 sm:p-12 md:p-16 flex flex-col md:flex-row items-center justify-between gap-10 hover:bg-white/[0.07] transition-all relative overflow-hidden group animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-700">

                                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-500/10 blur-[100px] rounded-full group-hover:bg-blue-500/20 transition-colors pointer-events-none" />

                                <div className="max-w-2xl relative z-10 text-center md:text-start">
                                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-6 tracking-tight">{t.ctaTitle}</h2>
                                    <p className="text-lg sm:text-xl text-white/60 font-medium leading-relaxed mb-8">
                                        {t.ctaText}
                                    </p>
                                    <button 
                                        onClick={() => window.open('https://t.me/HIMITCSBOT', '_blank')} 
                                        className="inline-flex items-center gap-3 px-8 py-4 bg-white text-black rounded-full font-bold text-lg hover:scale-105 active:scale-95 transition-all w-full sm:w-auto justify-center"
                                    >
                                        <span>{t.btnTeam}</span>
                                        <ArrowRight size={20} className={isAr ? 'rotate-180' : ''}/>
                                    </button>
                                </div>

                                <div className="relative z-10 flex flex-col items-center md:items-end text-center md:text-end border-t md:border-t-0 md:border-l border-white/10 pt-10 md:pt-0 md:pl-10 min-w-[200px]" dir="ltr">
                                    <span className="text-xs font-bold tracking-widest text-white/40 mb-3">{t.closing}</span>
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl font-black tracking-widest text-white/90">
                                            {t.team}
                                        </span>
                                        <Heart size={20} className="text-white fill-white mt-1 animate-pulse" />
                                    </div>
                                    <span className="text-[10px] font-bold tracking-widest text-white/30 uppercase mt-8 block">
                                        {t.footerText}
                                    </span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
