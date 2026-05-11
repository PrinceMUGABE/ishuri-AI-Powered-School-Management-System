# payments/translations.py
from django.utils.translation import gettext as _
from django.utils import translation


class PaymentTranslations:
    """Centralized translations for payment-related messages"""
    
    # Notification messages
    PAYMENT_ASSIGNMENT_CREATED_TITLE = {
        'en': 'Payment Assignment Created',
        'fr': 'Attribution de Paiement Créée',
        'rw': 'Ishyurwa ry\'ishyurwa ryaremanywe'
    }
    
    PAYMENT_ASSIGNMENT_CREATED_MESSAGE = {
        'en': 'You have been assigned a payment of {amount} for {fee_name}. Due date: {due_date}',
        'fr': 'Un paiement de {amount} vous a été attribué pour {fee_name}. Date d\'échéance : {due_date}',
        'rw': 'Wahawe ishyurwa rya {amount} kuri {fee_name}. Itariki yo kurangiza: {due_date}'
    }
    
    PAYMENT_ASSIGNMENT_UPDATED_TITLE = {
        'en': 'Payment Assignment Updated',
        'fr': 'Attribution de Paiement Mise à Jour',
        'rw': 'Ishyurwa ry\'ishyurwa ryavuzweho'
    }
    
    PAYMENT_ASSIGNMENT_UPDATED_MESSAGE = {
        'en': 'Your payment assignment has been updated. New total: {total_amount}, Paid: {paid_amount}, Remaining: {remaining_amount}',
        'fr': 'Votre attribution de paiement a été mise à jour. Nouveau total : {total_amount}, Payé : {paid_amount}, Restant : {remaining_amount}',
        'rw': 'Ishyurwa ryawe ryavuzweho. Ikiguzi gishya: {total_amount}, Cyishyuwe: {paid_amount}, Gusigaye: {remaining_amount}'
    }
    
    PAYMENT_RECEIVED_TITLE = {
        'en': 'Payment Received',
        'fr': 'Paiement Reçu',
        'rw': 'Ishyurwa ryakiriwe'
    }
    
    PAYMENT_RECEIVED_MESSAGE = {
        'en': 'A payment of {amount} has been received. Reference: {reference}',
        'fr': 'Un paiement de {amount} a été reçu. Référence : {reference}',
        'rw': 'Ishyurwa rya {amount} ryakiriwe. Referansi: {reference}'
    }
    
    PAYMENT_COMPLETED_TITLE = {
        'en': 'Payment Completed',
        'fr': 'Paiement Complété',
        'rw': 'Ishyurwa ryuzuye'
    }
    
    PAYMENT_COMPLETED_MESSAGE = {
        'en': 'Congratulations! Your payment for {fee_name} has been fully completed.',
        'fr': 'Félicitations ! Votre paiement pour {fee_name} est entièrement complété.',
        'rw': 'Urakozwe! Ishyurwa ryawe rya {fee_name} ryarangiye.'
    }
    
    PAYMENT_OVERDUE_TITLE = {
        'en': 'Payment Overdue',
        'fr': 'Paiement en Retard',
        'rw': 'Ishyurwa ryarengeje igihe'
    }
    
    PAYMENT_OVERDUE_MESSAGE = {
        'en': 'Your payment of {remaining_amount} for {fee_name} is overdue. Due date was {due_date}. Please make payment as soon as possible.',
        'fr': 'Votre paiement de {remaining_amount} pour {fee_name} est en retard. La date d\'échéance était le {due_date}. Veuillez effectuer le paiement dès que possible.',
        'rw': 'Ishyurwa ryawe rya {remaining_amount} kuri {fee_name} ryararengeje igihe. Itariki yo kurangiza yari {due_date}. Nyamuneka ishyure vuba.uwashyize'
    }
    
    PAYMENT_TRANSACTION_CREATED_TITLE = {
        'en': 'Payment Transaction Created',
        'fr': 'Transaction de Paiement Créée',
        'rw': 'Transaction y\'ishyurwa yaremanywe'
    }
    
    PAYMENT_TRANSACTION_CREATED_MESSAGE = {
        'en': 'A payment transaction of {amount} has been initiated. Reference: {reference}',
        'fr': 'Une transaction de paiement de {amount} a été initiée. Référence : {reference}',
        'rw': 'Transaction y\'ishyurwa ya {amount} yatangiye. Referansi: {reference}'
    }
    
    PAYMENT_TRANSACTION_COMPLETED_TITLE = {
        'en': 'Payment Transaction Completed',
        'fr': 'Transaction de Paiement Complétée',
        'rw': 'Transaction y\'ishyurwa yarangiye'
    }
    
    PAYMENT_TRANSACTION_COMPLETED_MESSAGE = {
        'en': 'Your payment transaction of {amount} has been successfully completed.',
        'fr': 'Votre transaction de paiement de {amount} a été complétée avec succès.',
        'rw': 'Transaction yawe y\'ishyurwa ya {amount} yaranze neza.'
    }
    
    @classmethod
    def get_translated_message(cls, message_dict, language, **kwargs):
        """Get translated message based on user's language"""
        with translation.override(language):
            message_template = message_dict.get(language, message_dict.get('en', ''))
            try:
                return message_template.format(**kwargs)
            except KeyError:
                return message_template
    
    @classmethod
    def get_notification_title(cls, notification_type, language, **kwargs):
        """Get notification title in user's language"""
        title_dict = getattr(cls, f'{notification_type}_TITLE', None)
        if title_dict:
            with translation.override(language):
                title_template = title_dict.get(language, title_dict.get('en', ''))
                try:
                    return title_template.format(**kwargs)
                except KeyError:
                    return title_template
        return notification_type.replace('_', ' ').title()
    
    @classmethod
    def get_notification_message(cls, notification_type, language, **kwargs):
        """Get notification message in user's language"""
        message_dict = getattr(cls, f'{notification_type}_MESSAGE', None)
        if message_dict:
            return cls.get_translated_message(message_dict, language, **kwargs)
        return f"{notification_type.replace('_', ' ').title()} notification"