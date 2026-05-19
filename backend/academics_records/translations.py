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
    },
    
    # Attendance Session List
    "attendance_sessions_fetched": {
        "en": "Attendance sessions retrieved successfully",
        "fr": "Sessions de présence récupérées avec succès",
        "rw": "Inama z'ibitiro zakusanyijwe neza"
    },
    
    # Attendance Create/Submit
    "attendance_missing_fields": {
        "en": "Please fill in all required fields",
        "fr": "Veuillez remplir tous les champs requis",
        "rw": "Uzuza ibyangombwa byose"
    },
    "attendance_no_records": {
        "en": "No attendance records to submit",
        "fr": "Aucun enregistrement de présence à soumettre",
        "rw": "Nta nyandiko z'ibitiro zo kohereza"
    },
    "attendance_session_exists": {
        "en": "Attendance already recorded for this session. A record already exists for this date, class, and subject.",
        "fr": "La présence a déjà été enregistrée pour cette session. Un enregistrement existe déjà pour cette date, cette classe et cette matière.",
        "rw": "Ibitiro byamaze kwandikwa kuri iyi nama. Inyandiko irahari kuri iyi tariki, iri cyiciro n'iri somo."
    },
    "attendance_created_success": {
        "en": "Attendance recorded successfully",
        "fr": "Présence enregistrée avec succès",
        "rw": "Ibitiro byanditswe neza"
    },
    
    # Attendance Session Detail
    "attendance_session_not_found": {
        "en": "Attendance session not found",
        "fr": "Session de présence non trouvée",
        "rw": "Inama y'ibitiro ntiboneka"
    },
    "attendance_session_fetched": {
        "en": "Attendance session details retrieved successfully",
        "fr": "Détails de la session de présence récupérés avec succès",
        "rw": "Iby'inama y'ibitiro byakusanyijwe neza"
    },
    
    # Attendance Record Update
    "attendance_record_not_found": {
        "en": "Attendance record not found",
        "fr": "Enregistrement de présence non trouvé",
        "rw": "Inyandiko y'ibitiro ntiboneka"
    },
    "attendance_record_updated": {
        "en": "Attendance record updated successfully",
        "fr": "Enregistrement de présence mis à jour avec succès",
        "rw": "Inyandiko y'ibitiro yahinduwe neza"
    },
    
    # Attendance Session Delete
    "attendance_session_deleted": {
        "en": "Attendance session for {session} deleted successfully",
        "fr": "Session de présence pour {session} supprimée avec succès",
        "rw": "Inama y'ibitiro ya {session} yasibwe neza"
    },
    
    # Teacher Students
    "not_assigned_to_classroom": {
        "en": "You are not assigned to this classroom",
        "fr": "Vous n'êtes pas assigné à cette salle de classe",
        "rw": "Ntabwo ugenewe iri cyumba cy'ishuri"
    },
    "classroom_not_found": {
        "en": "Classroom not found",
        "fr": "Salle de classe non trouvée",
        "rw": "Icyumba cy'ishuri ntiboneka"
    },
    "students_fetched": {
        "en": "Students retrieved successfully",
        "fr": "Étudiants récupérés avec succès",
        "rw": "Abanyeshuri bakusanyijwe neza"
    },
    
    # Additional Error Messages
    "parse_error": {
        "en": "Error parsing Excel file: {error}",
        "fr": "Erreur lors de l'analyse du fichier Excel : {error}",
        "rw": "Ikosa ry'gusoma dosiye ya Excel: {error}"
    },
    "permission_denied": {
        "en": "You don't have permission to access this resource",
        "fr": "Vous n'avez pas la permission d'accéder à cette ressource",
        "rw": "Ntufite uburenganzira bwo kubona uru rukundo"
    },
    "grades_fetched": {
        "en": "Grades retrieved successfully",
        "fr": "Notes récupérées avec succès",
        "rw": "Amanota yakusanyijwe neza"
    },
    
    # Notification Messages
    "notif_attendance_recorded_title": {
        "en": "Attendance Recorded",
        "fr": "Présence enregistrée",
        "rw": "Ibitiro byanditswe"
    },
    "notif_attendance_recorded_msg": {
        "en": "Your attendance for {subject} on {date} was marked as {status}",
        "fr": "Votre présence pour {subject} le {date} a été marquée comme {status}",
        "rw": "Ibitiro byawe ku isomo rya {subject} ku itariki ya {date} byagaragaye nka {status}"
    },
    "notif_attendance_updated_title": {
        "en": "Attendance Updated",
        "fr": "Présence mise à jour",
        "rw": "Ibitiro byahinduwe"
    },
    "notif_attendance_updated_msg": {
        "en": "Your attendance status has been updated to {status}",
        "fr": "Votre statut de présence a été mis à jour à {status}",
        "rw": "Imiterere y'ibitiro byawe yahinduwe ikaba {status}"
    },
    
    # Manual Grade Entry
    "grade_created_success": {
        "en": "Grade created successfully",
        "fr": "Note créée avec succès",
        "rw": "Amanota yaremwe neza"
    },
    "grade_updated_success": {
        "en": "Grade updated successfully",
        "fr": "Note mise à jour avec succès",
        "rw": "Amanota yahinduwe neza"
    },
    "grade_deleted_success": {
        "en": "Grade deleted successfully",
        "fr": "Note supprimée avec succès",
        "rw": "Amanota yasibwe neza"
    },
    "grade_not_found": {
        "en": "Grade not found",
        "fr": "Note non trouvée",
        "rw": "Amanota ntaboneka"
    },
    
    # File Operations
    "file_download_success": {
        "en": "File downloaded successfully",
        "fr": "Fichier téléchargé avec succès",
        "rw": "Dosiye yakurutswe neza"
    },
    "file_download_failed": {
        "en": "Failed to download file",
        "fr": "Échec du téléchargement du fichier",
        "rw": "Kurura dosiye byananiwe"
    },
    "file_not_found": {
        "en": "File not found",
        "fr": "Fichier non trouvé",
        "rw": "Dosiye ntaboneka"
    },
    "file_preview_failed": {
        "en": "Failed to load file preview",
        "fr": "Échec du chargement de l'aperçu du fichier",
        "rw": "Kwerekana dosiye byananiwe"
    },
    
    # Pagination
    "pagination_info": {
        "en": "Showing {start} to {end} of {total} results",
        "fr": "Affichage de {start} à {end} sur {total} résultats",
        "rw": "Kwerekana kuva {start} kugeza {end} kuri {total} byose"
    },
    
    # Search
    "search_placeholder": {
        "en": "Search by student name, subject, or class...",
        "fr": "Rechercher par nom d'étudiant, matière ou classe...",
        "rw": "Shakisha ukoreshe izina ry'umunyeshuri, isomo cyangwa icyiciro..."
    },
    
    # Modal Buttons
    "modal_confirm_delete": {
        "en": "Delete",
        "fr": "Supprimer",
        "rw": "Siba"
    },
    "modal_cancel": {
        "en": "Cancel",
        "fr": "Annuler",
        "rw": "Hagarika"
    },
    "modal_save": {
        "en": "Save Changes",
        "fr": "Enregistrer les modifications",
        "rw": "Bika Ibyahinduwe"
    },
    "modal_close": {
        "en": "Close",
        "fr": "Fermer",
        "rw": "Funga"
    },
    
    # Success Messages
    "refresh_success": {
        "en": "Data refreshed successfully",
        "fr": "Données actualisées avec succès",
        "rw": "Amakuru yavuguruwe neza"
    },
    
    # Loading States
    "loading_data": {
        "en": "Loading data...",
        "fr": "Chargement des données...",
        "rw": "Amakuru ariko araza..."
    },
    "processing": {
        "en": "Processing...",
        "fr": "Traitement en cours...",
        "rw": "Iri gukorwa..."
    },
    
    # Validation Errors
    "invalid_score": {
        "en": "Invalid score value. Please enter a number between 0 and 100",
        "fr": "Valeur de note invalide. Veuillez entrer un nombre entre 0 et 100",
        "rw": "Amanota si yo. Urugo rw'ibiro hagati ya 0 na 100"
    },
    "invalid_date": {
        "en": "Invalid date format. Please use YYYY-MM-DD",
        "fr": "Format de date invalide. Veuillez utiliser AAAA-MM-JJ",
        "rw": "Itariki si yo. Koresha UUUU-MM-DD"
    },
    "no_data_to_export": {
        "en": "No data available to export",
        "fr": "Aucune donnée disponible à exporter",
        "rw": "Nta makuru ariho yo kohereza hanze"
    },
    
    # Template Generation
    "template_generation_success": {
        "en": "Template generated successfully",
        "fr": "Modèle généré avec succès",
        "rw": "Akarorero karemanywe neza"
    },
    "template_generation_failed": {
        "en": "Failed to generate template",
        "fr": "Échec de la génération du modèle",
        "rw": "Kurema akarorero byananiwe"
    },
    "no_students_in_class": {
        "en": "No students found in the selected class",
        "fr": "Aucun étudiant trouvé dans la classe sélectionnée",
        "rw": "Nta munyeshuri uboneka mu cyiciro cyahiswemo"
    },
    
    # Bulk Upload
    "bulk_upload_success": {
        "en": "Successfully uploaded {count} records",
        "fr": "{count} enregistrements téléchargés avec succès",
        "rw": "Inyandiko {count} zoherejwe neza"
    },
    "bulk_upload_partial_success": {
        "en": "Uploaded {success} records, {failed} failed",
        "fr": "{success} enregistrements téléchargés, {failed} ont échoué",
        "rw": "Inyandiko {success} zoherejwe, {failed} ntizohereje"
    },
    "duplicate_records_found": {
        "en": "Duplicate records found and skipped: {count}",
        "fr": "Enregistrements en double trouvés et ignorés : {count}",
        "rw": "Inyandiko zisubiranye zabonetse zirekwa: {count}"
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