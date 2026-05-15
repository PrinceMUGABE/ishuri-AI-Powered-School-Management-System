# academics_records/translations.py

TRANSLATIONS = {
    "teacher_profile_not_found": {
        "en": "Teacher profile not found",
        "fr": "Profil enseignant non trouvé",
        "rw": "Umwarimu ntaboneka"
    },
    "invalid_data": {
        "en": "Invalid data provided",
        "fr": "Données invalides",
        "rw": "Amakuru atari yo"
    },
    "unexpected_error": {
        "en": "An unexpected error occurred: {error}",
        "fr": "Une erreur inattendue s'est produite: {error}",
        "rw": "Ikibazo gitari kiri bitegerezwa cyabaye: {error}"
    },
    "forbidden": {
        "en": "You don't have permission to perform this action",
        "fr": "Vous n'avez pas la permission d'effectuer cette action",
        "rw": "Ntufite uburenganzira bwo gukora iki gikorwa"
    },
    "teacher_not_assigned": {
        "en": "You are not assigned to teach {subject} in {class_level}",
        "fr": "Vous n'êtes pas assigné à enseigner {subject} en {class_level}",
        "rw": "Ntugenguwe kwigisha {subject} muri {class_level}"
    },
    "grade_upload_bad_template": {
        "en": "Excel file missing required columns: {cols}",
        "fr": "Fichier Excel manque les colonnes requises: {cols}",
        "rw": "Dosiye ya Excel ibura insonga zikenewe: {cols}"
    },
    "students_not_in_class": {
        "en": "Students not found in class {class_level}: {students}",
        "fr": "Étudiants non trouvés dans la classe {class_level}: {students}",
        "rw": "Abanyeshuri ntibonetse mu ishuri {class_level}: {students}"
    },
    "grade_upload_no_data": {
        "en": "No valid grade data found in the file",
        "fr": "Aucune donnée de note valide trouvée dans le fichier",
        "rw": "Nta manota afite agaciro yabonetse muri dosiye"
    },
    "grade_upload_success": {
        "en": "Grades uploaded successfully and pending admin approval",
        "fr": "Notes téléchargées avec succès et en attente d'approbation",
        "rw": "Amanota yatanzwe neza kandi arindiriye kwemezwa"
    },
    "attendance_upload_bad_template": {
        "en": "Excel file missing required columns: {cols}",
        "fr": "Fichier Excel manque les colonnes requises: {cols}",
        "rw": "Dosiye ya Excel ibura insonga zikenewe: {cols}"
    },
    "attendance_upload_no_data": {
        "en": "No valid attendance data found in the file",
        "fr": "Aucune donnée de présence valide trouvée dans le fichier",
        "rw": "Nta makuru y'itarurishamibare afite agaciro yabonetse muri dosiye"
    },
    "grade_approved": {
        "en": "Grade upload approved successfully",
        "fr": "Téléchargement de notes approuvé avec succès",
        "rw": "Amanota yemewe neza"
    },
    "grade_rejected": {
        "en": "Grade upload rejected",
        "fr": "Téléchargement de notes rejeté",
        "rw": "Amanota yanze"
    },
    "grade_upload_list_fetched": {
        "en": "Grade uploads fetched successfully",
        "fr": "Téléchargements de notes récupérés",
        "rw": "Urutonde rw'amanota rwabonetse"
    },
    "performance_fetched": {
        "en": "Performance data fetched successfully",
        "fr": "Données de performance récupérées",
        "rw": "Amakuru y'ibyagezweho yabonetse"
    },
    "notif_grade_upload_title": {
        "en": "New Grade Upload",
        "fr": "Nouveau téléchargement de notes",
        "rw": "Amanota mashya yatanzwe"
    },
    "notif_grade_upload_msg": {
        "en": "Teacher {teacher} uploaded grades for {subject} - {class_level}",
        "fr": "L'enseignant {teacher} a téléchargé les notes pour {subject} - {class_level}",
        "rw": "Umwarimu {teacher} yatanze amanota ya {subject} - {class_level}"
    }
}


def t(key: str, lang: str = "en", **kwargs) -> str:
    """Get translated string"""
    lang = lang if lang in ("en", "fr", "rw") else "en"
    entry = TRANSLATIONS.get(key, {})
    text = entry.get(lang) or entry.get("en") or key
    if kwargs:
        try:
            text = text.format(**kwargs)
        except KeyError:
            pass
    return text


def get_lang(request) -> str:
    """Extract language from request"""
    lang = request.query_params.get("lang", "")
    if lang in ("en", "fr", "rw"):
        return lang
    lang = request.META.get("HTTP_X_LANGUAGE", "")
    if lang in ("en", "fr", "rw"):
        return lang
    accept = request.META.get("HTTP_ACCEPT_LANGUAGE", "en")
    for code in ("fr", "rw", "en"):
        if code in accept:
            return code
    return "en"