# payments/admin.py
from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from .models import StudentPaymentAssignment, PaymentTransaction


class PaymentTransactionInline(admin.TabularInline):
    model = PaymentTransaction
    extra = 0
    fields = ['amount', 'payment_method', 'transaction_status', 'transaction_reference', 'paid_at']
    readonly_fields = ['transaction_reference', 'paid_at']


@admin.register(StudentPaymentAssignment)
class StudentPaymentAssignmentAdmin(admin.ModelAdmin):
    list_display = ['id', 'student', 'class_level_cost', 'total_amount', 'paid_amount', 'remaining_amount', 'status', 'payment_due_date']
    list_filter = ['status', 'academic_year', 'created_at']
    search_fields = ['student__full_name', 'student__roll_number', 'class_level_cost__name']
    readonly_fields = ['id', 'created_at', 'updated_at', 'paid_amount', 'remaining_amount']
    inlines = [PaymentTransactionInline]
    
    fieldsets = (
        (_('Student Information'), {
            'fields': ('student', 'class_level_cost', 'academic_year')
        }),
        (_('Amount Details'), {
            'fields': ('total_amount', 'paid_amount', 'remaining_amount')
        }),
        (_('Payment Period'), {
            'fields': ('payment_start_date', 'payment_due_date', 'payment_extended_until')
        }),
        (_('Status'), {
            'fields': ('status',)
        }),
        (_('Metadata'), {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = ['id', 'transaction_reference', 'payment_assignment', 'amount', 'payment_method', 'transaction_status', 'paid_at']
    list_filter = ['payment_method', 'transaction_status', 'created_at']
    search_fields = ['transaction_reference', 'receipt_number', 'phone_number']
    readonly_fields = ['id', 'transaction_reference', 'receipt_number', 'created_at']
    
    fieldsets = (
        (_('Transaction Information'), {
            'fields': ('payment_assignment', 'amount', 'payment_method', 'payment_type', 'transaction_status')
        }),
        (_('Mobile Money Details'), {
            'fields': ('phone_number', 'mobile_money_provider'),
            'classes': ('collapse',)
        }),
        (_('Bank Transfer Details'), {
            'fields': ('bank_name', 'bank_account_number', 'bank_receipt_number'),
            'classes': ('collapse',)
        }),
        (_('References'), {
            'fields': ('transaction_reference', 'receipt_number', 'notes')
        }),
        (_('Timestamps'), {
            'fields': ('paid_at', 'created_at', 'updated_at', 'recorded_by'),
            'classes': ('collapse',)
        }),
    )