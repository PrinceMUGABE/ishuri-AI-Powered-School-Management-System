# academics/migrations/0004_fix_payment_type.py
from django.db import migrations, models
import django.db.models.deletion


def create_payment_types(apps, schema_editor):
    """Create default payment types"""
    PaymentType = apps.get_model('academics', 'PaymentType')
    
    default_types = [
        {'name': 'Termly', 'code': 'TERMLY', 'description': 'Payment per term', 'is_active': True},
        {'name': 'Yearly', 'code': 'YEARLY', 'description': 'Payment per year', 'is_active': True},
        {'name': 'Monthly', 'code': 'MONTHLY', 'description': 'Payment per month', 'is_active': True},
        {'name': 'Weekly', 'code': 'WEEKLY', 'description': 'Payment per week', 'is_active': True},
        {'name': 'Pay Once', 'code': 'ONCE', 'description': 'One-time payment', 'is_active': True},
    ]
    
    for type_data in default_types:
        PaymentType.objects.get_or_create(
            code=type_data['code'],
            defaults=type_data
        )


def set_default_payment_type(apps, schema_editor):
    """Set default payment type for existing class level costs"""
    PaymentType = apps.get_model('academics', 'PaymentType')
    ClassLevelCost = apps.get_model('academics', 'ClassLevelCost')
    
    try:
        termly_type = PaymentType.objects.get(code='TERMLY')
        ClassLevelCost.objects.all().update(payment_type=termly_type)
    except PaymentType.DoesNotExist:
        pass


class Migration(migrations.Migration):

    dependencies = [
        ('academics', '0003_paymenttype_remove_classlevelcost_frequency_and_more'),  # This is the correct dependency
    ]

    operations = [
        # Add payment_type field if it doesn't exist
        migrations.AddField(
            model_name='classlevelcost',
            name='payment_type',
            field=models.ForeignKey(
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='costs',
                to='academics.paymenttype',
                verbose_name='payment type',
            ),
        ),
        
        # Create default payment types
        migrations.RunPython(create_payment_types, reverse_code=migrations.RunPython.noop),
        
        # Set default payment type for existing records
        migrations.RunPython(set_default_payment_type, reverse_code=migrations.RunPython.noop),
        
        # Make payment_type non-nullable
        migrations.AlterField(
            model_name='classlevelcost',
            name='payment_type',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='costs',
                to='academics.paymenttype',
                verbose_name='payment type',
            ),
        ),
    ]