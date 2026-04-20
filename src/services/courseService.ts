import { supabase } from '../lib/supabase';

export interface CourseModule {
    id: string;
    subject_id: string;
    title: string;
    order_index: number;
    lessons?: CourseLesson[];
}

export interface CourseLesson {
    id: string;
    module_id: string;
    title: string;
    content_html: string;
    duration: number;
    type: 'text' | 'video' | 'quiz' | 'reading';
    order_index: number;
}

export const courseService = {

    async getCourseContent(subjectId: string, includeContent: boolean = true) {
        let query = supabase
            .from('course_modules')
            .select(`
                lessons:course_lessons(
                    id, module_id, title, duration, type, order_index${includeContent ? ', content_html' : ''}
                )
            `)
            .eq('subject_id', subjectId)
            .order('order_index', { ascending: true });

        const { data: modules, error } = await query;

        if (error) throw error;

        if (modules) {
            modules.forEach((mod: any) => {
                if (mod.lessons) {
                    mod.lessons.sort((a: any, b: any) => a.order_index - b.order_index);
                }
            });
        }

        return modules as CourseModule[];
    },

    async getLesson(lessonId: string) {
        const { data, error } = await supabase
            .from('course_lessons')
            .select('*')
            .eq('id', lessonId)
            .maybeSingle();

        if (error) throw error;
        return data as CourseLesson;
    },

    async getSubjectResources(subjectId: string) {
        const { data, error } = await supabase
            .from('materials')
            .select('*')
            .eq('subject_id', subjectId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async getSubject(id: string) {
        const { data, error } = await supabase
            .from('subjects')
            .select('*')
            .eq('id', id)
            .maybeSingle();
        if (error) throw error;
        return data;
    },

    async createModule(module: Omit<CourseModule, 'id' | 'lessons'>) {
        const { data, error } = await supabase
            .from('course_modules')
            .insert(module)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateModule(id: string, updates: Partial<CourseModule>) {
        const { data, error } = await supabase
            .from('course_modules')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteModule(id: string) {
        const { error } = await supabase.from('course_modules').delete().eq('id', id);
        if (error) throw error;
    },

    async createLesson(lesson: Omit<CourseLesson, 'id'>) {
        const { data, error } = await supabase
            .from('course_lessons')
            .insert(lesson)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateLesson(id: string, updates: Partial<CourseLesson>) {
        const { data, error } = await supabase
            .from('course_lessons')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteLesson(id: string) {
        const { error } = await supabase.from('course_lessons').delete().eq('id', id);
        if (error) throw error;
    }
};
