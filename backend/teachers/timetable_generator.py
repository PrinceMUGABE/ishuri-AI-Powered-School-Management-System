# # teachers/timetable_generator.py
# """
# Timetable generation engine.

# Algorithm overview
# ------------------
# For each active TeacherAssignment in the given term:

# 1. Determine the required hours per week from ClassLevelSubject.
# 2. For each assigned classroom, build a weekly schedule:
#    - If teaching_frequency == 'daily': the subject must appear every school day.
#      Each day, the subject gets (hours_per_week / 5) hours worth of slots,
#      split into ≤2-hour continuous blocks.  Remaining hours after 2h are
#      re-inserted later that day after other subjects fill the gap.
#    - If teaching_frequency == 'weekly': the subject appears on one day per week
#      for exactly hours_per_week hours (split into ≤2-hour blocks with gaps).
# 3. Slots are allocated only within the school level's operating hours,
#    skipping break periods.
# 4. A teacher cannot be double-booked (two classrooms at the same time).
# 5. A classroom cannot be double-booked.
# 6. The teacher's total weekly hours cannot exceed work_hours_per_week.
# 7. Days that are holidays or marked as day_off are skipped.

# The generator returns (entries_to_create, conflicts) without touching the DB,
# so the view can wrap it in a transaction.
# """

# from datetime import date, datetime, timedelta
# from collections import defaultdict
# from typing import List, Dict, Tuple, Any

# from academics.models import (
#     AcademicYear, Term, SchoolBreak, SchoolDaySetting, Holiday, ClassLevelSubject
# )
# from teachers.models import Teacher, TeacherAssignment, TeacherTimetable


# # ---------------------------------------------------------------------------
# # Constants
# # ---------------------------------------------------------------------------
# MAX_SESSION_MINUTES = 120   # 2 hours — maximum uninterrupted teaching block
# MIN_SLOT_MINUTES = 30       # smallest schedulable unit
# TEACHER_MIN_HOURS_DAY = 8   # teacher must teach AT LEAST this many hours/day
# TEACHER_MAX_HOURS_DAY = 9   # teacher must NOT exceed this many hours/day

# WORKING_DAYS = {0, 1, 2, 3, 4}   # Mon-Fri (Python weekday)


# # ---------------------------------------------------------------------------
# # Helpers
# # ---------------------------------------------------------------------------

# def _dt(t):
#     """Combine a time with today's date for arithmetic."""
#     return datetime.combine(date.today(), t)


# def _minutes_between(t_start, t_end):
#     return int((_dt(t_end) - _dt(t_start)).total_seconds() / 60)


# def _time_add(t, minutes):
#     return (_dt(t) + timedelta(minutes=minutes)).time()


# def _is_holiday(check_date: date, academic_year, school_level) -> bool:
#     """Return True if check_date is a holiday for this school level (or all levels)."""
#     return Holiday.objects.filter(
#         academic_year=academic_year,
#         date=check_date
#     ).filter(
#         # global holiday OR specific to this school level
#         models_Q(school_level__isnull=True) | models_Q(school_level=school_level)
#     ).exists()


# # We can't import Django Q objects at module level cleanly without circular issues,
# # so we do it inside the function below.
# def _is_day_off(weekday: int, check_date: date, academic_year) -> bool:
#     """
#     Return True if weekday is marked as day_off in SchoolDaySetting
#     OR if the specific date is marked as day_off.
#     """
#     return SchoolDaySetting.objects.filter(
#         academic_year=academic_year,
#         day_type='day_off',
#         is_active=True
#     ).filter(
#         # either a recurring weekday-off or a specific date
#         **{'weekday': weekday}
#     ).exists() or SchoolDaySetting.objects.filter(
#         academic_year=academic_year,
#         day_type='day_off',
#         is_active=True,
#         specific_date=check_date
#     ).exists()


# def _is_valid_school_day(weekday: int, check_date: date, academic_year, school_level) -> bool:
#     """A day is valid if it's a working day, not a holiday, and not a day_off."""
#     if weekday not in WORKING_DAYS:
#         return False

#     # Holiday check
#     from django.db.models import Q
#     holiday_exists = Holiday.objects.filter(
#         academic_year=academic_year,
#         date=check_date
#     ).filter(
#         Q(school_level__isnull=True) | Q(school_level=school_level)
#     ).exists()
#     if holiday_exists:
#         return False

#     # Day-off check (recurring weekday or specific date)
#     day_off = SchoolDaySetting.objects.filter(
#         academic_year=academic_year,
#         day_type='day_off',
#         is_active=True
#     ).filter(
#         Q(weekday=weekday) | Q(specific_date=check_date)
#     ).exists()
#     return not day_off


# def _get_free_slots(school_level, start_time, end_time, existing_entries):
#     """
#     Return a list of (slot_start, slot_end) tuples representing free time
#     in [start_time, end_time] after removing breaks and already-scheduled entries.
#     Each slot is a contiguous free block (may be longer than MAX_SESSION_MINUTES).
#     """
#     breaks = list(
#         SchoolBreak.objects.filter(school_level=school_level, is_active=True)
#         .order_by('start_time')
#         .values_list('start_time', 'end_time')
#     )
#     # Combine breaks with existing scheduled blocks
#     blocked = [(s, e) for s, e in breaks]
#     for entry in existing_entries:
#         blocked.append((entry['start_time'], entry['end_time']))

#     # Sort and merge overlapping blocked intervals
#     blocked.sort(key=lambda x: x[0])
#     merged = []
#     for s, e in blocked:
#         if merged and s <= merged[-1][1]:
#             merged[-1] = (merged[-1][0], max(merged[-1][1], e))
#         else:
#             merged.append([s, e])

#     # Find free gaps between school_level start and end
#     free = []
#     cursor = start_time
#     for b_start, b_end in merged:
#         if cursor < b_start:
#             free.append((cursor, b_start))
#         if b_end > cursor:
#             cursor = b_end
#     if cursor < end_time:
#         free.append((cursor, end_time))

#     # Filter out gaps smaller than MIN_SLOT_MINUTES
#     return [
#         (s, e) for s, e in free
#         if _minutes_between(s, e) >= MIN_SLOT_MINUTES
#     ]


# def _chop_session(slot_start, slot_end, remaining_minutes):
#     """
#     From a free slot, return the actual session duration (in minutes) to schedule.
#     Rules:
#     - Cannot exceed MAX_SESSION_MINUTES.
#     - Cannot exceed the free slot length.
#     - Cannot exceed remaining_minutes needed.
#     """
#     available = _minutes_between(slot_start, slot_end)
#     session = min(available, MAX_SESSION_MINUTES, remaining_minutes)
#     # Round down to nearest 30-minute unit
#     session = (session // MIN_SLOT_MINUTES) * MIN_SLOT_MINUTES
#     return session


# # ---------------------------------------------------------------------------
# # Core generator
# # ---------------------------------------------------------------------------

# def generate_timetable_for_term(
#     academic_year: AcademicYear,
#     term: Term,
#     teacher_filter=None,
#     created_by=None
# ) -> Tuple[List[TeacherTimetable], List[Dict]]:
#     """
#     Build timetable entries for the given term.

#     Returns
#     -------
#     entries : list of unsaved TeacherTimetable instances (bulk-create them)
#     conflicts : list of dicts describing scheduling failures
#     """

#     conflicts = []
#     entries: List[TeacherTimetable] = []

#     # -----------------------------------------------------------------
#     # We track allocations in memory so we can check conflicts without
#     # hitting the DB repeatedly.
#     # teacher_schedule[teacher_id][day] = list of {start_time, end_time}
#     # room_schedule[room_id][day]       = list of {start_time, end_time}
#     # -----------------------------------------------------------------
#     teacher_schedule: Dict[int, Dict[int, List]] = defaultdict(lambda: defaultdict(list))
#     room_schedule: Dict[int, Dict[int, List]]    = defaultdict(lambda: defaultdict(list))
#     # teacher_weekly_minutes[teacher_id] = total minutes scheduled this week
#     teacher_weekly_minutes: Dict[int, int] = defaultdict(int)

#     # Fetch all active assignments for this term
#     assignments_qs = TeacherAssignment.objects.filter(
#         academic_year=academic_year,
#         term=term,
#         status='active'
#     ).select_related(
#         'teacher', 'school_level', 'class_level', 'subject'
#     ).prefetch_related('classrooms')

#     if teacher_filter:
#         assignments_qs = assignments_qs.filter(teacher=teacher_filter)

#     assignments = list(assignments_qs)

#     if not assignments:
#         return [], [{'error': 'No active assignments found for this term'}]

#     # Pre-load existing timetable entries from DB (in case of partial regeneration)
#     existing_qs = TeacherTimetable.objects.filter(
#         academic_year=academic_year, term=term
#     )
#     if teacher_filter:
#         existing_qs = existing_qs.filter(teacher=teacher_filter)
#     for e in existing_qs:
#         teacher_schedule[e.teacher_id][e.day_of_week].append(
#             {'start_time': e.start_time, 'end_time': e.end_time}
#         )
#         room_schedule[e.classroom_id][e.day_of_week].append(
#             {'start_time': e.start_time, 'end_time': e.end_time}
#         )

#     # Working days Mon-Fri
#     working_days = [0, 1, 2, 3, 4]  # Python weekday integers (Mon=0)

#     def _teacher_day_minutes(teacher_id, day):
#         return sum(
#             _minutes_between(e['start_time'], e['end_time'])
#             for e in teacher_schedule[teacher_id][day]
#         )

#     def _room_is_free(room_id, day, s, e):
#         for slot in room_schedule[room_id][day]:
#             if not (e <= slot['start_time'] or s >= slot['end_time']):
#                 return False
#         return True

#     def _teacher_is_free(teacher_id, day, s, e):
#         for slot in teacher_schedule[teacher_id][day]:
#             if not (e <= slot['start_time'] or s >= slot['end_time']):
#                 return False
#         return True

#     def _book(teacher_id, room_id, day, s, e, minutes):
#         slot = {'start_time': s, 'end_time': e}
#         teacher_schedule[teacher_id][day].append(slot)
#         room_schedule[room_id][day].append(slot)
#         teacher_weekly_minutes[teacher_id] += minutes

#     def _try_schedule_minutes(
#         assignment, classroom, day, needed_minutes, allow_partial=True
#     ):
#         """
#         Try to schedule `needed_minutes` of teaching for this assignment/classroom
#         on `day`. May produce multiple entries if a 2h block is reached and a gap
#         is needed before resuming.

#         Returns list of (start_time, end_time) tuples that were booked.
#         """
#         teacher = assignment.teacher
#         school_level = assignment.school_level
#         sl_start = school_level.start_time
#         sl_end = school_level.end_time

#         if not sl_start or not sl_end:
#             return []

#         # Check teacher weekly cap
#         teacher_capacity_minutes = int(float(teacher.work_hours_per_week) * 60)
#         already_scheduled = teacher_weekly_minutes[teacher.id]
#         if already_scheduled >= teacher_capacity_minutes:
#             return []

#         scheduled_slots = []
#         remaining = min(needed_minutes, teacher_capacity_minutes - already_scheduled)

#         # Build current blocked list for free-slot computation
#         current_teacher_blocks = teacher_schedule[teacher.id][day]
#         current_room_blocks = room_schedule[classroom.id][day]
#         combined_blocks = current_teacher_blocks + current_room_blocks

#         free_slots = _get_free_slots(school_level, sl_start, sl_end, combined_blocks)

#         for slot_start, slot_end in free_slots:
#             if remaining <= 0:
#                 break

#             # Check teacher daily cap
#             day_mins = _teacher_day_minutes(teacher.id, day)
#             max_today = TEACHER_MAX_HOURS_DAY * 60
#             if day_mins >= max_today:
#                 break

#             available_today = max_today - day_mins
#             session_mins = _chop_session(slot_start, slot_end, min(remaining, available_today))
#             if session_mins < MIN_SLOT_MINUTES:
#                 continue

#             session_end = _time_add(slot_start, session_mins)

#             if not _teacher_is_free(teacher.id, day, slot_start, session_end):
#                 continue
#             if not _room_is_free(classroom.id, day, slot_start, session_end):
#                 continue

#             _book(teacher.id, classroom.id, day, slot_start, session_end, session_mins)
#             scheduled_slots.append((slot_start, session_end))
#             remaining -= session_mins

#         return scheduled_slots

#     # -----------------------------------------------------------------
#     # Main scheduling loop
#     # -----------------------------------------------------------------
#     for assignment in assignments:
#         teacher = assignment.teacher
#         school_level = assignment.school_level
#         classrooms = list(assignment.classrooms.filter(status='active'))

#         if not classrooms:
#             conflicts.append({
#                 'teacher': teacher.full_name,
#                 'subject': assignment.subject.name,
#                 'class_level': assignment.class_level.name,
#                 'error': 'No active classrooms assigned',
#             })
#             continue

#         # Determine required scheduling from ClassLevelSubject
#         try:
#             cls_subject = ClassLevelSubject.objects.get(
#                 class_level=assignment.class_level,
#                 subject=assignment.subject
#             )
#         except ClassLevelSubject.DoesNotExist:
#             conflicts.append({
#                 'teacher': teacher.full_name,
#                 'subject': assignment.subject.name,
#                 'class_level': assignment.class_level.name,
#                 'error': 'No ClassLevelSubject entry found; cannot determine required hours',
#             })
#             continue

#         required_hours_per_week = float(cls_subject.hours_per_week)
#         required_minutes_per_week = int(required_hours_per_week * 60)
#         frequency = cls_subject.teaching_frequency  # 'daily' or 'weekly'

#         # Filter valid school days for this term/school_level
#         valid_days = []
#         for wd in working_days:
#             # Use a representative date in the term to check holidays etc.
#             # We use the first occurrence of this weekday within the term.
#             cursor = term.start_date
#             while cursor <= term.end_date:
#                 if cursor.weekday() == wd:
#                     if _is_valid_school_day(wd, cursor, academic_year, school_level):
#                         valid_days.append(wd)
#                     break
#                 cursor += timedelta(days=1)

#         if not valid_days:
#             conflicts.append({
#                 'teacher': teacher.full_name,
#                 'subject': assignment.subject.name,
#                 'error': 'No valid school days found in this term',
#             })
#             continue

#         # For each classroom, schedule independently
#         for classroom in classrooms:
#             scheduled_total = 0

#             if frequency == 'daily':
#                 # Spread evenly across valid days
#                 # minutes per day = required_minutes_per_week / len(valid_days)
#                 mins_per_day = required_minutes_per_week / len(valid_days)

#                 for day in valid_days:
#                     needed = int(mins_per_day)
#                     slots = _try_schedule_minutes(assignment, classroom, day, needed)
#                     for s, e in slots:
#                         entries.append(TeacherTimetable(
#                             teacher=teacher,
#                             assignment=assignment,
#                             academic_year=academic_year,
#                             term=term,
#                             day_of_week=day,
#                             start_time=s,
#                             end_time=e,
#                             subject=assignment.subject,
#                             class_level=assignment.class_level,
#                             classroom=classroom,
#                             school_level=school_level,
#                             created_by=created_by,
#                         ))
#                         scheduled_total += _minutes_between(s, e)

#             else:
#                 # 'weekly' — schedule all required hours on a single day
#                 # Pick the day with the most availability for this teacher
#                 best_day = None
#                 best_free = -1
#                 for day in valid_days:
#                     combined = (
#                         teacher_schedule[teacher.id][day] +
#                         room_schedule[classroom.id][day]
#                     )
#                     free_slots = _get_free_slots(
#                         school_level,
#                         school_level.start_time,
#                         school_level.end_time,
#                         combined
#                     )
#                     free_mins = sum(_minutes_between(s, e) for s, e in free_slots)
#                     if free_mins > best_free:
#                         best_free = free_mins
#                         best_day = day

#                 if best_day is None:
#                     conflicts.append({
#                         'teacher': teacher.full_name,
#                         'subject': assignment.subject.name,
#                         'classroom': classroom.name,
#                         'error': 'No suitable day found for weekly subject',
#                     })
#                     continue

#                 slots = _try_schedule_minutes(
#                     assignment, classroom, best_day, required_minutes_per_week
#                 )
#                 for s, e in slots:
#                     entries.append(TeacherTimetable(
#                         teacher=teacher,
#                         assignment=assignment,
#                         academic_year=academic_year,
#                         term=term,
#                         day_of_week=best_day,
#                         start_time=s,
#                         end_time=e,
#                         subject=assignment.subject,
#                         class_level=assignment.class_level,
#                         classroom=classroom,
#                         school_level=school_level,
#                         created_by=created_by,
#                     ))
#                     scheduled_total += _minutes_between(s, e)

#             # Record if we couldn't schedule everything
#             if scheduled_total < required_minutes_per_week:
#                 shortfall_hours = (required_minutes_per_week - scheduled_total) / 60
#                 conflicts.append({
#                     'teacher': teacher.full_name,
#                     'subject': assignment.subject.name,
#                     'classroom': classroom.name,
#                     'class_level': assignment.class_level.name,
#                     'warning': (
#                         f'Only scheduled {scheduled_total / 60:.1f}h of '
#                         f'{required_hours_per_week:.1f}h required '
#                         f'(shortfall: {shortfall_hours:.1f}h). '
#                         f'Check teacher capacity and school day length.'
#                     ),
#                 })

#     # -----------------------------------------------------------------
#     # Deduplicate entries (same teacher, day, start_time, classroom)
#     # In theory the algorithm prevents this, but be safe.
#     # -----------------------------------------------------------------
#     seen = set()
#     unique_entries = []
#     for e in entries:
#         key = (e.teacher_id, e.day_of_week, e.start_time, e.classroom_id)
#         if key not in seen:
#             seen.add(key)
#             unique_entries.append(e)

#     return unique_entries, conflicts




# teachers/timetable_generator.py
"""
Timetable generation engine.

Algorithm overview
------------------
For each active TeacherAssignment in the given term:

1. Determine the required hours per week from ClassLevelSubject.
2. For each assigned classroom, build a weekly schedule:
   - If teaching_frequency == 'daily': the subject must appear every school day.
     Each day, the subject gets (hours_per_week / num_valid_days) hours worth of
     slots, split into ≤2-hour continuous blocks.
   - If teaching_frequency == 'weekly': the subject appears on one day per week
     for exactly hours_per_week hours (split into ≤2-hour blocks).
3. Slots are allocated only within the school level's operating hours,
   skipping break periods.
4. A teacher cannot be double-booked (two classrooms at the same time).
5. A classroom cannot be double-booked.
6. The teacher's total weekly hours cannot exceed work_hours_per_week.

Valid school days (Mon–Fri) determination
------------------------------------------
A weekday (0=Mon … 4=Fri) is EXCLUDED from the weekly template only if it is
*permanently* marked as a recurring day-off via SchoolDaySetting
(weekday=<wd>, day_type='day_off', specific_date=None).

Date-specific events (holidays or one-off day-offs that fall on a specific
calendar date) are NOT used to remove a weekday from the recurring template.
Those dates happen once per year; in all other weeks the day is normal.
The generated timetable represents the *recurring weekly pattern*; date-specific
exclusions can be surfaced as informational conflicts but must not collapse
whole weekdays.

The generator returns (entries_to_create, conflicts) without touching the DB,
so the view can wrap it in a transaction.
"""

from datetime import date, datetime, timedelta
from collections import defaultdict
from typing import List, Dict, Tuple

from django.db.models import Q

from academics.models import (
    AcademicYear, Term, SchoolBreak, SchoolDaySetting, Holiday, ClassLevelSubject,
)
from teachers.models import Teacher, TeacherAssignment, TeacherTimetable


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
MAX_SESSION_MINUTES = 120   # 2 hours — maximum uninterrupted teaching block
MIN_SLOT_MINUTES    = 30    # smallest schedulable unit
TEACHER_MAX_HOURS_DAY = 9   # teacher must NOT exceed this many hours/day

WORKING_DAYS = [0, 1, 2, 3, 4]   # Mon–Fri (Python weekday integers)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _dt(t):
    """Combine a time with today's date for arithmetic."""
    return datetime.combine(date.today(), t)


def _minutes_between(t_start, t_end):
    return int((_dt(t_end) - _dt(t_start)).total_seconds() / 60)


def _time_add(t, minutes):
    return (_dt(t) + timedelta(minutes=minutes)).time()


def _get_recurring_day_off_weekdays(academic_year) -> set:
    """
    Return the set of weekday integers (0–6) that are *permanently* marked as
    day-off for this academic year via a recurring SchoolDaySetting
    (weekday is set, specific_date is NULL).

    These are the only settings that should shrink the Mon–Fri working template.
    """
    return set(
        SchoolDaySetting.objects.filter(
            academic_year=academic_year,
            day_type='day_off',
            is_active=True,
            weekday__isnull=False,
            specific_date__isnull=True,
        ).values_list('weekday', flat=True)
    )


def _get_date_specific_day_offs(academic_year) -> set:
    """
    Return the set of specific calendar dates that are marked as day-off
    (one-off, not recurring-weekday).
    """
    return set(
        SchoolDaySetting.objects.filter(
            academic_year=academic_year,
            day_type='day_off',
            is_active=True,
            specific_date__isnull=False,
        ).values_list('specific_date', flat=True)
    )


def _get_holiday_dates(academic_year, school_level) -> set:
    """
    Return all holiday dates for this academic year that apply to the given
    school level (global holidays + level-specific ones).
    """
    return set(
        Holiday.objects.filter(
            academic_year=academic_year,
        ).filter(
            Q(school_level__isnull=True) | Q(school_level=school_level)
        ).values_list('date', flat=True)
    )


def _build_valid_weekdays(academic_year, school_level) -> List[int]:
    """
    Return the list of weekday integers (0–4, Mon–Fri) that form the recurring
    weekly teaching template.

    A weekday is removed ONLY when it is *permanently* configured as a
    recurring day-off (SchoolDaySetting with weekday set, no specific_date).

    Date-specific holidays and one-off day-offs are intentionally ignored here
    because they affect only one calendar date each year, not every week.
    """
    recurring_off = _get_recurring_day_off_weekdays(academic_year)
    return [wd for wd in WORKING_DAYS if wd not in recurring_off]


def _count_working_occurrences_in_term(
    weekday: int,
    term: Term,
    academic_year: AcademicYear,
    school_level,
    holiday_dates: set,
    date_specific_offs: set,
) -> int:
    """
    Count how many times `weekday` actually occurs within the term date range,
    excluding any specific holiday or day-off dates.

    Used only for informational conflict reporting (to estimate shortfall).
    """
    count = 0
    cursor = term.start_date
    while cursor <= term.end_date:
        if cursor.weekday() == weekday:
            if cursor not in holiday_dates and cursor not in date_specific_offs:
                count += 1
        cursor += timedelta(days=1)
    return count


def _get_free_slots(school_level, start_time, end_time, existing_entries):
    """
    Return a list of (slot_start, slot_end) tuples representing free time
    in [start_time, end_time] after removing breaks and already-scheduled entries.
    Each slot is a contiguous free block (may be longer than MAX_SESSION_MINUTES).
    """
    breaks = list(
        SchoolBreak.objects.filter(school_level=school_level, is_active=True)
        .order_by('start_time')
        .values_list('start_time', 'end_time')
    )

    # Combine breaks with existing scheduled blocks
    blocked = list(breaks)
    for entry in existing_entries:
        blocked.append((entry['start_time'], entry['end_time']))

    # Sort and merge overlapping blocked intervals
    blocked.sort(key=lambda x: x[0])
    merged = []
    for s, e in blocked:
        if merged and s <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(merged[-1][1], e))
        else:
            merged.append([s, e])

    # Find free gaps between school_level start and end
    free = []
    cursor = start_time
    for b_start, b_end in merged:
        if cursor < b_start:
            free.append((cursor, b_start))
        if b_end > cursor:
            cursor = b_end
    if cursor < end_time:
        free.append((cursor, end_time))

    # Filter out gaps smaller than MIN_SLOT_MINUTES
    return [
        (s, e) for s, e in free
        if _minutes_between(s, e) >= MIN_SLOT_MINUTES
    ]


def _chop_session(slot_start, slot_end, remaining_minutes):
    """
    From a free slot, return the actual session duration (minutes) to schedule.
    Rules:
    - Cannot exceed MAX_SESSION_MINUTES.
    - Cannot exceed the free slot length.
    - Cannot exceed remaining_minutes needed.
    - Rounded down to nearest MIN_SLOT_MINUTES unit.
    """
    available = _minutes_between(slot_start, slot_end)
    session = min(available, MAX_SESSION_MINUTES, remaining_minutes)
    session = (session // MIN_SLOT_MINUTES) * MIN_SLOT_MINUTES
    return session


# ---------------------------------------------------------------------------
# Core generator
# ---------------------------------------------------------------------------

def generate_timetable_for_term(
    academic_year: AcademicYear,
    term: Term,
    teacher_filter=None,
    created_by=None,
) -> Tuple[List[TeacherTimetable], List[Dict]]:
    """
    Build timetable entries for the given term.

    Returns
    -------
    entries   : list of unsaved TeacherTimetable instances (bulk-create them)
    conflicts : list of dicts describing scheduling failures / warnings
    """

    conflicts: List[Dict] = []
    entries:   List[TeacherTimetable] = []

    # In-memory schedules to avoid repeated DB hits during generation.
    # teacher_schedule[teacher_id][day_of_week] = [{start_time, end_time}, ...]
    # room_schedule[room_id][day_of_week]        = [{start_time, end_time}, ...]
    teacher_schedule: Dict[int, Dict[int, List]] = defaultdict(lambda: defaultdict(list))
    room_schedule:    Dict[int, Dict[int, List]] = defaultdict(lambda: defaultdict(list))
    # teacher_weekly_minutes[teacher_id] = total minutes booked this week
    teacher_weekly_minutes: Dict[int, int] = defaultdict(int)

    # ------------------------------------------------------------------
    # Fetch assignments
    # ------------------------------------------------------------------
    assignments_qs = (
        TeacherAssignment.objects
        .filter(academic_year=academic_year, term=term, status='active')
        .select_related('teacher', 'school_level', 'class_level', 'subject')
        .prefetch_related('classrooms')
    )
    if teacher_filter:
        assignments_qs = assignments_qs.filter(teacher=teacher_filter)

    assignments = list(assignments_qs)
    if not assignments:
        return [], [{'error': 'No active assignments found for this term'}]

    # ------------------------------------------------------------------
    # Pre-load any existing timetable entries (partial-regen support)
    # ------------------------------------------------------------------
    existing_qs = TeacherTimetable.objects.filter(academic_year=academic_year, term=term)
    if teacher_filter:
        existing_qs = existing_qs.filter(teacher=teacher_filter)
    for e in existing_qs:
        slot = {'start_time': e.start_time, 'end_time': e.end_time}
        teacher_schedule[e.teacher_id][e.day_of_week].append(slot)
        room_schedule[e.classroom_id][e.day_of_week].append(slot)

    # ------------------------------------------------------------------
    # Inner helpers (closures over the schedule dicts above)
    # ------------------------------------------------------------------

    def _teacher_day_minutes(teacher_id, day):
        return sum(
            _minutes_between(s['start_time'], s['end_time'])
            for s in teacher_schedule[teacher_id][day]
        )

    def _room_is_free(room_id, day, s, e):
        for slot in room_schedule[room_id][day]:
            if not (e <= slot['start_time'] or s >= slot['end_time']):
                return False
        return True

    def _teacher_is_free(teacher_id, day, s, e):
        for slot in teacher_schedule[teacher_id][day]:
            if not (e <= slot['start_time'] or s >= slot['end_time']):
                return False
        return True

    def _book(teacher_id, room_id, day, s, e):
        slot = {'start_time': s, 'end_time': e}
        teacher_schedule[teacher_id][day].append(slot)
        room_schedule[room_id][day].append(slot)
        teacher_weekly_minutes[teacher_id] += _minutes_between(s, e)

    def _try_schedule_minutes(assignment, classroom, day, needed_minutes):
        """
        Try to schedule `needed_minutes` of teaching for this assignment/classroom
        on weekday `day` (0=Mon … 6=Sun).

        Returns list of (start_time, end_time) tuples that were successfully booked.
        """
        teacher = assignment.teacher
        school_level = assignment.school_level
        sl_start = school_level.start_time
        sl_end   = school_level.end_time

        if not sl_start or not sl_end:
            return []

        # Respect teacher's contracted weekly maximum
        teacher_cap_minutes = int(float(teacher.work_hours_per_week) * 60)
        already_weekly = teacher_weekly_minutes[teacher.id]
        if already_weekly >= teacher_cap_minutes:
            return []

        remaining = min(needed_minutes, teacher_cap_minutes - already_weekly)

        # Build the combined blocked list for free-slot computation
        combined_blocks = (
            teacher_schedule[teacher.id][day] +
            room_schedule[classroom.id][day]
        )
        free_slots = _get_free_slots(school_level, sl_start, sl_end, combined_blocks)

        scheduled_slots = []
        for slot_start, slot_end in free_slots:
            if remaining <= 0:
                break

            # Daily cap per teacher
            day_mins = _teacher_day_minutes(teacher.id, day)
            max_today = TEACHER_MAX_HOURS_DAY * 60
            if day_mins >= max_today:
                break

            session_mins = _chop_session(
                slot_start, slot_end,
                min(remaining, max_today - day_mins)
            )
            if session_mins < MIN_SLOT_MINUTES:
                continue

            session_end = _time_add(slot_start, session_mins)

            if not _teacher_is_free(teacher.id, day, slot_start, session_end):
                continue
            if not _room_is_free(classroom.id, day, slot_start, session_end):
                continue

            _book(teacher.id, classroom.id, day, slot_start, session_end)
            scheduled_slots.append((slot_start, session_end))
            remaining -= session_mins

        return scheduled_slots

    # ------------------------------------------------------------------
    # Main scheduling loop
    # ------------------------------------------------------------------
    for assignment in assignments:
        teacher      = assignment.teacher
        school_level = assignment.school_level
        classrooms   = list(assignment.classrooms.filter(status='active'))

        if not classrooms:
            conflicts.append({
                'teacher':     teacher.full_name,
                'subject':     assignment.subject.name,
                'class_level': assignment.class_level.name,
                'error':       'No active classrooms assigned',
            })
            continue

        # Resolve ClassLevelSubject
        try:
            cls_subject = ClassLevelSubject.objects.get(
                class_level=assignment.class_level,
                subject=assignment.subject,
            )
        except ClassLevelSubject.DoesNotExist:
            conflicts.append({
                'teacher':     teacher.full_name,
                'subject':     assignment.subject.name,
                'class_level': assignment.class_level.name,
                'error':       'No ClassLevelSubject entry found; cannot determine required hours',
            })
            continue

        required_hours_per_week   = float(cls_subject.hours_per_week)
        required_minutes_per_week = int(required_hours_per_week * 60)
        frequency = cls_subject.teaching_frequency  # 'daily' | 'weekly'

        # ------------------------------------------------------------------
        # Determine the recurring weekly template (Mon–Fri minus permanent offs)
        # ------------------------------------------------------------------
        valid_days = _build_valid_weekdays(academic_year, school_level)

        if not valid_days:
            conflicts.append({
                'teacher': teacher.full_name,
                'subject': assignment.subject.name,
                'error':   'All working days are permanently marked as day-off',
            })
            continue

        # ------------------------------------------------------------------
        # Informational: note any date-specific holidays/day-offs in this term
        # that fall on working days.  These do NOT affect the weekly template
        # but are useful for administrators to know about.
        # ------------------------------------------------------------------
        holiday_dates      = _get_holiday_dates(academic_year, school_level)
        date_specific_offs = _get_date_specific_day_offs(academic_year)
        blocked_dates      = holiday_dates | date_specific_offs

        # Report specific dates that will be skipped during this term
        skipped_dates = []
        cursor = term.start_date
        while cursor <= term.end_date:
            if cursor.weekday() in set(valid_days) and cursor in blocked_dates:
                skipped_dates.append(str(cursor))
            cursor += timedelta(days=1)

        if skipped_dates:
            conflicts.append({
                'teacher': teacher.full_name,
                'subject': assignment.subject.name,
                'info': (
                    f'The following dates in this term are holidays/day-offs and will '
                    f'have no class (other weeks are unaffected): {", ".join(skipped_dates)}'
                ),
            })

        # ------------------------------------------------------------------
        # Schedule per classroom
        # ------------------------------------------------------------------
        for classroom in classrooms:
            scheduled_total = 0

            if frequency == 'daily':
                # Spread evenly across valid (recurring) working days.
                # Each day gets an equal share of the weekly minutes.
                mins_per_day = required_minutes_per_week / len(valid_days)

                for day in valid_days:
                    needed = int(mins_per_day)
                    slots  = _try_schedule_minutes(assignment, classroom, day, needed)
                    for s, e in slots:
                        entries.append(TeacherTimetable(
                            teacher=teacher,
                            assignment=assignment,
                            academic_year=academic_year,
                            term=term,
                            day_of_week=day,
                            start_time=s,
                            end_time=e,
                            subject=assignment.subject,
                            class_level=assignment.class_level,
                            classroom=classroom,
                            school_level=school_level,
                            created_by=created_by,
                        ))
                        scheduled_total += _minutes_between(s, e)

            else:
                # 'weekly' — schedule all required hours on a single best day.
                best_day  = None
                best_free = -1
                for day in valid_days:
                    combined = (
                        teacher_schedule[teacher.id][day] +
                        room_schedule[classroom.id][day]
                    )
                    free_slots = _get_free_slots(
                        school_level,
                        school_level.start_time,
                        school_level.end_time,
                        combined,
                    )
                    free_mins = sum(_minutes_between(s, e) for s, e in free_slots)
                    if free_mins > best_free:
                        best_free = free_mins
                        best_day  = day

                if best_day is None:
                    conflicts.append({
                        'teacher':   teacher.full_name,
                        'subject':   assignment.subject.name,
                        'classroom': classroom.name,
                        'error':     'No suitable day found for weekly subject',
                    })
                    continue

                slots = _try_schedule_minutes(
                    assignment, classroom, best_day, required_minutes_per_week
                )
                for s, e in slots:
                    entries.append(TeacherTimetable(
                        teacher=teacher,
                        assignment=assignment,
                        academic_year=academic_year,
                        term=term,
                        day_of_week=best_day,
                        start_time=s,
                        end_time=e,
                        subject=assignment.subject,
                        class_level=assignment.class_level,
                        classroom=classroom,
                        school_level=school_level,
                        created_by=created_by,
                    ))
                    scheduled_total += _minutes_between(s, e)

            # Warn if we could not fill the full weekly requirement
            if scheduled_total < required_minutes_per_week:
                shortfall_hours = (required_minutes_per_week - scheduled_total) / 60
                conflicts.append({
                    'teacher':     teacher.full_name,
                    'subject':     assignment.subject.name,
                    'classroom':   classroom.name,
                    'class_level': assignment.class_level.name,
                    'warning': (
                        f'Only scheduled {scheduled_total / 60:.1f}h of '
                        f'{required_hours_per_week:.1f}h required '
                        f'(shortfall: {shortfall_hours:.1f}h). '
                        f'Check teacher capacity and school day length.'
                    ),
                })

    # ------------------------------------------------------------------
    # Deduplicate (same teacher + day + start_time + classroom)
    # ------------------------------------------------------------------
    seen = set()
    unique_entries = []
    for e in entries:
        key = (e.teacher_id, e.day_of_week, e.start_time, e.classroom_id)
        if key not in seen:
            seen.add(key)
            unique_entries.append(e)

    return unique_entries, conflicts