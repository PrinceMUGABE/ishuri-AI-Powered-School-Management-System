"""
Translation helpers for the students app.
Supports: en (English), fr (French), rw (Kinyarwanda)
"""

MESSAGES = {
    # Student CRUD
    'student_created': {
        'en': 'Student created successfully',
        'fr': 'Étudiant créé avec succès',
        'rw': 'Umunyeshuri yashyizwe mu buryo bwiza',
    },
    'student_updated': {
        'en': 'Student updated successfully',
        'fr': 'Étudiant mis à jour avec succès',
        'rw': 'Amakuru y\'umunyeshuri yavuguruwe neza',
    },
    'student_deleted': {
        'en': 'Student deleted successfully',
        'fr': 'Étudiant supprimé avec succès',
        'rw': 'Umunyeshuri asibwe neza',
    },
    'student_not_found': {
        'en': 'Student not found',
        'fr': 'Étudiant introuvable',
        'rw': 'Umunyeshuri ntaboneka',
    },
    # Parent CRUD
    'parent_created': {
        'en': 'Parent/Guardian created successfully',
        'fr': 'Parent/Tuteur créé avec succès',
        'rw': 'Umubyeyi/Umurezi yashyizwe mu buryo bwiza',
    },
    'parent_updated': {
        'en': 'Parent/Guardian updated successfully',
        'fr': 'Parent/Tuteur mis à jour avec succès',
        'rw': 'Amakuru y\'umubyeyi yavuguruwe neza',
    },
    'parent_deleted': {
        'en': 'Parent/Guardian deleted successfully',
        'fr': 'Parent/Tuteur supprimé avec succès',
        'rw': 'Umubyeyi/Umurezi asibwe neza',
    },
    'parent_not_found': {
        'en': 'Parent/Guardian not found',
        'fr': 'Parent/Tuteur introuvable',
        'rw': 'Umubyeyi/Umurezi ntaboneka',
    },
    # Auth / permission
    'permission_denied': {
        'en': 'You do not have permission to perform this action',
        'fr': 'Vous n\'avez pas la permission d\'effectuer cette action',
        'rw': 'Ntufite uburenganzira bwo gukora ibi',
    },
    'account_created': {
        'en': 'User account created and credentials sent',
        'fr': 'Compte utilisateur créé et identifiants envoyés',
        'rw': 'Konti y\'umukoresha yaremwe kandi amakuru yoherejwe',
    },
    # Notifications
    'notif_student_created_title': {
        'en': 'Welcome to the School',
        'fr': 'Bienvenue à l\'école',
        'rw': 'Murakaza neza ku ishuri',
    },
    'notif_student_created_msg': {
        'en': 'Your student account has been created. Roll Number: {roll_number}',
        'fr': 'Votre compte étudiant a été créé. Numéro de rôle: {roll_number}',
        'rw': 'Konti yawe y\'umunyeshuri yaremwe. Inomero: {roll_number}',
    },
    'notif_student_updated_title': {
        'en': 'Student Profile Updated',
        'fr': 'Profil étudiant mis à jour',
        'rw': 'Umwirondoro w\'umunyeshuri wavuguruwe',
    },
    'notif_student_deleted_title': {
        'en': 'Student Account Removed',
        'fr': 'Compte étudiant supprimé',
        'rw': 'Konti y\'umunyeshuri isibwe',
    },
    'notif_parent_created_title': {
        'en': 'Welcome to the School Portal',
        'fr': 'Bienvenue sur le portail scolaire',
        'rw': 'Murakaza neza ku rubuga rw\'ishuri',
    },
    'notif_parent_created_msg': {
        'en': 'Your parent/guardian account has been created successfully.',
        'fr': 'Votre compte parent/tuteur a été créé avec succès.',
        'rw': 'Konti yawe y\'umubyeyi yaremwe neza.',
    },
    'notif_parent_updated_title': {
        'en': 'Parent Profile Updated',
        'fr': 'Profil parent mis à jour',
        'rw': 'Umwirondoro w\'umubyeyi wavuguruwe',
    },
    'student_already_has_parents': {
        'en': 'You already have a parent/guardian assigned. Only an administrator can modify your parent records.',
        'fr': 'Vous avez déjà un parent/tuteur assigné. Seul un administrateur peut modifier vos dossiers parentaux.',
        'rw': 'Usanzwe ufite umubyeyi/umurezi wagenwe. Umuyobozi gusa ashobora guhindura amakuru ya babyeyi bawe.',
    },
    'contact_admin_to_update_parents': {
        'en': 'Please contact an administrator to add, update, or remove parent/guardian records.',
        'fr': 'Veuillez contacter un administrateur pour ajouter, mettre à jour ou supprimer les dossiers de parents/tuteurs.',
        'rw': 'Nyamuneka wamarana n\'umuyobozi kugirango wongerere, uvugurure cyangwa usibe amakuru ya babyeyi/abarezi.',
    },
    'notif_student_parent_added_title': {
        'en': 'Parent/Guardian Added',
        'fr': 'Parent/Tuteur Ajouté',
        'rw': 'Umubyeyi/Umurezi Yongewe',
    },
    'notif_student_parent_added_msg': {
        'en': '{parent_name} has been added as your parent/guardian.',
        'fr': '{parent_name} a été ajouté(e) comme votre parent/tuteur.',
        'rw': '{parent_name} yongewe nk\'umubyeyi/umurezi wawe.',
    },
    'notif_parent_deleted_title': {
        'en': 'Parent Account Removed',
        'fr': 'Compte parent supprimé',
        'rw': 'Konti y\'umubyeyi isibwe',
    },
}


def get_message(key: str, lang: str = 'en', **kwargs) -> str:
    """Return translated message for the given key and language."""
    lang = lang if lang in ('en', 'fr', 'rw') else 'en'
    entry = MESSAGES.get(key, {})
    text = entry.get(lang) or entry.get('en') or key
    if kwargs:
        try:
            text = text.format(**kwargs)
        except KeyError:
            pass
    return text