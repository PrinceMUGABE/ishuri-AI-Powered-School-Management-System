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
        'operation_success': 'Operation completed successfully',
        'operation_failed': 'Operation failed',

        # Teacher CRUD
        'teacher_created': 'Teacher Created',
        'teacher_updated': 'Teacher Updated',
        'teacher_deleted': 'Teacher Deleted',
        'teacher_create_success': 'Teacher "{name}" created successfully',
        'teacher_update_success': 'Teacher "{name}" updated successfully',
        'teacher_delete_success': 'Teacher "{name}" deleted successfully',
        'teacher_not_found': 'Teacher not found',
        'teacher_already_exists': 'A teacher with this email or phone number already exists',
        'email_already_exists': 'A teacher with this email already exists',
        'phone_already_exists': 'A teacher with this phone number already exists',
        'cannot_delete_has_assignments': 'Cannot delete teacher because they have active assignments',
        'teacher_inactive': 'Teacher is not active',

        # Teacher retrieval
        'teachers_retrieved': 'Teachers retrieved successfully',
        'teacher_retrieved': 'Teacher retrieved successfully',

        # Teacher Profile
        'profile_retrieved': 'Profile retrieved successfully',
        'profile_updated': 'Profile Updated',
        'profile_update_success': 'Your profile has been updated successfully',
        'profile_update_failed': 'Failed to update profile',

        # Password Change
        'password_changed': 'Password Changed',
        'password_change_success': 'Your password has been changed successfully',
        'password_change_failed': 'Failed to change password',
        'current_password_incorrect': 'Current password is incorrect',
        'new_password_mismatch': 'New passwords do not match',
        'password_too_weak': 'Password is too weak. It must be at least 8 characters',

        # Teacher Documents
        'document_uploaded': 'Document Uploaded',
        'document_upload_success': 'Document "{title}" uploaded successfully',
        'document_deleted': 'Document Deleted',
        'document_delete_success': 'Document deleted successfully',
        'document_not_found': 'Document not found',
        'documents_retrieved': 'Documents retrieved successfully',
        'invalid_file_type': 'Invalid file type. Allowed types: PDF, DOC, DOCX, JPG, PNG',

        # Teacher Assignments
        'assignment_created': 'Teacher Assignment Created',
        'assignment_updated': 'Teacher Assignment Updated',
        'assignment_deleted': 'Teacher Assignment Deleted',
        'assignment_create_success': 'Assignment for teacher "{teacher}" created successfully',
        'assignment_update_success': 'Assignment for teacher "{teacher}" updated successfully',
        'assignment_delete_success': 'Assignment deleted successfully',
        'assignment_not_found': 'Assignment not found',
        'assignment_retrieved': 'Assignment retrieved successfully',
        'assignments_retrieved': 'Assignments retrieved successfully',
        'assignment_already_exists': 'This assignment already exists for the teacher in this term',
        'classroom_already_assigned': 'Classroom is already assigned to another teacher for this term',
        'teacher_not_specialized': 'Teacher is not specialized in this subject',
        'class_level_mismatch': 'Class level does not belong to the selected school level',
        'total_hours_exceeded': 'Teacher\'s total weekly hours would exceed their capacity',

        # Timetable
        'timetable_generated': 'Timetable Generated',
        'timetable_generate_success': 'Timetable generated successfully for week {week}',
        'timetable_generate_failed': 'Failed to generate timetable',
        'timetable_retrieved': 'Timetable retrieved successfully',
        'timetable_exported': 'Timetable exported successfully',
        'no_assignments_found': 'No active assignments found for this academic year and term',
        'no_school_days_found': 'No school day settings found for this academic year',
        'teacher_conflict': 'Teacher already has a class scheduled at this time',
        'classroom_conflict': 'Classroom is already occupied at this time',
        'break_time_conflict': 'This time slot overlaps with a break period',
        'outside_school_hours': 'This time slot is outside school operating hours',
        'day_off': 'Day Off - No classes scheduled',

        # Academic year / term
        'academic_year_not_found': 'Academic year not found',
        'term_not_found': 'Term not found',

        # Students
        'students_retrieved': 'Students retrieved successfully',
        'student_not_found': 'Student not found',
        'student_details_retrieved': 'Student details retrieved successfully',
        'no_classrooms_assigned': 'No classrooms assigned to this teacher',
        'not_assigned_to_classroom': 'You are not assigned to this classroom',
        'not_authorized_to_view_student': 'You are not authorized to view this student',
        'classroom_not_found': 'Classroom not found',

        # Report
        'report_generated': 'Report generated successfully',

        # Holidays
        'holiday_create_success': 'Holiday "{name}" created successfully',
        'holiday_update_success': 'Holiday "{name}" updated successfully',
        'holiday_delete_success': 'Holiday "{name}" deleted successfully',
        'holiday_not_found': 'Holiday not found',
        'holiday_retrieved': 'Holiday retrieved successfully',
        'holidays_retrieved': 'Holidays retrieved successfully',

        # School Day Settings
        'day_setting_create_success': 'School day setting created successfully',
        'day_setting_update_success': 'School day setting updated successfully',
        'day_setting_delete_success': 'School day setting deleted successfully',
        'day_setting_not_found': 'School day setting not found',
        'day_setting_retrieved': 'School day setting retrieved successfully',
        'day_settings_retrieved': 'School day settings retrieved successfully',

        # Email
        'teacher_welcome_subject': 'Welcome to the School Management System',
        'teacher_welcome_body': """Dear {name},

Your teacher account has been created successfully.

Login Credentials:
Username: {username}
Password: {password}

Please change your password after your first login.

Best regards,
School Management Team
""",

        # Notifications
        'teacher_welcome_notification': 'Teacher account "{name}" has been created successfully',
        'teacher_updated_notification': 'Teacher account "{name}" has been updated',
        'teacher_deleted_notification': 'Teacher account "{name}" has been deleted',
        'teacher_profile_updated_notification': 'Your profile has been updated successfully',
        'assignment_created_notification': 'You have been assigned to teach "{subject}" for {class_level}',
        'assignment_deleted_notification': 'Your assignment to teach "{subject}" for {class_level} has been removed',
        'timetable_generated_notification': 'Your weekly timetable has been generated. Please check your schedule.',

        # Error Messages
        'database_error': 'Database error occurred. Please try again later.',
        'integrity_error': 'Data integrity error. Please check your input.',
        'permission_denied': 'You do not have permission to perform this action',
        'invalid_data': 'Invalid data provided. Please check your input.',
        'server_error': 'Server error occurred. Please contact support.',
        'file_too_large': 'File is too large. Maximum size is 10MB.',
    },

    'fr': {
        # General
        'admin_access_required': 'Accès administrateur requis',
        'teacher_access_required': 'Accès enseignant requis',
        'validation_failed': 'Échec de la validation',
        'operation_success': 'Opération réussie',
        'operation_failed': 'Échec de l\'opération',

        # Teacher CRUD
        'teacher_created': 'Enseignant Créé',
        'teacher_updated': 'Enseignant Mis à Jour',
        'teacher_deleted': 'Enseignant Supprimé',
        'teacher_create_success': 'Enseignant "{name}" créé avec succès',
        'teacher_update_success': 'Enseignant "{name}" mis à jour avec succès',
        'teacher_delete_success': 'Enseignant "{name}" supprimé avec succès',
        'teacher_not_found': 'Enseignant non trouvé',
        'teacher_already_exists': 'Un enseignant avec cet email ou numéro de téléphone existe déjà',
        'email_already_exists': 'Un enseignant avec cet email existe déjà',
        'phone_already_exists': 'Un enseignant avec ce numéro de téléphone existe déjà',
        'cannot_delete_has_assignments': 'Impossible de supprimer l\'enseignant car il a des affectations actives',
        'teacher_inactive': 'L\'enseignant n\'est pas actif',

        # Teacher retrieval
        'teachers_retrieved': 'Enseignants récupérés avec succès',
        'teacher_retrieved': 'Enseignant récupéré avec succès',

        # Teacher Profile
        'profile_retrieved': 'Profil récupéré avec succès',
        'profile_updated': 'Profil Mis à Jour',
        'profile_update_success': 'Votre profil a été mis à jour avec succès',
        'profile_update_failed': 'Échec de la mise à jour du profil',

        # Password Change
        'password_changed': 'Mot de passe Changé',
        'password_change_success': 'Votre mot de passe a été changé avec succès',
        'password_change_failed': 'Échec du changement de mot de passe',
        'current_password_incorrect': 'Le mot de passe actuel est incorrect',
        'new_password_mismatch': 'Les nouveaux mots de passe ne correspondent pas',
        'password_too_weak': 'Le mot de passe est trop faible. Il doit comporter au moins 8 caractères',

        # Teacher Documents
        'document_uploaded': 'Document Téléchargé',
        'document_upload_success': 'Document "{title}" téléchargé avec succès',
        'document_deleted': 'Document Supprimé',
        'document_delete_success': 'Document supprimé avec succès',
        'document_not_found': 'Document non trouvé',
        'documents_retrieved': 'Documents récupérés avec succès',
        'invalid_file_type': 'Type de fichier invalide. Types autorisés: PDF, DOC, DOCX, JPG, PNG',

        # Teacher Assignments
        'assignment_created': 'Affectation d\'Enseignant Créée',
        'assignment_updated': 'Affectation d\'Enseignant Mise à Jour',
        'assignment_deleted': 'Affectation d\'Enseignant Supprimée',
        'assignment_create_success': 'Affectation pour l\'enseignant "{teacher}" créée avec succès',
        'assignment_update_success': 'Affectation pour l\'enseignant "{teacher}" mise à jour avec succès',
        'assignment_delete_success': 'Affectation supprimée avec succès',
        'assignment_not_found': 'Affectation non trouvée',
        'assignment_retrieved': 'Affectation récupérée avec succès',
        'assignments_retrieved': 'Affectations récupérées avec succès',
        'assignment_already_exists': 'Cette affectation existe déjà pour l\'enseignant dans ce trimestre',
        'classroom_already_assigned': 'La salle de classe est déjà attribuée à un autre enseignant pour ce trimestre',
        'teacher_not_specialized': 'L\'enseignant n\'est pas spécialisé dans cette matière',
        'class_level_mismatch': 'Le niveau de classe n\'appartient pas au niveau scolaire sélectionné',
        'total_hours_exceeded': 'Les heures hebdomadaires totales de l\'enseignant dépasseraient sa capacité',

        # Timetable
        'timetable_generated': 'Emploi du Temps Généré',
        'timetable_generate_success': 'Emploi du temps généré avec succès pour la semaine {week}',
        'timetable_generate_failed': 'Échec de la génération de l\'emploi du temps',
        'timetable_retrieved': 'Emploi du temps récupéré avec succès',
        'timetable_exported': 'Emploi du temps exporté avec succès',
        'no_assignments_found': 'Aucune affectation active trouvée pour cette année académique et ce trimestre',
        'no_school_days_found': 'Aucun paramètre de jour scolaire trouvé pour cette année académique',
        'teacher_conflict': 'L\'enseignant a déjà un cours programmé à cette heure',
        'classroom_conflict': 'La salle de classe est déjà occupée à cette heure',
        'break_time_conflict': 'Ce créneau horaire chevauche une période de pause',
        'outside_school_hours': 'Ce créneau horaire est en dehors des heures de fonctionnement de l\'école',
        'day_off': 'Jour de congé - Aucun cours programmé',

        # Academic year / term
        'academic_year_not_found': 'Année académique non trouvée',
        'term_not_found': 'Trimestre non trouvé',

        # Students
        'students_retrieved': 'Étudiants récupérés avec succès',
        'student_not_found': 'Étudiant non trouvé',
        'student_details_retrieved': 'Détails de l\'étudiant récupérés avec succès',
        'no_classrooms_assigned': 'Aucune salle de classe assignée à cet enseignant',
        'not_assigned_to_classroom': 'Vous n\'êtes pas assigné à cette salle de classe',
        'not_authorized_to_view_student': 'Vous n\'êtes pas autorisé à voir cet étudiant',
        'classroom_not_found': 'Salle de classe non trouvée',

        # Report
        'report_generated': 'Rapport généré avec succès',

        # Holidays
        'holiday_create_success': 'Jour férié "{name}" créé avec succès',
        'holiday_update_success': 'Jour férié "{name}" mis à jour avec succès',
        'holiday_delete_success': 'Jour férié "{name}" supprimé avec succès',
        'holiday_not_found': 'Jour férié non trouvé',
        'holiday_retrieved': 'Jour férié récupéré avec succès',
        'holidays_retrieved': 'Jours fériés récupérés avec succès',

        # School Day Settings
        'day_setting_create_success': 'Paramètre de jour scolaire créé avec succès',
        'day_setting_update_success': 'Paramètre de jour scolaire mis à jour avec succès',
        'day_setting_delete_success': 'Paramètre de jour scolaire supprimé avec succès',
        'day_setting_not_found': 'Paramètre de jour scolaire non trouvé',
        'day_setting_retrieved': 'Paramètre de jour scolaire récupéré avec succès',
        'day_settings_retrieved': 'Paramètres de jour scolaire récupérés avec succès',

        # Email
        'teacher_welcome_subject': 'Bienvenue dans le Système de Gestion Scolaire',
        'teacher_welcome_body': """Cher/Chère {name},

Votre compte enseignant a été créé avec succès.

Identifiants de connexion:
Nom d'utilisateur: {username}
Mot de passe: {password}

Veuillez changer votre mot de passe après votre première connexion.

Cordialement,
L'équipe de gestion scolaire
""",

        # Notifications
        'teacher_welcome_notification': 'Le compte enseignant "{name}" a été créé avec succès',
        'teacher_updated_notification': 'Le compte enseignant "{name}" a été mis à jour',
        'teacher_deleted_notification': 'Le compte enseignant "{name}" a été supprimé',
        'teacher_profile_updated_notification': 'Votre profil a été mis à jour avec succès',
        'assignment_created_notification': 'Vous avez été assigné à enseigner "{subject}" pour {class_level}',
        'assignment_deleted_notification': 'Votre affectation pour enseigner "{subject}" pour {class_level} a été supprimée',
        'timetable_generated_notification': 'Votre emploi du temps hebdomadaire a été généré. Veuillez consulter votre horaire.',

        # Error Messages
        'database_error': 'Une erreur de base de données s\'est produite. Veuillez réessayer plus tard.',
        'integrity_error': 'Erreur d\'intégrité des données. Veuillez vérifier votre saisie.',
        'permission_denied': 'Vous n\'avez pas la permission d\'effectuer cette action',
        'invalid_data': 'Données invalides fournies. Veuillez vérifier votre saisie.',
        'server_error': 'Une erreur serveur s\'est produite. Veuillez contacter le support.',
        'file_too_large': 'Le fichier est trop volumineux. Taille maximale: 10 Mo.',
    },

    'rw': {
        # General
        'admin_access_required': 'Uruhushya rw\'ubuyobozi rurakenewe',
        'teacher_access_required': 'Uruhushya rw\'umwarimu rurakenewe',
        'validation_failed': 'Igenzura ryananiwe',
        'operation_success': 'Igikorwa cyakozwe neza',
        'operation_failed': 'Igikorwa cyananiwe',

        # Teacher CRUD
        'teacher_created': 'Umwarimu Yakojwe',
        'teacher_updated': 'Umwarimu Yahinduwe',
        'teacher_deleted': 'Umwarimu Yakuvwe',
        'teacher_create_success': 'Umwarimu "{name}" yakojwe neza',
        'teacher_update_success': 'Umwarimu "{name}" yahinduwe neza',
        'teacher_delete_success': 'Umwarimu "{name}" yakuvwe neza',
        'teacher_not_found': 'Umwarimu ntaboneka',
        'teacher_already_exists': 'Umwarimu ufiyi email cyangwa numero ya telefone aboneka',
        'email_already_exists': 'Umwarimu ufite iyi email aboneka',
        'phone_already_exists': 'Umwarimu ufite iyi numero ya terefone aboneka',
        'cannot_delete_has_assignments': 'Ntushobora gusiba umwarimu kuko afite akazi',
        'teacher_inactive': 'Umwarimu ntagikora',

        # Teacher retrieval
        'teachers_retrieved': 'Abarimu bakuwe neza',
        'teacher_retrieved': 'Umwarimu yakuwe neza',

        # Teacher Profile
        'profile_retrieved': 'Ibwirizwa ryakuwe neza',
        'profile_updated': 'Ibwirizwa Ryahinduwe',
        'profile_update_success': 'Ibwirizwa ryawe ryahinduwe neza',
        'profile_update_failed': 'Guhindura ibwirizwa byananiwe',

        # Password Change
        'password_changed': 'Ijambo ryibinga Ryahinduwe',
        'password_change_success': 'Ijambo ryibinga ryawe ryahinduwe neza',
        'password_change_failed': 'Guhindura ijambo ryibinga byananiwe',
        'current_password_incorrect': 'Ijambo ryibinga uri gukoresha ntabwo ari ryo',
        'new_password_mismatch': 'Ijambo ryibinga rishya ntabwo rirengana',
        'password_too_weak': 'Ijambo ryibinga ni rike. Rikwiye kugira byibura inyuguti 8',

        # Teacher Documents
        'document_uploaded': 'Inyandiko Yashyizwe',
        'document_upload_success': 'Inyandiko "{title}" yashyizwe neza',
        'document_deleted': 'Inyandiko Yakuvwe',
        'document_delete_success': 'Inyandiko yakuvwe neza',
        'document_not_found': 'Inyandiko ntaboneka',
        'documents_retrieved': 'Inyandiko zakuwe neza',
        'invalid_file_type': 'Ubwoko bwa dosiye ntabwo bwemewe. Zemewe: PDF, DOC, DOCX, JPG, PNG',

        # Teacher Assignments
        'assignment_created': 'Akazi k\'Umwarimu Kashyizweho',
        'assignment_updated': 'Akazi k\'Umwarimu Kahinduwe',
        'assignment_deleted': 'Akazi k\'Umwarimu Kakuvwe',
        'assignment_create_success': 'Akazi k\'umwarimu "{teacher}" kashyizweho neza',
        'assignment_update_success': 'Akazi k\'umwarimu "{teacher}" kahinduwe neza',
        'assignment_delete_success': 'Akazi kakuvwe neza',
        'assignment_not_found': 'Akazi ntaboneka',
        'assignment_retrieved': 'Akazi kakuwe neza',
        'assignments_retrieved': 'Akazi kakuwe neza',
        'assignment_already_exists': 'Uyu mwarimu amaze guhabwa iri somo muriki gihembwe',
        'classroom_already_assigned': 'Icyumba gisanzwe gihererejwe undi mwarimu muriki gihembwe',
        'teacher_not_specialized': 'Umwarimu ntabwo yizeye muri iri somo',
        'class_level_mismatch': 'Urwego rw\'ishuri ntiruri kurwego rw\'amashuri wahisemo',
        'total_hours_exceeded': 'Amasaha y\'umwarimu yarenze uko akwiriye',

        # Timetable
        'timetable_generated': 'Igihe cy\'Amasomo Gyakozwe',
        'timetable_generate_success': 'Igihe cy\'amasomo cyakozwe neza ku cyumweru {week}',
        'timetable_generate_failed': 'Gukora igihe cy\'amasomo byananiwe',
        'timetable_retrieved': 'Igihe cy\'amasomo cyakuwe neza',
        'timetable_exported': 'Igihe cy\'amasomo cyoherejwe neza',
        'no_assignments_found': 'Nta kazi kaboneka muri uyu mwaka n\'iki gihembwe',
        'no_school_days_found': 'Ntabikorwa by\'ishuri byashyizweho muri uyu mwaka w\'amashuri',
        'teacher_conflict': 'Umwarimu afite isomo riri kuri iri gihe',
        'classroom_conflict': 'Icyumba gikoreshwa kuri iri gihe',
        'break_time_conflict': 'Iri gihe rirahurika n\'igihe cy\'ikiruhuko',
        'outside_school_hours': 'Iri gihe ritari mu masaha y\'ishuri',
        'day_off': 'Umunsi w\'ikiruhuko - Nta isomo',

        # Academic year / term
        'academic_year_not_found': 'Umwaka w\'amashuri ntaboneka',
        'term_not_found': 'Igihembwe ntaboneka',

        # Students
        'students_retrieved': 'Abanyeshuri bakuwe neza',
        'student_not_found': 'Umunyeshuri ntaboneka',
        'student_details_retrieved': 'Amakuru y\'umunyeshuri yakuwe neza',
        'no_classrooms_assigned': 'Nta cyumba gihererejwe uyu mwarimu',
        'not_assigned_to_classroom': 'Ntabwo uhererejwe muri iki cyumba',
        'not_authorized_to_view_student': 'Ntabwo uremewe kureba uyu munyeshuri',
        'classroom_not_found': 'Icyumba ntaboneka',

        # Report
        'report_generated': 'Raporo yakozwe neza',

        # Holidays
        'holiday_create_success': 'Umunsi mukuru "{name}" wakozwe neza',
        'holiday_update_success': 'Umunsi mukuru "{name}" wahinduwe neza',
        'holiday_delete_success': 'Umunsi mukuru "{name}" wakuvwe neza',
        'holiday_not_found': 'Umunsi mukuru ntaboneka',
        'holiday_retrieved': 'Umunsi mukuru wakuwe neza',
        'holidays_retrieved': 'Iminsi mikuru yakuwe neza',

        # School Day Settings
        'day_setting_create_success': 'Igenamiterere ry\'umunsi ryakozwe neza',
        'day_setting_update_success': 'Igenamiterere ry\'umunsi ryahinduwe neza',
        'day_setting_delete_success': 'Igenamiterere ry\'umunsi ryakuvwe neza',
        'day_setting_not_found': 'Igenamiterere ry\'umunsi ntaboneka',
        'day_setting_retrieved': 'Igenamiterere ry\'umunsi ryakuwe neza',
        'day_settings_retrieved': 'Igenamiterere ry\'iminsi ryakuwe neza',

        # Email
        'teacher_welcome_subject': 'Murakaza neza muri Sisitemu yo Gucunga Amashuri',
        'teacher_welcome_body': """Mwiriwe {name},

Konti yawe y'umwarimu yakojwe neza.

Amakuru yo kwinjira:
Izina: {username}
Ijambo ryibanga: {password}

Nyamuneka uhindure ijambo ryibanga nyuma yo kwinjira bwa mbere.

Twifuje amahoro,
Itsinda rya Sisitemu y'Amashuri
""",

        # Notifications
        'teacher_welcome_notification': 'Konti y\'umwarimu "{name}" yakojwe neza',
        'teacher_updated_notification': 'Konti y\'umwarimu "{name}" yahinduwe',
        'teacher_deleted_notification': 'Konti y\'umwarimu "{name}" yakuvwe',
        'teacher_profile_updated_notification': 'Ibwirizwa ryawe ryahinduwe neza',
        'assignment_created_notification': 'Wahawe akazi wo kwigisha "{subject}" muri {class_level}',
        'assignment_deleted_notification': 'Akazi kawe ko kwigisha "{subject}" muri {class_level} gakuvwe',
        'timetable_generated_notification': 'Igihe cyawe cy\'amasomo cyakozwe. Reba gahunda yawe.',

        # Error Messages
        'database_error': 'Habaye ikibazo muri database. Gerageza nyuma.',
        'integrity_error': 'Habaye ikibazo mu makuru. Gerageza ugerageze.',
        'permission_denied': 'Ntabwo uremewe gukora iki gikorwa',
        'invalid_data': 'Amakuru utanze si yo. Gerageza ugerageze.',
        'server_error': 'Habaye ikibazo muri sisitemu. Vugana n\'ubuyobozi.',
        'file_too_large': 'Dosiye ni nini cyane. Ubunini ntiburenze 10MB.',
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
            pass

    return message


def get_notification_title(key, lang='en'):
    """Get notification title translation"""
    titles = {
        'teacher_created': get_translation('teacher_created', lang),
        'teacher_updated': get_translation('teacher_updated', lang),
        'teacher_deleted': get_translation('teacher_deleted', lang),
        'assignment_created': get_translation('assignment_created', lang),
        'assignment_deleted': get_translation('assignment_deleted', lang),
        'timetable_generated': get_translation('timetable_generated', lang),
        'profile_updated': get_translation('profile_updated', lang),
        'password_changed': get_translation('password_changed', lang),
        'document_uploaded': get_translation('document_uploaded', lang),
    }
    return titles.get(key, get_translation(key, lang))


def get_notification_message(key, lang='en', **kwargs):
    """Get notification message translation with formatting"""
    messages = {
        'teacher_created_notification': get_translation('teacher_welcome_notification', lang, **kwargs),
        'teacher_updated_notification': get_translation('teacher_updated_notification', lang, **kwargs),
        'teacher_deleted_notification': get_translation('teacher_deleted_notification', lang, **kwargs),
        'teacher_profile_updated_notification': get_translation('teacher_profile_updated_notification', lang, **kwargs),
        'assignment_created_notification': get_translation('assignment_created_notification', lang, **kwargs),
        'assignment_deleted_notification': get_translation('assignment_deleted_notification', lang, **kwargs),
        'timetable_generated_notification': get_translation('timetable_generated_notification', lang, **kwargs),
    }
    return messages.get(key, get_translation(key, lang, **kwargs))