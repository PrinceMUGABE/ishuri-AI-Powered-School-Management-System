# celery.py or tasks.py
from celery import shared_task
from celery.schedules import crontab
from payments.services import PaymentService

@shared_task
def send_weekly_payment_reminders():
    """Celery task to send weekly payment reminders"""
    return PaymentService.send_weekly_payment_reminders()

# In your celery beat schedule
CELERY_BEAT_SCHEDULE = {
    'send-payment-reminders': {
        'task': 'payments.tasks.send_weekly_payment_reminders',
        'schedule': crontab(day_of_week='friday', hour=9, minute=0),
    },
}