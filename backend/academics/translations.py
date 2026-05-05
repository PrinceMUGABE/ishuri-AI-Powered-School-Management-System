# academics/translations.py

ACADEMICS_TRANSLATIONS = {
    'en': {
        # Academic Year
        'academic_year_created': 'Academic Year Created',
        'academic_year_updated': 'Academic Year Updated',
        'academic_year_deleted': 'Academic Year Deleted',
        'academic_year_activated': 'Academic Year Activated',
        
        # School Level
        'school_level_created': 'School Level Created',
        'school_level_updated': 'School Level Updated',
        
        # Class Level
        'class_level_created': 'Class Level Created',
        'class_level_updated': 'Class Level Updated',
        'class_level_deleted': 'Class Level Deleted',
        
        # Classroom
        'classroom_created': 'Classroom Created',
        'classroom_updated': 'Classroom Updated',
        
        # Subject
        'subject_created': 'Subject Created',
        'subject_updated': 'Subject Updated',
        
        # Course Assignment
        'subject_assigned': 'Subject Assigned to Class',
        'subject_unassigned': 'Subject Removed from Class',
        
        # Cost
        'cost_added': 'Fee Structure Added',
        'cost_updated': 'Fee Structure Updated',
        
        # Messages
        'create_success': '{name} created successfully',
        'update_success': '{name} updated successfully',
        'delete_success': '{name} deleted successfully',
        'assign_success': 'Subject assigned to class level successfully',
        'unassign_success': 'Subject removed from class level successfully',
    },
    'fr': {
        'academic_year_created': 'Année Académique Créée',
        'academic_year_updated': 'Année Académique Mise à Jour',
        'academic_year_deleted': 'Année Académique Supprimée',
        'academic_year_activated': 'Année Académique Activée',
        
        'school_level_created': 'Niveau Scolaire Créé',
        'school_level_updated': 'Niveau Scolaire Mis à Jour',
        
        'class_level_created': 'Classe Créée',
        'class_level_updated': 'Classe Mise à Jour',
        'class_level_deleted': 'Classe Supprimée',
        
        'classroom_created': 'Salle de Classe Créée',
        'classroom_updated': 'Salle de Classe Mise à Jour',
        
        'subject_created': 'Matière Créée',
        'subject_updated': 'Matière Mise à Jour',
        
        'subject_assigned': 'Matière Assignée à la Classe',
        'subject_unassigned': 'Matière Retirée de la Classe',
        
        'cost_added': 'Structure des Frais Ajoutée',
        'cost_updated': 'Structure des Frais Mise à Jour',
        
        'create_success': '{name} créé avec succès',
        'update_success': '{name} mis à jour avec succès',
        'delete_success': '{name} supprimé avec succès',
        'assign_success': 'Matière assignée à la classe avec succès',
        'unassign_success': 'Matière retirée de la classe avec succès',
    },
    'rw': {
        'academic_year_created': 'Umwaka w\'Amashuri Waremwe',
        'academic_year_updated': 'Umwaka w\'Amashuri Wahinduwe',
        'academic_year_deleted': 'Umwaka w\'Amashuri Wakuwe',
        'academic_year_activated': 'Umwaka w\'Amashuri Wakozwe',
        
        'school_level_created': 'Urwego rw\'Amashuri Rwaremwe',
        'school_level_updated': 'Urwego rw\'Amashuri Rwahinduwe',
        
        'class_level_created': 'Icyiciro cy\'Amashuri Cyaremwe',
        'class_level_updated': 'Icyiciro cy\'Amashuri Cyahinduwe',
        'class_level_deleted': 'Icyiciro cy\'Amashuri Cyakuwe',
        
        'classroom_created': 'Icyumba cy\'Ishuri Cyaremwe',
        'classroom_updated': 'Icyumba cy\'Ishuri Cyahinduwe',
        
        'subject_created': 'I somo Riremwe',
        'subject_updated': 'I somo Rihinduwe',
        
        'subject_assigned': 'I somo Ryashyizwe mu Cyiciro',
        'subject_unassigned': 'I somo Ryakuwe mu Cyiciro',
        
        'cost_added': 'Igiciro cy\'Amafaranga Cyongewe',
        'cost_updated': 'Igiciro cy\'Amafaranga Cyahinduwe',
        
        'create_success': '{name} yaremwe neza',
        'update_success': '{name} yahinduwe neza',
        'delete_success': '{name} yakuwe neza',
        'assign_success': 'I somo ryashyizwe mu cyiciro neza',
        'unassign_success': 'I somo ryakuwe mu cyiciro neza',
    }
}


def get_academics_message(key, lang='en', **kwargs):
    """Get translated message for academics module"""
    lang = lang if lang in ['en', 'fr', 'rw'] else 'en'
    message = ACADEMICS_TRANSLATIONS.get(lang, {}).get(key, ACADEMICS_TRANSLATIONS['en'].get(key, key))
    
    if kwargs:
        try:
            return message.format(**kwargs)
        except KeyError:
            return message
    return message