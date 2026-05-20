# payments/models.py
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal
from datetime import date

from academics.models import ClassLevelCost, AcademicYear
from accounts.models import User
from students.models import Student


class PaymentStatus(models.TextChoices):
    """Payment status for a payment assignment"""
    WAITING = 'waiting', _('Waiting')
    STARTED = 'started', _('Started')
    COMPLETED = 'completed', _('Completed')
    FAILED = 'failed', _('Failed')
    PARTIALLY_PAID = 'partially_paid', _('Partially Paid')
    OVERDUE = 'overdue', _('Overdue')


class PaymentMethod(models.TextChoices):
    """Payment methods"""
    MOBILE_MONEY = 'mobile_money', _('Mobile Money')
    BANK_TRANSFER = 'bank_transfer', _('Bank Transfer')
    CASH = 'cash', _('Cash')
    CHEQUE = 'cheque', _('Cheque')


class PaymentType(models.TextChoices):
    """Payment type"""
    FULLY_PAID = 'fully_paid', _('Fully Paid')
    PARTIALLY_PAID = 'partially_paid', _('Partially Paid')


class StudentPaymentAssignment(models.Model):
    """
    Model to track which fee structures are assigned to which student
    A student can have multiple fee assignments for a given academic year
    """
    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name='payment_assignments',
        verbose_name=_('student')
    )
    class_level_cost = models.ForeignKey(
        ClassLevelCost,
        on_delete=models.CASCADE,
        related_name='student_assignments',
        verbose_name=_('fee structure')
    )
    academic_year = models.ForeignKey(
        AcademicYear,
        on_delete=models.CASCADE,
        related_name='payment_assignments',
        verbose_name=_('academic year')
    )
    
    # Amount details
    total_amount = models.DecimalField(
        _('total amount'),
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'), message=_('Amount must be greater than 0'))]
    )
    paid_amount = models.DecimalField(
        _('paid amount'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0'), message=_('Paid amount cannot be negative'))]
    )
    remaining_amount = models.DecimalField(
        _('remaining amount'),
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )
    
    # Payment period
    payment_start_date = models.DateField(_('payment start date'), default=timezone.now)
    payment_due_date = models.DateField(_('payment due date'))
    payment_extended_until = models.DateField(_('payment extended until'), null=True, blank=True)
    
    # Status
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.WAITING
    )
    
    # Timestamps
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_payment_assignments',
        verbose_name=_('created by')
    )
    
    class Meta:
        verbose_name = _('student payment assignment')
        verbose_name_plural = _('student payment assignments')
        ordering = ['-created_at']
        unique_together = [['student', 'class_level_cost', 'academic_year']]
        indexes = [
            models.Index(fields=['student', 'status']),
            models.Index(fields=['academic_year', 'status']),
            models.Index(fields=['payment_due_date']),
            models.Index(fields=['status']),
        ]
    
    def clean(self):
        """Validate payment assignment data"""
        # Ensure dates are date objects, not strings
        if self.payment_due_date and self.payment_start_date:
            # Convert to date if they're strings (though Django should handle this)
            from datetime import date
            
            due_date = self.payment_due_date
            start_date = self.payment_start_date
            
            if isinstance(due_date, str):
                from datetime import datetime
                due_date = datetime.strptime(due_date, '%Y-%m-%d').date()
            if isinstance(start_date, str):
                from datetime import datetime
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            
            if due_date <= start_date:
                raise ValidationError({
                    'payment_due_date': _('Due date must be after start date')
                })
        
        if self.payment_extended_until and self.payment_start_date:
            # Convert to date if they're strings
            from datetime import date
            
            extended_until = self.payment_extended_until
            start_date = self.payment_start_date
            
            if isinstance(extended_until, str):
                from datetime import datetime
                extended_until = datetime.strptime(extended_until, '%Y-%m-%d').date()
            if isinstance(start_date, str):
                from datetime import datetime
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            
            if extended_until <= start_date:
                raise ValidationError({
                    'payment_extended_until': _('Extended date must be after start date')
                })
        
        if self.paid_amount > self.total_amount:
            raise ValidationError({
                'paid_amount': _('Paid amount cannot exceed total amount')
            })
        
        # Check if class level cost belongs to student's class level
        if self.class_level_cost and self.student:
            if self.class_level_cost.class_level != self.student.current_class_level:
                raise ValidationError({
                    'class_level_cost': _('This fee structure does not belong to the student\'s current class level')
                })
    
    def save(self, *args, **kwargs):
        # Auto-calculate remaining amount
        self.remaining_amount = self.total_amount - self.paid_amount
        
        # Update status based on payment
        if self.remaining_amount <= 0:
            self.status = PaymentStatus.COMPLETED
        elif self.paid_amount > 0 and self.remaining_amount > 0:
            self.status = PaymentStatus.PARTIALLY_PAID
        elif self.status == PaymentStatus.WAITING and self.paid_amount == 0:
            # Check if due date has passed
            if self.payment_due_date and self.payment_due_date < timezone.now().date():
                self.status = PaymentStatus.OVERDUE
            else:
                self.status = PaymentStatus.WAITING
        
        self.clean()
        super().save(*args, **kwargs)
    
    def update_paid_amount(self, amount):
        """Update paid amount when a payment is made"""
        new_paid_amount = self.paid_amount + amount
        if new_paid_amount > self.total_amount:
            raise ValidationError(_('Payment amount exceeds remaining balance'))
        
        self.paid_amount = new_paid_amount
        self.save()
        return self.remaining_amount
    
    @property
    def is_overdue(self):
        """Check if payment is overdue"""
        due_date = self.payment_extended_until or self.payment_due_date
        return due_date and due_date < timezone.now().date() and self.remaining_amount > 0
    
    def __str__(self):
        return f"{self.student.full_name} - {self.class_level_cost.name} - {self.status}"


class PaymentTransaction(models.Model):
    """
    Model to track individual payment transactions
    """
    class TransactionStatus(models.TextChoices):
        PENDING = 'pending', _('Pending')
        COMPLETED = 'completed', _('Completed')
        FAILED = 'failed', _('Failed')
        REFUNDED = 'refunded', _('Refunded')
    
    payment_assignment = models.ForeignKey(
        StudentPaymentAssignment,
        on_delete=models.CASCADE,
        related_name='transactions',
        verbose_name=_('payment assignment')
    )
    
    # Transaction details
    amount = models.DecimalField(
        _('amount'),
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'), message=_('Amount must be greater than 0'))]
    )
    
    payment_method = models.CharField(
        _('payment method'),
        max_length=20,
        choices=PaymentMethod.choices
    )
    
    payment_type = models.CharField(
        _('payment type'),
        max_length=20,
        choices=PaymentType.choices,
        default=PaymentType.PARTIALLY_PAID
    )
    
    transaction_status = models.CharField(
        _('transaction status'),
        max_length=20,
        choices=TransactionStatus.choices,
        default=TransactionStatus.PENDING
    )
    
    # Mobile money specific fields
    phone_number = models.CharField(
        _('phone number'),
        max_length=20,
        blank=True,
        null=True,
        help_text=_('Phone number used for mobile money payment')
    )
    mobile_money_provider = models.CharField(
        _('mobile money provider'),
        max_length=50,
        blank=True,
        null=True,
        choices=[('mtn', 'MTN'), ('airtel', 'Airtel'), ('tigo', 'Tigo')]
    )
    transaction_reference = models.CharField(
        _('transaction reference'),
        max_length=100,
        unique=True,
        blank=True,
        null=True
    )
    
    # Bank transfer specific fields
    bank_name = models.CharField(_('bank name'), max_length=100, blank=True, null=True)
    bank_account_number = models.CharField(_('bank account number'), max_length=50, blank=True, null=True)
    bank_receipt_number = models.CharField(_('bank receipt number'), max_length=100, blank=True, null=True)
    
    # Payment timestamps
    paid_at = models.DateTimeField(_('paid at'), null=True, blank=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    # Who recorded the payment
    recorded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='recorded_payments',
        verbose_name=_('recorded by')
    )
    
    # Additional notes
    notes = models.TextField(_('notes'), blank=True)
    receipt_number = models.CharField(_('receipt number'), max_length=100, blank=True, null=True)
    
    class Meta:
        verbose_name = _('payment transaction')
        verbose_name_plural = _('payment transactions')
        ordering = ['-paid_at', '-created_at']
        indexes = [
            models.Index(fields=['transaction_reference']),
            models.Index(fields=['transaction_status']),
            models.Index(fields=['paid_at']),
            models.Index(fields=['payment_assignment', 'transaction_status']),
        ]
    
    def clean(self):
        """Validate payment transaction"""
        if self.payment_method == PaymentMethod.MOBILE_MONEY:
            if not self.phone_number:
                raise ValidationError({
                    'phone_number': _('Phone number is required for mobile money payments')
                })
        
        if self.payment_method == PaymentMethod.BANK_TRANSFER:
            if not self.bank_receipt_number:
                raise ValidationError({
                    'bank_receipt_number': _('Bank receipt number is required for bank transfers')
                })
        
        # Only check remaining balance for new/pending transactions,
        # not when completing an already-processed one
        if (self.payment_assignment_id and 
                self.transaction_status == self.TransactionStatus.PENDING):
            if self.amount > self.payment_assignment.remaining_amount:
                raise ValidationError({
                    'amount': _('Payment amount (${}) exceeds remaining balance (${})').format(
                        self.amount, self.payment_assignment.remaining_amount
                    )
                })
    def save(self, *args, **kwargs):
        if not self.transaction_reference:
            import uuid
            self.transaction_reference = f"TXN-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
        
        if not self.receipt_number:
            self.receipt_number = f"RCP-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        
        if self.transaction_status == self.TransactionStatus.COMPLETED and not self.paid_at:
            self.paid_at = timezone.now()
        
        self.clean()
        super().save(*args, **kwargs)
    
    def complete_transaction(self):
        """Complete the payment transaction and update the assignment"""
        if self.transaction_status != self.TransactionStatus.COMPLETED:
            self.transaction_status = self.TransactionStatus.COMPLETED
            self.paid_at = timezone.now()
            
            # Update the payment assignment FIRST
            self.payment_assignment.update_paid_amount(self.amount)
            
            # Determine payment type based on updated assignment
            if self.payment_assignment.remaining_amount <= 0:
                self.payment_type = PaymentType.FULLY_PAID
            else:
                self.payment_type = PaymentType.PARTIALLY_PAID
            
            # Use update_fields to bypass clean() — the amount was already
            # validated when the transaction was first saved
            PaymentTransaction.objects.filter(pk=self.pk).update(
                transaction_status=self.transaction_status,
                paid_at=self.paid_at,
                payment_type=self.payment_type,
            )
            # Refresh so self reflects the DB state
            self.refresh_from_db()
            
            return True
        return False
    def __str__(self):
        return f"{self.transaction_reference} - {self.amount} - {self.transaction_status}"