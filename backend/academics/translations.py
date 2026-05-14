# translations.py
"""
Translation file for Academics app.
Supports English (en), French (fr), and Kinyarwanda (rw)
"""

TRANSLATIONS = {
    'en': {
        # General
        'admin_access_required': 'Admin access required',
        'validation_failed': 'Validation failed',
        'create_success': 'created successfully',
        'update_success': 'updated successfully',
        'delete_success': 'deleted successfully',
        'assign_success': 'assigned successfully',
        'unassign_success': 'unassigned successfully',
        'fetch_error': 'Failed to fetch data',
        'create_error': 'Failed to create record',
        'update_error': 'Failed to update record',
        'delete_error': 'Failed to delete record',
        'not_found': 'Record not found',
        'already_exists': 'Record already exists',
        'code_already_exists': 'A record with this code already exists',
        'cannot_delete_has_children': 'Cannot delete because it has associated records',
        'dashboard_fetched': 'Dashboard statistics retrieved successfully',
        
        # Validation errors
        'subject_code_invalid': 'Subject code must contain only uppercase letters and numbers',
        'class_code_invalid': 'Class code must contain only uppercase letters and numbers',
        'room_code_invalid': 'Room code must contain only uppercase letters and numbers',
        'end_date_after_start': 'End date must be after start date',
        'overlapping_academic_year': 'This academic year overlaps with existing year: {name}',
        'duplicate_name': 'A subject with this name already exists',
        'duplicate_name_in_school_level': 'A class level with this name already exists in this school level',
        'duplicate_name_in_class_level': 'A classroom with this name already exists in this class level',
        'fee_structure_already_exists': 'A fee structure with this name already exists for this class level and academic year',
        'already_assigned': 'This subject is already assigned to this class level',
        
        # Fetch success messages
        'academic_years_fetched': '{count} academic year(s) retrieved successfully',
        'school_levels_fetched': '{count} school level(s) retrieved successfully',
        'class_levels_fetched': '{count} class level(s) retrieved successfully',
        'classrooms_fetched': '{count} classroom(s) retrieved successfully',
        'subjects_fetched': '{count} subject(s) retrieved successfully',
        'assignments_fetched': '{count} assignment(s) retrieved successfully',
        'costs_fetched': '{count} fee structure(s) retrieved successfully',
        
        # Detail fetch success messages
        'academic_year_fetched': 'Academic year "{name}" retrieved successfully',
        'school_level_fetched': 'School level "{name}" retrieved successfully',
        'class_level_fetched': 'Class level "{name}" retrieved successfully',
        'classroom_fetched': 'Classroom "{name}" retrieved successfully',
        'subject_fetched': 'Subject "{name}" retrieved successfully',
        'cost_fetched': 'Fee structure "{name}" retrieved successfully',
        
        # Academic Year
        'academic_year_created_title': 'Academic Year Created',
        'academic_year_updated_title': 'Academic Year Updated',
        'academic_year_deleted_title': 'Academic Year Deleted',
        'academic_year_create_msg': 'Academic year "{name}" created successfully',
        'academic_year_update_msg': 'Academic year "{name}" updated successfully',
        'academic_year_delete_msg': 'Academic year "{name}" deleted successfully',
        
        # School Level
        'school_level_created_title': 'School Level Created',
        'school_level_updated_title': 'School Level Updated',
        'school_level_deleted_title': 'School Level Deleted',
        'school_level_create_msg': 'School level "{name}" created successfully',
        'school_level_update_msg': 'School level "{name}" updated successfully',
        'school_level_delete_msg': 'School level "{name}" deleted successfully',
        
        # Class Level
        'class_level_created_title': 'Class Level Created',
        'class_level_updated_title': 'Class Level Updated',
        'class_level_deleted_title': 'Class Level Deleted',
        'class_level_create_msg': 'Class level "{name} ({code})" created successfully',
        'class_level_update_msg': 'Class level "{name} ({code})" updated successfully',
        'class_level_delete_msg': 'Class level "{name} ({code})" deleted successfully',
        
        # Classroom
        'classroom_created_title': 'Classroom Created',
        'classroom_updated_title': 'Classroom Updated',
        'classroom_deleted_title': 'Classroom Deleted',
        'classroom_create_msg': 'Classroom "{name} ({code})" created successfully',
        'classroom_update_msg': 'Classroom "{name}" updated successfully',
        'classroom_delete_msg': 'Classroom "{name}" deleted successfully',
        
        # Subject
        'subject_created_title': 'Subject Created',
        'subject_updated_title': 'Subject Updated',
        'subject_deleted_title': 'Subject Deleted',
        'subject_create_msg': 'Subject "{name} ({code})" created successfully',
        'subject_update_msg': 'Subject "{name}" updated successfully',
        'subject_delete_msg': 'Subject "{name} ({code})" deleted successfully',
        
        # Assignments
        'subject_assigned_title': 'Subject Assigned',
        'subject_unassigned_title': 'Subject Unassigned',
        'assign_msg': 'Subject "{subject}" assigned to class level "{class_level}" successfully',
        'unassign_msg': 'Subject "{subject}" unassigned from class level "{class_level}" successfully',
        
        # Fee Structures
        'fee_structure_created_title': 'Fee Structure Created',
        'fee_structure_updated_title': 'Fee Structure Updated',
        'fee_structure_deleted_title': 'Fee Structure Deleted',
        'fee_structure_create_msg': 'Fee structure "{name}" for {class_level} created successfully',
        'fee_structure_update_msg': 'Fee structure "{name}" updated successfully',
        'fee_structure_delete_msg': 'Fee structure "{name}" for {class_level} deleted successfully',
        
        # Error Messages
        'duplicate_code': 'A record with this code already exists',
        'duplicate_name': 'A record with this name already exists',
        'invalid_school_level': 'Invalid school level ID',
        'invalid_class_level': 'Invalid class level ID',
        'invalid_academic_year': 'Invalid academic year ID',
        'invalid_subject': 'Invalid subject ID',
        'class_level_inactive': 'Cannot assign to an inactive class level',
        'subject_inactive': 'Cannot assign an inactive subject',
        'terms_fetched': '{count} term(s) retrieved successfully',
        'term_fetched': 'Term "{name}" retrieved successfully',
        'term_create_msg': 'Term "{name}" created successfully',
        'term_update_msg': 'Term "{name}" updated successfully',
        'term_delete_msg': 'Term "{name}" deleted successfully',
        'payment_types_fetched': '{count} payment type(s) retrieved successfully',
        'payment_type_create_msg': 'Payment type "{name}" created successfully',
        'day_settings_fetched': '{count} day setting(s) retrieved successfully',
        'day_setting_create_msg': 'Day setting created successfully',
        'day_setting_update_msg': 'Day setting updated successfully',
        'day_setting_delete_msg': 'Day setting deleted successfully',
        'classroom_assign_msg': 'Classroom "{classroom}" assigned to "{class_level}" successfully',
        'classroom_unassign_msg': 'Classroom "{classroom}" unassigned from "{class_level}" successfully',
        'learning_days_fetched': 'Learning days retrieved successfully',
        'missing_dates': 'Both start_date and end_date are required',

        # Add notification titles:
        'term_created_title': 'Term Created',
        'term_updated_title': 'Term Updated',
        'term_deleted_title': 'Term Deleted',
        'day_setting_created_title': 'Day Setting Created',
        'classroom_assigned_title': 'Classroom Assigned',
        'classroom_unassigned_title': 'Classroom Unassigned',

        'term_dates_outside_academic_year': 'Term dates must be within the academic year dates',
        'overlapping_term': 'This term overlaps with existing term: {name}',
        'payment_type_code_invalid': 'Payment type code must contain only uppercase letters and numbers',
        'missing_weekday_or_date': 'Either weekday or specific date must be provided',
        'date_outside_academic_year': 'Date must be within the academic year',
        'different_school_levels': 'Classroom must belong to the same school level as the class level',
        'classroom_already_assigned_to_term': 'This classroom is already assigned to this term',
        'school_breaks_fetched': '{count} school break(s) retrieved successfully',
        'break_fetched': 'Break "{name}" retrieved successfully',
        'break_create_msg': 'Break "{name}" for {school_level} created successfully',
        'break_update_msg': 'Break "{name}" updated successfully',
        'break_delete_msg': 'Break "{name}" for {school_level} deleted successfully',
        'breaks_fetched': '{count} break(s) retrieved successfully',
        'break_created_title': 'School Break Created',
        'break_updated_title': 'School Break Updated',
        'break_deleted_title': 'School Break Deleted',
        'end_time_after_start': 'End time must be after start time',
        'duplicate_break_name': 'A break with this name already exists for this school level',
        'overlapping_break': 'This break overlaps with existing break: {name}',
        'break_too_short': 'Break duration cannot be less than 5 minutes',
        'break_too_long':  'Break duration cannot exceed 1 hour (60 minutes)',
        'break_start_too_early': 'Break must start at least 5 minutes after the school level start time ({time})',
        'break_end_too_late':    'Break must end at least 5 minutes before the school level end time ({time})',
        'school_level_start_time': 'Daily start time',
        'school_level_end_time':   'Daily end time',
        'holidays_fetched': '{count} holiday(s) retrieved successfully',
        'holiday_fetched': 'Holiday "{name}" retrieved successfully',
        'holiday_create_msg': 'Holiday "{name}" on {date} created successfully',
        'holiday_update_msg': 'Holiday "{name}" updated successfully',
        'holiday_delete_msg': 'Holiday "{name}" on {date} deleted successfully',
        'holiday_created_title': 'Holiday Created',
        'holiday_updated_title': 'Holiday Updated',
        'holiday_deleted_title': 'Holiday Deleted',
        'holiday_date_outside_academic_year': 'Holiday date must be within the academic year',
        'holiday_already_exists': 'A holiday already exists on {date} for academic year {academic_year}',
    },
    'fr': {
        # General
        'admin_access_required': 'Accès administrateur requis',
        'validation_failed': 'Échec de la validation',
        'create_success': 'créé avec succès',
        'update_success': 'mis à jour avec succès',
        'delete_success': 'supprimé avec succès',
        'assign_success': 'assigné avec succès',
        'unassign_success': 'désassigné avec succès',
        'fetch_error': 'Échec de la récupération des données',
        'create_error': 'Échec de la création',
        'update_error': 'Échec de la mise à jour',
        'delete_error': 'Échec de la suppression',
        'not_found': 'Enregistrement non trouvé',
        'already_exists': 'Un enregistrement existe déjà',
        'code_already_exists': 'Un enregistrement avec ce code existe déjà',
        'cannot_delete_has_children': 'Suppression impossible car il existe des enregistrements associés',
        'dashboard_fetched': 'Statistiques du tableau de bord récupérées avec succès',
        
        # Validation errors
        'subject_code_invalid': 'Le code de la matière doit contenir uniquement des lettres majuscules et des chiffres',
        'class_code_invalid': 'Le code de la classe doit contenir uniquement des lettres majuscules et des chiffres',
        'room_code_invalid': 'Le code de la salle doit contenir uniquement des lettres majuscules et des chiffres',
        'end_date_after_start': 'La date de fin doit être postérieure à la date de début',
        'overlapping_academic_year': 'Cette année académique chevauche l\'année existante : {name}',
        'duplicate_name': 'Une matière avec ce nom existe déjà',
        'duplicate_name_in_school_level': 'Un niveau de classe avec ce nom existe déjà dans ce niveau scolaire',
        'duplicate_name_in_class_level': 'Une salle de classe avec ce nom existe déjà dans ce niveau de classe',
        'fee_structure_already_exists': 'Une structure de frais avec ce nom existe déjà pour ce niveau de classe et cette année académique',
        'already_assigned': 'Cette matière est déjà assignée à ce niveau de classe',
        
        # Fetch success messages
        'academic_years_fetched': '{count} année(s) académique(s) récupérée(s) avec succès',
        'school_levels_fetched': '{count} niveau(x) scolaire(s) récupéré(s) avec succès',
        'class_levels_fetched': '{count} niveau(x) de classe récupéré(s) avec succès',
        'classrooms_fetched': '{count} salle(s) de classe récupérée(s) avec succès',
        'subjects_fetched': '{count} matière(s) récupérée(s) avec succès',
        'assignments_fetched': '{count} attribution(s) récupérée(s) avec succès',
        'costs_fetched': '{count} structure(s) de frais récupérée(s) avec succès',
        
        # Detail fetch success messages
        'academic_year_fetched': 'Année académique "{name}" récupérée avec succès',
        'school_level_fetched': 'Niveau scolaire "{name}" récupéré avec succès',
        'class_level_fetched': 'Niveau de classe "{name}" récupéré avec succès',
        'classroom_fetched': 'Salle de classe "{name}" récupérée avec succès',
        'subject_fetched': 'Matière "{name}" récupérée avec succès',
        'cost_fetched': 'Structure de frais "{name}" récupérée avec succès',
        
        # Academic Year
        'academic_year_created_title': 'Année Académique Créée',
        'academic_year_updated_title': 'Année Académique Mise à Jour',
        'academic_year_deleted_title': 'Année Académique Supprimée',
        'academic_year_create_msg': 'Année académique "{name}" créée avec succès',
        'academic_year_update_msg': 'Année académique "{name}" mise à jour avec succès',
        'academic_year_delete_msg': 'Année académique "{name}" supprimée avec succès',
        
        # School Level
        'school_level_created_title': 'Niveau Scolaire Créé',
        'school_level_updated_title': 'Niveau Scolaire Mis à Jour',
        'school_level_deleted_title': 'Niveau Scolaire Supprimé',
        'school_level_create_msg': 'Niveau scolaire "{name}" créé avec succès',
        'school_level_update_msg': 'Niveau scolaire "{name}" mis à jour avec succès',
        'school_level_delete_msg': 'Niveau scolaire "{name}" supprimé avec succès',
        
        # Class Level
        'class_level_created_title': 'Niveau de Classe Créé',
        'class_level_updated_title': 'Niveau de Classe Mis à Jour',
        'class_level_deleted_title': 'Niveau de Classe Supprimé',
        'class_level_create_msg': 'Niveau de classe "{name} ({code})" créé avec succès',
        'class_level_update_msg': 'Niveau de classe "{name} ({code})" mis à jour avec succès',
        'class_level_delete_msg': 'Niveau de classe "{name} ({code})" supprimé avec succès',
        
        # Classroom
        'classroom_created_title': 'Salle de Classe Créée',
        'classroom_updated_title': 'Salle de Classe Mise à Jour',
        'classroom_deleted_title': 'Salle de Classe Supprimée',
        'classroom_create_msg': 'Salle de classe "{name} ({code})" créée avec succès',
        'classroom_update_msg': 'Salle de classe "{name}" mise à jour avec succès',
        'classroom_delete_msg': 'Salle de classe "{name}" supprimée avec succès',
        
        # Subject
        'subject_created_title': 'Matière Créée',
        'subject_updated_title': 'Matière Mise à Jour',
        'subject_deleted_title': 'Matière Supprimée',
        'subject_create_msg': 'Matière "{name} ({code})" créée avec succès',
        'subject_update_msg': 'Matière "{name}" mise à jour avec succès',
        'subject_delete_msg': 'Matière "{name} ({code})" supprimée avec succès',
        
        # Assignments
        'subject_assigned_title': 'Matière Assignée',
        'subject_unassigned_title': 'Matière Désassignée',
        'assign_msg': 'Matière "{subject}" assignée au niveau de classe "{class_level}" avec succès',
        'unassign_msg': 'Matière "{subject}" désassignée du niveau de classe "{class_level}" avec succès',
        
        # Fee Structures
        'fee_structure_created_title': 'Structure de Frais Créée',
        'fee_structure_updated_title': 'Structure de Frais Mise à Jour',
        'fee_structure_deleted_title': 'Structure de Frais Supprimée',
        'fee_structure_create_msg': 'Structure de frais "{name}" pour {class_level} créée avec succès',
        'fee_structure_update_msg': 'Structure de frais "{name}" mise à jour avec succès',
        'fee_structure_delete_msg': 'Structure de frais "{name}" pour {class_level} supprimée avec succès',
        
        # Error Messages
        'duplicate_code': 'Un enregistrement avec ce code existe déjà',
        'duplicate_name': 'Un enregistrement avec ce nom existe déjà',
        'invalid_school_level': 'ID de niveau scolaire invalide',
        'invalid_class_level': 'ID de niveau de classe invalide',
        'invalid_academic_year': "ID d'année académique invalide",
        'invalid_subject': 'ID de matière invalide',
        'class_level_inactive': "Impossible d'assigner à un niveau de classe inactif",
        'subject_inactive': "Impossible d'assigner une matière inactive",
        'terms_fetched':               '{count} terme(s) récupéré(s) avec succès',
        'term_fetched':                'Terme "{name}" récupéré avec succès',
        'term_create_msg':             'Terme "{name}" créé avec succès',
        'term_update_msg':             'Terme "{name}" mis à jour avec succès',
        'term_delete_msg':             'Terme "{name}" supprimé avec succès',
        'payment_types_fetched':       '{count} type(s) de paiement récupéré(s) avec succès',
        'payment_type_create_msg':     'Type de paiement "{name}" créé avec succès',
        'day_settings_fetched':        '{count} paramètre(s) de journée récupéré(s) avec succès',
        'day_setting_create_msg':      'Paramètre de journée créé avec succès',
        'day_setting_update_msg':      'Paramètre de journée mis à jour avec succès',
        'day_setting_delete_msg':      'Paramètre de journée supprimé avec succès',
        'classroom_assign_msg':        'Salle "{classroom}" assignée à "{class_level}" avec succès',
        'classroom_unassign_msg':      'Salle "{classroom}" désassignée de "{class_level}" avec succès',
        'learning_days_fetched':       'Jours d\'apprentissage récupérés avec succès',
        'missing_dates':               'Les champs start_date et end_date sont tous les deux requis',
        
        # Notification titles — fr
        'term_created_title':          'Trimestre Créé',
        'term_updated_title':          'Trimestre Mis à Jour',
        'term_deleted_title':          'Trimestre Supprimé',
        'day_setting_created_title':   'Paramètre de Journée Créé',
        'classroom_assigned_title':    'Salle Assignée',
        'classroom_unassigned_title':  'Salle Désassignée',
        'term_dates_outside_academic_year': 'Les dates du trimestre doivent être comprises dans l\'année académique',
        'overlapping_term': 'Ce trimestre chevauche le trimestre existant : {name}',
        'payment_type_code_invalid': 'Le code du type de paiement ne doit contenir que des lettres majuscules et des chiffres',
        'missing_weekday_or_date': 'Le jour de la semaine ou la date spécifique doit être fourni',
        'date_outside_academic_year': 'La date doit être dans l\'année académique',
        'different_school_levels': 'La salle de classe doit appartenir au même niveau scolaire que le niveau de classe',
        'classroom_already_assigned_to_term': 'Cette salle de classe est déjà assignée à ce trimestre',
        'school_breaks_fetched': '{count} pause(s) scolaire(s) récupérée(s) avec succès',
        'break_fetched': 'Pause "{name}" récupérée avec succès',
        'break_create_msg': 'Pause "{name}" pour {school_level} créée avec succès',
        'break_update_msg': 'Pause "{name}" mise à jour avec succès',
        'break_delete_msg': 'Pause "{name}" pour {school_level} supprimée avec succès',
        'breaks_fetched': '{count} pause(s) récupérée(s) avec succès',
        'break_created_title': 'Pause Scolaire Créée',
        'break_updated_title': 'Pause Scolaire Mise à Jour',
        'break_deleted_title': 'Pause Scolaire Supprimée',
        'end_time_after_start': 'L\'heure de fin doit être après l\'heure de début',
        'duplicate_break_name': 'Une pause avec ce nom existe déjà pour ce niveau scolaire',
        'overlapping_break': 'Cette pause chevauche la pause existante : {name}',
        'break_too_short': 'La durée de la pause ne peut pas être inférieure à 5 minutes',
        'break_too_long':  'La durée de la pause ne peut pas dépasser 1 heure (60 minutes)',
        'break_start_too_early': 'La pause doit commencer au moins 5 minutes après l\'heure de début du niveau scolaire ({time})',
        'break_end_too_late':    'La pause doit se terminer au moins 5 minutes avant l\'heure de fin du niveau scolaire ({time})',
        'school_level_start_time': 'Heure de début quotidienne',
        'school_level_end_time':   'Heure de fin quotidienne',
        'holidays_fetched': '{count} jour(s) férié(s) récupéré(s) avec succès',
        'holiday_fetched': 'Jour férié "{name}" récupéré avec succès',
        'holiday_create_msg': 'Jour férié "{name}" le {date} créé avec succès',
        'holiday_update_msg': 'Jour férié "{name}" mis à jour avec succès',
        'holiday_delete_msg': 'Jour férié "{name}" le {date} supprimé avec succès',
        'holiday_created_title': 'Jour Férié Créé',
        'holiday_updated_title': 'Jour Férié Mis à Jour',
        'holiday_deleted_title': 'Jour Férié Supprimé',
        'holiday_date_outside_academic_year': 'La date du jour férié doit être dans l\'année académique',
        'holiday_already_exists': 'Un jour férié existe déjà le {date} pour l\'année académique {academic_year}',
 
    },
    'rw': {
        # General
        'admin_access_required': 'Uruhushya rw\'ubuyobozi rurakenewe',
        'validation_failed': 'Igenzura ryananiwe',
        'create_success': 'byakozwe neza',
        'update_success': 'byahinduwe neza',
        'delete_success': 'byakuvwe neza',
        'assign_success': 'byashyizweho neza',
        'unassign_success': 'byakuvwe neza',
        'fetch_error': 'Kubura amakuru byananiwe',
        'create_error': 'Kurema byananiwe',
        'update_error': 'Kuvugurura byananiwe',
        'delete_error': 'Gusiba byananiwe',
        'not_found': 'Ibyo ushaka ntibiboneka',
        'already_exists': 'Iri tumbi rirakiboneka',
        'code_already_exists': 'Ikintu gifite iyi kode kiraboneka',
        'cannot_delete_has_children': 'Ntushobora gusiba kuko hari ibindi bikurikira',
        'dashboard_fetched': 'Imibare y\'ikibaho yakusanyijwe neza',
        
        # Validation errors
        'subject_code_invalid': 'Kode y\'icyigisho igomba kuba inyuguti nkuru n\'imibare gusa',
        'class_code_invalid': 'Kode y\'ishuri igomba kuba inyuguti nkuru n\'imibare gusa',
        'room_code_invalid': 'Kode y\'icyumba igomba kuba inyuguti nkuru n\'imibare gusa',
        'end_date_after_start': 'Itariki y\'impera igomba kuba nyuma y\'itariki y\'itangiriro',
        'overlapping_academic_year': 'Uyu mwaka w\'amashuri urahuranye n\'uwabayeho: {name}',
        'duplicate_name': 'Icyigisho gifite iri zina kiragiboneka',
        'duplicate_name_in_school_level': 'Urwego rw\'ishuri rifite iri zina mu rwego rw\'amashuri ruraboneka',
        'duplicate_name_in_class_level': 'Icyumba cy\'amashuri gifite iri zina mu rwego rw\'ishuri giragiboneka',
        'fee_structure_already_exists': 'Ibiciro bifite iri zina kuri uru rwego n\'uyu mwaka biragiboneka',
        'already_assigned': 'Iki cyigisho gishyashyizwe kuri uru rwego rw\'ishuri',
        
        # Fetch success messages
        'academic_years_fetched': 'Imyaka {count} y\'amashuri yakusanyijwe neza',
        'school_levels_fetched': 'Ibyiciro {count} by\'amashuri byakusanyijwe neza',
        'class_levels_fetched': 'Ibyiciro {count} by\'ishuri byakusanyijwe neza',
        'classrooms_fetched': 'Ibyumba {count} by\'amashuri byakusanyijwe neza',
        'subjects_fetched': 'Ibyigisho {count} byakusanyijwe neza',
        'assignments_fetched': 'Imihererekane {count} yakusanyijwe neza',
        'costs_fetched': 'Ibiciro {count} byakusanyijwe neza',
        
        # Detail fetch success messages
        'academic_year_fetched': 'Umwaka w\'amashuri "{name}" wakusanyijwe neza',
        'school_level_fetched': 'Urwego rw\'amashuri "{name}" rwakusanyijwe neza',
        'class_level_fetched': 'Urwego rw\'ishuri "{name}" rwakusanyijwe neza',
        'classroom_fetched': 'Icyumba cy\'amashuri "{name}" cyakusanyijwe neza',
        'subject_fetched': 'Icyigisho "{name}" cyakusanyijwe neza',
        'cost_fetched': 'Ibiciro "{name}" byakusanyijwe neza',
        
        # Academic Year
        'academic_year_created_title': 'Umwaka w\'Amashuri Wakozwe',
        'academic_year_updated_title': 'Umwaka w\'Amashuri Wahinduwe',
        'academic_year_deleted_title': 'Umwaka w\'Amashuri Wakuvwe',
        'academic_year_create_msg': 'Umwaka w\'amashuri "{name}" wakozwe neza',
        'academic_year_update_msg': 'Umwaka w\'amashuri "{name}" wahinduwe neza',
        'academic_year_delete_msg': 'Umwaka w\'amashuri "{name}" wakuvwe neza',
        
        # School Level
        'school_level_created_title': 'Urwego rw\'Amashuri Rwakozwe',
        'school_level_updated_title': 'Urwego rw\'Amashuri Rwaravuguruwe',
        'school_level_deleted_title': 'Urwego rw\'Amashuri Rwakuvwe',
        'school_level_create_msg': 'Urwego rw\'amashuri "{name}" rwakozwe neza',
        'school_level_update_msg': 'Urwego rw\'amashuri "{name}" rwaravuguruwe neza',
        'school_level_delete_msg': 'Urwego rw\'amashuri "{name}" rwakuvwe neza',
        
        # Class Level
        'class_level_created_title': 'Urwego rw\'Ishuri Rwakozwe',
        'class_level_updated_title': 'Urwego rw\'Ishuri Rwaravuguruwe',
        'class_level_deleted_title': 'Urwego rw\'Ishuri Rwakuvwe',
        'class_level_create_msg': 'Urwego rw\'ishuri "{name} ({code})" rwakozwe neza',
        'class_level_update_msg': 'Urwego rw\'ishuri "{name} ({code})" rwaravuguruwe neza',
        'class_level_delete_msg': 'Urwego rw\'ishuri "{name} ({code})" rwakuvwe neza',
        
        # Classroom
        'classroom_created_title': 'Icyumba cy\'Amashuri Cyakozwe',
        'classroom_updated_title': 'Icyumba cy\'Amashuri Cyahinduwe',
        'classroom_deleted_title': 'Icyumba cy\'Amashuri Cyakuvwe',
        'classroom_create_msg': 'Icyumba cy\'amashuri "{name} ({code})" cyakozwe neza',
        'classroom_update_msg': 'Icyumba cy\'amashuri "{name}" cyahinduwe neza',
        'classroom_delete_msg': 'Icyumba cy\'amashuri "{name}" cyakuvwe neza',
        
        # Subject
        'subject_created_title': 'Icyigisho Cyakozwe',
        'subject_updated_title': 'Icyigisho Cyahinduwe',
        'subject_deleted_title': 'Icyigisho Cyakuvwe',
        'subject_create_msg': 'Icyigisho "{name} ({code})" cyakozwe neza',
        'subject_update_msg': 'Icyigisho "{name}" cyahinduwe neza',
        'subject_delete_msg': 'Icyigisho "{name} ({code})" cyakuvwe neza',
        
        # Assignments
        'subject_assigned_title': 'Icyigisho Cyashyizweho',
        'subject_unassigned_title': 'Icyigisho Gyakuvwe',
        'assign_msg': 'Icyigisho "{subject}" cyashyizwe ku rwego rw\'ishuri "{class_level}" neza',
        'unassign_msg': 'Icyigisho "{subject}" gyakuvwe ku rwego rw\'ishuri "{class_level}" neza',
        
        # Fee Structures
        'fee_structure_created_title': 'Ibiciro Byashyizweho',
        'fee_structure_updated_title': 'Ibiciro Byahinduwe',
        'fee_structure_deleted_title': 'Ibiciro Byakuvwe',
        'fee_structure_create_msg': 'Ibiciro "{name}" bya {class_level} byashyizweho neza',
        'fee_structure_update_msg': 'Ibiciro "{name}" byahinduwe neza',
        'fee_structure_delete_msg': 'Ibiciro "{name}" bya {class_level} byakuvwe neza',
        
        # Error Messages
        'duplicate_code': 'Ikintu gifite iyi kode kiraboneka',
        'duplicate_name': 'Ikintu gifite iri zina kiraboneka',
        'invalid_school_level': 'ID y\'urwego rw\'amashuri ntabwo ari yo',
        'invalid_class_level': 'ID y\'urwego rw\'ishuri ntabwo ari yo',
        'invalid_academic_year': 'ID y\'umwaka w\'amashuri ntabwo ari yo',
        'invalid_subject': 'ID y\'icyigisho ntabwo ari yo',
        'class_level_inactive': 'Ntushobora gushyira ku rwego rw\'ishuri rutakora',
        'subject_inactive': 'Ntushobora gushyira icyigisho kitakora',
        
        'terms_fetched':               'Ingeri {count} z\'ibihe zabonetse neza',
        'term_fetched':                'Igihembwe "{name}" cyabonetse neza',
        'term_create_msg':             'Igihembwe "{name}" cyaremwe neza',
        'term_update_msg':             'Igihembwe "{name}" cyavuguruwe neza',
        'term_delete_msg':             'Igihembwe "{name}" gisibwe neza',
        'payment_types_fetched':       'Ubwoko {count} bw\'ubwishyu bwabonetse neza',
        'payment_type_create_msg':     'Ubwoko bw\'ubwishyu "{name}" bwaremwe neza',
        'day_settings_fetched':        'Igenamiterere {count} ry\'iminsi ryabonetse neza',
        'day_setting_create_msg':      'Igenamiterere ry\'umunsi ryaremwe neza',
        'day_setting_update_msg':      'Igenamiterere ry\'umunsi ryavuguruwe neza',
        'day_setting_delete_msg':      'Igenamiterere ry\'umunsi ryasibwe neza',
        'classroom_assign_msg':        'Icyumba "{classroom}" gihariwe "{class_level}" neza',
        'classroom_unassign_msg':      'Icyumba "{classroom}" gikuwe kuri "{class_level}" neza',
        'learning_days_fetched':       'Iminsi y\'kwiga yabonetse neza',
        'missing_dates':               'start_date na end_date byombi bisabwa',
        
        # Notification titles — rw
        'term_created_title':          'Igihembwe Cyaremwe',
        'term_updated_title':          'Igihembwe Cyavuguruwe',
        'term_deleted_title':          'Igihembwe Gisibwe',
        'day_setting_created_title':   'Igenamiterere ry\'Umunsi Ryaremwe',
        'classroom_assigned_title':    'Icyumba Gihawe Aklase',
        'classroom_unassigned_title':  'Icyumba Gikuwe kuri Aklase',
        'term_dates_outside_academic_year': 'Ibihe by\'igihembwe bigomba kuba mu mwaka w\'amashuri',
        'overlapping_term': 'Iki gihembwe girahurana n\'igihembwe kiriho: {name}',
        'payment_type_code_invalid': 'Kode y\'ubwoko bw\'ubwishyu igomba kuba inyuguti nkuru n\'imibare gusa',
        'missing_weekday_or_date': 'Umunsi w\'icyumweru cyangwa itariki igomba gutangwa',
        'date_outside_academic_year': 'Itariki igomba kuba mu mwaka w\'amashuri',
        'different_school_levels': 'Icyumba cy\'amashuri kigomba kuba mu rwego rumwe n\'urwego rw\'ishuri',
        'classroom_already_assigned_to_term': 'Iki cyumba gishashyirwaho muri iki gihembwe',
        'school_breaks_fetched': 'Ibihembe {count} by\'ikiruhuko byakusanyijwe neza',
        'break_fetched': 'Ikiruhuko "{name}" cyakusanyijwe neza',
        'break_create_msg': 'Ikiruhuko "{name}" cya {school_level} cyakozwe neza',
        'break_update_msg': 'Ikiruhuko "{name}" cyahinduwe neza',
        'break_delete_msg': 'Ikiruhuko "{name}" cya {school_level} cyakuvwe neza',
        'breaks_fetched': 'Ibihembe {count} by\'ikiruhuko byakusanyijwe neza',
        'break_created_title': 'Ikiruhuko Cy\'ishuri Cyakozwe',
        'break_updated_title': 'Ikiruhuko Cy\'ishuri Cyahinduwe',
        'break_deleted_title': 'Ikiruhuko Cy\'ishuri Cyakuvwe',
        'end_time_after_start': 'Igihe cy\'impera kigomba kuba nyuma y\'igihe cy\'itangiriro',
        'duplicate_break_name': 'Ikiruhuko gifite iri zina mu rwego rw\'amashuri kiragiboneka',
        'overlapping_break': 'Iki kiruhuko gihuranye n\'ikiruhuko kiriho: {name}',
        'break_too_short': 'Ikiruhuko ntikishobora kuba munsi y\'iminota 5',
        'break_too_long':  'Ikiruhuko ntikishobora kurenza isaha 1 (iminota 60)',
        'break_start_too_early': 'Ikiruhuko kigomba gutangira nibura iminota 5 nyuma y\'igihe cy\'itangiriro cy\'urwego rw\'amashuri ({time})',
        'break_end_too_late':    'Ikiruhuko kigomba kurangira nibura iminota 5 mbere y\'igihe cy\'impera cy\'urwego rw\'amashuri ({time})',
        'school_level_start_time': 'Igihe cy\'itangiriro cy\'umunsi',
        'school_level_end_time':   'Igihe cy\'impera cy\'umunsi',
        'holidays_fetched': 'Iminsi {count} y\'ikiruhuko yabonetse neza',
        'holiday_fetched': 'Ikiruhuko "{name}" cyabonetse neza',
        'holiday_create_msg': 'Ikiruhuko "{name}" ku itariki {date} cyaremwe neza',
        'holiday_update_msg': 'Ikiruhuko "{name}" cyavuguruwe neza',
        'holiday_delete_msg': 'Ikiruhuko "{name}" ku itariki {date} cyakuvwe neza',
        'holiday_created_title': 'Ikiruhuko Cyaremwe',
        'holiday_updated_title': 'Ikiruhuko Cyavuguruwe',
        'holiday_deleted_title': 'Ikiruhuko Gyakuvwe',
        'holiday_date_outside_academic_year': 'Itariki y\'ikiruhuko igomba kuba mu mwaka w\'amashuri',
        'holiday_already_exists': 'Ikiruhuko kiriho ku itariki {date} mu mwaka w\'amashuri {academic_year}',

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