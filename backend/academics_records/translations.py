"""
translations.py – All user-facing strings for the academics_records app.

Each key maps to a dict of {lang_code: translated_string}.
Helper function `t(key, lang)` returns the correct string.
"""

TRANSLATIONS = {

    # ── Generic ──────────────────────────────────────────────────────────────
    "success":                          {"en": "Success",                         "fr": "Succès",                            "rw": "Byagenze neza"},
    "error":                            {"en": "Error",                           "fr": "Erreur",                            "rw": "Ikosa"},
    "not_found":                        {"en": "Not found",                       "fr": "Non trouvé",                        "rw": "Ntibabonetse"},
    "forbidden":                        {"en": "You do not have permission to perform this action.", "fr": "Vous n'avez pas la permission d'effectuer cette action.", "rw": "Ntufite uburenganzira bwo gukora iki gikorwa."},
    "invalid_data":                     {"en": "Invalid data provided.",          "fr": "Données invalides fournies.",        "rw": "Amakuru atari yo yatanzwe."},
    "unexpected_error":                 {"en": "An unexpected error occurred: {error}", "fr": "Une erreur inattendue s'est produite : {error}", "rw": "Ikibazo kitateganijwe cyabaye: {error}"},
    "validation_error":                 {"en": "Validation error: {error}",       "fr": "Erreur de validation : {error}",    "rw": "Ikosa ryo kugenzura: {error}"},
    "db_error":                         {"en": "Database error: {error}",         "fr": "Erreur de base de données : {error}", "rw": "Ikosa rya databaazi: {error}"},
    "file_error":                       {"en": "File processing error: {error}",  "fr": "Erreur de traitement de fichier : {error}", "rw": "Ikosa ryo gukora dosiye: {error}"},
    "parse_error":                      {"en": "Could not parse file: {error}",   "fr": "Impossible d'analyser le fichier : {error}", "rw": "Ntibishoboka gusoma dosiye: {error}"},
    "teacher_profile_not_found":        {"en": "Teacher profile not found for this user.", "fr": "Profil enseignant introuvable pour cet utilisateur.", "rw": "Umwarimu ntaboneka kuri uyu mukoresha."},
    "student_not_found":                {"en": "Student with roll number {roll} not found.", "fr": "Étudiant avec numéro {roll} introuvable.", "rw": "Umunyeshuri {roll} ntaboneka."},
    "no_records":                       {"en": "No records found.",               "fr": "Aucun enregistrement trouvé.",      "rw": "Nta makuru aboneka."},
    "deleted_successfully":             {"en": "Deleted successfully.",           "fr": "Supprimé avec succès.",             "rw": "Gusiba byagenze neza."},
    "updated_successfully":             {"en": "Updated successfully.",           "fr": "Mis à jour avec succès.",           "rw": "Kuvugurura byagenze neza."},

    # ── Grade Upload ─────────────────────────────────────────────────────────
    "grade_upload_success":             {"en": "Grades uploaded successfully and pending admin review.", "fr": "Notes téléchargées avec succès et en attente de validation par l'administrateur.", "rw": "Amanota yatanzwe neza kandi arindirira isuzuma ry'umuyobozi."},
    "grade_upload_no_file":             {"en": "No Excel file provided.",         "fr": "Aucun fichier Excel fourni.",        "rw": "Nta dosiye ya Excel yatanzwe."},
    "grade_upload_invalid_ext":         {"en": "Only .xlsx or .xls files are accepted.", "fr": "Seuls les fichiers .xlsx ou .xls sont acceptés.", "rw": "Dosiye .xlsx cyangwa .xls gusa ziemerewe."},
    "grade_upload_bad_template":        {"en": "Excel file is missing required columns: {cols}", "fr": "Colonnes requises manquantes dans le fichier : {cols}", "rw": "Insonga zikenewe zirabura muri dosiye: {cols}"},
    "grade_upload_duplicate":           {"en": "A grade upload already exists for this teacher/subject/class/term. Please update instead.", "fr": "Un téléchargement de notes existe déjà pour cet enseignant/matière/classe/période.", "rw": "Amanota akoroheje arashyizwe kuri uyu mwarimu/inyigisho/ishuri/igihe. Vugurura aho."},
    "grade_upload_saved":               {"en": "{count} student grades saved.",   "fr": "{count} notes d'étudiants enregistrées.", "rw": "Amanota y'{count} ba munyeshuri yabitswe."},
    "grade_upload_list_fetched":        {"en": "Grade uploads fetched successfully.", "fr": "Téléchargements de notes récupérés avec succès.", "rw": "Urutonde rw'amanota rwaboneka neza."},
    "grades_fetched":                   {"en": "Grades fetched successfully.",    "fr": "Notes récupérées avec succès.",      "rw": "Amanota yaboneka neza."},
    "grade_not_found":                  {"en": "Grade record not found.",         "fr": "Enregistrement de note introuvable.", "rw": "Amanota ntaboneka."},
    "grade_updated":                    {"en": "Grade updated successfully.",     "fr": "Note mise à jour avec succès.",      "rw": "Amanota yavuguruwe neza."},
    "grade_upload_not_found":           {"en": "Grade upload not found.",         "fr": "Téléchargement de notes introuvable.", "rw": "Dosiye y'amanota ntaboneka."},
    "grade_approved":                   {"en": "Grade upload approved and grades published to students.", "fr": "Téléchargement approuvé et notes publiées.", "rw": "Amanota yemewe kandi ashyizwe ahagaragara ku banyeshuri."},
    "grade_rejected":                   {"en": "Grade upload rejected. Teacher has been notified.", "fr": "Téléchargement refusé. L'enseignant a été informé.", "rw": "Amanota yananiwe. Umwarimu yamenyeshejwe."},
    "grade_already_approved":           {"en": "This grade upload is already approved.",  "fr": "Ce téléchargement est déjà approuvé.",  "rw": "Aya manota yari yemewe."},
    "grade_deleted":                    {"en": "Grade upload and all related grades deleted.", "fr": "Téléchargement et toutes les notes supprimés.", "rw": "Dosiye y'amanota n'amanota byose bisibwe."},

    # ── Notifications – Grades ───────────────────────────────────────────────
    "notif_grade_upload_title":         {"en": "New Grade Upload Pending Review", "fr": "Nouveau téléchargement de notes en attente", "rw": "Amanota mashya arindirira isuzuma"},
    "notif_grade_upload_msg":           {"en": "Teacher {teacher} has uploaded grades for {subject} – {class_level} ({term}). Please review.", "fr": "L'enseignant {teacher} a téléchargé les notes pour {subject} – {class_level} ({term}). Veuillez réviser.", "rw": "Umwarimu {teacher} yashyize amanota ya {subject} – {class_level} ({term}). Suzuma."},
    "notif_grade_approved_title":       {"en": "Your Grades Have Been Approved",  "fr": "Vos notes ont été approuvées",        "rw": "Amanota yawe yemewe"},
    "notif_grade_approved_msg":         {"en": "Your grade submission for {subject} – {class_level} has been approved and published.", "fr": "Votre soumission de notes pour {subject} – {class_level} a été approuvée.", "rw": "Amanota yawe ya {subject} – {class_level} yemewe kandi ashyizwe ahagaragara."},
    "notif_grade_rejected_title":       {"en": "Grade Submission Requires Revision", "fr": "La soumission de notes nécessite une révision", "rw": "Amanota asaba gusubirwaho"},
    "notif_grade_rejected_msg":         {"en": "Your grade submission for {subject} – {class_level} was rejected. Reason: {reason}", "fr": "Votre soumission pour {subject} – {class_level} a été refusée. Raison : {reason}", "rw": "Amanota yawe ya {subject} – {class_level} yananiwe. Impamvu: {reason}"},
    "notif_grade_published_title":      {"en": "Grades Published",               "fr": "Notes publiées",                     "rw": "Amanota ashyizwe ahagaragara"},
    "notif_grade_published_msg":        {"en": "Your grades for {subject} ({term}) are now available.", "fr": "Vos notes pour {subject} ({term}) sont disponibles.", "rw": "Amanota yawe ya {subject} ({term}) arashobora kuboneka."},

    # ── Attendance ───────────────────────────────────────────────────────────
    "attendance_session_created":       {"en": "Attendance session created successfully.", "fr": "Session de présence créée avec succès.", "rw": "Inyigisho y'ibarurishamibare yafunguwe neza."},
    "attendance_session_not_found":     {"en": "Attendance session not found.",   "fr": "Session de présence introuvable.",   "rw": "Inyigisho ntaboneka."},
    "attendance_session_duplicate":     {"en": "An attendance session already exists for this teacher/class/subject/date.", "fr": "Une session de présence existe déjà pour cet enseignant/classe/matière/date.", "rw": "Inyigisho irashyizweho kuri uyu mwarimu/ishuri/inyigisho/itariki."},
    "attendance_submitted":             {"en": "Attendance submitted successfully.", "fr": "Présence soumise avec succès.",   "rw": "Ibarurishamibare ryoherejwe neza."},
    "attendance_fetched":               {"en": "Attendance records fetched successfully.", "fr": "Enregistrements de présence récupérés.", "rw": "Amateka y'ibarurishamibare yaboneka neza."},
    "attendance_updated":               {"en": "Attendance record updated.",      "fr": "Enregistrement de présence mis à jour.", "rw": "Ibarurishamibare ryavuguruwe."},
    "attendance_deleted":               {"en": "Attendance session deleted.",     "fr": "Session de présence supprimée.",    "rw": "Inyigisho isibwe."},
    "attendance_record_not_found":      {"en": "Attendance record not found.",    "fr": "Enregistrement de présence introuvable.", "rw": "Ibarurishamibare ntaboneka."},
    "attendance_record_deleted":        {"en": "Attendance record deleted.",      "fr": "Enregistrement de présence supprimé.", "rw": "Ibarurishamibare risibwe."},
    "attendance_added":                 {"en": "Attendance record added.",        "fr": "Enregistrement de présence ajouté.", "rw": "Ibarurishamibare ryongeweho."},
    "attendance_already_exists":        {"en": "Attendance already recorded for this student in this session.", "fr": "Présence déjà enregistrée pour cet étudiant.", "rw": "Ibarurishamibare ry'uyu munyeshuri rirashyizweho muri iyi nyigisho."},

    # ── Notifications – Attendance ────────────────────────────────────────────
    "notif_attendance_submitted_title": {"en": "Attendance Submitted",           "fr": "Présence soumise",                  "rw": "Ibarurishamibare ryoherejwe"},
    "notif_attendance_submitted_msg":   {"en": "Teacher {teacher} submitted attendance for {subject} – {class_level} on {date}.", "fr": "L'enseignant {teacher} a soumis la présence pour {subject} – {class_level} le {date}.", "rw": "Umwarimu {teacher} yohereje ibarurishamibare ya {subject} – {class_level} ku {date}."},
    "notif_low_attendance_title":       {"en": "Low Attendance Warning",         "fr": "Avertissement d'assiduité faible",  "rw": "Inzio y'ubukerewe buke"},
    "notif_low_attendance_msg":         {"en": "Student {student} has low attendance ({pct}%) in {subject}.", "fr": "L'étudiant {student} a une faible assiduité ({pct}%) en {subject}.", "rw": "Umunyeshuri {student} afite ibarurishamibare ruke ({pct}%) muri {subject}."},

    # ── Assignment ───────────────────────────────────────────────────────────
    "assignment_uploaded":              {"en": "Assignment uploaded successfully.", "fr": "Devoir téléchargé avec succès.",   "rw": "Akazi koherejwe neza."},
    "assignment_not_found":             {"en": "Assignment not found.",           "fr": "Devoir introuvable.",               "rw": "Akazi ntaboneka."},
    "assignment_no_file":               {"en": "No PDF file provided.",           "fr": "Aucun fichier PDF fourni.",          "rw": "Nta dosiye PDF yatanzwe."},
    "assignment_invalid_ext":           {"en": "Only PDF files are allowed for assignments.", "fr": "Seuls les fichiers PDF sont acceptés.", "rw": "Dosiye PDF gusa ziemerewe."},
    "assignment_fetched":               {"en": "Assignments fetched successfully.", "fr": "Devoirs récupérés avec succès.",  "rw": "Akazi kaboneka neza."},
    "assignment_updated":               {"en": "Assignment updated successfully.", "fr": "Devoir mis à jour avec succès.",   "rw": "Akazi kavuguruwe neza."},
    "assignment_deleted":               {"en": "Assignment deleted successfully.", "fr": "Devoir supprimé avec succès.",     "rw": "Akazi gasibwe neza."},
    "assignment_detail_fetched":        {"en": "Assignment details fetched.",     "fr": "Détails du devoir récupérés.",      "rw": "Amakuru y'akazi yaboneka."},

    # ── Notifications – Assignments ───────────────────────────────────────────
    "notif_assignment_uploaded_title":  {"en": "New Assignment Posted",          "fr": "Nouveau devoir publié",             "rw": "Akazi gashya gasohowe"},
    "notif_assignment_uploaded_msg":    {"en": "A new assignment '{title}' has been posted for {subject} – {class_level}. Due: {due_date}.", "fr": "Un nouveau devoir '{title}' a été publié pour {subject} – {class_level}. Délai : {due_date}.", "rw": "Akazi gashya '{title}' gashyizweho kuri {subject} – {class_level}. Igihe: {due_date}."},
    "notif_assignment_admin_title":     {"en": "New Assignment Uploaded",        "fr": "Nouveau devoir téléchargé",         "rw": "Akazi gashya gasohowe"},
    "notif_assignment_admin_msg":       {"en": "Teacher {teacher} uploaded assignment '{title}' for {subject} – {class_level}.", "fr": "L'enseignant {teacher} a publié le devoir '{title}' pour {subject} – {class_level}.", "rw": "Umwarimu {teacher} yashyize akazi '{title}' kuri {subject} – {class_level}."},
}


def t(key: str, lang: str = "en", **kwargs) -> str:
    """
    Translate a key to the given language.
    Falls back to English if the language or key is not found.
    Supports .format()-style keyword arguments.
    """
    lang = lang if lang in ("en", "fr", "rw") else "en"
    entry = TRANSLATIONS.get(key, {})
    text  = entry.get(lang) or entry.get("en") or key
    if kwargs:
        try:
            text = text.format(**kwargs)
        except KeyError:
            pass
    return text


def get_lang(request) -> str:
    """Extract the preferred language from the request."""
    # 1. Query param  ?lang=fr
    lang = request.query_params.get("lang") or request.GET.get("lang", "")
    if lang in ("en", "fr", "rw"):
        return lang
    # 2. Custom header  X-Language: rw
    lang = request.META.get("HTTP_X_LANGUAGE", "")
    if lang in ("en", "fr", "rw"):
        return lang
    # 3. Accept-Language header
    accept = request.META.get("HTTP_ACCEPT_LANGUAGE", "en")
    for code in ("fr", "rw", "en"):
        if code in accept:
            return code
    return "en"