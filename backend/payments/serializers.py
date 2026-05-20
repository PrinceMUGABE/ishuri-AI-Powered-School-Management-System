# payments/serializers.py
from rest_framework import serializers
from django.utils import timezone
from decimal import Decimal

from .models import (
    StudentPaymentAssignment, 
    PaymentTransaction, 
    PaymentStatus, 
    PaymentMethod, 
    PaymentType
)
from academics.serializers import ClassLevelCostSerializer
from academics.models import ClassLevelCost
from students.models import Student
from students.serializers import StudentDetailSerializer
from accounts.models import User


class ClassLevelCostBasicSerializer(serializers.ModelSerializer):
    """Basic serializer for ClassLevelCost"""
    class Meta:
        model = ClassLevelCost
        fields = ['id', 'name', 'amount']


class PaymentTransactionSerializer(serializers.ModelSerializer):
    """Serializer for PaymentTransaction"""
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    transaction_status_display = serializers.CharField(source='get_transaction_status_display', read_only=True)
    payment_type_display = serializers.CharField(source='get_payment_type_display', read_only=True)
    recorded_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = PaymentTransaction
        fields = [
            'id', 'payment_assignment', 'amount', 'payment_method', 'payment_method_display',
            'payment_type', 'payment_type_display', 'transaction_status', 'transaction_status_display',
            'phone_number', 'mobile_money_provider', 'transaction_reference', 'bank_name',
            'bank_account_number', 'bank_receipt_number', 'paid_at', 'created_at',
            'recorded_by', 'recorded_by_name', 'notes', 'receipt_number'
        ]
        read_only_fields = ['id', 'transaction_reference', 'receipt_number', 'created_at', 'paid_at']
    
    def get_recorded_by_name(self, obj):
        if obj.recorded_by:
            return obj.recorded_by.username
        return None
    
    def validate(self, data):
        payment_method = data.get('payment_method')
        
        if payment_method == PaymentMethod.MOBILE_MONEY:
            if not data.get('phone_number'):
                raise serializers.ValidationError({
                    'phone_number': 'Phone number is required for mobile money payments'
                })
        
        if payment_method == PaymentMethod.BANK_TRANSFER:
            if not data.get('bank_receipt_number'):
                raise serializers.ValidationError({
                    'bank_receipt_number': 'Bank receipt number is required for bank transfers'
                })
        
        return data


class StudentPaymentAssignmentSerializer(serializers.ModelSerializer):
    """Serializer for StudentPaymentAssignment"""
    student_details = StudentDetailSerializer(source='student', read_only=True)
    class_level_cost_details = ClassLevelCostBasicSerializer(source='class_level_cost', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    transactions = PaymentTransactionSerializer(many=True, read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    paid_percentage = serializers.SerializerMethodField()
    
    class Meta:
        model = StudentPaymentAssignment
        fields = [
            'id', 'student', 'student_details', 'class_level_cost', 'class_level_cost_details',
            'academic_year', 'total_amount', 'paid_amount', 'remaining_amount',
            'payment_start_date', 'payment_due_date', 'payment_extended_until',
            'status', 'status_display', 'is_overdue', 'paid_percentage',
            'created_at', 'updated_at', 'created_by', 'transactions'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'paid_amount', 'remaining_amount']
    
    def get_paid_percentage(self, obj):
        if obj.total_amount > 0:
            return float((obj.paid_amount / obj.total_amount) * 100)
        return 0.00
    
    def validate(self, data):
        student = data.get('student')
        class_level_cost = data.get('class_level_cost')
        total_amount = data.get('total_amount')
        payment_due_date = data.get('payment_due_date')
        payment_start_date = data.get('payment_start_date', timezone.now().date())
        
        if student and class_level_cost:
            if class_level_cost.class_level != student.current_class_level:
                raise serializers.ValidationError({
                    'class_level_cost': f'This fee structure does not belong to the student\'s current class level: {student.current_class_level}'
                })
        
        if payment_due_date and payment_due_date <= payment_start_date:
            raise serializers.ValidationError({
                'payment_due_date': 'Due date must be after start date'
            })
        
        if total_amount and total_amount <= 0:
            raise serializers.ValidationError({
                'total_amount': 'Total amount must be greater than 0'
            })
        
        return data
    
    def create(self, validated_data):
        validated_data['remaining_amount'] = validated_data['total_amount']
        validated_data['paid_amount'] = Decimal('0.00')
        return super().create(validated_data)


class CreatePaymentAssignmentSerializer(serializers.Serializer):
    """Serializer for creating payment assignments"""
    student_id = serializers.IntegerField()
    class_level_cost_ids = serializers.ListField(child=serializers.IntegerField())
    academic_year_id = serializers.IntegerField()
    payment_due_date = serializers.DateField()
    payment_start_date = serializers.DateField(required=False)
    
    def validate_student_id(self, value):
        try:
            student = Student.objects.get(id=value)
            # if student.status != 'active':
            #     raise serializers.ValidationError('Student is not active')
            return student
        except Student.DoesNotExist:
            raise serializers.ValidationError('Student not found')
    
    def validate_class_level_cost_ids(self, value):
        costs = ClassLevelCost.objects.filter(id__in=value)
        if len(costs) != len(value):
            raise serializers.ValidationError('One or more fee structures not found')
        return costs
    
    def validate(self, data):
        student = data.get('student_id')
        costs = data.get('class_level_cost_ids')
        
        if student and costs:
            for cost in costs:
                if cost.class_level != student.current_class_level:
                    raise serializers.ValidationError(
                        f'Fee structure "{cost.name}" does not belong to student\'s class level'
                    )
        
        return data


class MakePaymentSerializer(serializers.Serializer):
    """Serializer for making a payment"""
    payment_assignment_id = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    payment_method = serializers.ChoiceField(choices=PaymentMethod.choices)
    phone_number = serializers.CharField(required=False, allow_blank=True)
    mobile_money_provider = serializers.CharField(required=False, allow_blank=True)
    bank_name = serializers.CharField(required=False, allow_blank=True)
    bank_account_number = serializers.CharField(required=False, allow_blank=True)
    bank_receipt_number = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate_payment_assignment_id(self, value):
        try:
            assignment = StudentPaymentAssignment.objects.get(id=value)
            if assignment.status == PaymentStatus.COMPLETED:
                raise serializers.ValidationError('This payment assignment is already completed')
            return assignment
        except StudentPaymentAssignment.DoesNotExist:
            raise serializers.ValidationError('Payment assignment not found')
    
    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Amount must be greater than 0')
        return value
    
    def validate(self, data):
        assignment = data.get('payment_assignment_id')
        amount = data.get('amount')
        payment_method = data.get('payment_method')
        
        if assignment and amount:
            if amount > assignment.remaining_amount:
                raise serializers.ValidationError({
                    'amount': f'Amount ({amount}) exceeds remaining balance ({assignment.remaining_amount})'
                })
        
        if payment_method == PaymentMethod.MOBILE_MONEY:
            if not data.get('phone_number'):
                raise serializers.ValidationError({
                    'phone_number': 'Phone number is required for mobile money payments'
                })
        
        if payment_method == PaymentMethod.BANK_TRANSFER:
            if not data.get('bank_receipt_number'):
                raise serializers.ValidationError({
                    'bank_receipt_number': 'Bank receipt number is required for bank transfers'
                })
        
        return data


class PaymentSummarySerializer(serializers.Serializer):
    """Serializer for payment summary"""
    total_assigned = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_paid = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_remaining = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_overdue = serializers.DecimalField(max_digits=12, decimal_places=2)
    completed_count = serializers.IntegerField()
    pending_count = serializers.IntegerField()
    overdue_count = serializers.IntegerField()