# serializers.py
from rest_framework import serializers
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError
from .models import (
    AcademicYear, SchoolLevel, ClassLevel, ClassRoom, Subject,
    ClassLevelSubject, ClassLevelCost
)
from .translations import get_translation


class AcademicYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = ['id', 'name', 'start_date', 'end_date', 'is_current', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_lang(self):
        request = self.context.get('request')
        if request and hasattr(request, 'lang'):
            return request.lang
        return 'en'
    
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


class SchoolLevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchoolLevel
        fields = ['id', 'name', 'description', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class ClassLevelSerializer(serializers.ModelSerializer):
    school_level_name = serializers.CharField(source='school_level.name', read_only=True)
    
    class Meta:
        model = ClassLevel
        fields = ['id', 'name', 'code', 'school_level', 'school_level_name', 'description', 
                  'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_lang(self):
        request = self.context.get('request')
        if request and hasattr(request, 'lang'):
            return request.lang
        return 'en'
    
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


class ClassRoomSerializer(serializers.ModelSerializer):
    class_level_name = serializers.CharField(source='class_level.name', read_only=True)
    room_type_display = serializers.CharField(source='get_room_type_display', read_only=True)
    
    class Meta:
        model = ClassRoom
        fields = ['id', 'name', 'code', 'class_level', 'class_level_name', 'room_type', 
                  'room_type_display', 'capacity', 'status', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_lang(self):
        request = self.context.get('request')
        if request and hasattr(request, 'lang'):
            return request.lang
        return 'en'
    
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
            if ClassRoom.objects.filter(code=data['code']).exclude(id=self.instance.id if self.instance else None).exists():
                raise serializers.ValidationError({
                    'code': get_translation('code_already_exists', lang)
                })
        
        if data.get('class_level') and data.get('name'):
            if ClassRoom.objects.filter(
                class_level=data['class_level'],
                name=data['name']
            ).exclude(id=self.instance.id if self.instance else None).exists():
                raise serializers.ValidationError({
                    'name': get_translation('duplicate_name_in_class_level', lang)
                })
        
        return data


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ['id', 'name', 'code', 'pass_mark', 'status', 'description', 
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_lang(self):
        request = self.context.get('request')
        if request and hasattr(request, 'lang'):
            return request.lang
        return 'en'
    
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


class ClassLevelSubjectSerializer(serializers.ModelSerializer):
    class_level_name = serializers.CharField(source='class_level.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    teaching_frequency_display = serializers.CharField(source='get_teaching_frequency_display', read_only=True)
    
    class Meta:
        model = ClassLevelSubject
        fields = ['id', 'class_level', 'class_level_name', 'subject', 'subject_name', 
                  'teaching_frequency', 'teaching_frequency_display', 'hours_per_week', 
                  'is_compulsory', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_lang(self):
        request = self.context.get('request')
        if request and hasattr(request, 'lang'):
            return request.lang
        return 'en'
    
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


class ClassLevelCostSerializer(serializers.ModelSerializer):
    academic_year_name = serializers.CharField(source='academic_year.name', read_only=True)
    class_level_name = serializers.CharField(source='class_level.name', read_only=True)
    frequency_display = serializers.CharField(source='get_frequency_display', read_only=True)
    
    class Meta:
        model = ClassLevelCost
        fields = ['id', 'name', 'academic_year', 'academic_year_name', 'class_level', 
                  'class_level_name', 'amount', 'frequency', 'frequency_display', 
                  'is_mandatory', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_lang(self):
        request = self.context.get('request')
        if request and hasattr(request, 'lang'):
            return request.lang
        return 'en'
    
    def validate(self, data):
        lang = self.get_lang()
        
        if ClassLevelCost.objects.filter(
            class_level=data.get('class_level'),
            name=data.get('name'),
            academic_year=data.get('academic_year')
        ).exclude(id=self.instance.id if self.instance else None).exists():
            raise serializers.ValidationError(
                get_translation('fee_structure_already_exists', lang)
            )
        
        return data