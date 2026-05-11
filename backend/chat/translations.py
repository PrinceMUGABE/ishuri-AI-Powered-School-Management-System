"""
Translations for the chat app.
All user-facing strings in English, French, and Kinyarwanda.
"""

TRANSLATIONS = {
    'en': {
        # Chatroom
        'chatroom_created': 'Chat room created successfully.',
        'chatroom_not_found': 'Chat room not found.',
        'chatroom_deleted': 'Chat room deleted successfully.',
        'chatroom_list_fetched': 'Chat rooms fetched successfully.',
        'chatroom_fetched': 'Chat room fetched successfully.',
        'chatroom_already_exists': 'A chat room for this student and teacher already exists.',
        'chatroom_settings_updated': 'Chat room settings updated successfully.',

        # Members
        'member_added': 'Member added to the chat room successfully.',
        'member_removed': 'Member removed from the chat room successfully.',
        'member_disabled': 'Member has been disabled from sending messages.',
        'member_enabled': 'Member has been enabled to send messages.',
        'member_not_found': 'Member not found in this chat room.',
        'member_already_exists': 'User is already a member of this chat room.',
        'cannot_remove_admin': 'You cannot remove the admin from the chat room.',
        'not_a_member': 'You are not a member of this chat room.',
        'not_authorized': 'You are not authorized to perform this action.',
        'send_message_disabled': 'You have been disabled from sending messages in this chat room.',

        # Messages
        'message_sent': 'Message sent successfully.',
        'message_not_found': 'Message not found.',
        'message_deleted': 'Message deleted successfully.',
        'message_updated': 'Message updated successfully.',
        'message_already_read': 'Message has already been read and cannot be edited.',
        'messages_fetched': 'Messages fetched successfully.',
        'unread_messages_fetched': 'Unread messages fetched successfully.',
        'not_message_sender': 'You are not the sender of this message.',
        'message_info_fetched': 'Message info fetched successfully.',
        'message_hidden': 'Message hidden from your view.',

        # Files
        'file_uploaded': 'File uploaded successfully.',
        'file_type_not_allowed': 'This file type is not allowed.',
        'file_too_large': 'File size exceeds the maximum allowed size of 50MB.',
        'no_file_provided': 'No file was provided.',

        # Student / Teacher
        'student_not_found': 'Student not found.',
        'teacher_not_found': 'Teacher not found.',
        'no_teacher_for_student': 'No teacher found teaching this student in the current class.',
        'parent_not_found': 'Parent not found.',
        'user_not_found': 'User not found.',

        # General
        'success': 'Operation completed successfully.',
        'error': 'An error occurred. Please try again.',
        'invalid_data': 'Invalid data provided.',
        'chatrooms_fetched': 'Chat rooms fetched successfully.',
    },

    'fr': {
        # Chatroom
        'chatroom_created': 'Salle de discussion créée avec succès.',
        'chatroom_not_found': 'Salle de discussion introuvable.',
        'chatroom_deleted': 'Salle de discussion supprimée avec succès.',
        'chatroom_list_fetched': 'Salles de discussion récupérées avec succès.',
        'chatroom_fetched': 'Salle de discussion récupérée avec succès.',
        'chatroom_already_exists': 'Une salle de discussion pour cet élève et ce professeur existe déjà.',
        'chatroom_settings_updated': 'Paramètres de la salle de discussion mis à jour avec succès.',

        # Members
        'member_added': 'Membre ajouté à la salle de discussion avec succès.',
        'member_removed': 'Membre retiré de la salle de discussion avec succès.',
        'member_disabled': 'Le membre a été désactivé pour l\'envoi de messages.',
        'member_enabled': 'Le membre a été activé pour l\'envoi de messages.',
        'member_not_found': 'Membre introuvable dans cette salle de discussion.',
        'member_already_exists': 'L\'utilisateur est déjà membre de cette salle de discussion.',
        'cannot_remove_admin': 'Vous ne pouvez pas retirer l\'administrateur de la salle de discussion.',
        'not_a_member': 'Vous n\'êtes pas membre de cette salle de discussion.',
        'not_authorized': 'Vous n\'êtes pas autorisé à effectuer cette action.',
        'send_message_disabled': 'Vous avez été désactivé pour l\'envoi de messages dans cette salle de discussion.',

        # Messages
        'message_sent': 'Message envoyé avec succès.',
        'message_not_found': 'Message introuvable.',
        'message_deleted': 'Message supprimé avec succès.',
        'message_updated': 'Message mis à jour avec succès.',
        'message_already_read': 'Le message a déjà été lu et ne peut pas être modifié.',
        'messages_fetched': 'Messages récupérés avec succès.',
        'unread_messages_fetched': 'Messages non lus récupérés avec succès.',
        'not_message_sender': 'Vous n\'êtes pas l\'expéditeur de ce message.',
        'message_info_fetched': 'Informations sur le message récupérées avec succès.',
        'message_hidden': 'Message masqué de votre vue.',

        # Files
        'file_uploaded': 'Fichier téléchargé avec succès.',
        'file_type_not_allowed': 'Ce type de fichier n\'est pas autorisé.',
        'file_too_large': 'La taille du fichier dépasse la taille maximale autorisée de 50 Mo.',
        'no_file_provided': 'Aucun fichier n\'a été fourni.',

        # Student / Teacher
        'student_not_found': 'Élève introuvable.',
        'teacher_not_found': 'Professeur introuvable.',
        'no_teacher_for_student': 'Aucun professeur trouvé enseignant cet élève dans la classe actuelle.',
        'parent_not_found': 'Parent introuvable.',
        'user_not_found': 'Utilisateur introuvable.',

        # General
        'success': 'Opération terminée avec succès.',
        'error': 'Une erreur s\'est produite. Veuillez réessayer.',
        'invalid_data': 'Données invalides fournies.',
        'chatrooms_fetched': 'Salles de discussion récupérées avec succès.',
    },

    'rw': {
        # Chatroom
        'chatroom_created': 'Icyumba cyo gutumanahana cyashyizweho neza.',
        'chatroom_not_found': 'Icyumba cyo gutumanahana ntikibonetse.',
        'chatroom_deleted': 'Icyumba cyo gutumanahana gisibwe neza.',
        'chatroom_list_fetched': 'Ibyumba byo gutumanahana byabonetse neza.',
        'chatroom_fetched': 'Icyumba cyo gutumanahana cyabonetse neza.',
        'chatroom_already_exists': 'Icyumba cyo gutumanahana kuri uyu munyeshuri n\'uyu mwarimu gisanzwe kihari.',
        'chatroom_settings_updated': 'Igenamiterere ry\'icyumba cyo gutumanahana ryavuguruwe neza.',

        # Members
        'member_added': 'Umunyamuryango yongewe mu cyumba cyo gutumanahana neza.',
        'member_removed': 'Umunyamuryango akuwe mu cyumba cyo gutumanahana neza.',
        'member_disabled': 'Umunyamuryango yanzwe uburenganzira bwo kohereza ubutumwa.',
        'member_enabled': 'Umunyamuryango yahawe uburenganzira bwo kohereza ubutumwa.',
        'member_not_found': 'Umunyamuryango ntabonetse muri iki cyumba cyo gutumanahana.',
        'member_already_exists': 'Umutumiwa asanzwe ari umunyamuryango w\'iki cyumba cyo gutumanahana.',
        'cannot_remove_admin': 'Ntushobora gukuraho umuyobozi mu cyumba cyo gutumanahana.',
        'not_a_member': 'Nturi umunyamuryango w\'iki cyumba cyo gutumanahana.',
        'not_authorized': 'Ntufite uburenganzira bwo gukora iyi ngikorwa.',
        'send_message_disabled': 'Wanzwe uburenganzira bwo kohereza ubutumwa muri iki cyumba cyo gutumanahana.',

        # Messages
        'message_sent': 'Ubutumwa bwoherejwe neza.',
        'message_not_found': 'Ubutumwa ntabubonetse.',
        'message_deleted': 'Ubutumwa bwasibwe neza.',
        'message_updated': 'Ubutumwa bwavuguruwe neza.',
        'message_already_read': 'Ubutumwa busomwe kandi ntishobora guhindurwa.',
        'messages_fetched': 'Ubutumwa bwabonetse neza.',
        'unread_messages_fetched': 'Ubutumwa butasomwa bwabonetse neza.',
        'not_message_sender': 'Ntuwatumye ubu butumwa.',
        'message_info_fetched': 'Amakuru y\'ubutumwa yabonetse neza.',
        'message_hidden': 'Ubutumwa bwihishwe mu reba rwawe.',

        # Files
        'file_uploaded': 'Dosiye yashyizweho neza.',
        'file_type_not_allowed': 'Ubu bwoko bwa dosiye ntibwemewe.',
        'file_too_large': 'Ingano ya dosiye irenze ingano ntarengwa ya 50MB.',
        'no_file_provided': 'Nta dosiye yatanzwe.',

        # Student / Teacher
        'student_not_found': 'Umunyeshuri ntabonetse.',
        'teacher_not_found': 'Umwarimu ntabonetse.',
        'no_teacher_for_student': 'Nta mwarimu wabonetse wiga uyu munyeshuri mu ishuri rya none.',
        'parent_not_found': 'Umubyeyi ntabonetse.',
        'user_not_found': 'Umutumiwa ntabonetse.',

        # General
        'success': 'Igikorwa cyarangiye neza.',
        'error': 'Habaye ikosa. Nyamuneka gerageza nanone.',
        'invalid_data': 'Amakuru atangwa ntabwo ari yo.',
        'chatrooms_fetched': 'Ibyumba byo gutumanahana byabonetse neza.',
    }
}


def get_translation(key: str, language: str = 'en') -> str:
    """
    Return translated string for a given key and language.
    Falls back to English if language or key is missing.
    """
    lang_dict = TRANSLATIONS.get(language, TRANSLATIONS['en'])
    return lang_dict.get(key, TRANSLATIONS['en'].get(key, key))


def get_user_language(request) -> str:
    """
    Extract user language from the authenticated user on the request.
    Falls back to 'en'.
    """
    try:
        if hasattr(request, 'user') and request.user.is_authenticated:
            lang = getattr(request.user, 'language', 'en')
            if lang in TRANSLATIONS:
                return lang
    except Exception:
        pass
    return 'en'