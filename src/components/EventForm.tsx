
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, User, MapPin, AlignLeft, BookOpen, ChevronRight, ChevronLeft, CalendarDays, Repeat, Check, X } from 'lucide-react';

interface EventFormProps {
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    lockedType?: 'exam' | 'assignment' | 'event' | 'lecture';
    initialData?: any;
}

export function EventForm({ onClose, onSubmit, lockedType, initialData }: EventFormProps) {
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        title: initialData?.title || '',
        description: initialData?.description || '',
        type: initialData?.type || lockedType || 'exam' as 'exam' | 'assignment' | 'event' | 'lecture' | 'lab',
        professor: initialData?.professor || '',
        location: initialData?.location || '',
        related_assignments: initialData?.related_assignments || '',
        date: initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : '',
        time: initialData?.time || '',
        lecture_time: initialData?.lecture_time || '',
        is_recurring: initialData?.is_recurring || false,
        day_of_week: initialData?.day_of_week || '',
        academic_year: initialData?.academic_year || '' // '1', '2', '3', '4' or empty for all
    });

    const isEditing = !!initialData;

    const handleNext = () => setStep(s => s + 1);
    const handleBack = () => setStep(s => s - 1);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onSubmit(formData);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 50 : -50,
            opacity: 0
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction < 0 ? 50 : -50,
            opacity: 0
        })
    };

    const isStep1Valid = true;
    const isStep2Valid = formData.title && formData.description;
    const isStep3Valid = formData.is_recurring
        ? (formData.day_of_week && formData.time)
        : (formData.date && formData.time);

    return (
        <div className="relative w-full max-w-2xl bg-[#0A0C10] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]" >
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20 backdrop-blur-xl z-20">
                <div>
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
                        {isEditing ? 'Edit Event' : (formData.is_recurring ? (formData.type === 'lab' ? 'Schedule Lab' : 'Schedule Lecture') : 'New Event')}
                    </h2>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-widest mt-1">
                        Step {step} of 3
                    </p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                    <X size={20} />
                </button>
            </div>

            <div className="h-1 bg-white/5 w-full">
                <motion.div
                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                    initial={{ width: "33%" }}
                    animate={{ width: `${(step / 3) * 100}%` }}
                    transition={{ duration: 0.3 }}
                />
            </div>

            <div className="flex-1 overflow-y-auto p-8 relative">
                <AnimatePresence mode="wait" custom={step}>

                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="h-full flex flex-col gap-6"
                        >
                            <h3 className="text-xl font-bold text-white text-center mb-4">
                                {isEditing ? 'Edit Item Type' : (lockedType ? `Create New ${lockedType.charAt(0).toUpperCase() + lockedType.slice(1)}` : 'What kind of item is this?')}
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setFormData({ ...formData, is_recurring: false, type: lockedType || 'exam' })}
                                    className={`relative p-6 rounded-2xl border-2 text-left transition-all duration-300 group
                                        ${!formData.is_recurring
                                            ? 'border-purple-500 bg-purple-500/10'
                                            : 'border-white/5 bg-white/5 hover:border-white/20'}`}
                                >
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-purple-900/40">
                                        <Calendar className="text-white" size={24} />
                                    </div>
                                    <h4 className="text-lg font-bold text-white mb-2">One-time {lockedType ? lockedType : 'Event'}</h4>
                                    <p className="text-sm text-gray-400">
                                        {lockedType === 'assignment'
                                            ? 'Create a new assignment with a due date.'
                                            : 'Exams, assignments, or special sessions that happen once on a specific date.'}
                                    </p>

                                    {!formData.is_recurring && (
                                        <div className="absolute top-4 right-4 bg-purple-500 rounded-full p-1">
                                            <Check size={12} className="text-white" />
                                        </div>
                                    )}
                                </button>

                                {!lockedType && (
                                    <>
                                        <button
                                            onClick={() => setFormData({ ...formData, is_recurring: true, type: 'lecture' })}
                                            className={`relative p-6 rounded-2xl border-2 text-left transition-all duration-300 group
                                            ${formData.is_recurring && formData.type === 'lecture'
                                                    ? 'border-blue-500 bg-blue-500/10'
                                                    : 'border-white/5 bg-white/5 hover:border-white/20'}`}
                                        >
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center mb-4 shadow-lg shadow-blue-900/40">
                                                <Repeat className="text-white" size={24} />
                                            </div>
                                            <h4 className="text-lg font-bold text-white mb-2">Weekly Lecture</h4>
                                            <p className="text-sm text-gray-400">Recurring classes that repeat on the same day every week.</p>

                                            {formData.is_recurring && formData.type === 'lecture' && (
                                                <div className="absolute top-4 right-4 bg-blue-500 rounded-full p-1">
                                                    <Check size={12} className="text-white" />
                                                </div>
                                            )}
                                        </button>

                                        <button
                                            onClick={() => setFormData({ ...formData, is_recurring: true, type: 'lab' })}
                                            className={`relative p-6 rounded-2xl border-2 text-left transition-all duration-300 group
                                            ${formData.is_recurring && formData.type === 'lab'
                                                    ? 'border-green-500 bg-green-500/10'
                                                    : 'border-white/5 bg-white/5 hover:border-white/20'}`}
                                        >
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-400 flex items-center justify-center mb-4 shadow-lg shadow-green-900/40">
                                                <Repeat className="text-white" size={24} />
                                            </div>
                                            <h4 className="text-lg font-bold text-white mb-2">Weekly Lab</h4>
                                            <p className="text-sm text-gray-400">Recurring labs/sections that repeat weekly.</p>

                                            {formData.is_recurring && formData.type === 'lab' && (
                                                <div className="absolute top-4 right-4 bg-green-500 rounded-full p-1">
                                                    <Check size={12} className="text-white" />
                                                </div>
                                            )}
                                        </button>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Title</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:bg-white/10 focus:border-purple-500 outline-none transition-all"
                                        placeholder="e.g. Mobile Apps Finals"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                        <BookOpen size={14} /> Academic Year
                                    </label>
                                    <select
                                        value={formData.academic_year}
                                        onChange={e => setFormData({ ...formData, academic_year: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:bg-white/10 focus:border-purple-500 outline-none transition-all [&>option]:bg-black"
                                    >
                                        <option value="">All Years</option>
                                        <option value="1">Year 1</option>
                                        <option value="2">Year 2</option>
                                        <option value="3">Year 3</option>
                                        <option value="4">Year 4</option>
                                    </select>
                                    <p className="text-xs text-gray-500">Leave as "All Years" for general events.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                            <User size={14} /> Professor
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.professor}
                                            onChange={e => setFormData({ ...formData, professor: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:bg-white/10 focus:border-purple-500 outline-none transition-all"
                                            placeholder="Dr. Name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                            <MapPin size={14} /> Location
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.location}
                                            onChange={e => setFormData({ ...formData, location: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:bg-white/10 focus:border-purple-500 outline-none transition-all"
                                            placeholder="Room / Hall / Zoom"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                        <AlignLeft size={14} /> Description
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:bg-white/10 focus:border-purple-500 outline-none transition-all resize-none h-24"
                                        placeholder="Add any extra details..."
                                    />
                                </div>

                                {!formData.is_recurring && !lockedType && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Type</label>
                                        <div className="flex gap-2">
                                            {['exam', 'assignment', 'event'].map(t => (
                                                <button
                                                    key={t}
                                                    onClick={() => setFormData({ ...formData, type: t as any })}
                                                    className={`px-4 py-2 rounded-lg text-sm font-bold uppercase transition-all ${formData.type === t
                                                        ? 'bg-white text-black'
                                                        : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                                                >
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="space-y-4">

                                {formData.is_recurring ? (
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                            <Repeat size={14} /> Day of Week
                                        </label>
                                        <select
                                            value={formData.day_of_week}
                                            onChange={e => setFormData({ ...formData, day_of_week: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:bg-white/10 focus:border-purple-500 outline-none transition-all [&>option]:bg-black"
                                        >
                                            <option value="">Select Day</option>
                                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                                                <option key={day} value={day}>{day}</option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                            <CalendarDays size={14} /> Date
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.date}
                                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:bg-white/10 focus:border-purple-500 outline-none transition-all [color-scheme:dark]"
                                        />
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                            <Clock size={14} /> Time
                                        </label>
                                        <input
                                            type="time"
                                            value={formData.time}
                                            onChange={e => setFormData({ ...formData, time: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:bg-white/10 focus:border-purple-500 outline-none transition-all [color-scheme:dark]"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                            <BookOpen size={14} /> Duration / Info
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.lecture_time}
                                            onChange={e => setFormData({ ...formData, lecture_time: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:bg-white/10 focus:border-purple-500 outline-none transition-all"
                                            placeholder="e.g. 10:00 - 12:00"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                        <BookOpen size={14} /> Related Assignments
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.related_assignments}
                                        onChange={e => setFormData({ ...formData, related_assignments: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:bg-white/10 focus:border-purple-500 outline-none transition-all"
                                        placeholder="Optionally link assignments..."
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>

            <div className="p-6 border-t border-white/10 flex justify-between items-center bg-black/20 backdrop-blur-xl">
                {step > 1 ? (
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors font-bold text-sm"
                    >
                        <ChevronLeft size={16} /> Back
                    </button>
                ) : (
                    <div></div>
                )}

                {step < 3 ? (
                    <button
                        onClick={handleNext}
                        disabled={step === 2 && !isStep2Valid}
                        className="flex items-center gap-2 px-8 py-3 rounded-xl bg-white text-black hover:bg-gray-100 transition-colors font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next <ChevronRight size={16} />
                    </button>
                ) : (
                    <button
                        onClick={handleSubmit}
                        disabled={!isStep3Valid || isSubmitting}
                        className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-400 hover:to-blue-400 text-white shadow-lg shadow-purple-500/25 transition-all font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Item')} <Check size={16} />
                    </button>
                )}
            </div>
        </div >
    );
}
