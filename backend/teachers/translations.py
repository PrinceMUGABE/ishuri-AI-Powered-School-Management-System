"""
Translation file for Teachers app.
Supports English (en), French (fr), and Kinyarwanda (rw)
"""

TRANSLATIONS = {
    'en': {
        # General
        'admin_access_required': 'Admin access required',
        'teacher_access_required': 'Teacher access required',
        'validation_failed': 'Validation failed',
        'create_success': 'created successfully',
        'update_success': 'updated successfully',
        'delete_success': 'deleted successfully',
        
        # Teacher
        'teacher_created': 'Teacher Created',
        'teacher_updated': 'Teacher Updated',
        'teacher_deleted': 'Teacher Deleted',
        'teacher_create_success': 'Teacher "{name}" created successfully',
        'teacher_update_success': 'Teacher "{name}" updated successfully',
        'teacher_delete_success': 'Teacher "{name}" deleted successfully',
        'teacher_not_found': 'Teacher not found',
        'email_already_exists': 'A teacher with this email already exists',
        'phone_already_exists': 'A teacher with this phone number already exists',
        'teacher_username_generated': 'Username generated: {username}',
        'teacher_password_generated': 'Password sent to email: {email}',
        
        # Teacher Notifications
        'teacher_welcome_notification': 'Teacher account "{name}" has been created successfully',
        'teacher_updated_notification': 'Teacher account "{name}" has been updated',
        'teacher_deleted_notification': 'Teacher account "{name}" has been deleted',
        'teacher_profile_updated_notification': 'Your profile has been updated successfully',
        
        # Assignment
        'assignment_created': 'Teacher Assignment Created',
        'assignment_deleted': 'Teacher Assignment Deleted',
        'assignment_create_success': 'Assignment for teacher "{teacher}" created successfully',
        'assignment_delete_success': 'Assignment deleted successfully',
        'assignment_not_found': 'Assignment not found',
        'duplicate_assignment': 'This assignment already exists for the teacher',
        'class_level_mismatch': 'Class level "{class_level}" does not belong to school level "{school_level}"',
        
        # Assignment Notifications
        'assignment_created_notification': 'Teacher "{teacher}" assigned to teach "{subject}" for {class_level}',
        'assignment_deleted_notification': 'Assignment for teacher "{teacher}" has been removed',
        
        # Timetable
        'timetable_generated': 'Timetable Generated',
        'timetable_generate_success': 'Timetable generated successfully',
        'timetable_generate_error': 'Failed to generate timetable',
        'teacher_conflict': 'Teacher already has a class scheduled at this time',
        'classroom_conflict': 'Classroom is already occupied at this time',
        
        # Timetable Notifications
        'timetable_generated_notification': 'Weekly timetable generated successfully for week {week}',
        'timetable_entry_created_notification': 'New timetable entry added for {teacher} on {day} at {time}',
        'timetable_entry_updated_notification': 'Timetable entry updated for {teacher}',
        'timetable_conflict_notification': 'Timetable conflict detected for {teacher} on {day} at {time}',
        
        # Day Settings
        'day_setting_created': 'Day Setting Created',
        'day_setting_updated': 'Day Setting Updated',
        'day_setting_deleted': 'Day Setting Deleted',
        'day_setting_create_success': 'Day setting for {school_level} on {day} created successfully',
        
        # Day Settings Notifications
        'day_setting_created_notification': 'School day settings for {school_level} on {day} have been configured',
        'day_setting_updated_notification': 'School day settings for {school_level} on {day} have been updated',
        'day_setting_deleted_notification': 'School day settings for {school_level} on {day} have been removed',
        
        # Holiday
        'holiday_created': 'Holiday Created',
        'holiday_deleted': 'Holiday Deleted',
        'holiday_create_success': 'Holiday "{name}" created successfully',
        'holiday_delete_success': 'Holiday "{name}" deleted successfully',
        
        # Holiday Notifications
        'holiday_created_notification': 'Holiday "{name}" has been added to the calendar',
        'holiday_deleted_notification': 'Holiday "{name}" has been removed from the calendar',
        
        # Profile
        'profile_updated': 'Profile Updated',
        'profile_update_success': 'Your profile has been updated successfully',
        
        # Error Messages
        'cannot_delete_has_assignments': 'Cannot delete teacher because they have active assignments',
        'cannot_delete_has_timetable': 'Cannot delete because it has timetable entries',
        'invalid_email': 'Please provide a valid email address',
        'invalid_phone': 'Please provide a valid phone number',
        'teacher_inactive': 'Cannot assign to an inactive teacher',
        'class_level_inactive': 'Cannot assign to an inactive class level',
        'subject_inactive': 'Cannot assign an inactive subject',
        'academic_year_required': 'Academic year is required for this operation',
        
        # Email
        'email_subject_welcome': 'Welcome to the School Management System',
        'email_body_welcome': """
Dear {name},

Your teacher account has been created successfully.

Login Credentials:
Username: {username}
Password: {password}

Please change your password after your first login.

Best regards,
School Management Team
""",
    },
    
    'fr': {
        # General
        'admin_access_required': 'Accès administrateur requis',
        'teacher_access_required': 'Accès enseignant requis',
        'validation_failed': 'Échec de la validation',
        'create_success': 'créé avec succès',
        'update_success': 'mis à jour avec succès',
        'delete_success': 'supprimé avec succès',
        
        # Teacher
        'teacher_created': 'Enseignant Créé',
        'teacher_updated': 'Enseignant Mis à Jour',
        'teacher_deleted': 'Enseignant Supprimé',
        'teacher_create_success': 'Enseignant "{name}" créé avec succès',
        'teacher_update_success': 'Enseignant "{name}" mis à jour avec succès',
        'teacher_delete_success': 'Enseignant "{name}" supprimé avec succès',
        'teacher_not_found': 'Enseignant non trouvé',
        'email_already_exists': 'Un enseignant avec cet email existe déjà',
        'phone_already_exists': 'Un enseignant avec ce numéro de téléphone existe déjà',
        'teacher_username_generated': 'Nom d\'utilisateur généré: {username}',
        'teacher_password_generated': 'Mot de passe envoyé à: {email}',
        
        # Teacher Notifications
        'teacher_welcome_notification': 'Le compte enseignant "{name}" a été créé avec succès',
        'teacher_updated_notification': 'Le compte enseignant "{name}" a été mis à jour',
        'teacher_deleted_notification': 'Le compte enseignant "{name}" a été supprimé',
        'teacher_profile_updated_notification': 'Votre profil a été mis à jour avec succès',
        
        # Assignment
        'assignment_created': 'Affectation d\'Enseignant Créée',
        'assignment_deleted': 'Affectation d\'Enseignant Supprimée',
        'assignment_create_success': 'Affectation pour l\'enseignant "{teacher}" créée avec succès',
        'assignment_delete_success': 'Affectation supprimée avec succès',
        'assignment_not_found': 'Affectation non trouvée',
        'duplicate_assignment': 'Cette affectation existe déjà pour l\'enseignant',
        'class_level_mismatch': 'Le niveau de classe "{class_level}" n\'appartient pas au niveau scolaire "{school_level}"',
        
        # Assignment Notifications
        'assignment_created_notification': 'L\'enseignant "{teacher}" a été assigné à enseigner "{subject}" pour {class_level}',
        'assignment_deleted_notification': 'L\'affectation pour l\'enseignant "{teacher}" a été supprimée',
        
        # Timetable
        'timetable_generated': 'Emploi du Temps Généré',
        'timetable_generate_success': 'Emploi du temps généré avec succès',
        'timetable_generate_error': 'Échec de la génération de l\'emploi du temps',
        'teacher_conflict': 'L\'enseignant a déjà un cours programmé à cette heure',
        'classroom_conflict': 'La salle de classe est déjà occupée à cette heure',
        
        # Timetable Notifications
        'timetable_generated_notification': 'Emploi du temps hebdomadaire généré avec succès pour la semaine {week}',
        'timetable_entry_created_notification': 'Nouvelle entrée d\'emploi du temps ajoutée pour {teacher} le {day} à {time}',
        'timetable_entry_updated_notification': 'Entrée d\'emploi du temps mise à jour pour {teacher}',
        'timetable_conflict_notification': 'Conflit d\'emploi du temps détecté pour {teacher} le {day} à {time}',
        
        # Day Settings
        'day_setting_created': 'Paramètre de Jour Créé',
        'day_setting_updated': 'Paramètre de Jour Mis à Jour',
        'day_setting_deleted': 'Paramètre de Jour Supprimé',
        'day_setting_create_success': 'Paramètre de jour pour {school_level} le {day} créé avec succès',
        
        # Day Settings Notifications
        'day_setting_created_notification': 'Paramètres de journée scolaire pour {school_level} le {day} ont été configurés',
        'day_setting_updated_notification': 'Paramètres de journée scolaire pour {school_level} le {day} ont été mis à jour',
        'day_setting_deleted_notification': 'Paramètres de journée scolaire pour {school_level} le {day} ont été supprimés',
        
        # Holiday
        'holiday_created': 'Jour Férié Créé',
        'holiday_deleted': 'Jour Férié Supprimé',
        'holiday_create_success': 'Jour férié "{name}" créé avec succès',
        'holiday_delete_success': 'Jour férié "{name}" supprimé avec succès',
        
        # Holiday Notifications
        'holiday_created_notification': 'Le jour férié "{name}" a été ajouté au calendrier',
        'holiday_deleted_notification': 'Le jour férié "{name}" a été supprimé du calendrier',
        
        # Profile
        'profile_updated': 'Profil Mis à Jour',
        'profile_update_success': 'Votre profil a été mis à jour avec succès',
        
        # Error Messages
        'cannot_delete_has_assignments': 'Impossible de supprimer l\'enseignant car il a des affectations actives',
        'cannot_delete_has_timetable': 'Impossible de supprimer car il a des entrées d\'emploi du temps',
        'invalid_email': 'Veuillez fournir une adresse email valide',
        'invalid_phone': 'Veuillez fournir un numéro de téléphone valide',
        'teacher_inactive': 'Impossible d\'affecter à un enseignant inactif',
        'class_level_inactive': 'Impossible d\'affecter à un niveau de classe inactif',
        'subject_inactive': 'Impossible d\'affecter une matière inactive',
        'academic_year_required': 'L\'année académique est requise pour cette opération',
        
        # Email
        'email_subject_welcome': 'Bienvenue dans le Système de Gestion Scolaire',
        'email_body_welcome': """
Cher/Chère {name},

Votre compte enseignant a été créé avec succès.

Identifiants de connexion:
Nom d'utilisateur: {username}
Mot de passe: {password}

Veuillez changer votre mot de passe après votre première connexion.

Cordialement,
L'équipe de gestion scolaire
""",
    },
    
    'rw': {
        # General
        'admin_access_required': 'Uruhushya rw\'ubuyobozi rurakenewe',
        'teacher_access_required': 'Uruhushya rw\'umwarimu rurakenewe',
        'validation_failed': 'Igenzura ryananiwe',
        'create_success': 'byakozwe neza',
        'update_success': 'byahinduwe neza',
        'delete_success': 'byakuvwe neza',
        
        # Teacher
        'teacher_created': 'Umwarimu Yakojwe',
        'teacher_updated': 'Umwarimu Yahinduwe',
        'teacher_deleted': 'Umwarimu Yakuvwe',
        'teacher_create_success': 'Umwarimu "{name}" yakojwe neza',
        'teacher_update_success': 'Umwarimu "{name}" yahinduwe neza',
        'teacher_delete_success': 'Umwarimu "{name}" yakuvwe neza',
        'teacher_not_found': 'Umwarimu ntaboneka',
        'email_already_exists': 'Umwarimu ufite iyi email aboneka',
        'phone_already_exists': 'Umwarimu ufite iyi nimero ya terefone aboneka',
        'teacher_username_generated': 'Izina ryakozwe: {username}',
        'teacher_password_generated': 'Ijambo ryibanga ryoherejwe kuri: {email}',
        
        # Teacher Notifications
        'teacher_welcome_notification': 'Konti y\'umwarimu "{name}" yakojwe neza',
        'teacher_updated_notification': 'Konti y\'umwarimu "{name}" yahinduwe',
        'teacher_deleted_notification': 'Konti y\'umwarimu "{name}" yakuvwe',
        'teacher_profile_updated_notification': 'Ibwirizwa ryawe ryahinduwe neza',
        
        # Assignment
        'assignment_created': 'Akazi k\'Umwarimu Kashyizweho',
        'assignment_deleted': 'Akazi k\'Umwarimu Kakuvwe',
        'assignment_create_success': 'Akazi k\'umwarimu "{teacher}" kashyizweho neza',
        'assignment_delete_success': 'Akazi kakuvwe neza',
        'assignment_not_found': 'Akazi ntaboneka',
        'duplicate_assignment': 'Uyu mwarimu amaze guhabwa iri somo',
        'class_level_mismatch': 'Urwego rw\'ishuri "{class_level}" ntiruri ku rwego rw\'amashuri "{school_level}"',
        
        # Assignment Notifications
        'assignment_created_notification': 'Umwarimu "{teacher}" yahawe akazi yo kwigisha "{subject}" muri {class_level}',
        'assignment_deleted_notification': 'Akazi k\'umwarimu "{teacher}" kakuvwe',
        
        # Timetable
        'timetable_generated': 'Igihe cy\'Amasomo Cyakozwe',
        'timetable_generate_success': 'Igihe cy\'amasomo cyakozwe neza',
        'timetable_generate_error': 'Gukora igihe cy\'amasomo byananiwe',
        'teacher_conflict': 'Umwarimu afite isomo riri kuri iri gihe',
        'classroom_conflict': 'Icyumba gikoreshwa kuri iri gihe',
        
        # Timetable Notifications
        'timetable_generated_notification': 'Igihe cy\'amasomo cya cyumweru {week} cyakozwe neza',
        'timetable_entry_created_notification': 'Igihe gishya cy\'amasomo cyongewe kuri {teacher} kuri {day} saa {time}',
        'timetable_entry_updated_notification': 'Igihe cy\'amasomo cyahinduwe kuri {teacher}',
        'timetable_conflict_notification': 'Hari ikibazo mu gihe cy\'amasomo cya {teacher} kuri {day} saa {time}',
        
        # Day Settings
        'day_setting_created': 'Igenamiterere ry\'Umunsi Ryakozwe',
        'day_setting_updated': 'Igenamiterere ry\'Umunsi Ryahinduwe',
        'day_setting_deleted': 'Igenamiterere ry\'Umunsi Ryakuvwe',
        'day_setting_create_success': 'Igenamiterere ry\'umunsi wa {school_level} kuri {day} ryakozwe neza',
        
        # Day Settings Notifications
        'day_setting_created_notification': 'Igenamiterere ry\'umunsi wa {school_level} kuri {day} ryashyizweho',
        'day_setting_updated_notification': 'Igenamiterere ry\'umunsi wa {school_level} kuri {day} ryahinduwe',
        'day_setting_deleted_notification': 'Igenamiterere ry\'umunsi wa {school_level} kuri {day} ryakuvwe',
        
        # Holiday
        'holiday_created': 'Umunsi mukuru Wakozwe',
        'holiday_deleted': 'Umunsi mukuru Wakuvwe',
        'holiday_create_success': 'Umunsi mukuru "{name}" wakozwe neza',
        'holiday_delete_success': 'Umunsi mukuru "{name}" wakuvwe neza',
        
        # Holiday Notifications
        'holiday_created_notification': 'Umunsi mukuru "{name}" wongewe ku kalendari',
        'holiday_deleted_notification': 'Umunsi mukuru "{name}" wakuvwe ku kalendari',
        
        # Profile
        'profile_updated': 'Ibwirizwa Ryahinduwe',
        'profile_update_success': 'Ibwirizwa ryawe ryahinduwe neza',
        
        # Error Messages
        'cannot_delete_has_assignments': 'Ntushobora gusiba umwarimu kuko afite akazi',
        'cannot_delete_has_timetable': 'Ntushobora gusiba kuko hari igihe cy\'amasomo',
        'invalid_email': 'Andika email ikora',
        'invalid_phone': 'Andika nimero ya terefone ikora',
        'teacher_inactive': 'Ntushobora guha akazi umwarimu utakora',
        'class_level_inactive': 'Ntushobora guha ikiciro cy\'ishuri kitakora',
        'subject_inactive': 'Ntushobora guha isomo ritakora',
        'academic_year_required': 'Umwaka w\'amashuri urasabwa kuri iyi gikorwa',
        
        # Email
        'email_subject_welcome': 'Murakaza neza muri Sisitemu yo Gucunga Amashuri',
        'email_body_welcome': """
Mwiriwe {name},

Konti yawe y'umwarimu yakojwe neza.

Amakuru yo kwinjira:
Izina: {username}
Ijambo ryibanga: {password}

Nyamuneka uhindure ijambo ryibanga nyuma yo kwinjira bwa mbere.

Twifuje amahoro,
Itsinda rya Sisitemu y'Amashuri
""",
    }
}


def get_translation(key, lang='en', **kwargs):
    """
    Get translated message for the given key and language.
    
    Args:
        key: The translation key
        lang: Language code ('en', 'fr', 'rw')
        **kwargs: Format arguments for the message
    
    Returns:
        str: Translated and formatted message
    """
    if lang not in TRANSLATIONS:
        lang = 'en'
    
    message = TRANSLATIONS[lang].get(key, TRANSLATIONS['en'].get(key, key))
    
    if kwargs:
        try:
            message = message.format(**kwargs)
        except KeyError:
            # If formatting fails, return as is
            pass
    
    return message


def get_notification_title(key, lang='en'):
    """Get notification title translation."""
    return get_translation(key, lang)


def get_notification_message(key, lang='en', **kwargs):
    """Get notification message translation with formatting."""
    return get_translation(key, lang, **kwargs)