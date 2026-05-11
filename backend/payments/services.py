# payments/services.py
from django.utils import timezone
from django.db import transaction
from decimal import Decimal
from datetime import datetime, timedelta
import logging

from .models import StudentPaymentAssignment, PaymentTransaction, PaymentStatus
from .translations import PaymentTranslations
from notifications.services import NotificationService

logger = logging.getLogger(__name__)


class PaymentService:
    """Service class for payment operations"""
    
    @classmethod
    def create_payment_assignments(cls, student, class_level_costs, academic_year, 
                                   payment_due_date, payment_start_date, created_by, request):
        """Create payment assignments for a student"""
        assignments = []
        
        with transaction.atomic():
            for cost in class_level_costs:
                # Check if assignment already exists
                existing = StudentPaymentAssignment.objects.filter(
                    student=student,
                    class_level_cost=cost,
                    academic_year=academic_year
                ).first()
                
                if existing:
                    continue
                
                assignment = StudentPaymentAssignment(
                    student=student,
                    class_level_cost=cost,
                    academic_year=academic_year,
                    total_amount=cost.amount,
                    payment_start_date=payment_start_date or timezone.now().date(),
                    payment_due_date=payment_due_date,
                    created_by=created_by
                )
                assignment.save()
                assignments.append(assignment)
                
                # Create notification for student
                cls._create_assignment_notification(assignment, request)
        
        return assignments
    
    @classmethod
    def _create_assignment_notification(cls, assignment, request):
        """Create notification for payment assignment"""
        user = assignment.student.user if assignment.student.user else None
        
        if user:
            language = cls._get_user_language(request, user)
            
            title = PaymentTranslations.get_notification_title(
                'PAYMENT_ASSIGNMENT_CREATED',
                language,
                amount=assignment.total_amount,
                fee_name=assignment.class_level_cost.name,
                due_date=assignment.payment_due_date
            )
            
            message = PaymentTranslations.get_notification_message(
                'PAYMENT_ASSIGNMENT_CREATED',
                language,
                amount=assignment.total_amount,
                fee_name=assignment.class_level_cost.name,
                due_date=assignment.payment_due_date
            )
            
            # Print to terminal
            print(f"\n🔔 NOTIFICATION CREATED:")
            print(f"   Recipient: {user.username}")
            print(f"   Title: {title}")
            print(f"   Message: {message}")
            print(f"   Language: {language}\n")
            
            NotificationService.create_academic_notification(
                user=user,
                notification_type='fee_structure_created',
                title=title,
                message=message,
                created_by=assignment.created_by,
                extra_data={
                    'assignment_id': assignment.id,
                    'total_amount': str(assignment.total_amount),
                    'fee_name': assignment.class_level_cost.name
                }
            )
    
    @classmethod
    def process_payment(cls, payment_assignment, amount, payment_method, 
                        recorded_by, request, **kwargs):
        """Process a payment transaction"""
        with transaction.atomic():
            # Create transaction
            transaction_obj = PaymentTransaction(
                payment_assignment=payment_assignment,
                amount=amount,
                payment_method=payment_method,
                recorded_by=recorded_by,
                notes=kwargs.get('notes', ''),
                phone_number=kwargs.get('phone_number'),
                mobile_money_provider=kwargs.get('mobile_money_provider'),
                bank_name=kwargs.get('bank_name'),
                bank_account_number=kwargs.get('bank_account_number'),
                bank_receipt_number=kwargs.get('bank_receipt_number')
            )
            transaction_obj.save()
            
            # Complete the transaction
            transaction_obj.complete_transaction()
            
            # Refresh assignment to get updated values
            payment_assignment.refresh_from_db()
            
            # Create payment received notification
            cls._create_payment_notification(payment_assignment, transaction_obj, request)
            
            # If payment is completed, create completion notification
            if payment_assignment.remaining_amount <= 0:
                cls._create_completion_notification(payment_assignment, request)
            
            # Check for overdue and create notification
            if payment_assignment.is_overdue:
                cls._create_overdue_notification(payment_assignment, request)
            
            return transaction_obj
    
    @classmethod
    def _create_payment_notification(cls, assignment, transaction_obj, request):
        """Create notification for payment received"""
        user = assignment.student.user if assignment.student.user else None
        
        if user:
            language = cls._get_user_language(request, user)
            
            title = PaymentTranslations.get_notification_title(
                'PAYMENT_RECEIVED',
                language,
                amount=transaction_obj.amount,
                reference=transaction_obj.transaction_reference
            )
            
            message = PaymentTranslations.get_notification_message(
                'PAYMENT_RECEIVED',
                language,
                amount=transaction_obj.amount,
                reference=transaction_obj.transaction_reference
            )
            
            print(f"\n💰 PAYMENT RECEIVED NOTIFICATION:")
            print(f"   Recipient: {user.username}")
            print(f"   Title: {title}")
            print(f"   Message: {message}")
            print(f"   Amount: {transaction_obj.amount}")
            print(f"   Language: {language}\n")
            
            NotificationService.create_academic_notification(
                user=user,
                notification_type='fee_payment_received',
                title=title,
                message=message,
                created_by=transaction_obj.recorded_by,
                extra_data={
                    'transaction_id': transaction_obj.id,
                    'amount': str(transaction_obj.amount),
                    'remaining_amount': str(assignment.remaining_amount),
                    'reference': transaction_obj.transaction_reference
                }
            )
            
            # Also notify parents if student has user account
            for parent_link in assignment.student.parent_students.all():
                parent_user = parent_link.parent.user
                if parent_user:
                    cls._create_parent_payment_notification(
                        parent_user, assignment, transaction_obj, request
                    )
    
    @classmethod
    def _create_parent_payment_notification(cls, parent_user, assignment, transaction_obj, request):
        """Create notification for parent about student payment"""
        language = cls._get_user_language(request, parent_user)
        
        title = PaymentTranslations.get_notification_title(
            'PAYMENT_RECEIVED',
            language,
            amount=transaction_obj.amount,
            reference=transaction_obj.transaction_reference
        )
        
        message = f"Payment received for student {assignment.student.full_name}: {transaction_obj.amount}"
        
        print(f"\n👪 PARENT PAYMENT NOTIFICATION:")
        print(f"   Parent: {parent_user.username}")
        print(f"   Student: {assignment.student.full_name}")
        print(f"   Title: {title}")
        print(f"   Message: {message}")
        print(f"   Language: {language}\n")
        
        NotificationService.create_academic_notification(
            user=parent_user,
            notification_type='fee_payment_received',
            title=title,
            message=message,
            created_by=transaction_obj.recorded_by,
            extra_data={
                'student_name': assignment.student.full_name,
                'amount': str(transaction_obj.amount),
                'reference': transaction_obj.transaction_reference
            }
        )
    
    @classmethod
    def _create_completion_notification(cls, assignment, request):
        """Create notification for completed payment"""
        user = assignment.student.user if assignment.student.user else None
        
        if user:
            language = cls._get_user_language(request, user)
            
            title = PaymentTranslations.get_notification_title(
                'PAYMENT_COMPLETED',
                language,
                fee_name=assignment.class_level_cost.name
            )
            
            message = PaymentTranslations.get_notification_message(
                'PAYMENT_COMPLETED',
                language,
                fee_name=assignment.class_level_cost.name
            )
            
            print(f"\n✅ PAYMENT COMPLETED NOTIFICATION:")
            print(f"   Recipient: {user.username}")
            print(f"   Title: {title}")
            print(f"   Message: {message}")
            print(f"   Language: {language}\n")
            
            NotificationService.create_academic_notification(
                user=user,
                notification_type='fee_payment_received',
                title=title,
                message=message,
                created_by=assignment.created_by,
                extra_data={
                    'assignment_id': assignment.id,
                    'fee_name': assignment.class_level_cost.name,
                    'total_paid': str(assignment.paid_amount)
                }
            )
    
    @classmethod
    def _create_overdue_notification(cls, assignment, request):
        """Create empathetic notification for overdue payment"""
        user = assignment.student.user if assignment.student.user else None
        
        if user:
            language = cls._get_user_language(request, user)
            
            title = PaymentTranslations.get_notification_title(
                'PAYMENT_OVERDUE',
                language,
                remaining_amount=assignment.remaining_amount,
                fee_name=assignment.class_level_cost.name,
                due_date=assignment.payment_due_date
            )
            
            message = PaymentTranslations.get_notification_message(
                'PAYMENT_OVERDUE',
                language,
                remaining_amount=assignment.remaining_amount,
                fee_name=assignment.class_level_cost.name,
                due_date=assignment.payment_due_date
            )
            
            print(f"\n⚠️ PAYMENT OVERDUE NOTIFICATION:")
            print(f"   Recipient: {user.username}")
            print(f"   Title: {title}")
            print(f"   Message: {message}")
            print(f"   Language: {language}\n")
            
            NotificationService.create_academic_notification(
                user=user,
                notification_type='fee_payment_overdue',
                title=title,
                message=message,
                created_by=None,
                extra_data={
                    'assignment_id': assignment.id,
                    'remaining_amount': str(assignment.remaining_amount),
                    'due_date': str(assignment.payment_due_date)
                },
                priority='high'
            )
    
    @classmethod
    def send_weekly_payment_reminders(cls):
        """
        Send professional, kind, and empathetic payment reminders every Friday
        This function should be called by a scheduled task (cron job or celery beat)
        """
        print(f"\n{'='*80}")
        print(f"📅 WEEKLY PAYMENT REMINDER JOB STARTED - {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*80}\n")
        
        today = timezone.now().date()
        
        # Check if today is Friday (weekday 4 in Python where Monday=0)
        if today.weekday() != 4:
            print(f"ℹ️ Today is not Friday (Weekday: {today.weekday()}). Reminders only sent on Fridays.")
            print(f"   Skipping reminder job...\n")
            return {
                'success': False,
                'message': 'Reminders only sent on Fridays',
                'reminders_sent': 0
            }
        
        # Get all active payment assignments with remaining balance
        # This includes: waiting, started, partially_paid, and overdue statuses
        pending_assignments = StudentPaymentAssignment.objects.filter(
            status__in=[
                PaymentStatus.WAITING, 
                PaymentStatus.STARTED, 
                PaymentStatus.PARTIALLY_PAID,
                PaymentStatus.OVERDUE
            ],
            remaining_amount__gt=0
        ).select_related('student', 'class_level_cost')
        
        reminders_sent = 0
        students_notified = set()
        parents_notified = set()
        
        for assignment in pending_assignments:
            # Calculate days until due or days overdue
            days_until_due = (assignment.payment_due_date - today).days
            days_overdue = (today - assignment.payment_due_date).days if today > assignment.payment_due_date else 0
            
            # Determine reminder type based on payment status
            if assignment.status == PaymentStatus.OVERDUE or days_overdue > 0:
                reminder_type = 'overdue'
                priority = 'high'
            elif days_until_due <= 7:
                reminder_type = 'urgent'
                priority = 'high'
            elif days_until_due <= 14:
                reminder_type = 'upcoming'
                priority = 'medium'
            else:
                reminder_type = 'general'
                priority = 'low'
            
            # Send reminder to student
            if assignment.student.user:
                cls._send_student_reminder(assignment, reminder_type, days_until_due, days_overdue, priority)
                reminders_sent += 1
                students_notified.add(assignment.student.id)
            
            # Send reminder to parents/guardians
            for parent_link in assignment.student.parent_students.all():
                parent = parent_link.parent
                if parent.user:
                    cls._send_parent_reminder(assignment, parent, reminder_type, days_until_due, days_overdue, priority)
                    reminders_sent += 1
                    parents_notified.add(parent.id)
        
        # Summary report
        print(f"\n{'='*80}")
        print(f"📊 WEEKLY REMINDER SUMMARY")
        print(f"{'='*80}")
        print(f"📅 Date: {today.strftime('%Y-%m-%d')}")
        print(f"📧 Total Reminders Sent: {reminders_sent}")
        print(f"👨‍🎓 Students Notified: {len(students_notified)}")
        print(f"👨‍👩‍👧 Parents/Guardians Notified: {len(parents_notified)}")
        print(f"💰 Total Pending Amount: ${sum(a.remaining_amount for a in pending_assignments):,.2f}")
        print(f"\n📋 Reminder Breakdown:")
        print(f"   • Overdue Assignments: {pending_assignments.filter(status=PaymentStatus.OVERDUE).count()}")
        print(f"   • Partially Paid: {pending_assignments.filter(status=PaymentStatus.PARTIALLY_PAID).count()}")
        print(f"   • Waiting/Started: {pending_assignments.filter(status__in=[PaymentStatus.WAITING, PaymentStatus.STARTED]).count()}")
        print(f"{'='*80}\n")
        
        return {
            'success': True,
            'message': f'Weekly reminders sent successfully',
            'date': today.strftime('%Y-%m-%d'),
            'reminders_sent': reminders_sent,
            'students_notified': len(students_notified),
            'parents_notified': len(parents_notified),
            'total_pending_amount': float(sum(a.remaining_amount for a in pending_assignments))
        }
    
    @classmethod
    def _send_student_reminder(cls, assignment, reminder_type, days_until_due, days_overdue, priority):
        """Send empathetic reminder to student"""
        user = assignment.student.user
        
        if not user:
            return
        
        # Get user's language preference
        language = user.language if hasattr(user, 'language') and user.language else 'en'
        
        # Professional, kind, and empathetic reminder templates
        reminder_templates = {
            'overdue': {
                'title': {
                    'en': '💙 We Care About Your Success - Payment Reminder',
                    'fr': '💙 Votre Réussite Nous Tient à Cœur - Rappel de Paiement',
                    'rw': '💙 Dukomeye ku byago byawe - Uributso bw\'ishyurwa'
                },
                'message': {
                    'en': """Dear {student_name},

We hope this message finds you well. We understand that sometimes life can present unexpected challenges, and we want you to know that we're here to support you.

We noticed that your payment of {remaining_amount} for {fee_name} is now overdue by {days_overdue} day(s). The original due date was {due_date}.

We understand that financial situations can be difficult, and we don't want this to be a source of stress for you. Your education and well-being are our top priorities.

💙 **How we can help:**
• We can work together to create a flexible payment plan
• Please reach out to our finance office to discuss extended payment options
• We offer financial counseling and support services

📞 **Contact our support team:**
• Finance Office: [Phone Number]
• Email: finance@school.com
• Visit us: Monday-Friday, 8AM-4PM

Please don't hesitate to reach out. We're committed to finding a solution that works for you. Remember, asking for help is a sign of strength, not weakness.

With understanding and support,
Your School Administration Team

💫 *No judgment, just support*""",
                    'fr': """Cher/Chère {student_name},

Nous espérons que ce message vous trouvera en bonne santé. Nous comprenons que la vie peut parfois présenter des défis inattendus, et nous voulons que vous sachiez que nous sommes là pour vous soutenir.

Nous avons remarqué que votre paiement de {remaining_amount} pour {fee_name} est maintenant en retard de {days_overdue} jour(s). La date d'échéance initiale était le {due_date}.

Nous comprenons que les situations financières peuvent être difficiles, et nous ne voulons pas que cela soit une source de stress pour vous. Votre éducation et votre bien-être sont nos priorités absolues.

💙 **Comment nous pouvons vous aider :**
• Nous pouvons travailler ensemble pour créer un plan de paiement flexible
• Veuillez contacter notre bureau des finances pour discuter des options de paiement prolongé
• Nous offrons des services de conseil et de soutien financier

📞 **Contactez notre équipe de soutien :**
• Bureau des finances : [Numéro de téléphone]
• Email : finance@school.com
• Visitez-nous : Lundi-Vendredi, 8h-16h

N'hésitez pas à nous contacter. Nous nous engageons à trouver une solution qui fonctionne pour vous. Rappelez-vous, demander de l'aide est un signe de force, pas de faiblesse.

Avec compréhension et soutien,
Votre équipe administrative scolaire

💫 *Pas de jugement, juste du soutien*"""
                }
            },
            'urgent': {
                'title': {
                    'en': '🌟 Friendly Reminder: Your Payment is Coming Up Soon',
                    'fr': '🌟 Rappel Amical : Votre Paiement Approche',
                    'rw': '🌟 Uributso bw\'ubuntu: Ishyurwa ryawe riregiye'
                },
                'message': {
                    'en': """Dear {student_name},

Warm greetings! We hope you're having a wonderful week and making great progress in your studies.

We're reaching out with a gentle reminder that your payment of {remaining_amount} for {fee_name} is due in just {days_until_due} day(s) on {due_date}.

We know that managing finances alongside your studies can be challenging, which is why we want to remind you early so you can plan accordingly.

💙 **Here's how we can support you:**
• Early payment discount available (ask our finance office)
• Flexible payment installments can be arranged
• Need more time? Just let us know - we're happy to discuss extensions

✅ **Quick and easy payment options:**
• Mobile Money: Quick and convenient
• Bank Transfer: Secure and reliable
• Online Portal: 24/7 access
• In-person: Our finance office is always open to help

Remember, we're a team, and we succeed together. If you're facing any difficulties, please don't wait until the last minute - reach out to us today. We're here to listen and help.

Wishing you continued success in your studies!

Warm regards,
Your School Administration Team

💫 *Your success is our success*""",
                    'fr': """Cher/Chère {student_name},

Chaleureuses salutations ! Nous espérons que vous passez une excellente semaine et que vous faites de grands progrès dans vos études.

Nous vous rappelons gentiment que votre paiement de {remaining_amount} pour {fee_name} est dû dans {days_until_due} jour(s) le {due_date}.

Nous savons que gérer ses finances tout en poursuivant ses études peut être difficile, c'est pourquoi nous souhaitons vous le rappeler tôt afin que vous puissiez planifier en conséquence.

💙 **Voici comment nous pouvons vous soutenir :**
• Réduction pour paiement anticipé disponible (renseignez-vous auprès de notre bureau des finances)
• Des paiements flexibles en plusieurs fois peuvent être arrangés
• Besoin de plus de temps ? Dites-le nous simplement - nous sommes heureux de discuter des prolongations

✅ **Options de paiement simples et rapides :**
• Mobile Money : Rapide et pratique
• Virement bancaire : Sécurisé et fiable
• Portail en ligne : Disponible 24h/24 et 7j/7
• En personne : Notre bureau des finances est toujours ouvert pour vous aider

N'oubliez pas, nous sommes une équipe, et nous réussissons ensemble. Si vous rencontrez des difficultés, n'attendez pas la dernière minute - contactez-nous dès aujourd'hui. Nous sommes là pour écouter et aider.

En vous souhaitant beaucoup de succès dans vos études !

Chaleureusement,
Votre équipe administrative scolaire

💫 *Votre réussite est notre réussite*"""
                }
            },
            'upcoming': {
                'title': {
                    'en': '📚 Planning Ahead: Your Upcoming Payment Reminder',
                    'fr': '📚 Planification : Rappel de Votre Paiement à Venir',
                    'rw': '📚 Gutegura neza: Uributso rw\'ishyurwa riri imbere'
                },
                'message': {
                    'en': """Dear {student_name},

Hello! We hope your academic journey is going well and that you're finding success in your studies.

This is a friendly reminder that you have a payment of {remaining_amount} for {fee_name} coming up on {due_date} (in {days_until_due} days).

💙 **Why we're reminding you early:**
• To help you plan your finances better
• To avoid any last-minute stress
• To ensure your academic progress continues smoothly

📝 **Helpful tips:**
• Break down the payment into smaller weekly savings
• Set a personal reminder on your phone
• Check out our online payment portal for easy transactions

Remember, we believe in you and your success. If you have any questions or need assistance, our friendly finance team is just a call or visit away.

Keep up the great work in your classes!

Best wishes,
Your School Administration Team

💫 *Prepared today for success tomorrow*""",
                    'fr': """Cher/Chère {student_name},

Bonjour ! Nous espérons que votre parcours académique se déroule bien et que vous rencontrez du succès dans vos études.

Ceci est un rappel amical que vous avez un paiement de {remaining_amount} pour {fee_name} à venir le {due_date} (dans {days_until_due} jours).

💙 **Pourquoi nous vous rappelons tôt :**
• Pour vous aider à mieux planifier vos finances
• Pour éviter tout stress de dernière minute
• Pour garantir que votre progression académique continue sans heurts

📝 **Conseils utiles :**
• Divisez le paiement en petites économies hebdomadaires
• Définissez un rappel personnel sur votre téléphone
• Consultez notre portail de paiement en ligne pour des transactions faciles

N'oubliez pas, nous croyons en vous et en votre réussite. Si vous avez des questions ou besoin d'aide, notre équipe financière sympathique n'est qu'à un appel ou une visite.

Continuez votre excellent travail dans vos cours !

Meilleurs vœux,
Votre équipe administrative scolaire

💫 *Préparé aujourd'hui pour le succès de demain*"""
                }
            },
            'general': {
                'title': {
                    'en': '💫 Investing in Your Future - Payment Information',
                    'fr': '💫 Investir dans Votre Avenir - Information de Paiement',
                    'rw': '💫 Gushora mu kazoza kawe - Amakuru y\'ishyurwa'
                },
                'message': {
                    'en': """Dear {student_name},

Greetings! We hope you're enjoying your learning experience and making wonderful progress in your education journey.

We wanted to kindly remind you about your upcoming payment of {remaining_amount} for {fee_name}, which is scheduled for {due_date} (in {days_until_due} days).

💙 **Remember:** Every payment you make is an investment in your bright future. Your education opens doors to endless opportunities, and we're honored to be part of your journey.

🌟 **Payment made easy:**
• Multiple payment methods available
• Online portal for quick transactions
• Dedicated support team ready to assist

✅ **Proactive planning:**
• Consider setting up automatic payments
• Mark your calendar as a gentle reminder
• Reach out early if you need flexibility

We're proud of your commitment to your education, and we're here to support you every step of the way.

Have a wonderful week ahead!

Warmly,
Your School Administration Team

💫 *Together, we build brighter futures*""",
                    'fr': """Cher/Chère {student_name},

Salutations ! Nous espérons que vous appréciez votre expérience d'apprentissage et que vous réalisez de merveilleux progrès dans votre parcours éducatif.

Nous souhaitons vous rappeler gentiment votre prochain paiement de {remaining_amount} pour {fee_name}, prévu pour le {due_date} (dans {days_until_due} jours).

💙 **Rappelez-vous :** Chaque paiement que vous effectuez est un investissement dans votre brillant avenir. Votre éducation ouvre les portes à des opportunités infinies, et nous sommes honorés de faire partie de votre parcours.

🌟 **Paiement facilité :**
• Multiples méthodes de paiement disponibles
• Portail en ligne pour des transactions rapides
• Équipe de soutien dédiée prête à vous aider

✅ **Planification proactive :**
• Envisagez de mettre en place des paiements automatiques
• Marquez votre calendrier comme un rappel doux
• Contactez-nous tôt si vous avez besoin de flexibilité

Nous sommes fiers de votre engagement envers votre éducation, et nous sommes là pour vous soutenir à chaque étape.

Passez une excellente semaine !

Chaleureusement,
Votre équipe administrative scolaire

💫 *Ensemble, nous construisons des avenirs meilleurs*"""
                }
            }
        }
        
        # Get the appropriate template
        template = reminder_templates.get(reminder_type, reminder_templates['general'])
        
        # Format the message with actual values
        title_template = template['title'].get(language, template['title']['en'])
        message_template = template['message'].get(language, template['message']['en'])
        
        # Prepare formatting variables
        format_vars = {
            'student_name': assignment.student.full_name,
            'fee_name': assignment.class_level_cost.name,
            'remaining_amount': f"${assignment.remaining_amount:,.2f}",
            'due_date': assignment.payment_due_date.strftime('%B %d, %Y'),
            'days_until_due': abs(days_until_due),
            'days_overdue': days_overdue
        }
        
        title = title_template.format(**format_vars)
        message = message_template.format(**format_vars)
        
        # Print to terminal for monitoring
        print(f"\n{'💙'*20}")
        print(f"📧 REMINDER SENT TO STUDENT")
        print(f"{'💙'*20}")
        print(f"👨‍🎓 Student: {assignment.student.full_name}")
        print(f"📚 Fee: {assignment.class_level_cost.name}")
        print(f"💰 Remaining: ${assignment.remaining_amount:,.2f}")
        print(f"📅 Due Date: {assignment.payment_due_date}")
        print(f"⚠️ Reminder Type: {reminder_type.upper()}")
        print(f"🌐 Language: {language}")
        print(f"📝 Title: {title[:100]}...")
        print(f"💬 Message Preview: {message[:200]}...")
        print(f"{'💙'*20}\n")
        
        # Create notification in the system
        NotificationService.create_academic_notification(
            user=user,
            notification_type='deadline_reminder',
            title=title,
            message=message,
            created_by=None,  # System notification
            extra_data={
                'assignment_id': assignment.id,
                'fee_name': assignment.class_level_cost.name,
                'remaining_amount': str(assignment.remaining_amount),
                'due_date': str(assignment.payment_due_date),
                'reminder_type': reminder_type,
                'days_until_due': days_until_due if days_until_due > 0 else 0,
                'days_overdue': days_overdue
            },
            priority=priority,
            action_url='/payments/my-payments/'
        )
    
    @classmethod
    def _send_parent_reminder(cls, assignment, parent, reminder_type, days_until_due, days_overdue, priority):
        """Send empathetic reminder to parent/guardian"""
        user = parent.user
        
        if not user:
            return
        
        # Get user's language preference
        language = user.language if hasattr(user, 'language') and user.language else 'en'
        
        # Professional, kind, and empathetic reminder templates for parents
        parent_templates = {
            'overdue': {
                'title': {
                    'en': '💙 Supporting Your Child\'s Education - Payment Update',
                    'fr': '💙 Soutenir l\'Éducation de Votre Enfant - Mise à Jour de Paiement',
                    'rw': '💙 Gukunda uburezi bw\'umwana wawe - Amakuru y\'ishyurwa'
                },
                'message': {
                    'en': """Dear {parent_name},

We hope this message finds you and your family well. As partners in your child's education, we want to communicate with transparency and compassion.

We noticed that the payment for {student_name}'s {fee_name} of {remaining_amount} is now overdue by {days_overdue} day(s). The original due date was {due_date}.

💙 **Our commitment to you:**
• We understand that financial challenges can arise unexpectedly
• Your child's education and well-being remain our top priority
• We're here to work WITH you, not against you

🤝 **How we can support your family:**
• Flexible payment arrangements tailored to your situation
• Extended payment plans with no penalties
• Financial counseling and resources available
• Confidential discussions with our finance team

📞 **Let's talk:**
• Call us directly: [Phone Number]
• Schedule a confidential meeting
• Email our support team: support@school.com

Please know that we're not here to judge or pressure you. We're here to understand and help. Every family faces challenges sometimes, and what matters most is working together to ensure {student_name} can continue learning without interruption.

We believe in {student_name}'s potential, and we believe in you. Let's find a solution together.

With genuine care and support,
Your School Administration Team

💫 *No family should face challenges alone*""",
                    'fr': """Cher/Chère {parent_name},

Nous espérons que ce message vous trouve, vous et votre famille, en bonne santé. En tant que partenaires dans l'éducation de votre enfant, nous voulons communiquer avec transparence et compassion.

Nous avons remarqué que le paiement pour {fee_name} de {student_name} de {remaining_amount} est maintenant en retard de {days_overdue} jour(s). La date d'échéance initiale était le {due_date}.

💙 **Notre engagement envers vous :**
• Nous comprenons que des défis financiers peuvent survenir de façon inattendue
• L'éducation et le bien-être de votre enfant restent notre priorité absolue
• Nous sommes là pour travailler AVEC vous, pas contre vous

🤝 **Comment nous pouvons soutenir votre famille :**
• Des arrangements de paiement flexibles adaptés à votre situation
• Des plans de paiement prolongés sans pénalités
• Des conseils financiers et des ressources disponibles
• Des discussions confidentielles avec notre équipe financière

📞 **Parlons-en :**
• Appelez-nous directement : [Numéro de téléphone]
• Planifiez une rencontre confidentielle
• Envoyez un email à notre équipe de soutien : support@school.com

Sachez que nous ne sommes pas ici pour vous juger ou vous mettre la pression. Nous sommes ici pour comprendre et aider. Chaque famille fait face à des défis parfois, et ce qui compte le plus, c'est de travailler ensemble pour que {student_name} puisse continuer à apprendre sans interruption.

Nous croyons au potentiel de {student_name}, et nous croyons en vous. Trouvons une solution ensemble.

Avec une réelle attention et un soutien sincère,
Votre équipe administrative scolaire

💫 *Aucune famille ne devrait faire face aux défis seule*"""
                }
            },
            'urgent': {
                'title': {
                    'en': '🌟 Gentle Reminder: Upcoming Payment for Your Child\'s Education',
                    'fr': '🌟 Rappel Doux : Paiement à Venir pour l\'Éducation de Votre Enfant',
                    'rw': '🌟 Uributso rw\'ubuntu: Ishyurwa riri bugufi ry\'uburezi bw\'umwana wawe'
                },
                'message': {
                    'en': """Dear {parent_name},

Warm greetings to you and your family! We hope {student_name} is thriving in their studies and enjoying the learning experience.

We're reaching out with a friendly reminder that a payment of {remaining_amount} for {student_name}'s {fee_name} is due in {days_until_due} day(s) on {due_date}.

💙 **Our supportive approach:**
• We believe in proactive communication to help you plan
• Early awareness gives you more options
• We're flexible and understanding of different situations

✅ **Payment options available:**
• Multiple payment methods for your convenience
• Installment plans upon request
• Early payment benefits available

🤝 **Need assistance?**
• Our finance team is ready to help with any questions
• Confidential support available
• No question is too small - just ask!

We're grateful for the trust you've placed in us to educate {student_name}. Your partnership means the world to us, and we want to make this journey as smooth as possible for your family.

Please don't hesitate to reach out if you need anything at all. We're here for you.

Warm regards,
Your School Administration Team

💫 *Partners in your child's success*""",
                    'fr': """Cher/Chère {parent_name},

Chaleureuses salutations à vous et à votre famille ! Nous espérons que {student_name} s'épanouit dans ses études et apprécie l'expérience d'apprentissage.

Nous vous rappelons gentiment qu'un paiement de {remaining_amount} pour {fee_name} de {student_name} est dû dans {days_until_due} jour(s) le {due_date}.

💙 **Notre approche de soutien :**
• Nous croyons en une communication proactive pour vous aider à planifier
• Une sensibilisation précoce vous donne plus d'options
• Nous sommes flexibles et compréhensifs face aux différentes situations

✅ **Options de paiement disponibles :**
• Multiples méthodes de paiement pour votre confort
• Plans de paiement échelonnés sur demande
• Avantages pour paiement anticipé disponibles

🤝 **Besoin d'aide ?**
• Notre équipe financière est prête à vous aider pour toute question
• Soutien confidentiel disponible
• Aucune question n'est trop petite - demandez simplement !

Nous sommes reconnaissants pour la confiance que vous nous avez accordée pour éduquer {student_name}. Votre partenariat signifie beaucoup pour nous, et nous voulons rendre ce parcours aussi fluide que possible pour votre famille.

N'hésitez pas à nous contacter si vous avez besoin de quoi que ce soit. Nous sommes là pour vous.

Chaleureusement,
Votre équipe administrative scolaire

💫 *Partenaires dans la réussite de votre enfant*"""
                }
            },
            'upcoming': {
                'title': {
                    'en': '📚 Planning Ahead for Your Child\'s Educational Journey',
                    'fr': '📚 Planification du Parcours Éducatif de Votre Enfant',
                    'rw': '📚 Gutegura urugendo rw\'uburezi bw\'umwana wawe'
                },
                'message': {
                    'en': """Dear {parent_name},

Hello! We hope this message finds your family well and that {student_name} continues to show enthusiasm for learning.

We wanted to kindly inform you about an upcoming payment of {remaining_amount} for {student_name}'s {fee_name}, scheduled for {due_date} (in {days_until_due} days).

💙 **Why we're sharing this early:**
• To support your financial planning
• To provide ample time for preparation
• To ensure {student_name}'s education continues uninterrupted

📝 **Helpful suggestions:**
• Consider setting up a payment schedule that works for you
• Our online portal makes payments quick and easy
• Reach out anytime if you'd like to discuss options

🌟 **Remember:** Every investment in education today creates brighter opportunities tomorrow. We're honored to be partners in shaping {student_name}'s future.

Thank you for your continued partnership and trust in us.

Best wishes to your family,
Your School Administration Team

💫 *Building futures together*""",
                    'fr': """Cher/Chère {parent_name},

Bonjour ! Nous espérons que ce message trouve votre famille en bonne santé et que {student_name} continue à montrer de l'enthousiasme pour l'apprentissage.

Nous souhaitons vous informer gentiment d'un paiement à venir de {remaining_amount} pour {fee_name} de {student_name}, prévu pour le {due_date} (dans {days_until_due} jours).

💙 **Pourquoi nous partageons cela tôt :**
• Pour soutenir votre planification financière
• Pour fournir amplement de temps pour la préparation
• Pour garantir que l'éducation de {student_name} continue sans interruption

📝 **Suggestions utiles :**
• Envisagez de mettre en place un calendrier de paiement qui fonctionne pour vous
• Notre portail en ligne rend les paiements rapides et faciles
• Contactez-nous à tout moment si vous souhaitez discuter des options

🌟 **Rappelez-vous :** Chaque investissement dans l'éducation aujourd'hui crée des opportunités plus brillantes demain. Nous sommes honorés d'être partenaires dans la formation de l'avenir de {student_name}.

Merci pour votre partenariat continu et votre confiance en nous.

Meilleurs vœux à votre famille,
Votre équipe administrative scolaire

💫 *Construire les futurs ensemble*"""
                }
            },
            'general': {
                'title': {
                    'en': '💫 Investing in Your Child\'s Bright Future',
                    'fr': '💫 Investir dans l\'Avenir Brillant de Votre Enfant',
                    'rw': '💫 Gushora mu kazoza keza kw\'umwana wawe'
                },
                'message': {
                    'en': """Dear {parent_name},

Greetings to you and your family! We're delighted to be partners in {student_name}'s educational journey.

We wanted to share a friendly reminder about the upcoming payment of {remaining_amount} for {student_name}'s {fee_name}, scheduled for {due_date} (in {days_until_due} days).

💙 **Our shared goal:** Your child's success and well-being

🌟 **Making payments manageable:**
• Various payment options to suit your needs
• Online portal for convenience
• Support team ready to assist

📞 **We're here to help:**
• Questions? Just ask!
• Need flexibility? Let's talk!
• Want to learn about payment plans? We've got options!

Thank you for your commitment to {student_name}'s education. Together, we're building a foundation for lifelong success.

Wishing your family all the best,
Your School Administration Team

💫 *Every child deserves the best education, and we're here to make it possible*""",
                    'fr': """Cher/Chère {parent_name},

Salutations à vous et à votre famille ! Nous sommes ravis d'être partenaires dans le parcours éducatif de {student_name}.

Nous souhaitons partager un rappel amical concernant le prochain paiement de {remaining_amount} pour {fee_name} de {student_name}, prévu pour le {due_date} (dans {days_until_due} jours).

💙 **Notre objectif commun :** La réussite et le bien-être de votre enfant

🌟 **Rendre les paiements gérables :**
• Diverses options de paiement adaptées à vos besoins
• Portail en ligne pour plus de commodité
• Équipe de soutien prête à vous aider

📞 **Nous sommes là pour vous aider :**
• Des questions ? Demandez simplement !
• Besoin de flexibilité ? Parlons-en !
• Vous voulez en savoir plus sur les plans de paiement ? Nous avons des options !

Merci pour votre engagement envers l'éducation de {student_name}. Ensemble, nous construisons une base pour une réussite à vie.

En souhaitant le meilleur à votre famille,
Votre équipe administrative scolaire

💫 *Chaque enfant mérite la meilleure éducation, et nous sommes là pour la rendre possible*"""
                }
            }
        }
        
        # Get the appropriate template
        template = parent_templates.get(reminder_type, parent_templates['general'])
        
        # Format the message with actual values
        title_template = template['title'].get(language, template['title']['en'])
        message_template = template['message'].get(language, template['message']['en'])
        
        # Prepare formatting variables
        format_vars = {
            'parent_name': parent.full_name,
            'student_name': assignment.student.full_name,
            'fee_name': assignment.class_level_cost.name,
            'remaining_amount': f"${assignment.remaining_amount:,.2f}",
            'due_date': assignment.payment_due_date.strftime('%B %d, %Y'),
            'days_until_due': abs(days_until_due),
            'days_overdue': days_overdue
        }
        
        title = title_template.format(**format_vars)
        message = message_template.format(**format_vars)
        
        # Print to terminal for monitoring
        print(f"\n{'👪'*20}")
        print(f"📧 REMINDER SENT TO PARENT")
        print(f"{'👪'*20}")
        print(f"👨‍👩‍👧 Parent: {parent.full_name}")
        print(f"👨‍🎓 Student: {assignment.student.full_name}")
        print(f"📚 Fee: {assignment.class_level_cost.name}")
        print(f"💰 Remaining: ${assignment.remaining_amount:,.2f}")
        print(f"📅 Due Date: {assignment.payment_due_date}")
        print(f"⚠️ Reminder Type: {reminder_type.upper()}")
        print(f"🌐 Language: {language}")
        print(f"📝 Title: {title[:100]}...")
        print(f"💬 Message Preview: {message[:200]}...")
        print(f"{'👪'*20}\n")
        
        # Create notification in the system
        NotificationService.create_academic_notification(
            user=user,
            notification_type='deadline_reminder',
            title=title,
            message=message,
            created_by=None,  # System notification
            extra_data={
                'assignment_id': assignment.id,
                'student_name': assignment.student.full_name,
                'fee_name': assignment.class_level_cost.name,
                'remaining_amount': str(assignment.remaining_amount),
                'due_date': str(assignment.payment_due_date),
                'reminder_type': reminder_type,
                'days_until_due': days_until_due if days_until_due > 0 else 0,
                'days_overdue': days_overdue,
                'is_parent_reminder': True
            },
            priority=priority,
            action_url='/payments/my-payments/'
        )
    
    @classmethod
    def check_overdue_payments(cls):
        """Check and notify overdue payments with empathy"""
        overdue_assignments = StudentPaymentAssignment.objects.filter(
            status__in=[PaymentStatus.WAITING, PaymentStatus.PARTIALLY_PAID, PaymentStatus.STARTED],
            payment_due_date__lt=timezone.now().date(),
            remaining_amount__gt=0
        )
        
        for assignment in overdue_assignments:
            assignment.status = PaymentStatus.OVERDUE
            assignment.save(update_fields=['status'])
            
            # Create empathetic overdue notification (without request object)
            # In production, you'd want to have a way to get language preference
            print(f"\n⚠️ OVERDUE PAYMENT DETECTED:")
            print(f"   Student: {assignment.student.full_name}")
            print(f"   Fee: {assignment.class_level_cost.name}")
            print(f"   Remaining: {assignment.remaining_amount}")
            print(f"   Due Date: {assignment.payment_due_date}")
            
            # Send notifications with empathy
            if assignment.student.user:
                cls._send_student_reminder(
                    assignment, 
                    'overdue', 
                    -1, 
                    (timezone.now().date() - assignment.payment_due_date).days,
                    'high'
                )
            
            for parent_link in assignment.student.parent_students.all():
                if parent_link.parent.user:
                    cls._send_parent_reminder(
                        assignment,
                        parent_link.parent,
                        'overdue',
                        -1,
                        (timezone.now().date() - assignment.payment_due_date).days,
                        'high'
                    )
        
        return overdue_assignments.count()
    
    @classmethod
    def _get_user_language(cls, request, user):
        """Get user's preferred language from request or user profile"""
        if request and hasattr(request, 'headers'):
            # Check Accept-Language header
            accept_language = request.headers.get('Accept-Language', 'en')
            lang = accept_language.split(',')[0][:2]
            if lang in ['en', 'fr', 'rw']:
                return lang
        
        # Fallback to user's language preference
        if user and hasattr(user, 'language'):
            return user.language
        
        return 'en'
 