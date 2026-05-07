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