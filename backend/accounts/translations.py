# Simple translation dictionary
TRANSLATIONS = {
    'en': {
        # Auth errors
        'invalid_credentials': 'Invalid username or password',
        'account_inactive': 'Your account is inactive. Please contact administrator.',
        'account_suspended': 'Your account has been suspended. Please contact administrator.',
        'invalid_role': 'Invalid role. This account is registered as {role}.',
        
        # Success messages
        'login_success': 'Login successful',
        'logout_success': 'Logout successful',
        'password_changed': 'Password changed successfully',
        'password_reset_sent': 'Password reset instructions sent to your email',
        'password_reset_success': 'Password reset successful',
        
        # User management
        'user_created': 'User created successfully',
        'user_updated': 'User updated successfully',
        'user_deleted': 'User deleted successfully',
        'user_activated': 'User activated successfully',
        'user_deactivated': 'User deactivated successfully',
    },
    'fr': {
        'invalid_credentials': 'Nom d\'utilisateur ou mot de passe invalide',
        'account_inactive': 'Votre compte est inactif. Veuillez contacter l\'administrateur.',
        'account_suspended': 'Votre compte a été suspendu. Veuillez contacter l\'administrateur.',
        'invalid_role': 'Rôle invalide. Ce compte est enregistré comme {role}.',
        
        'login_success': 'Connexion réussie',
        'logout_success': 'Déconnexion réussie',
        'password_changed': 'Mot de passe changé avec succès',
        'password_reset_sent': 'Instructions de réinitialisation envoyées à votre email',
        'password_reset_success': 'Réinitialisation du mot de passe réussie',
        
        'user_created': 'Utilisateur créé avec succès',
        'user_updated': 'Utilisateur mis à jour avec succès',
        'user_deleted': 'Utilisateur supprimé avec succès',
        'user_activated': 'Utilisateur activé avec succès',
        'user_deactivated': 'Utilisateur désactivé avec succès',
    },
    'rw': {
        'invalid_credentials': 'Izina cyangwa ijambo banga si byo',
        'account_inactive': 'Konti yawe nkora. Nyamuneka wagirane n\'umuyobozi.',
        'account_suspended': 'Konti yawe yahagaritswe. Nyamuneka wagirane n\'umuyobozi.',
        'invalid_role': 'Uruhare si rwo. Iyi konti yiyandikishije nk\'{role}.',
        
        'login_success': 'Winjiye neza',
        'logout_success': 'Wasohotse neza',
        'password_changed': 'Ijambo banga ryahinduwe neza',
        'password_reset_sent': 'Amabwiriza yo gusubiramo ijambo banga yoherejwe kuri email yawe',
        'password_reset_success': 'Ijambo banga ryasubiwemo neza',
        
        'user_created': 'Umukoresha yaremwe neza',
        'user_updated': 'Umukoresha yahinduwe neza',
        'user_deleted': 'Umukoresha yakuwe neza',
        'user_activated': 'Umukoresha yarakozwe neza',
        'user_deactivated': 'Umukoresha yahagaritswe neza',
    }
}


def get_message(key, lang='en'):
    """Get translated message"""
    lang = lang if lang in ['en', 'fr', 'rw'] else 'en'
    return TRANSLATIONS.get(lang, {}).get(key, TRANSLATIONS['en'].get(key, key))


def get_role_display(role, lang='en'):
    """Get translated role display"""
    roles = {
        'admin': {'en': 'Administrator', 'fr': 'Administrateur', 'rw': 'Ubuyobozi'},
        'teacher': {'en': 'Teacher', 'fr': 'Enseignant', 'rw': 'Umwarimu'},
        'student': {'en': 'Student', 'fr': 'Étudiant', 'rw': 'Umwan Nyabikorwa'},
        'parent': {'en': 'Parent', 'fr': 'Parent', 'rw': 'Umubyeyi'},
    }
    return roles.get(role, {}).get(lang, role)


def get_status_display(status, lang='en'):
    """Get translated status display"""
    statuses = {
        'active': {'en': 'Active', 'fr': 'Actif', 'rw': 'Gikora'},
        'inactive': {'en': 'Inactive', 'fr': 'Inactif', 'rw': 'Ntigikora'},
        'suspended': {'en': 'Suspended', 'fr': 'Suspendu', 'rw': 'Yahagaritswe'},
    }
    return statuses.get(status, {}).get(lang, status)