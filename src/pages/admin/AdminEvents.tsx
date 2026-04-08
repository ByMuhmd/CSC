
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, Clock, AlertCircle, Repeat, Edit2 } from 'lucide-react';
import { eventService, CalendarEvent } from '../../services/eventService';

import { EventForm } from '../../components/EventForm';

export default function AdminEvents() {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
    const [activeTab, setActiveTab] = useState<'events' | 'weekly'>('events');
    const [error, setError] = useState('');

    useEffect(() => {
        loadEvents();
    }, []);

    const loadEvents = async () => {
        try {
            const data = await eventService.getAllEvents();
            setEvents(data);
        } catch (err) {
            console.error(err);
            setError('Failed to load events');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this event?')) return;
        try {
            await eventService.deleteEvent(id);
            setEvents(prev => prev.filter(e => e.id !== id));
        } catch (err) {
            console.error(err);
            alert('Failed to delete event');
        }
    };

    const handleSaveEvent = async (formData: any) => {
        setError('');
        try {
            let dateISO = '';
            if (!formData.is_recurring) {
                const dateObj = new Date(`${formData.date}T${formData.time}`);
                dateISO = dateObj.toISOString();
            } else {
                dateISO = new Date().toISOString();
            }

            const eventData = {
                title: formData.title,
                date: dateISO,
                time: formData.time,
                type: formData.is_recurring ? (formData.type === 'lab' ? 'lab' : 'lecture') : formData.type,
                description: formData.description,
                professor: formData.professor,
                location: formData.location,
                lecture_time: formData.lecture_time,
                related_assignments: formData.related_assignments,
                is_recurring: formData.is_recurring,
                day_of_week: formData.is_recurring ? formData.day_of_week : undefined,
                academic_year: formData.academic_year || null
            };

            if (editingEvent) {
                await eventService.updateEvent(editingEvent.id, eventData);
            } else {
                await eventService.createEvent(eventData);
            }

            await loadEvents();
            setIsCreating(false);
            setEditingEvent(null);
            setActiveTab(formData.is_recurring ? 'weekly' : 'events');
        } catch (err: any) {
            console.error(err);
            const message = err.message || err.error_description || 'Failed to save event';
            setError(message);
        }
    };

    return (
        <div className="space-y-8 relative font-sans">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="flex justify-between items-end relative z-10">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-purple-400 mb-2">
                        Events & Schedule
                    </h1>
                    <div className="flex gap-4 mt-6">
                        <button
                            onClick={() => setActiveTab('events')}
                            className={`pb-2 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'events' ? 'text-white border-purple-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
                        >
                            One-time Events
                        </button>
                        <button
                            onClick={() => setActiveTab('weekly')}
                            className={`pb-2 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'weekly' ? 'text-white border-purple-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
                        >
                            Weekly Schedule
                        </button>
                    </div>
                </div>
                <button
                    onClick={() => { setEditingEvent(null); setIsCreating(true); }}
                    className="group relative px-6 py-3 bg-white text-black rounded-xl font-bold text-sm uppercase tracking-wider hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all duration-300 flex items-center gap-3 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-200/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    <Plus className="w-4 h-4" strokeWidth={3} />
                    <span>Create New Item</span>
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={20} />
                    <span className="font-medium">{error}</span>
                </div>
            )}

            {(isCreating || editingEvent) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
                    <EventForm
                        onClose={() => { setIsCreating(false); setEditingEvent(null); }}
                        onSubmit={handleSaveEvent}
                        initialData={editingEvent}
                    />
                </div>
            )}

            <div className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/5">
                                <th className="text-left p-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Event Details</th>
                                <th className="text-left p-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Year</th>
                                <th className="text-left p-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Class Info</th>
                                <th className="text-left p-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Schedule</th>
                                <th className="text-left p-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Category</th>
                                <th className="text-right p-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Manage</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {events
                                .filter(e => activeTab === 'events' ? !e.is_recurring : e.is_recurring)
                                .map((event, idx) => (
                                    <tr key={event.id} className="group hover:bg-white/[0.02] transition-colors duration-300">
                                        <td className="p-6">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold
                                                ${event.type === 'exam' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                                        event.type === 'assignment' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                                            'bg-green-500/10 text-green-400 border border-green-500/20'}
                                            `}>
                                                    {event.title.charAt(0)}
                                                </div>
                                                <div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${event.academic_year
                                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                                : 'bg-white/5 text-gray-400 border border-white/10'}`}>
                                                {event.academic_year ? `Year ${event.academic_year}` : 'All'}
                                            </span>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex flex-col gap-1">
                                                <div className="text-sm text-white font-bold">{event.professor}</div>
                                                <div className="text-xs text-gray-500">{event.location}</div>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2 text-gray-300 font-medium">
                                                    {event.is_recurring ? (
                                                        <>
                                                            <Repeat size={14} className="text-purple-400" />
                                                            <span>Every {event.day_of_week}</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Calendar size={14} className="text-purple-400" />
                                                            {new Date(event.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                                        </>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-gray-500 font-bold uppercase tracking-wider">
                                                    <Clock size={12} />
                                                    {event.time || new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                {event.lecture_time && (
                                                    <div className="text-xs text-purple-400 font-medium mt-1">
                                                        Lect: {event.lecture_time}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border
                                            ${event.type === 'exam' ? 'bg-red-500/5 text-red-400 border-red-500/20' :
                                                    event.type === 'assignment' ? 'bg-blue-500/5 text-blue-400 border-blue-500/20' :
                                                        event.type === 'lab' ? 'bg-teal-500/5 text-teal-400 border-teal-500/20' :
                                                            'bg-green-500/5 text-green-400 border-green-500/20'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${event.type === 'exam' ? 'bg-red-500' :
                                                    event.type === 'assignment' ? 'bg-blue-500' :
                                                        event.type === 'lab' ? 'bg-teal-500' : 'bg-green-500'
                                                    } animate-pulse`} />
                                                {event.type}
                                            </span>
                                        </td>
                                        <td className="p-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setEditingEvent(event)}
                                                    className="p-2.5 rounded-xl text-gray-500 hover:text-white hover:bg-white/10 transition-all duration-300 border border-transparent hover:border-white/10 group/btn"
                                                    title="Edit Event"
                                                >
                                                    <Edit2 size={16} className="group-hover/btn:scale-110 transition-transform" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(event.id)}
                                                    className="p-2.5 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300 border border-transparent hover:border-red-500/20 group/btn"
                                                    title="Delete Event"
                                                >
                                                    <Trash2 size={16} className="group-hover/btn:scale-110 transition-transform" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            {events.length === 0 && !isLoading && (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center gap-4">
                                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                                                <Calendar className="w-8 h-8 text-gray-600" />
                                            </div>
                                            <p className="font-medium">No upcoming events scheduled</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div >
    );
}
