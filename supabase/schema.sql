
create extension if not exists "uuid-ossp";

create table public.profiles (
    id uuid references auth.users on delete cascade primary key,
    username text unique,
    full_name text,
    avatar_url text,
    role text default 'student',
    xp integer default 0,
    level integer default 1,
    streak integer default 0,
    subject_scores jsonb default '[]'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.subjects (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    slug text unique not null,
    academic_year text,
    semester integer,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.course_modules (
    id uuid default uuid_generate_v4() primary key,
    subject_id uuid references public.subjects(id) on delete cascade not null,
    title text not null,
    order_index integer default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.course_lessons (
    id uuid default uuid_generate_v4() primary key,
    module_id uuid references public.course_modules(id) on delete cascade not null,
    title text not null,
    content_html text,
    duration integer default 0,
    type text default 'text',
    order_index integer default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.materials (
    id uuid default uuid_generate_v4() primary key,
    subject_id uuid references public.subjects(id) on delete cascade not null,
    title text not null,
    url text not null,
    type text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.quizzes (
    id uuid default uuid_generate_v4() primary key,
    subject_id uuid references public.subjects(id) on delete cascade not null,
    title text not null,
    description text,
    is_published boolean default false,
    is_public boolean default false,
    time_limit integer default 0,
    pass_percentage integer default 50,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.quiz_questions (
    id uuid default uuid_generate_v4() primary key,
    quiz_id uuid references public.quizzes(id) on delete cascade not null,
    question_text text not null,
    options jsonb not null default '[]'::jsonb,
    correct_answer integer not null,
    explanation text,
    order_index integer default 0
);

create table public.quiz_attempts (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    quiz_id uuid references public.quizzes(id) on delete cascade not null,
    score integer not null,
    total_questions integer not null,
    completed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.challenges (
    id uuid default uuid_generate_v4() primary key,
    challenger_id uuid references public.profiles(id) on delete cascade not null,
    opponent_id uuid references public.profiles(id) on delete set null,
    quiz_category text,
    quiz_label text,
    status text default 'pending',
    challenger_score integer,
    opponent_score integer,
    winner_id uuid references public.profiles(id) on delete set null,
    is_open_link boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    expires_at timestamp with time zone not null
);

create table public.notifications (
    id uuid default uuid_generate_v4() primary key,
    title text not null,
    message text not null,
    type text default 'info',
    target_audience text default 'all',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.user_notes (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    context_type text not null,
    context_id uuid,
    context_label text,
    content text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.events (
    id uuid default uuid_generate_v4() primary key,
    title text not null,
    date timestamp with time zone not null,
    type text default 'event',
    description text,
    professor text,
    location text,
    lecture_time text,
    related_assignments text,
    is_recurring boolean default false,
    day_of_week text,
    time text,
    academic_year text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.support_tickets (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    subject text not null,
    status text default 'open',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.support_messages (
    id uuid default uuid_generate_v4() primary key,
    ticket_id uuid references public.support_tickets(id) on delete cascade not null,
    sender_id uuid references public.profiles(id) on delete set null,
    content text not null,
    is_admin_reply boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.audit_logs (
    id uuid default uuid_generate_v4() primary key,
    actor_id uuid references public.profiles(id) on delete set null,
    action text not null,
    target_type text,
    target_id uuid,
    payload jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.study_groups (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    description text,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.messages (
    id uuid default uuid_generate_v4() primary key,
    group_id uuid references public.study_groups(id) on delete cascade not null,
    user_id uuid references public.profiles(id) on delete set null,
    content text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;

create policy "Public profiles are viewable by everyone." on public.profiles
    for select using (true);

create policy "Users can update own profile." on public.profiles
    for update using (auth.uid() = id);

create policy "Admin only subjects." on public.subjects
    for all using (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and (role = 'admin' or role = 'super_admin')
        )
    );

create policy "Subjects are viewable by authenticated users." on public.subjects
    for select using (auth.role() = 'authenticated');
