from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from accounts.views.base_view import BaseAPIView, api_endpoint
from accounts.translations.translator import translator


class GetCurrentLanguageView(BaseAPIView):
    """Get the current user's language preference."""
    
    permission_classes = [AllowAny]  # Allow even non-authenticated users
    
    @api_endpoint
    def get(self, request):
        """
        Get the current language from session, user profile, or header.
        
        Returns:
            Current language code and available languages
        """
        lang_code = translator.get_user_language(request)
        
        # Get language display name
        language_name = translator._language_names.get(lang_code, lang_code)
        
        # Get available languages
        available_languages = {
            code: name for code, name in translator._language_names.items()
        }
        
        # Get session language if set
        session_language = request.session.get(translator.SESSION_LANGUAGE_KEY)
        
        # Get user profile language if authenticated
        user_language = None
        if request.user.is_authenticated and hasattr(request.user, 'language'):
            user_language = request.user.language
        
        return Response({
            'success': True,
            'status_code': status.HTTP_200_OK,
            'data': {
                'current_language': lang_code,
                'current_language_name': language_name,
                'session_language': session_language,
                'user_profile_language': user_language,
                'available_languages': available_languages,
                'is_authenticated': request.user.is_authenticated
            }
        }, status=status.HTTP_200_OK)


class ChangeLanguageView(BaseAPIView):
    """Change the user's language preference."""
    
    permission_classes = [AllowAny]  # Allow even non-authenticated users
    
    @api_endpoint
    def post(self, request):
        """
        Change user's language preference.
        
        Request body:
            - language: Language code (en, fr, rw)
            - persist_to_profile: Whether to save to user profile (default: true for authenticated users)
        
        Returns:
            Updated language information
        """
        language = request.data.get('language')
        persist_to_profile = request.data.get('persist_to_profile', request.user.is_authenticated)
        
        # Validate language
        if not language:
            return self.error_response(
                'validation.required_field',
                status_code=status.HTTP_400_BAD_REQUEST,
                field='language'
            )
        
        if language not in ['en', 'fr', 'rw']:
            return self.error_response(
                'validation.invalid_choice',
                status_code=status.HTTP_400_BAD_REQUEST,
                field='language',
                choices='en, fr, rw'
            )
        
        # Set language in session
        success = translator.set_session_language(request, language)
        
        if not success:
            return self.error_response(
                'system.internal_error',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Also update user profile if requested and user is authenticated
        profile_updated = False
        if persist_to_profile and request.user.is_authenticated:
            try:
                request.user.language = language
                request.user.save(update_fields=['language'])
                profile_updated = True
            except Exception as e:
                # Log error but don't fail the request
                pass
        
        # Get the translated response message
        lang_name = translator._language_names.get(language, language)
        
        return Response({
            'success': True,
            'status_code': status.HTTP_200_OK,
            'message': f'Language changed to {lang_name}',
            'data': {
                'language': language,
                'language_name': lang_name,
                'session_updated': success,
                'profile_updated': profile_updated,
                'available_languages': translator._language_names
            }
        }, status=status.HTTP_200_OK)


class ClearLanguageView(BaseAPIView):
    """Clear the user's language preference from session."""
    
    permission_classes = [AllowAny]
    
    @api_endpoint
    def post(self, request):
        """
        Clear language preference from session.
        System will fall back to user profile or header language.
        """
        success = translator.clear_session_language(request)
        
        # Get the language that will be used now
        new_lang = translator.get_user_language(request)
        new_lang_name = translator._language_names.get(new_lang, new_lang)
        
        return Response({
            'success': True,
            'status_code': status.HTTP_200_OK,
            'message': 'Language preference cleared',
            'data': {
                'session_cleared': success,
                'fallback_language': new_lang,
                'fallback_language_name': new_lang_name
            }
        }, status=status.HTTP_200_OK)


class LanguageMiddleware:
    """
    Middleware to automatically set language from session.
    Add this to your MIDDLEWARE in settings.py
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Get language from session or user profile
        lang_code = translator.get_user_language(request)
        
        # Activate the language for Django's i18n
        from django.utils import translation
        if lang_code == 'rw':
            translation.activate('rw')
        elif lang_code == 'fr':
            translation.activate('fr')
        else:
            translation.activate('en')
        
        # Store language in request for easy access
        request.current_language = lang_code
        
        response = self.get_response(request)
        
        # Set language cookie for frontend
        response.set_cookie(
            'user_language',
            lang_code,
            max_age=31536000,  # 1 year
            httponly=False,  # Allow JavaScript to read it
            samesite='Lax'
        )
        
        return response