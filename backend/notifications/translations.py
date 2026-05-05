# notifications/translations.py

# Notification type translations
NOTIFICATION_TYPE_TRANSLATIONS = {
    'en': {
        # User Management
        'user_created': 'Account Created',
        'user_updated': 'Account Updated',
        'user_deleted': 'Account Deleted',
        'user_status_changed': 'Account Status Changed',
        'user_role_changed': 'Role Changed',
        
        # Authentication
        'login_success': 'Login Successful',
        'login_failed': 'Login Failed',
        'password_changed': 'Password Changed',
        'password_reset': 'Password Reset',
        'password_reset_request': 'Password Reset Requested',
        
        # Grades
        'grade_uploaded': 'Grade Uploaded',
        'grade_updated': 'Grade Updated',
        'grade_approved': 'Grade Approved',
        'grade_rejected': 'Grade Rejected',
        
        # Assignments
        'assignment_created': 'New Assignment',
        'assignment_updated': 'Assignment Updated',
        'assignment_submitted': 'Assignment Submitted',
        'assignment_graded': 'Assignment Graded',
        'assignment_due_soon': 'Assignment Due Soon',
        
        # Attendance
        'attendance_marked': 'Attendance Recorded',
        'attendance_missed': 'Attendance Missed',
        'low_attendance_warning': 'Low Attendance Warning',
        
        # Communication
        'message_received': 'New Message',
        'message_sent': 'Message Sent',
        'announcement_posted': 'New Announcement',
        
        # Fees
        'fee_payment_received': 'Payment Received',
        'fee_payment_overdue': 'Payment Overdue',
        'invoice_generated': 'Invoice Generated',
        
        # System
        'system_alert': 'System Alert',
        'backup_completed': 'Backup Completed',
        'error_occurred': 'System Error',
    },
    'fr': {
        'user_created': 'Compte Créé',
        'user_updated': 'Compte Mis à Jour',
        'user_deleted': 'Compte Supprimé',
        'user_status_changed': 'Statut du Compte Modifié',
        'user_role_changed': 'Rôle Modifié',
        
        'login_success': 'Connexion Réussie',
        'login_failed': 'Échec de Connexion',
        'password_changed': 'Mot de Passe Modifié',
        'password_reset': 'Mot de Passe Réinitialisé',
        'password_reset_request': 'Demande de Réinitialisation',
        
        'grade_uploaded': 'Notes Téléchargées',
        'grade_updated': 'Notes Mises à Jour',
        'grade_approved': 'Notes Approuvées',
        'grade_rejected': 'Notes Rejetées',
        
        'assignment_created': 'Nouveau Devoir',
        'assignment_updated': 'Devoir Mis à Jour',
        'assignment_submitted': 'Devoir Soumis',
        'assignment_graded': 'Devoir Noté',
        'assignment_due_soon': 'Devoir Bientôt Dû',
        
        'attendance_marked': 'Présence Enregistrée',
        'attendance_missed': 'Absence Enregistrée',
        'low_attendance_warning': 'Avertissement d\'Assiduité',
        
        'message_received': 'Nouveau Message',
        'message_sent': 'Message Envoyé',
        'announcement_posted': 'Nouvelle Annonce',
        
        'fee_payment_received': 'Paiement Reçu',
        'fee_payment_overdue': 'Paiement en Retard',
        'invoice_generated': 'Facture Générée',
        
        'system_alert': 'Alerte Système',
        'backup_completed': 'Sauvegarde Terminée',
        'error_occurred': 'Erreur Système',
    },
    'rw': {
        'user_created': 'Konti Yaremwe',
        'user_updated': 'Konti Yahinduwe',
        'user_deleted': 'Konti Yakuwe',
        'user_status_changed': 'Imiterere ya Konti Yahinduwe',
        'user_role_changed': 'Uruhare Rwahinduwe',
        
        'login_success': 'Winjiye Neza',
        'login_failed': 'Ntiwinjiye',
        'password_changed': 'Ijambo Banga Ryahinduwe',
        'password_reset': 'Ijambo Banga Ryasubiwemo',
        'password_reset_request': 'Usabwe Gusubiramo Ijambo Banga',
        
        'grade_uploaded': 'Amanota Yashyizwe',
        'grade_updated': 'Amanota Yahinduwe',
        'grade_approved': 'Amanota Yemejwe',
        'grade_rejected': 'Amanota Yanzwe',
        
        'assignment_created': 'Igikorwa Gishya',
        'assignment_updated': 'Igikorwa Gihinduwe',
        'assignment_submitted': 'Igikorwa Cyatanzwe',
        'assignment_graded': 'Igikorwa Gitanzwe',
        'assignment_due_soon': 'Igikorwa Kiri Bujya',
        
        'attendance_marked': 'Itabaza Ryanditswe',
        'attendance_missed': 'Itabaza Ribuze',
        'low_attendance_warning': 'Uburere bw\'Itabaza Rike',
        
        'message_received': 'Ubutumwa Bushya',
        'message_sent': 'Ubutumwa Bwoherejwe',
        'announcement_posted': 'Itangazo Rishya',
        
        'fee_payment_received': 'Amafaranga Yakiriwe',
        'fee_payment_overdue': 'Amafaranga Aratinze',
        'invoice_generated': 'Invoque Yatejwe',
        
        'system_alert': 'Ibiruro Bya Sisitemu',
        'backup_completed': 'Backup Yarangiye',
        'error_occurred': 'Ikibazo Cya Sisitemu',
    }
}

# Notification message templates
NOTIFICATION_MESSAGE_TEMPLATES = {
    'en': {
        # User management
        'user_created_self': 'Your account has been created with role: {role}. Welcome to {site_name}!',
        'user_created_admin': 'User {username} has been created successfully with role: {role}.',
        'user_updated_self': 'Your account was updated by {updated_by}. Fields changed: {fields}.',
        'user_updated_admin': 'User {username} has been updated successfully.',
        'user_deleted_self': 'Your account has been deleted by {deleted_by}.',
        'user_deleted_admin': 'User {username} has been deleted successfully.',
        'user_status_changed_self': 'Your account has been {action} by {changed_by}.',
        'user_status_changed_admin': 'User {username} status changed from {old_status} to {new_status}.',
        'user_role_changed': 'Your role has been changed from {old_role} to {new_role}.',
        
        # Authentication
        'login_success': 'You logged in successfully from IP: {ip_address} at {time}.',
        'login_failed': 'Failed login attempt detected from IP: {ip_address}.',
        'password_changed_self': 'Your password has been changed successfully. If you didn\'t do this, contact support.',
        'password_changed_admin': 'Password changed successfully.',
        'password_reset_request': 'A password reset has been requested for your account. If this wasn\'t you, please contact support.',
        'password_reset_success': 'Your password has been reset successfully.',
        
        # Grades
        'grade_uploaded': 'New grades have been uploaded for {subject}.',
        'grade_updated': 'Your grades for {subject} have been updated.',
        'grade_approved': 'Your grades for {subject} have been approved.',
        'grade_rejected': 'Your grades for {subject} need revision.',
        
        # Assignments
        'assignment_created': 'New assignment "{title}" has been posted. Due: {due_date}.',
        'assignment_updated': 'Assignment "{title}" has been updated.',
        'assignment_submitted': 'Assignment "{title}" has been submitted.',
        'assignment_graded': 'Assignment "{title}" has been graded. Score: {score}.',
        'assignment_due_soon': 'Assignment "{title}" is due in {days} days.',
        
        # Attendance
        'attendance_marked': 'Attendance for {date} has been recorded.',
        'attendance_missed': 'You were marked absent on {date}.',
        'low_attendance_warning': 'Your attendance is below {percentage}%. Please improve.',
        
        # Communication
        'message_received': 'New message from {sender}: {preview}',
        'message_sent': 'Your message to {recipient} has been sent.',
        'announcement_posted': 'New announcement: {title}',
        
        # Fees
        'fee_payment_received': 'Payment of {amount} RWF has been received.',
        'fee_payment_overdue': 'Payment of {amount} RWF is overdue by {days} days.',
        'invoice_generated': 'New invoice #{number} has been generated. Amount: {amount} RWF.',
        
        # System
        'system_alert': '{message}',
        'backup_completed': 'System backup completed at {time}.',
        'error_occurred': 'An error occurred: {error_message}. Please contact support.',
    },
    'fr': {
        'user_created_self': 'Votre compte a été créé avec le rôle : {role}. Bienvenue sur {site_name} !',
        'user_created_admin': 'L\'utilisateur {username} a été créé avec succès avec le rôle : {role}.',
        'user_updated_self': 'Votre compte a été mis à jour par {updated_by}. Champs modifiés : {fields}.',
        'user_updated_admin': 'L\'utilisateur {username} a été mis à jour avec succès.',
        'user_deleted_self': 'Votre compte a été supprimé par {deleted_by}.',
        'user_deleted_admin': 'L\'utilisateur {username} a été supprimé avec succès.',
        'user_status_changed_self': 'Votre compte a été {action} par {changed_by}.',
        'user_status_changed_admin': 'Le statut de {username} est passé de {old_status} à {new_status}.',
        'user_role_changed': 'Votre rôle est passé de {old_role} à {new_role}.',
        
        'login_success': 'Vous vous êtes connecté depuis l\'IP : {ip_address} à {time}.',
        'login_failed': 'Tentative de connexion échouée depuis l\'IP : {ip_address}.',
        'password_changed_self': 'Votre mot de passe a été changé avec succès.',
        'password_changed_admin': 'Mot de passe changé avec succès.',
        'password_reset_request': 'Une demande de réinitialisation de mot de passe a été faite pour votre compte.',
        'password_reset_success': 'Votre mot de passe a été réinitialisé avec succès.',
        
        'grade_uploaded': 'De nouvelles notes ont été téléchargées pour {subject}.',
        'grade_updated': 'Vos notes pour {subject} ont été mises à jour.',
        'grade_approved': 'Vos notes pour {subject} ont été approuvées.',
        'grade_rejected': 'Vos notes pour {subject} nécessitent une révision.',
        
        'assignment_created': 'Nouveau devoir "{title}" a été publié. Date limite : {due_date}.',
        'assignment_updated': 'Le devoir "{title}" a été mis à jour.',
        'assignment_submitted': 'Le devoir "{title}" a été soumis.',
        'assignment_graded': 'Le devoir "{title}" a été noté. Score : {score}.',
        'assignment_due_soon': 'Le devoir "{title}" est dû dans {days} jours.',
        
        'attendance_marked': 'La présence du {date} a été enregistrée.',
        'attendance_missed': 'Vous avez été marqué absent le {date}.',
        'low_attendance_warning': 'Votre présence est inférieure à {percentage}%. Veuillez vous améliorer.',
        
        'message_received': 'Nouveau message de {sender} : {preview}',
        'message_sent': 'Votre message à {recipient} a été envoyé.',
        'announcement_posted': 'Nouvelle annonce : {title}',
        
        'fee_payment_received': 'Paiement de {amount} RWF a été reçu.',
        'fee_payment_overdue': 'Le paiement de {amount} RWF est en retard de {days} jours.',
        'invoice_generated': 'Nouvelle facture #{number} a été générée. Montant : {amount} RWF.',
        
        'system_alert': '{message}',
        'backup_completed': 'Sauvegarde système terminée à {time}.',
        'error_occurred': 'Une erreur s\'est produite : {error_message}. Veuillez contacter le support.',
    },
    'rw': {
        'user_created_self': 'Konti yawe yaremwe nk\'{role}. Murakaza neza kuri {site_name}!',
        'user_created_admin': 'Umukoresha {username} yaremwe neza nk\'{role}.',
        'user_updated_self': 'Konti yawe yahinduwe na {updated_by}. Ibintu byahinduwe: {fields}.',
        'user_updated_admin': 'Umukoresha {username} yahinduwe neza.',
        'user_deleted_self': 'Konti yawe yakuwe na {deleted_by}.',
        'user_deleted_admin': 'Umukoresha {username} yakuwe neza.',
        'user_status_changed_self': 'Konti yawe {action} na {changed_by}.',
        'user_status_changed_admin': 'Imiterere ya {username} yahindutse iva {old_status} ija {new_status}.',
        'user_role_changed': 'Uruhare rwawe rwahindutse ruva {old_role} ruja {new_role}.',
        
        'login_success': 'Winjiye neza uva IP: {ip_address} saa {time}.',
        'login_failed': 'Kugerageza kwinjira byananiwe biva IP: {ip_address}.',
        'password_changed_self': 'Ijambo banga ryawe ryahinduwe neza.',
        'password_changed_admin': 'Ijambo banga ryahinduwe neza.',
        'password_reset_request': 'Usabwe gusubiramo ijambo banga ryawe. Niba utabisabye, wagirane na support.',
        'password_reset_success': 'Ijambo banga ryawe ryasubiwemo neza.',
        
        'grade_uploaded': 'Amanota mashya ya {subject} yashyizwe.',
        'grade_updated': 'Amanota yawe ya {subject} yahinduwe.',
        'grade_approved': 'Amanota yawe ya {subject} yemejwe.',
        'grade_rejected': 'Amanota yawe ya {subject} agomba gusubirwamo.',
        
        'assignment_created': 'Igikorwa gishya "{title}" cyashyizwe. Igena: {due_date}.',
        'assignment_updated': 'Igikorwa "{title}" gikozwemo impinduka.',
        'assignment_submitted': 'Igikorwa "{title}" cyatanzwe.',
        'assignment_graded': 'Igikorwa "{title}" cyatanzwe. Amanota: {score}.',
        'assignment_due_soon': 'Igikorwa "{title}" kiri bujya mu gihe cy\'iminsi {days}.',
        
        'attendance_marked': 'Itabaza ryo kuwa {date} ryanditswe.',
        'attendance_missed': 'Wabuze itabaza kuwa {date}.',
        'low_attendance_warning': 'Itabaza ryawe riri munsi ya {percentage}%. Nyamuneka wikubeho.',
        
        'message_received': 'Ubutumwa bushya bwa {sender}: {preview}',
        'message_sent': 'Ubutumwa bwawe kuri {recipient} bwoherejwe.',
        'announcement_posted': 'Itangazo rishya: {title}',
        
        'fee_payment_received': 'Amafaranga y\'{amount} RWF yakiriwe.',
        'fee_payment_overdue': 'Amafaranga y\'{amount} RWF aratinze iminsi {days}.',
        'invoice_generated': 'Fagitire mishya #{number} yatejwe. Amafaranga: {amount} RWF.',
        
        'system_alert': '{message}',
        'backup_completed': 'Backup ya sisitemu yarangiye saa {time}.',
        'error_occurred': 'Habaye ikibazo: {error_message}. Nyamuneka wagirane na support.',
    }
}


def get_notification_title(notification_type, lang='en'):
    """Get translated notification title"""
    lang = lang if lang in ['en', 'fr', 'rw'] else 'en'
    return NOTIFICATION_TYPE_TRANSLATIONS.get(lang, {}).get(
        notification_type, 
        NOTIFICATION_TYPE_TRANSLATIONS['en'].get(notification_type, notification_type.replace('_', ' ').title())
    )


def get_notification_message(template_key, lang='en', **kwargs):
    """Get translated notification message with variables"""
    lang = lang if lang in ['en', 'fr', 'rw'] else 'en'
    template = NOTIFICATION_MESSAGE_TEMPLATES.get(lang, {}).get(
        template_key,
        NOTIFICATION_MESSAGE_TEMPLATES['en'].get(template_key, template_key)
    )
    
    # Format with provided variables
    try:
        return template.format(**kwargs)
    except KeyError:
        return template