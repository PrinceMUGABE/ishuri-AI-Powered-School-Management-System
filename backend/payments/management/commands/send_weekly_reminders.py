# payments/management/commands/send_weekly_reminders.py
from django.core.management.base import BaseCommand
from django.utils import timezone
from payments.services import PaymentService


class Command(BaseCommand):
    help = 'Send weekly payment reminders to students and parents every Friday'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force send reminders even if not Friday',
        )
    
    def handle(self, *args, **options):
        force = options['force']
        today = timezone.now().date()
        
        # Check if today is Friday (weekday 4 where Monday=0)
        if not force and today.weekday() != 4:
            self.stdout.write(
                self.style.WARNING(
                    f'Today is {today.strftime("%A")}. Reminders are only sent on Fridays. '
                    'Use --force to override.'
                )
            )
            return
        
        self.stdout.write(self.style.SUCCESS('Starting weekly payment reminders...'))
        
        # Send reminders
        result = PaymentService.send_weekly_payment_reminders()
        
        if result['success']:
            self.stdout.write(
                self.style.SUCCESS(
                    f"\n✅ Successfully sent {result['reminders_sent']} reminders\n"
                    f"   Students: {result['students_notified']}\n"
                    f"   Parents: {result['parents_notified']}\n"
                    f"   Total Pending Amount: ${result['total_pending_amount']:,.2f}"
                )
            )
        else:
            self.stdout.write(self.style.ERROR(f"\n❌ Failed to send reminders: {result['message']}"))