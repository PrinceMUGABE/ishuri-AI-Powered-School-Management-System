import json
import os
from pathlib import Path
from typing import Dict, Any, Optional
from django.utils.translation import get_language
from django.core.cache import cache
from rest_framework.exceptions import APIException


class Translator:
    """Multi-language translation service for Ishuri system with session support."""
    
    _translations: Dict[str, Dict] = {}
    _supported_languages = ['en', 'fr', 'rw']
    _language_names = {
        'en': 'English',
        'fr': 'Français',
        'rw': 'Ikinyarwanda'
    }
    
    # Session key for storing language preference
    SESSION_LANGUAGE_KEY = 'user_language'
    
    def __init__(self):
        self._load_translations()
    
    def _load_translations(self):
        """Load all translation JSON files."""
        translations_dir = Path(__file__).parent
        
        for lang_code in self._supported_languages:
            file_path = translations_dir / f"{lang_code}.json"
            if file_path.exists():
                with open(file_path, 'r', encoding='utf-8') as f:
                    self._translations[lang_code] = json.load(f)
    
    def get_user_language(self, request) -> str:
        """
        Get user's preferred language from session, then from user profile, then from request header.
        Priority: Session > User Profile > Request Header > Default
        """
        # 1. Check session first
        if request and hasattr(request, 'session'):
            session_lang = request.session.get(self.SESSION_LANGUAGE_KEY)
            if session_lang and session_lang in self._supported_languages:
                return session_lang
        
        # 2. Check authenticated user's profile
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            if hasattr(request.user, 'language') and request.user.language:
                if request.user.language in self._supported_languages:
                    return request.user.language
        
        # 3. Check request header
        if request:
            header_lang = request.headers.get('Accept-Language', 'en')
            # Parse header like 'en-US,en;q=0.9,fr;q=0.8'
            if ',' in header_lang:
                header_lang = header_lang.split(',')[0].split(';')[0]
            header_lang = header_lang[:2]  # Get first 2 characters
            if header_lang in self._supported_languages:
                return header_lang
        
        # 4. Default to English
        return 'en'
    
    def set_session_language(self, request, language_code: str) -> bool:
        """
        Set user's language preference in session.
        
        Args:
            request: HTTP request object
            language_code: Language code (en, fr, rw)
        
        Returns:
            True if language was set successfully, False otherwise
        """
        if language_code not in self._supported_languages:
            return False
        
        if request and hasattr(request, 'session'):
            request.session[self.SESSION_LANGUAGE_KEY] = language_code
            request.session.modified = True
            
            # Also update user profile if user is authenticated
            if hasattr(request, 'user') and request.user.is_authenticated:
                try:
                    request.user.language = language_code
                    request.user.save(update_fields=['language'])
                except Exception:
                    # Don't fail if user profile update fails
                    pass
            
            return True
        
        return False
    
    def clear_session_language(self, request) -> bool:
        """Clear language preference from session."""
        if request and hasattr(request, 'session'):
            if self.SESSION_LANGUAGE_KEY in request.session:
                del request.session[self.SESSION_LANGUAGE_KEY]
                request.session.modified = True
            return True
        return False
    
    def get_translation(self, key: str, lang_code: str = None, request=None, **kwargs) -> str:
        """
        Get translation for a given key.
        
        Args:
            key: Dot notation key (e.g., 'success.login_success')
            lang_code: Language code (en, fr, rw) - overrides request language
            request: HTTP request object to get language from session
            **kwargs: Format parameters for the translation string
        
        Returns:
            Translated string with formatting applied
        """
        # Determine language to use
        if not lang_code and request:
            lang_code = self.get_user_language(request)
        elif not lang_code:
            lang_code = self.get_default_language()
        
        # Fallback to English if language not supported
        if lang_code not in self._supported_languages:
            lang_code = 'en'
        
        # Navigate through nested dictionary
        keys = key.split('.')
        translation = self._translations.get(lang_code, {})
        
        try:
            for k in keys:
                translation = translation[k]
        except (KeyError, TypeError):
            # Fallback to English if key not found in requested language
            translation = self._get_from_english(key)
        
        # Format the string with provided arguments
        if isinstance(translation, str) and kwargs:
            try:
                translation = translation.format(**kwargs)
            except KeyError:
                pass
        
        return translation
    
    def _get_from_english(self, key: str) -> str:
        """Get translation from English as fallback."""
        keys = key.split('.')
        translation = self._translations.get('en', {})
        
        for k in keys:
            translation = translation.get(k, key)
            if not isinstance(translation, dict):
                break
        
        return translation if isinstance(translation, str) else key
    
    def get_success_message(self, message_key: str, lang_code: str = None, request=None, **kwargs) -> Dict[str, Any]:
        """Get formatted success response message."""
        message = self.get_translation(f"success.{message_key}", lang_code, request, **kwargs)
        actual_lang = lang_code or (self.get_user_language(request) if request else 'en')
        
        return {
            "message": message,
            "message_key": message_key,
            "language": actual_lang
        }
    
    def get_error_message(self, error_key: str, lang_code: str = None, request=None, **kwargs) -> Dict[str, Any]:
        """Get formatted error response message."""
        message = self.get_translation(f"errors.{error_key}", lang_code, request, **kwargs)
        actual_lang = lang_code or (self.get_user_language(request) if request else 'en')
        
        return {
            "message": message,
            "error_key": error_key,
            "language": actual_lang
        }
    
    def get_validation_error(self, field: str, error_key: str, lang_code: str = None, request=None, **kwargs) -> str:
        """Get validation error message for a specific field."""
        if 'field' not in kwargs:
            field_name = self.get_translation(f"fields.{field}", lang_code, request, **kwargs)
            kwargs['field'] = field_name
        
        return self.get_translation(f"errors.validation.{error_key}", lang_code, request, **kwargs)
    
    def get_notification(self, notification_key: str, lang_code: str = None, request=None, **kwargs) -> Dict[str, str]:
        """Get notification title and body."""
        title = self.get_translation(f"notifications.{notification_key}.title", lang_code, request, **kwargs)
        body = self.get_translation(f"notifications.{notification_key}.body", lang_code, request, **kwargs)
        
        return {
            "title": title,
            "body": body
        }
    
    def get_role_display(self, role: str, lang_code: str = None, request=None) -> str:
        """Get translated role name."""
        return self.get_translation(f"roles.{role}", lang_code, request)
    
    def get_status_display(self, status: str, lang_code: str = None, request=None) -> str:
        """Get translated status name."""
        return self.get_translation(f"statuses.{status}", lang_code, request)
    
    def get_default_language(self) -> str:
        """Get default language from Django settings."""
        try:
            lang = get_language()
            if lang and lang.startswith('rw'):
                return 'rw'
            elif lang and lang.startswith('fr'):
                return 'fr'
            elif lang and lang.startswith('en'):
                return 'en'
        except:
            pass
        return 'en'  # Default to English
    
    def get_supported_languages(self) -> Dict[str, str]:
        """Get list of supported languages."""
        return {code: self._language_names.get(code, code) for code in self._supported_languages}


# Global translator instance
translator = Translator()