# serializers.py
from rest_framework import serializers
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError
from .models import (
    AcademicYear, SchoolLevel, ClassLevel, ClassRoom, Subject,
    ClassLevelSubject, ClassLevelCost, Term, PaymentType, SchoolDaySetting, ClassroomAssignment, SchoolBreak,
    Holiday
)
from .translations import get_translation


# ══════════════════════════════════════════════════════════════════════════════
#  BASE SERIALIZER WITH LANGUAGE SUPPORT
# ══════════════════════════════════════════════════════════════════════════════

class BaseSerializer(serializers.ModelSerializer):
    """Base serializer with language helper methods."""
    
    def get_lang(self):
        """Extract language from request context."""
        request = self.context.get('request')
        if request and hasattr(request, 'lang'):
            return request.lang
        return 'en'
    
    def get_translation(self, key, **kwargs):
        """Get translated message."""
        return get_translation(key, self.get_lang(), **kwargs)


# ══════════════════════════════════════════════════════════════════════════════
#  ACADEMIC YEAR SERIALIZER
# ══════════════════════════════════════════════════════════════════════════════

class AcademicYearSerializer(BaseSerializer):
    class Meta:
        model = AcademicYear
        fields = ['id', 'name', 'start_date', 'end_date', 'is_current', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, data):
        lang = self.get_lang()
        
        if data.get('start_date') and data.get('end_date'):
            if data['end_date'] <= data['start_date']:
                raise serializers.ValidationError({
                    'end_date': get_translation('end_date_after_start', lang)
                })
        
        overlapping = AcademicYear.objects.filter(
            start_date__lte=data.get('end_date'),
            end_date__gte=data.get('start_date')
        )
        if self.instance:
            overlapping = overlapping.exclude(id=self.instance.id)
        
        if overlapping.exists():
            raise serializers.ValidationError(
                get_translation('overlapping_academic_year', lang, name=overlapping.first().name)
            )
        
        return data


# ══════════════════════════════════════════════════════════════════════════════
#  SCHOOL LEVEL SERIALIZER
# ══════════════════════════════════════════════════════════════════════════════

class SchoolLevelSerializer(BaseSerializer):
    class Meta:
        model = SchoolLevel
        fields = ['id', 'name', 'description', 'start_time', 'end_time',
                  'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
        
    def validate(self, data):
        lang = self.get_lang()
        if data.get('start_time') and data.get('end_time'):
            if data['end_time'] <= data['start_time']:
                raise serializers.ValidationError({
                    'end_time': get_translation('end_time_after_start', lang)
                })
        return data

# ══════════════════════════════════════════════════════════════════════════════
#  CLASS LEVEL SERIALIZER
# ══════════════════════════════════════════════════════════════════════════════

class ClassLevelSerializer(BaseSerializer):
    school_level_name = serializers.CharField(source='school_level.name', read_only=True)
    
    class Meta:
        model = ClassLevel
        fields = ['id', 'name', 'code', 'school_level', 'school_level_name', 'description', 
                  'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_code(self, value):
        import re
        lang = self.get_lang()
        
        if value:
            value = value.upper().strip()
            if not re.match(r'^[A-Z0-9]+$', value):
                raise serializers.ValidationError(
                    get_translation('class_code_invalid', lang)
                )
        return value
    
    def validate(self, data):
        lang = self.get_lang()
        
        if data.get('code'):
            if ClassLevel.objects.filter(code=data['code']).exclude(id=self.instance.id if self.instance else None).exists():
                raise serializers.ValidationError({
                    'code': get_translation('code_already_exists', lang)
                })
        
        if data.get('name') and data.get('school_level'):
            if ClassLevel.objects.filter(
                name=data['name'], 
                school_level=data['school_level']
            ).exclude(id=self.instance.id if self.instance else None).exists():
                raise serializers.ValidationError({
                    'name': get_translation('duplicate_name_in_school_level', lang)
                })
        
        return data


# ══════════════════════════════════════════════════════════════════════════════
#  CLASSROOM SERIALIZER
# ══════════════════════════════════════════════════════════════════════════════

class ClassRoomSerializer(BaseSerializer):
    room_type_display = serializers.CharField(source='get_room_type_display', read_only=True)
    
    class Meta:
        model = ClassRoom
        fields = ['id', 'name', 'code', 'room_type', 'room_type_display', 
                  'capacity', 'status', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_code(self, value):
        import re
        lang = self.get_lang()
        if value:
            value = value.upper().strip()
            if not re.match(r'^[A-Z0-9]+$', value):
                raise serializers.ValidationError(
                    get_translation('room_code_invalid', lang)
                )
        return value
    
    def validate(self, data):
        lang = self.get_lang()
        if data.get('code'):
            if ClassRoom.objects.filter(code=data['code']).exclude(
                id=self.instance.id if self.instance else None
            ).exists():
                raise serializers.ValidationError({
                    'code': get_translation('code_already_exists', lang)
                })
        if data.get('name'):
            if ClassRoom.objects.filter(name=data['name']).exclude(
                id=self.instance.id if self.instance else None
            ).exists():
                raise serializers.ValidationError({
                    'name': get_translation('duplicate_name', lang)
                })
        return data

# ══════════════════════════════════════════════════════════════════════════════
#  SUBJECT SERIALIZER
# ══════════════════════════════════════════════════════════════════════════════

class SubjectSerializer(BaseSerializer):
    class Meta:
        model = Subject
        fields = ['id', 'name', 'code', 'pass_mark', 'status', 'description', 
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_name(self, value):
        import re
        if value:
            value = value.strip().title()
        return value
    
    def validate_code(self, value):
        import re
        lang = self.get_lang()
        
        if value:
            value = value.upper().strip()
            if not re.match(r'^[A-Z0-9]+$', value):
                raise serializers.ValidationError(
                    get_translation('subject_code_invalid', lang)
                )
        return value
    
    def validate(self, data):
        lang = self.get_lang()
        
        if data.get('code'):
            if Subject.objects.filter(code=data['code']).exclude(id=self.instance.id if self.instance else None).exists():
                raise serializers.ValidationError({
                    'code': get_translation('code_already_exists', lang)
                })
        
        if data.get('name'):
            if Subject.objects.filter(name__iexact=data['name']).exclude(id=self.instance.id if self.instance else None).exists():
                raise serializers.ValidationError({
                    'name': get_translation('duplicate_name', lang)
                })
        
        return data


# ══════════════════════════════════════════════════════════════════════════════
#  CLASS LEVEL SUBJECT SERIALIZER
# ══════════════════════════════════════════════════════════════════════════════

class ClassLevelSubjectSerializer(BaseSerializer):
    class_level_name = serializers.CharField(source='class_level.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    teaching_frequency_display = serializers.CharField(source='get_teaching_frequency_display', read_only=True)
    
    class Meta:
        model = ClassLevelSubject
        fields = ['id', 'class_level', 'class_level_name', 'subject', 'subject_name', 
                  'teaching_frequency', 'teaching_frequency_display', 'hours_per_week', 
                  'is_compulsory', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, data):
        lang = self.get_lang()
        
        if ClassLevelSubject.objects.filter(
            class_level=data.get('class_level'),
            subject=data.get('subject')
        ).exclude(id=self.instance.id if self.instance else None).exists():
            raise serializers.ValidationError(
                get_translation('already_assigned', lang)
            )
        
        return data


# ══════════════════════════════════════════════════════════════════════════════
#  TERM SERIALIZER
# ══════════════════════════════════════════════════════════════════════════════

class TermSerializer(BaseSerializer):
    academic_year_name = serializers.CharField(source='academic_year.name', read_only=True)
    
    class Meta:
        model = Term
        fields = ['id', 'academic_year', 'academic_year_name', 'term_number', 'name', 
                  'start_date', 'end_date', 'is_current', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, data):
        lang = self.get_lang()
        
        if data.get('start_date') and data.get('end_date'):
            if data['end_date'] <= data['start_date']:
                raise serializers.ValidationError({
                    'end_date': get_translation('end_date_after_start', lang)
                })
        
        # Check if dates are within academic year
        if data.get('academic_year') and data.get('start_date') and data.get('end_date'):
            academic_year = data['academic_year']
            if data['start_date'] < academic_year.start_date or data['end_date'] > academic_year.end_date:
                raise serializers.ValidationError(
                    get_translation('term_dates_outside_academic_year', lang)
                )
        
        # Check for overlapping terms
        if data.get('academic_year') and data.get('start_date') and data.get('end_date'):
            overlapping = Term.objects.filter(
                academic_year=data['academic_year'],
                start_date__lte=data['end_date'],
                end_date__gte=data['start_date']
            )
            if self.instance:
                overlapping = overlapping.exclude(id=self.instance.id)
            
            if overlapping.exists():
                raise serializers.ValidationError(
                    get_translation('overlapping_term', lang, name=overlapping.first().name)
                )
        
        return data


# ══════════════════════════════════════════════════════════════════════════════
#  PAYMENT TYPE SERIALIZER
# ══════════════════════════════════════════════════════════════════════════════

class PaymentTypeSerializer(BaseSerializer):
    class Meta:
        model = PaymentType
        fields = ['id', 'name', 'code', 'description', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_code(self, value):
        import re
        lang = self.get_lang()
        
        if value:
            value = value.upper().strip()
            if not re.match(r'^[A-Z0-9]+$', value):
                raise serializers.ValidationError(
                    get_translation('payment_type_code_invalid', lang)
                )
        return value
    
    def validate(self, data):
        lang = self.get_lang()
        
        if data.get('code'):
            if PaymentType.objects.filter(code=data['code']).exclude(id=self.instance.id if self.instance else None).exists():
                raise serializers.ValidationError({
                    'code': get_translation('code_already_exists', lang)
                })
        
        if data.get('name'):
            if PaymentType.objects.filter(name__iexact=data['name']).exclude(id=self.instance.id if self.instance else None).exists():
                raise serializers.ValidationError({
                    'name': get_translation('duplicate_name', lang)
                })
        
        return data


# ══════════════════════════════════════════════════════════════════════════════
#  SCHOOL DAY SETTING SERIALIZER
# ══════════════════════════════════════════════════════════════════════════════

class SchoolDaySettingSerializer(BaseSerializer):
    weekday_display = serializers.CharField(source='get_weekday_display', read_only=True)
    day_type_display = serializers.CharField(source='get_day_type_display', read_only=True)
    academic_year_name = serializers.CharField(source='academic_year.name', read_only=True)
    
    class Meta:
        model = SchoolDaySetting
        fields = ['id', 'academic_year', 'academic_year_name', 'day_type', 'day_type_display',
                  'weekday', 'weekday_display', 'specific_date', 'description', 'is_active',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, data):
        lang = self.get_lang()
        
        # Either weekday or specific_date must be provided
        if not data.get('weekday') and not data.get('specific_date'):
            raise serializers.ValidationError(
                get_translation('missing_weekday_or_date', lang)
            )
        
        # If specific_date is provided, validate it's within academic year
        if data.get('specific_date') and data.get('academic_year'):
            if data['specific_date'] < data['academic_year'].start_date or data['specific_date'] > data['academic_year'].end_date:
                raise serializers.ValidationError({
                    'specific_date': get_translation('date_outside_academic_year', lang)
                })
        
        return data


# ══════════════════════════════════════════════════════════════════════════════
#  CLASSROOM ASSIGNMENT SERIALIZER
# ══════════════════════════════════════════════════════════════════════════════

class ClassroomAssignmentSerializer(BaseSerializer):
    classroom_name = serializers.CharField(source='classroom.name', read_only=True)
    classroom_code = serializers.CharField(source='classroom.code', read_only=True)
    class_level_name = serializers.CharField(source='class_level.name', read_only=True)
    term_name = serializers.CharField(source='term.name', read_only=True)
    academic_year_name = serializers.CharField(source='academic_year.name', read_only=True)
    
    class Meta:
        model = ClassroomAssignment
        fields = ['id', 'classroom', 'classroom_name', 'classroom_code', 'class_level', 
                  'class_level_name', 'term', 'term_name', 'academic_year', 'academic_year_name',
                  'is_primary', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, data):
        lang = self.get_lang()
        
        # Check for duplicate assignment (classroom + term)
        if data.get('classroom') and data.get('term'):
            if ClassroomAssignment.objects.filter(
                classroom=data['classroom'],
                term=data['term']
            ).exclude(id=self.instance.id if self.instance else None).exists():
                raise serializers.ValidationError(
                    get_translation('classroom_already_assigned_to_term', lang)
                )
        
        return data

# ══════════════════════════════════════════════════════════════════════════════
#  CLASS LEVEL COST SERIALIZER
# ══════════════════════════════════════════════════════════════════════════════

class ClassLevelCostSerializer(BaseSerializer):
    academic_year_name = serializers.CharField(source='academic_year.name', read_only=True)
    class_level_name = serializers.CharField(source='class_level.name', read_only=True)
    payment_type_name = serializers.CharField(source='payment_type.name', read_only=True)
    
    class Meta:
        model = ClassLevelCost
        fields = ['id', 'name', 'academic_year', 'academic_year_name', 'class_level', 
                  'class_level_name', 'payment_type', 'payment_type_name', 'amount', 
                  'is_mandatory', 'description', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, data):
        lang = self.get_lang()
        
        # Check for duplicate fee structure
        if data.get('class_level') and data.get('name') and data.get('academic_year'):
            if ClassLevelCost.objects.filter(
                class_level=data['class_level'],
                name=data['name'],
                academic_year=data['academic_year']
            ).exclude(id=self.instance.id if self.instance else None).exists():
                raise serializers.ValidationError(
                    get_translation('fee_structure_already_exists', lang)
                )
        
        return data
    
    
    
    
# ══════════════════════════════════════════════════════════════════════════════
#  SCHOOL BREAK SERIALIZER
# ══════════════════════════════════════════════════════════════════════════════

class SchoolBreakSerializer(BaseSerializer):
    school_level_name = serializers.CharField(source='school_level.name', read_only=True)
    break_type_display = serializers.CharField(source='get_break_type_display', read_only=True)
    
    class Meta:
        model = SchoolBreak
        fields = ['id', 'name', 'break_type', 'break_type_display', 'school_level', 
                  'school_level_name', 'start_time', 'end_time', 'duration_minutes', 
                  'description', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'duration_minutes', 'created_at', 'updated_at']
    
    def validate(self, data):
        from datetime import datetime, timedelta
        lang = self.get_lang()

        start_time = data.get('start_time')
        end_time   = data.get('end_time')

        if start_time and end_time:
            if end_time <= start_time:
                raise serializers.ValidationError({
                    'end_time': get_translation('end_time_after_start', lang)
                })

            start_dt = datetime.combine(datetime.today(), start_time)
            end_dt   = datetime.combine(datetime.today(), end_time)
            duration = int((end_dt - start_dt).total_seconds() / 60)

            if duration < 5:
                raise serializers.ValidationError(
                    get_translation('break_too_short', lang)
                )
            if duration > 60:
                raise serializers.ValidationError(
                    get_translation('break_too_long', lang)
                )

            # School-level boundary checks
            school_level = data.get('school_level') or (
                self.instance.school_level if self.instance else None
            )
            if school_level and school_level.start_time and school_level.end_time:
                sl_start = datetime.combine(datetime.today(), school_level.start_time)
                sl_end   = datetime.combine(datetime.today(), school_level.end_time)

                if start_dt < sl_start + timedelta(minutes=5):
                    raise serializers.ValidationError({
                        'start_time': get_translation(
                            'break_start_too_early', lang,
                            time=school_level.start_time.strftime('%H:%M')
                        )
                    })
                if end_dt > sl_end - timedelta(minutes=5):
                    raise serializers.ValidationError({
                        'end_time': get_translation(
                            'break_end_too_late', lang,
                            time=school_level.end_time.strftime('%H:%M')
                        )
                    })

        # Duplicate name check
        if data.get('school_level') and data.get('name'):
            if SchoolBreak.objects.filter(
                school_level=data['school_level'],
                name__iexact=data['name']
            ).exclude(id=self.instance.id if self.instance else None).exists():
                raise serializers.ValidationError({
                    'name': get_translation('duplicate_break_name', lang)
                })

        # Overlap check
        if data.get('school_level') and start_time and end_time:
            overlapping = SchoolBreak.objects.filter(
                school_level=data['school_level'],
                start_time__lt=end_time,
                end_time__gt=start_time,
                is_active=True
            )
            if self.instance:
                overlapping = overlapping.exclude(id=self.instance.id)
            if overlapping.exists():
                raise serializers.ValidationError(
                    get_translation('overlapping_break', lang,
                                    name=overlapping.first().name)
                )

        return data
    
    
    
# ══════════════════════════════════════════════════════════════════════════════
#  HOLIDAY SERIALIZER
# ══════════════════════════════════════════════════════════════════════════════

class HolidaySerializer(BaseSerializer):
    school_level_name = serializers.CharField(source='school_level.name', read_only=True)
    academic_year_name = serializers.CharField(source='academic_year.name', read_only=True)
    
    class Meta:
        model = Holiday
        fields = ['id', 'name', 'date', 'is_recurring', 'description', 
                  'school_level', 'school_level_name', 'academic_year', 
                  'academic_year_name', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, data):
        lang = self.get_lang()
        
        # Validate date is within academic year
        if data.get('date') and data.get('academic_year'):
            if data['date'] < data['academic_year'].start_date or data['date'] > data['academic_year'].end_date:
                raise serializers.ValidationError({
                    'date': get_translation('holiday_date_outside_academic_year', lang)
                })
        
        # Check for duplicate holiday (same date, school_level, academic_year)
        if data.get('date') and data.get('academic_year'):
            school_level = data.get('school_level')
            query = Holiday.objects.filter(
                date=data['date'],
                academic_year=data['academic_year']
            )
            if school_level:
                query = query.filter(school_level=school_level)
            else:
                query = query.filter(school_level__isnull=True)
            
            if self.instance:
                query = query.exclude(id=self.instance.id)
            
            if query.exists():
                raise serializers.ValidationError(
                    get_translation('holiday_already_exists', lang, 
                                   date=data['date'].isoformat(),
                                   academic_year=data['academic_year'].name)
                )
        
        return data